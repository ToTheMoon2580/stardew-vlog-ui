// HTTP 模式与 AI 生图代理检查（需要 Node 静态服务器）
//   node qa/http-check.mjs
import path from "node:path";
import { spawn } from "node:child_process";
import { Browser } from "./browser.mjs";

const root = path.resolve(import.meta.dirname, "..");
const port = 8791;
const base = "http://127.0.0.1:" + port;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const server = spawn(process.execPath, [path.join(root, "server.mjs")], {
  cwd: root,
  stdio: "ignore",
  windowsHide: true,
  env: { ...process.env, PORT: String(port) }
});

let browser;
try {
  // 等服务器起来
  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(base + "/overlay.html");
      if (response.ok) {
        up = true;
        break;
      }
    } catch {
      // still starting
    }
    await wait(100);
  }
  check("静态服务器启动", up, base);
  if (!up) throw new Error("server did not start");

  browser = await Browser.launch({ headless: true, port: 9339 });
  const page = await browser.newPage({ width: 1400, height: 900 });
  await page.goto(base + "/overlay.html");
  await page.waitFor("window.vlogHUD && window.vlogHUD.ready === true");
  check("HTTP 模式页面可加载", true);
  check("HTTP 模式无脚本异常", page.pageErrors.length === 0, page.pageErrors.join(" | "));

  const assets = await page.evaluate(`(() => ({
    selections: document.querySelectorAll(".component-selection").length,
    items: document.querySelectorAll(".item-choice").length,
    painted: (() => {
      const canvas = document.querySelector("#hudCanvas");
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 8) n++;
      return n;
    })()
  }))()`);
  check("HTTP 模式 HUD 正常绘制", assets.selections === 4 && assets.painted > 50000, assets.painted + " px");

  // AI：没有 Key 时的提示
  await page.click('[data-inspector-tab="ai"]');
  await page.evaluate(`document.querySelector("#aiApiKeyInput").value = ""`);
  await page.click("#generateImageButton");
  await wait(300);
  const noKey = await page.evaluate("document.querySelector('#aiStatus').textContent");
  check("AI 无 Key 时提示填写", /API Key/.test(noKey), noKey);

  // AI：填了 Key 但没有可用凭据时，代理应返回结构化错误而不是崩溃
  await page.evaluate(`document.querySelector("#aiApiKeyInput").value = "sk-invalid-test-key"`);
  await page.click("#generateImageButton");
  await wait(6000);
  const withKey = await page.evaluate("document.querySelector('#aiStatus').textContent");
  const stillAlive = await page.evaluate("window.vlogHUD.ready === true");
  check("AI 请求失败时给出错误文案", withKey !== "正在生成像素图片..." && withKey.length > 0, withKey.slice(0, 80));
  check("AI 请求失败后页面仍可用", stillAlive === true);
  check("AI 失败不产生脚本异常", page.pageErrors.length === 0, page.pageErrors.join(" | "));

  await page.screenshot(path.join(root, "qa", "shots", "http-ai.png"));
} finally {
  if (browser) await browser.close();
  server.kill();
}
const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) process.exitCode = 1;
