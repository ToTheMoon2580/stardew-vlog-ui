import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const [spriteSource, itemsSource, appSource, dialogueText, smallText, tinyText, itemFiles] = await Promise.all([
  readFile(root + "/spritefont.js", "utf8"),
  readFile(root + "/items.js", "utf8"),
  readFile(root + "/app.js", "utf8"),
  readFile(root + "/assets/stardew/SpriteFont1-zh-CN.json", "utf8"),
  readFile(root + "/assets/stardew/SmallFont-zh-CN.json", "utf8"),
  readFile(root + "/assets/stardew/tinyFont.json", "utf8"),
  readdir(root + "/assets/items")
]);

function dataUrl(buffer) {
  return "data:image/png;base64," + buffer.toString("base64");
}

const assetData = {
  cursors: dataUrl(await readFile(root + "/assets/stardew/Cursors.png")),
  menu: dataUrl(await readFile(root + "/assets/stardew/MenuTiles.png")),
  fonts: {
    dialogue: dataUrl(await readFile(root + "/assets/stardew/SpriteFont1-zh-CN.png")),
    small: dataUrl(await readFile(root + "/assets/stardew/SmallFont-zh-CN.png")),
    tiny: dataUrl(await readFile(root + "/assets/stardew/tinyFont.png"))
  },
  heart: dataUrl(await readFile(root + "/assets/ui/heart.png")),
  items: Object.fromEntries(await Promise.all(itemFiles.filter((name) => name.endsWith(".png")).map(async (name) => [
    name.replace(/\.png$/i, ""),
    dataUrl(await readFile(root + "/assets/items/" + name))
  ])))
};

const fonts = {
  dialogue: JSON.parse(dialogueText).content,
  small: JSON.parse(smallText).content,
  tiny: JSON.parse(tinyText).content
};

const spriteClean = spriteSource
  .replace(/^export class /gm, "class ")
  .replace(/^export async function /gm, "async function ");

const itemsClean = itemsSource
  .replace(/^export const /gm, "const ");

const appClean = appSource
  .replace(/^import .*?;\r?\n/gm, "")
  .replace(
    'await Promise.all(Object.entries(ITEMS)',
    'const { ITEMS, GROUPS, PRESETS } = window.STARDEW_ITEMS;\n  await Promise.all(Object.entries(ITEMS)'
  )
  .replace(
    'loadSpriteFont("./assets/stardew/SpriteFont1-zh-CN.json", "./assets/stardew/SpriteFont1-zh-CN.png")',
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.dialogue, "./assets/stardew/SpriteFont1-zh-CN.png")'
  )
  .replace(
    'loadSpriteFont("./assets/stardew/SmallFont-zh-CN.json", "./assets/stardew/SmallFont-zh-CN.png")',
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.small, "./assets/stardew/SmallFont-zh-CN.png")'
  )
  .replace(
    'loadSpriteFont("./assets/stardew/tinyFont.json", "./assets/stardew/tinyFont.png")',
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.tiny, "./assets/stardew/tinyFont.png")'
  )
  .replace(
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.dialogue, "./assets/stardew/SpriteFont1-zh-CN.png")',
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.dialogue, window.STARDEW_ASSETS.fonts.dialogue)'
  )
  .replace(
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.small, "./assets/stardew/SmallFont-zh-CN.png")',
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.small, window.STARDEW_ASSETS.fonts.small)'
  )
  .replace(
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.tiny, "./assets/stardew/tinyFont.png")',
    'loadSpriteFontFromData(window.STARDEW_FONT_DATA.tiny, window.STARDEW_ASSETS.fonts.tiny)'
  )
  .replace(
    'loadImage("./assets/stardew/Cursors.png")',
    'loadImage(window.STARDEW_ASSETS.cursors)'
  )
  .replace(
    'loadImage("./assets/stardew/MenuTiles.png")',
    'loadImage(window.STARDEW_ASSETS.menu)'
  )
  .replaceAll(
    '"./assets/items/" + item.source + ".png"',
    'window.STARDEW_ASSETS.items[item.source]'
  )
  .replaceAll(
    '"./assets/ui/heart.png"',
    'window.STARDEW_ASSETS.heart'
  );

const bundle = [
  "/* Generated offline bundle. Source modules remain in the project. */",
  '(function () { "use strict";',
  spriteClean,
  itemsClean,
  "window.STARDEW_ITEMS = { ITEMS, GROUPS, PRESETS };",
  "window.STARDEW_ASSETS = " + JSON.stringify(assetData) + ";",
  "window.STARDEW_FONT_DATA = " + JSON.stringify(fonts) + ";",
  "async function loadSpriteFontFromData(metadata, imageUrl) {",
  "  const atlas = await loadImage(imageUrl);",
  "  return new SpriteFontRenderer(atlas, metadata);",
  "}",
  appClean,
  "})();"
].join("\n");

await writeFile(path.join(root, "app-bundle.js"), bundle, "utf8");
console.log("wrote app-bundle.js", Buffer.byteLength(bundle));
