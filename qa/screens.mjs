// Renders reference screenshots of the editor for documentation / visual review.
//
//   node qa/screens.mjs            # desktop 1500×980
//   node qa/screens.mjs --small    # 1180×760 laptop layout
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";
import { Browser } from "./browser.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "qa", "shots");
const pageUrl = pathToFileURL(path.join(root, "overlay.html")).href;
const testVideo = path.join(root, "previews", "vlog-sample.mp4");
const small = process.argv.includes("--small");

const viewport = small ? { width: 1180, height: 760 } : { width: 1500, height: 980 };
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage(viewport);
await mkdir(outDir, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  await page.goto(pageUrl);
  await page.waitFor("window.vlogHUD && window.vlogHUD.ready === true");
  await page.evaluate("localStorage.clear()");
  await wait(300);

  const prefix = small ? "small-" : "";
  await page.screenshot(path.join(outDir, prefix + "editor-default.png"));

  await page.click('[data-inspector-tab="layers"]');
  await wait(150);
  await page.screenshot(path.join(outDir, prefix + "editor-layers.png"));

  await page.click('[data-inspector-tab="scene"]');
  await page.setFileInput("#videoInput", [testVideo]);
  await page.waitFor("document.querySelector('#videoPreview').duration > 0");
  await page.evaluate("window.vlogHUD.seek(0.8)");
  await page.evaluate(`window.vlogHUD.set({ time: "09:10", weather: "blossom", stamina: 86, tag: "出门" })`);
  await page.evaluate("window.vlogHUD.seek(4.5)");
  await page.evaluate(`window.vlogHUD.set({ time: "18:30", weather: "rain", stamina: 42, tag: "收工" })`);
  await page.evaluate("window.vlogHUD.seek(1.6)");
  await wait(250);
  await page.screenshot(path.join(outDir, prefix + "editor-timeline.png"));

  await page.evaluate(`(() => {
    document.querySelector('[data-layout="portrait"]').click();
  })()`);
  await wait(250);
  await page.screenshot(path.join(outDir, prefix + "editor-portrait.png"));

  await page.evaluate(`(() => {
    document.querySelector('[data-layout="landscape"]').click();
    document.querySelector("#exportOpenButton").click();
  })()`);
  await wait(250);
  await page.screenshot(path.join(outDir, prefix + "editor-export.png"));
  await page.evaluate("document.querySelector('#exportDialog').close()");

  if (small) {
    await page.evaluate("document.body.classList.add('library-open')");
    await wait(250);
    await page.screenshot(path.join(outDir, prefix + "editor-library.png"));
    await page.evaluate("document.body.classList.remove('library-open')");
  }

  console.log("screens written to", outDir);
} finally {
  await browser.close();
}
