// QA harness for the Stardew Vlog HUD editor.
// Runs a real Edge/Chrome instance over CDP against overlay.html.
//
//   node qa/verify.mjs                # all suites
//   node qa/verify.mjs baseline       # selected suites
//   node qa/verify.mjs --headed       # watch the browser
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { Browser } from "./browser.mjs";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const shotsDir = path.join(root, "qa", "shots");
const tmpDir = path.join(root, "qa", ".tmp");
const pageUrl = pathToFileURL(path.join(root, "overlay.html")).href;
const testVideo = path.join(root, "previews", "video-editor-demo.mp4");
let ffprobePath = null;

async function resolveFfprobe() {
  const candidates = [process.env.DSH_FFPROBE, "ffprobe", "D:\\AI产物\\_tools\\ffmpeg\\ffprobe.exe"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await run(candidate, ["-version"]);
      return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const wanted = args.filter((item) => !item.startsWith("--"));

const results = [];
let page;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  return ok;
}

function near(actual, expected, tolerance = 1) {
  return Math.abs(actual - expected) <= tolerance;
}

async function waitForIdle() {
  await page.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
}

async function probeVideo(file) {
  if (!ffprobePath) throw new Error("ffprobe 不可用");
  const { stdout } = await run(ffprobePath, [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,width,height",
    "-show_entries", "format=duration",
    "-of", "json",
    file
  ]);
  return JSON.parse(stdout);
}

async function reload({ keepStorage = false } = {}) {
  await page.goto(pageUrl);
  if (!keepStorage) await page.evaluate("localStorage.clear()");
  await page.waitFor("window.vlogHUD && window.vlogHUD.ready === true", {
    label: "HUD 与选区渲染完成"
  });
  await waitForIdle();
}

async function importVideo() {
  await page.setFileInput("#videoInput", [testVideo]);
  await page.waitFor("document.querySelector('#videoPreview').duration > 0", { label: "视频元数据" });
  await page.waitFor("!document.querySelector('#videoPreview').hidden", { label: "视频已显示" });
  await waitForIdle();
}

async function dragOnPage(from, to, steps = 6) {
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from.x, y: from.y, button: "left", clickCount: 1 });
  for (let step = 1; step <= steps; step++) {
    const x = from.x + (to.x - from.x) * step / steps;
    const y = from.y + (to.y - from.y) * step / steps;
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 });
  }
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to.x, y: to.y, button: "left", clickCount: 1 });
  await waitForIdle();
}

const suites = {};

