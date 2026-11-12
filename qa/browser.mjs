// Minimal Chrome DevTools Protocol driver used by the QA scripts.
// No third-party dependencies: Node 24 ships a global WebSocket and fetch.
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const BROWSER_CANDIDATES = [
  process.env.DSH_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean);

export function findBrowser() {
  const found = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("找不到 Edge 或 Chrome，可通过 DSH_BROWSER 环境变量指定路径");
  return found;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message + " (" + message.error.code + ")"));
        else entry.resolve(message.result);
        return;
      }
      const key = message.method + (message.sessionId ? "@" + message.sessionId : "");
      for (const handler of this.listeners.get(key) || []) handler(message.params);
      for (const handler of this.listeners.get(message.method) || []) handler(message.params, message.sessionId);
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  on(event, handler, sessionId) {
    const key = event + (sessionId ? "@" + sessionId : "");
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(handler);
    return () => this.listeners.get(key)?.delete(handler);
  }
}

export class Browser {
  constructor(process, cdp, userDataDir) {
    this.process = process;
    this.cdp = cdp;
    this.userDataDir = userDataDir;
    this.downloadDir = path.join(userDataDir, "downloads");
  }

  static async launch({ headless = true, port = 9333, width = 1500, height = 980 } = {}) {
    const executable = findBrowser();
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), "dsh-cdp-"));
    const downloadDir = path.join(userDataDir, "downloads");
    await mkdir(downloadDir, { recursive: true });
    const args = [
      "--remote-debugging-port=" + port,
      "--user-data-dir=" + userDataDir,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-features=Translate,MediaRouter",
      "--window-size=" + width + "," + height,
      "--autoplay-policy=no-user-gesture-required"
    ];
    if (headless) args.push("--headless");
    args.push("about:blank");
    const child = spawn(executable, args, { stdio: "ignore", windowsHide: true });

    let endpoint = null;
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        const response = await fetch("http://127.0.0.1:" + port + "/json/version");
        endpoint = (await response.json()).webSocketDebuggerUrl;
        if (endpoint) break;
      } catch {
        // browser still starting
      }
      await delay(100);
    }
    if (!endpoint) {
      child.kill();
      throw new Error("浏览器没有在预期时间内启动");
    }

    const socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("CDP 连接失败")), { once: true });
    });
    const cdp = new CdpConnection(socket);
    const browser = new Browser(child, cdp, userDataDir);
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
      eventsEnabled: true
    });
    return browser;
  }

  async newPage({ width = 1500, height = 980 } = {}) {
    const { targetId } = await this.cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await this.cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const page = new Page(this.cdp, targetId, sessionId, this.downloadDir);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    return page;
  }

  async close() {
    try {
      this.cdp.socket.close();
    } catch {
      // ignore
    }
    this.process.kill();
    await delay(150);
    try {
      await rm(this.userDataDir, { recursive: true, force: true });
    } catch {
      // Windows may still hold a lock; non-fatal for QA runs.
    }
  }
}

export class Page {
  constructor(cdp, targetId, sessionId, downloadDir) {
    this.cdp = cdp;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.downloadDir = downloadDir;
    this.consoleErrors = [];
    this.pageErrors = [];
    this.logs = [];
    cdp.on("Runtime.consoleAPICalled", (params) => {
      const text = (params.args || []).map((arg) => arg.value ?? arg.description ?? arg.type).join(" ");
      this.logs.push({ type: params.type, text });
      if (params.type === "error") this.consoleErrors.push(text);
    }, sessionId);
    cdp.on("Runtime.exceptionThrown", (params) => {
      const details = params.exceptionDetails;
      const text = details.exception?.description || details.text;
      this.pageErrors.push(text);
    }, sessionId);
    cdp.on("Log.entryAdded", (params) => {
      if (params.entry.level === "error") this.consoleErrors.push(params.entry.text);
    }, sessionId);
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async evaluate(expression, { awaitPromise = true } = {}) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      const message = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error("页面脚本异常: " + message);
    }
    return result.result.value;
  }

  async waitFor(expression, { timeout = 15000, interval = 100, label = expression } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        if (await this.evaluate("Boolean(" + expression + ")")) return true;
      } catch {
        // keep polling while the page is still loading
      }
      await delay(interval);
    }
    throw new Error("等待超时: " + label);
  }

  async goto(url) {
    await this.send("Page.navigate", { url });
    await this.waitFor("document.readyState === 'complete'", { label: "页面加载完成" });
  }

  async screenshot(filePath) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, Buffer.from(data, "base64"));
    return filePath;
  }

  async setFileInput(selector, absolutePaths) {
    const { root } = await this.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await this.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error("找不到文件输入框: " + selector);
    await this.send("DOM.setFileInputFiles", { nodeId, files: absolutePaths });
  }

  async click(selector) {
    const box = await this.evaluate(`(async () => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: "center", inline: "center" });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!box) throw new Error("找不到可点击元素: " + selector);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
    }
  }

  async pressKey(key, { modifiers = 0 } = {}) {
    const codes = { Escape: 27, z: 90, y: 89 };
    const keyCode = codes[key] ?? key.toUpperCase().charCodeAt(0);
    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code: key.length === 1 ? "Key" + key.toUpperCase() : key,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      modifiers
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code: key.length === 1 ? "Key" + key.toUpperCase() : key,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      modifiers
    });
  }

  async waitForFile(matcher, { timeout = 60000 } = {}) {
    const { readdir } = await import("node:fs/promises");
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const entries = await readdir(this.downloadDir).catch(() => []);
      const hit = entries.find((name) => matcher.test(name) && !name.endsWith(".crdownload"));
      if (hit) {
        // let the browser finish flushing
        await delay(400);
        return path.join(this.downloadDir, hit);
      }
      await delay(150);
    }
    throw new Error("等待下载超时");
  }

  // 在页面脚本运行前清空 localStorage，避免自动恢复上一次工程影响用例
  async setClearStorageOnLoad(enabled) {
    if (enabled && !this.clearScriptId) {
      const { identifier } = await this.send("Page.addScriptToEvaluateOnNewDocument", {
        source: "try{localStorage.clear()}catch(e){}"
      });
      this.clearScriptId = identifier;
    } else if (!enabled && this.clearScriptId) {
      await this.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: this.clearScriptId });
      this.clearScriptId = null;
    }
  }
}