suites.baseline = async () => {
  await reload();
  check("页面无 JavaScript 异常", page.pageErrors.length === 0, page.pageErrors.join(" | "));
  check("控制台无错误日志", page.consoleErrors.length === 0, page.consoleErrors.join(" | "));

  const metrics = await page.evaluate(`(() => ({
    weathers: document.querySelectorAll("#weatherInput option").length,
    groups: document.querySelectorAll("#groupInput option").length,
    items: document.querySelectorAll(".item-choice").length,
    selections: document.querySelectorAll(".component-selection").length,
    editorHeight: Math.round(document.querySelector("#editorPanel").getBoundingClientRect().height),
    canvasWidth: document.querySelector("#hudCanvas").width,
    canvasHeight: document.querySelector("#hudCanvas").height,
    stageWidth: Math.round(document.querySelector("#previewStage").getBoundingClientRect().width),
    stageHeight: Math.round(document.querySelector("#previewStage").getBoundingClientRect().height),
    tabs: document.querySelectorAll(".editor-tab").length,
    activeTab: document.querySelector("#editorPanel").dataset.activeTab,
    hasTimeline: Boolean(document.querySelector("#timelineTrack")),
    undoDisabled: document.querySelector("#undoButton").disabled
  }))()`);

  check("天气选项 7 个", metrics.weathers === 7, String(metrics.weathers));
  check("工具组 6 个", metrics.groups === 6, String(metrics.groups));
  check("原版物品按钮 17 个", metrics.items === 17, String(metrics.items));
  check("HUD 选区 4 个", metrics.selections === 4, String(metrics.selections));
  check("编辑器默认高度 400px", near(metrics.editorHeight, 400, 2), metrics.editorHeight + "px");
  check("Canvas 横屏 1920×1080", metrics.canvasWidth === 1920 && metrics.canvasHeight === 1080,
    metrics.canvasWidth + "×" + metrics.canvasHeight);
  check("预览区与 Canvas 宽高比一致", near(metrics.stageWidth / metrics.stageHeight, 1920 / 1080, 0.01),
    (metrics.stageWidth / metrics.stageHeight).toFixed(4));
  check("默认分页为剪辑", metrics.activeTab === "video", metrics.activeTab);
  check("时间轴已渲染", metrics.hasTimeline);
  check("初始无可撤销操作", metrics.undoDisabled === true);

  const painted = await page.evaluate(`(() => {
    const canvas = document.querySelector("#hudCanvas");
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 8) opaque++;
    return opaque;
  })()`);
  check("HUD 已绘制像素", painted > 50000, painted + " px");
  await page.screenshot(path.join(shotsDir, "baseline-landscape.png"));

  await page.click('[data-editor-tab="layers"]');
  await waitForIdle();
  const layersTab = await page.evaluate(`(() => ({
    active: document.querySelector("#editorPanel").dataset.activeTab,
    visible: [...document.querySelectorAll(".control-section[data-panel]")].filter((s) => !s.classList.contains("panel-hidden")).map((s) => s.dataset.panel)
  }))()`);
  check("分页切换到图层", layersTab.active === "layers" && layersTab.visible.every((panel) => panel === "layers"),
    layersTab.visible.join(","));
  await page.click('[data-editor-tab="video"]');

  const before = await page.evaluate("Math.round(document.querySelector('#editorPanel').getBoundingClientRect().height)");
  const handle = await page.evaluate(`(() => {
    const r = document.querySelector("#editorResizeHandle").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  await dragOnPage(handle, { x: handle.x, y: handle.y - 90 }, 4);
  const after = await page.evaluate("Math.round(document.querySelector('#editorPanel').getBoundingClientRect().height)");
  check("编辑器高度可拖动", after > before + 60, before + " → " + after);

  const clockBox = await page.evaluate(`(() => {
    const r = document.querySelector('.component-selection[data-component="clock"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  const beforeMove = await page.evaluate("window.vlogHUD.layers.clock");
  await dragOnPage(clockBox, { x: clockBox.x - 120, y: clockBox.y + 60 }, 6);
  const afterMove = await page.evaluate("window.vlogHUD.layers.clock");
  check("模块拖动生效", Math.abs(afterMove.x - beforeMove.x) > 50,
    `x ${Math.round(beforeMove.x)} → ${Math.round(afterMove.x)}`);

  const clockBefore = await page.evaluate("window.vlogHUD.layers.clock");
  await page.evaluate(`(() => {
    const select = document.querySelector("#layoutInput");
    select.value = "portrait";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitForIdle();
  const portrait = await page.evaluate(`(() => ({
    w: document.querySelector("#hudCanvas").width,
    h: document.querySelector("#hudCanvas").height,
    sw: document.querySelector("#previewStage").getBoundingClientRect().width,
    sh: document.querySelector("#previewStage").getBoundingClientRect().height,
    selections: document.querySelectorAll(".component-selection").length,
    clockX: window.vlogHUD.layers.clock.x,
    toolbarX: window.vlogHUD.layers.toolbar.x
  }))()`);
  check("竖屏 Canvas 1080×1920", portrait.w === 1080 && portrait.h === 1920, portrait.w + "×" + portrait.h);
  check("竖屏预览宽高比一致", near(portrait.sw / portrait.sh, 1080 / 1920, 0.01), (portrait.sw / portrait.sh).toFixed(4));
  check("竖屏选区保留 4 个", portrait.selections === 4, String(portrait.selections));
  check("调整过的图层按比例重映射", near(portrait.clockX, clockBefore.x * 1080 / 1920, 4),
    Math.round(clockBefore.x) + " → " + Math.round(portrait.clockX));
  check("未调整图层贴合竖屏默认位置", near(portrait.toolbarX, 140, 1), "toolbar.x=" + Math.round(portrait.toolbarX));
  await page.screenshot(path.join(shotsDir, "baseline-portrait.png"));

  await page.evaluate(`(() => {
    const select = document.querySelector("#layoutInput");
    select.value = "landscape";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitForIdle();
  check("运行期无新增异常", page.pageErrors.length === 0, page.pageErrors.join(" | "));
};

suites.timeline = async () => {
  await reload();
  await importVideo();
  const info = await page.evaluate(`(() => {
    const v = document.querySelector("#videoPreview");
    return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, ticks: document.querySelectorAll(".timeline-tick").length };
  })()`);
  check("视频导入并读取时长", info.duration > 0, info.duration.toFixed(3) + "s " + info.w + "×" + info.h);
  check("时间轴标尺有刻度", info.ticks >= 2, info.ticks + " 个刻度");

  // Scrub on the track
  const lane = await page.evaluate(`(() => {
    const r = document.querySelector("#timelineTrack").getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  })()`);
  const scrubX = lane.left + lane.width * 0.5;
  await dragOnPage({ x: scrubX, y: lane.top + lane.height - 8 }, { x: lane.left + lane.width * 0.75, y: lane.top + lane.height - 8 }, 5);
  const scrubbed = await page.evaluate(`(() => ({
    playhead: window.vlogHUD.state && document.querySelector("#currentTimeLabel").textContent,
    videoTime: document.querySelector("#videoPreview").currentTime
  }))()`);
  check("拖动时间轴可定位", Math.abs(scrubbed.videoTime - info.duration * 0.75) < 0.15,
    scrubbed.playhead + " / video=" + scrubbed.videoTime.toFixed(2));

  // Build 3 keyframes through the UI
  await page.evaluate("window.vlogHUD.seek(0.2)");
  await page.evaluate(`window.vlogHUD.set({ time: "09:00", stamina: 90, money: 200 })`);
  await page.evaluate("window.vlogHUD.seek(1.6)");
  await page.evaluate(`window.vlogHUD.set({ time: "18:00", stamina: 40, money: 900 })`);
  const frames = await page.evaluate("window.vlogHUD.keyframes");
  check("编辑时自动记录关键帧", frames.length >= 3, frames.map((f) => f.at.toFixed(2)).join("/"));
  check("关键帧按时间排序", frames.every((frame, index) => index === 0 || frame.at >= frames[index - 1].at));

  const mid = await page.evaluate("(() => window.vlogHUD.stateAt(0.9))()");
  check("关键帧之间插值生效", mid.stamina > 40 && mid.stamina < 90, "stamina=" + mid.stamina + " time=" + mid.time);

  const markerCount = await page.evaluate("document.querySelectorAll('.keyframe-marker').length");
  check("时间轴显示菱形标记", markerCount === frames.length, markerCount + " 个");
  await page.screenshot(path.join(shotsDir, "timeline.png"));

  // Drag a keyframe to retime it
  const targetIndex = 1;
  const markerBox = await page.evaluate(`(() => {
    const marker = document.querySelector('.keyframe-marker[data-index="${targetIndex}"]');
    const r = marker.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, at: window.vlogHUD.keyframes[${targetIndex}].at };
  })()`);
  const targetX = lane.left + lane.width * (markerBox.at / info.duration) + 70;
  await dragOnPage({ x: markerBox.x, y: markerBox.y }, { x: targetX, y: markerBox.y }, 8);
  const retimed = await page.evaluate(`(() => ({
    frames: window.vlogHUD.keyframes,
    playhead: document.querySelector("#videoPreview").currentTime
  }))()`);
  const moved = retimed.frames[targetIndex].at;
  check("关键帧可拖动改时间", moved > markerBox.at + 0.05, markerBox.at.toFixed(2) + " → " + moved.toFixed(2));
  check("拖动后仍按时间排序", retimed.frames.every((frame, index) => index === 0 || frame.at >= retimed.frames[index - 1].at));

  // Zoom
  const widthBefore = await page.evaluate("document.querySelector('#timelineTrack').getBoundingClientRect().width");
  await page.click("#timelineZoomIn");
  await page.click("#timelineZoomIn");
  await waitForIdle();
  const widthAfter = await page.evaluate("document.querySelector('#timelineTrack').getBoundingClientRect().width");
  check("时间轴可放大", widthAfter > widthBefore * 1.5, Math.round(widthBefore) + "px → " + Math.round(widthAfter) + "px");
  await page.click("#timelineFitButton");
  await waitForIdle();
  const widthFit = await page.evaluate("document.querySelector('#timelineTrack').getBoundingClientRect().width");
  check("时间轴可适应窗口", near(widthFit, widthBefore, 2), Math.round(widthFit) + "px");

  // Double click empty area adds a keyframe
  const countBefore = await page.evaluate("window.vlogHUD.keyframes.length");
  await page.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x: lane.left + lane.width * 0.35, y: lane.top + lane.height - 8, button: "left", clickCount: 2
  });
  await page.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: lane.left + lane.width * 0.35, y: lane.top + lane.height - 8, button: "left", clickCount: 2
  });
  await waitForIdle();
  const countAfter = await page.evaluate("window.vlogHUD.keyframes.length");
  check("双击时间轴新增关键帧", countAfter > countBefore, countBefore + " → " + countAfter);
};

suites.autokey = async () => {
  await reload();
  await importVideo();
  await page.evaluate("window.vlogHUD.seek(1.0)");
  await page.evaluate(`window.vlogHUD.set({ weather: "rain" })`);
  const frames = await page.evaluate("window.vlogHUD.keyframes");
  check("自动关键帧在播放头写入", frames.some((frame) => Math.abs(frame.at - 1.0) < 0.1 && frame.weather === "rain"),
    frames.map((f) => f.at + ":" + f.weather).join(" / "));

  await page.evaluate("window.vlogHUD.seek(0.0)");
  await page.evaluate(`window.vlogHUD.set({ weather: "snow" })`);
  const atZero = await page.evaluate("window.vlogHUD.keyframes");
  check("播放头落在已有帧时更新该帧", atZero[0].weather === "snow", atZero[0].weather);

  await page.evaluate("window.vlogHUD.seek(1.0)");
  await page.evaluate("window.vlogHUD.undo()");
  await page.waitFor("window.vlogHUD.history.undo >= 0");
  await waitForIdle();

  // Auto-key OFF keeps the frame count and writes into the previous keyframe
  await page.evaluate(`(() => {
    const input = document.querySelector("#autoKeyInput");
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await page.evaluate("window.vlogHUD.seek(1.8)");
  const beforeManual = await page.evaluate("window.vlogHUD.keyframes.length");
  await page.evaluate(`window.vlogHUD.set({ weather: "storm" })`);
  const manual = await page.evaluate("window.vlogHUD.keyframes");
  check("关闭自动关键帧后不新增帧", manual.length === beforeManual, beforeManual + " → " + manual.length);
  check("关闭自动关键帧后写入最近关键帧", manual[manual.length - 1].weather === "storm",
    manual.map((frame) => frame.at.toFixed(1) + ":" + frame.weather).join(" / "));
  await page.evaluate(`(() => {
    const input = document.querySelector("#autoKeyInput");
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
};

suites.history = async () => {
  await reload();
  const before = await page.evaluate("window.vlogHUD.state.day");
  await page.evaluate(`(() => {
    const input = document.querySelector("#dayInput");
    input.value = "27";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await waitForIdle();
  const changed = await page.evaluate("window.vlogHUD.state.day");
  check("日期修改生效", changed === 27, before + " → " + changed);
  check("撤销按钮已启用", (await page.evaluate("document.querySelector('#undoButton').disabled")) === false);

  await page.evaluate("window.vlogHUD.undo()");
  await page.waitFor("window.vlogHUD.state.day !== 27", { label: "撤销生效" });
  const afterUndo = await page.evaluate("window.vlogHUD.state.day");
  check("撤销恢复修改前状态", afterUndo === before, changed + " → " + afterUndo);

  await page.evaluate("window.vlogHUD.redo()");
  await page.waitFor("window.vlogHUD.state.day === 27", { label: "重做生效" });
  const afterRedo = await page.evaluate("window.vlogHUD.state.day");
  check("重做恢复修改", afterRedo === 27, afterUndo + " → " + afterRedo);

  // Keyboard shortcut
  await page.pressKey("z", { modifiers: 2 });
  await page.waitFor("window.vlogHUD.state.day !== 27", { label: "Ctrl+Z 撤销" });
  check("Ctrl+Z 快捷键撤销", (await page.evaluate("window.vlogHUD.state.day")) === before);

  await page.pressKey("z", { modifiers: 2 | 8 });
  await page.waitFor("window.vlogHUD.state.day === 27", { label: "Ctrl+Shift+Z 重做" });
  check("Ctrl+Shift+Z 快捷键重做", (await page.evaluate("window.vlogHUD.state.day")) === 27);

  // Keyframe add/delete undo
  await page.evaluate("window.vlogHUD.seek(1.0)");
  const countBefore = await page.evaluate("window.vlogHUD.keyframes.length");
  await page.click("#addKeyframeButton");
  await waitForIdle();
  const countAfterAdd = await page.evaluate("window.vlogHUD.keyframes.length");
  await page.evaluate("window.vlogHUD.undo()");
  await page.waitFor(`window.vlogHUD.keyframes.length === ${countBefore}`, { label: "撤销新增关键帧" });
  check("撤销新增关键帧", countAfterAdd === countBefore + 1 && (await page.evaluate("window.vlogHUD.keyframes.length")) === countBefore,
    countBefore + " → " + countAfterAdd + " → " + countBefore);

  // Layer drag undo
  const beforeDrag = await page.evaluate("window.vlogHUD.layers.caption");
  const box = await page.evaluate(`(() => {
    const r = document.querySelector('.component-selection[data-component="caption"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  await dragOnPage(box, { x: box.x + 90, y: box.y - 40 }, 6);
  const afterDrag = await page.evaluate("window.vlogHUD.layers.caption");
  check("拖动图层改变位置", Math.abs(afterDrag.x - beforeDrag.x) > 40, Math.round(beforeDrag.x) + " → " + Math.round(afterDrag.x));
  await page.evaluate("window.vlogHUD.undo()");
  await page.waitFor(`Math.abs(window.vlogHUD.layers.caption.x - ${beforeDrag.x}) < 1`, { label: "撤销图层拖动" });
  check("撤销图层拖动", Math.abs((await page.evaluate("window.vlogHUD.layers.caption")).x - beforeDrag.x) < 1);

  // Guard: the last keyframe can never be deleted
  await page.evaluate(`(() => {
    while (window.vlogHUD.keyframes.length > 1) window.vlogHUD.deleteKeyframe();
  })()`);
  await waitForIdle();
  await page.evaluate("document.querySelector('#deleteKeyframeButton').click()");
  await waitForIdle();
  check("保留最后一个关键帧", (await page.evaluate("window.vlogHUD.keyframes.length")) === 1,
    String(await page.evaluate("window.vlogHUD.keyframes.length")));
};

suites.project = async () => {
  await reload();
  await importVideo();
  await page.evaluate("window.vlogHUD.seek(0.6)");
  await page.evaluate(`window.vlogHUD.set({ caption: "工程持久化测试", money: 1234 })`);

  await page.click('[data-editor-tab="export"]');
  await page.click("#saveProjectButton");
  const file = await page.waitForFile(/\.json$/);
  const project = JSON.parse(await readFile(file, "utf8"));
  check("工程 JSON 可保存", project.format === "stardew-vlog-hud", "v" + project.version);
  check("工程版本为 2", project.version === 2, String(project.version));
  check("工程记录视频元数据", Boolean(project.video && project.video.name), JSON.stringify(project.video));
  check("工程记录关键帧图层", Array.isArray(project.keyframes) && Boolean(project.keyframes[0].layers), "layers ok");

  // v1 migration: build a legacy shaped project from the current one
  const migrated = await page.evaluate(`(() => {
    const current = window.vlogHUD.project.serialize();
    const legacy = {
      format: "stardew-vlog-hud",
      version: 1,
      layout: "landscape",
      smooth: true,
      componentLayout: current.keyframes[0].layers,
      customComponentImages: {},
      customItemImages: {},
      keyframes: current.keyframes.map((frame) => {
        const copy = { ...frame };
        delete copy.layers;
        delete copy.images;
        return copy;
      })
    };
    const result = window.vlogHUD.project.migrate(legacy);
    return { version: result.version, imageKeys: Object.keys(result.images), layers: result.keyframes[0].layers.clock };
  })()`);
  check("v1 工程可迁移到 v2", migrated.version === 2, "v" + migrated.version);
  check("迁移后补充图层数据", Boolean(migrated.layers && Number.isFinite(migrated.layers.x)),
    JSON.stringify(migrated.layers));

  // Legacy custom component image becomes a referenced registry entry
  const legacyImage = await page.evaluate(`(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 8; canvas.height = 8;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ff0000"; c.fillRect(0, 0, 8, 8);
    const dataUrl = canvas.toDataURL("image/png");
    const legacy = {
      format: "stardew-vlog-hud",
      version: 1,
      layout: "landscape",
      componentLayout: window.vlogHUD.project.serialize().keyframes[0].layers,
      customComponentImages: { clock: dataUrl },
      customItemImages: {},
      keyframes: [{ at: 0, time: "08:30", weather: "sunny", season: "fall", day: 12, stamina: 100, money: 860,
        group: "commute", item: "phone", tag: "准备出发", caption: "旧工程", clockVisible: true,
        staminaVisible: true, toolbarVisible: true, captionVisible: true }]
    };
    const result = window.vlogHUD.project.migrate(legacy);
    return {
      imageCount: Object.keys(result.images).length,
      frameImage: result.keyframes[0].images.clock,
      matches: Boolean(result.images[result.keyframes[0].images.clock])
    };
  })()`);
  check("v1 自定义图片进入图片库", legacyImage.imageCount === 1 && legacyImage.matches,
    JSON.stringify(legacyImage));

  // Reload project through the file input
  await page.evaluate("localStorage.clear()");
  await page.setFileInput("#projectInput", [file]);
  await page.waitFor("document.querySelector('#projectMeta').textContent.includes('工程 v2')", { label: "工程加载" });
  await page.waitFor("window.vlogHUD.keyframes.some((f) => f.caption === '工程持久化测试')", { label: "关键帧恢复" });
  const loaded = await page.evaluate(`(() => ({
    frames: window.vlogHUD.keyframes.length,
    videoName: document.querySelector("#videoName").textContent,
    reminderHidden: document.querySelector("#videoReminder").hidden,
    reminderText: document.querySelector("#videoReminderText").textContent
  }))()`);
  check("加载工程恢复关键帧", loaded.frames === project.keyframes.length, loaded.frames + " 帧");

  // Loading into a fresh page (no video) must remind the user to re-import
  await reload();
  await page.setFileInput("#projectInput", [file]);
  await page.waitFor("window.vlogHUD.keyframes.length > 1", { label: "工程已加载" });
  await waitForIdle();
  const reminder = await page.evaluate(`(() => ({
    hidden: document.querySelector("#videoReminder").hidden,
    text: document.querySelector("#videoReminderText").textContent,
    meta: document.querySelector("#projectMeta").textContent
  }))()`);
  check("无视频加载工程时提示重新导入", reminder.hidden === false && reminder.text.includes("重新导入"),
    reminder.text.slice(0, 60));
  check("工程信息显示视频规格", reminder.meta.includes("1920×1080"), reminder.meta);

  // Autosave (best effort under file://)
  const storage = await page.evaluate(`(() => {
    try {
      localStorage.setItem("__probe", "1");
      localStorage.removeItem("__probe");
      return true;
    } catch (error) {
      return String(error);
    }
  })()`);
  if (storage === true) {
    await page.evaluate(`(() => {
      const input = document.querySelector("#tagInput");
      input.value = "自动保存";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await page.evaluate("new Promise((r) => setTimeout(r, 1800))");
    const autosaved = await page.evaluate("Boolean(localStorage.getItem('stardew-vlog-hud.autosave.v2'))");
    check("自动保存写入 localStorage", autosaved);

    await reload({ keepStorage: true });
    const barVisible = await page.evaluate("!document.querySelector('#autosaveBar').hidden");
    check("重新打开提示自动保存", barVisible);
    if (barVisible) {
      await page.click("#autosaveRestore");
      await page.waitFor("window.vlogHUD.keyframes.some((f) => f.tag === '自动保存')", { label: "恢复自动保存" });
      const hiddenAfter = await page.evaluate("document.querySelector('#autosaveBar').hidden");
      check("恢复自动保存后隐藏提示条", hiddenAfter === true);
    }
  } else {
    console.log("    跳过自动保存断言：localStorage 不可用（" + storage + "）");
  }
};

suites.layers = async () => {
  await reload();
  await importVideo();
  await page.evaluate("window.vlogHUD.seek(0)");
  const start = await page.evaluate("window.vlogHUD.layers.clock");
  await page.evaluate("window.vlogHUD.seek(1.2)");
  await page.evaluate("window.vlogHUD.setLayer('clock', { x: 400, y: 300 })");
  await waitForIdle();
  const end = await page.evaluate("window.vlogHUD.layers.clock");
  check("图层位置写入关键帧", Math.abs(end.x - 400) < 1 && Math.abs(end.y - 300) < 1, JSON.stringify(end));

  const mid = await page.evaluate("window.vlogHUD.layerAtTime(0.6)");
  const expectedX = (start.x + 400) / 2;
  check("图层位置按关键帧插值", Math.abs(mid.clock.x - expectedX) < 30,
    "x=" + Math.round(mid.clock.x) + "（期望约 " + Math.round(expectedX) + "）");

  await page.evaluate("window.vlogHUD.seek(0)");
  const startAgain = await page.evaluate("window.vlogHUD.layers.clock");
  check("回到首帧恢复原图层位置", Math.abs(startAgain.x - start.x) < 1 && Math.abs(startAgain.y - start.y) < 1,
    Math.round(startAgain.x) + "," + Math.round(startAgain.y));

  // Per-keyframe custom image
  const imageId = await page.evaluate(`(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const c = canvas.getContext("2d");
    c.fillStyle = "#3aa3ff"; c.fillRect(0, 0, 64, 64);
    return window.vlogHUD.components.setImage("clock", canvas.toDataURL("image/png"));
  })()`);
  await waitForIdle();
  const frameWithImage = await page.evaluate("window.vlogHUD.keyframes.filter((f) => f.images.clock).length");
  check("替换图片记录到关键帧", Boolean(imageId) && frameWithImage >= 1, "id=" + imageId + " 帧数=" + frameWithImage);

  await page.evaluate("window.vlogHUD.seek(1.2)");
  await waitForIdle();
  const atOther = await page.evaluate("window.vlogHUD.components.imageId('clock')");
  check("其他关键帧不受图片影响", atOther !== imageId, String(atOther));

  const serialized = await page.evaluate("window.vlogHUD.project.serialize()");
  check("工程保存图片库", Boolean(serialized.images[imageId]), Object.keys(serialized.images).join(","));

  // Round trip through a fresh page
  await reload();
  await page.evaluate(`window.vlogHUD.project.load(${JSON.stringify(serialized)})`);
  await page.waitFor("window.vlogHUD.keyframes.length > 0", { label: "工程加载" });
  await page.evaluate("window.vlogHUD.seek(0)");
  await waitForIdle();
  const restored = await page.evaluate(`(() => {
    const id = window.vlogHUD.components.imageId("clock");
    const layer = window.vlogHUD.layers.clock;
    const canvas = document.querySelector("#hudCanvas");
    const ctx = canvas.getContext("2d");
    const pixel = ctx.getImageData(Math.round(layer.x + 24), Math.round(layer.y + 24), 1, 1).data;
    return { id, pixel: [...pixel] };
  })()`);
  check("重新加载工程恢复图层图片", restored.id === imageId, String(restored.id));
  check("图层图片实际绘制到画布", restored.pixel[2] > 180 && restored.pixel[0] < 140, "rgba(" + restored.pixel.join(",") + ")");

  const invalid = await page.evaluate(`(() => {
    try {
      window.vlogHUD.project.migrate({ format: "something-else" });
      return "no-error";
    } catch (error) {
      return error.message;
    }
  })()`);
  check("拒绝无效工程文件", invalid !== "no-error" && /有效/.test(invalid), invalid);

  // Layer drag creates a keyframe (auto key) at the playhead
  await page.evaluate("window.vlogHUD.seek(0.4)");
  const box = await page.evaluate(`(() => {
    const r = document.querySelector('.component-selection[data-component="clock"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  const countBefore = await page.evaluate("window.vlogHUD.keyframes.length");
  await dragOnPage(box, { x: box.x - 60, y: box.y + 30 }, 6);
  const afterDrag = await page.evaluate("window.vlogHUD.keyframes");
  check("播放头拖动图层生成图层关键帧", afterDrag.length > countBefore,
    countBefore + " → " + afterDrag.length + " 帧 @" + afterDrag.map((f) => f.at.toFixed(1)).join("/"));
};

suites.export = async () => {
  await reload();
  await importVideo();
  await page.evaluate("window.vlogHUD.seek(0.4)");
  await page.evaluate(`window.vlogHUD.set({ weather: "snow", stamina: 55 })`);
  await page.evaluate("window.vlogHUD.seek(0)");
  await page.click('[data-editor-tab="export"]');

  const support = await page.evaluate(`(() => ({
    mp4: MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2"),
    webm: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
  }))()`);
  console.log("    编码支持:", JSON.stringify(support));

  // Cancel path
  await page.click("#exportVideoButton");
  await page.waitFor("window.vlogHUD.exporting === true", { label: "导出开始" });
  await page.click("#cancelExportButton");
  await page.waitFor("window.vlogHUD.exporting === false", { label: "导出取消" });
  const cancelled = await page.evaluate(`(() => ({
    status: document.querySelector("#exportStatus").textContent,
    log: document.querySelector("#exportLog").textContent,
    buttonEnabled: document.querySelector("#exportVideoButton").disabled === false
  }))()`);
  check("导出可取消", /取消/.test(cancelled.status) || /取消/.test(cancelled.log), cancelled.status);
  check("取消后恢复导出按钮", cancelled.buttonEnabled);
  check("导出日志记录取消", /取消/.test(cancelled.log), cancelled.log.split("\n").slice(-1)[0]?.slice(0, 40));

  // Full export
  await page.click("#exportVideoButton");
  const file = await page.waitForFile(/\.(mp4|webm)$/, { timeout: 120000 });
  if (!ffprobePath) {
    check("导出文件生成（未校验编码）", /\.(mp4|webm)$/.test(file), path.basename(file));
  } else {
    const probe = await probeVideo(file);
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    check("导出文件生成", Boolean(video), path.basename(file));
    check("导出含 H.264 视频", video?.codec_name === "h264", video?.codec_name + " " + video?.width + "×" + video?.height);
    check("导出含 AAC 音轨", audio?.codec_name === "aac", audio?.codec_name || "无音轨");
    const duration = Number(probe.format.duration);
    check("导出时长接近原片", duration > 1.5 && duration < 3.5, duration.toFixed(2) + "s");
  }

  const log = await page.evaluate("document.querySelector('#exportLog').textContent");
  check("导出日志包含编码信息", /编码/.test(log), log.split("\n")[1]?.slice(0, 60));

  if (ffprobePath) {
    // Portrait export
    await rm(page.downloadDir, { recursive: true, force: true });
    await mkdir(page.downloadDir, { recursive: true });
    await page.evaluate(`(() => {
      const select = document.querySelector("#layoutInput");
      select.value = "portrait";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await page.evaluate("window.vlogHUD.seek(0)");
    await page.click("#exportVideoButton");
    const portraitFile = await page.waitForFile(/\.(mp4|webm)$/, { timeout: 120000 });
    const portraitProbe = await probeVideo(portraitFile);
    const portraitVideo = portraitProbe.streams.find((stream) => stream.codec_type === "video");
    check("竖屏导出 1080×1920", portraitVideo?.width === 1080 && portraitVideo?.height === 1920,
      portraitVideo?.width + "×" + portraitVideo?.height + " " + portraitVideo?.codec_name);
  }
};

async function main() {
  await rm(shotsDir, { recursive: true, force: true });
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(shotsDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });
  ffprobePath = await resolveFfprobe();
  if (!ffprobePath) console.log("提示：未找到 ffprobe，导出编码断言会跳过（设置 DSH_FFPROBE 可指定路径）");
  const browser = await Browser.launch({ headless: !headed });
  page = await browser.newPage({ width: 1500, height: 980 });
  try {
    const order = ["baseline", "timeline", "autokey", "history", "project", "layers", "export"];
    const selected = wanted.length ? order.filter((name) => wanted.includes(name)) : order;
    await reload();
    for (const name of selected) {
      console.log("\n### " + name);
      await suites[name]();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  await writeFile(path.join(shotsDir, "results.json"), JSON.stringify(results, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
