import { loadImage, loadSpriteFont } from "./spritefont.js";
import { ITEMS, GROUPS, PRESETS } from "./items.js";

const WEATHERS = {
  sunny: { label: "晴天", sprite: 2 },
  rain: { label: "雨天", sprite: 1 },
  blossom: { label: "花瓣", sprite: 3 },
  storm: { label: "雷雨", sprite: 4 },
  greenRain: { label: "绿雨", sprite: 5 },
  wind: { label: "大风", sprite: 6 },
  snow: { label: "下雪", sprite: 7 }
};

const GROUPS_LABELS = {
  commute: "出门通勤",
  work: "上班工作",
  home: "宅家日常",
  outdoor: "农场劳动",
  food: "吃饭探店",
  travel: "旅行记录",
  custom: "自定义工具栏"
};

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const MAX_STAMINA = 270;
const GAME_TEXT = "#221122";
const SHADOW = "#dd9454";

const LAYER_NAMES = ["clock", "stamina", "toolbar", "caption"];
const STICKER_SHEETS = {
  springobjects: { label: "随手物", cell: 16, defaultScale: 4 },
  Craftables: { label: "可制作", cell: 16, defaultScale: 4 },
  tools: { label: "工具", cell: 16, defaultScale: 4 },
  weapons: { label: "武器", cell: 16, defaultScale: 4 },
  BuffsIcons: { label: "增益图标", cell: 16, defaultScale: 4 },
  Objects_2: { label: "物件", cell: 16, defaultScale: 4 },
  menu: { label: "界面图块", cell: 64, defaultScale: 1 }
};
const STICKER_ASSET_GROUPS = {
  items: { label: "常用道具", defaultScale: 2 },
  ui: { label: "界面零件", defaultScale: 2 }
};
// 16px 的原版图块想放到画面里当主视觉，8 倍（128px）远远不够；上限放到 50 倍（5000%）
const STICKER_SCALE_MIN = 0.05;
const STICKER_SCALE_MAX = 50;
const PROJECT_FORMAT = "stardew-vlog-hud";
const PROJECT_VERSION = 3;
const AUTOSAVE_KEY = "stardew-vlog-hud.autosave.v2";
const KEYFRAME_EPSILON = 0.045;
const HISTORY_LIMIT = 120;
const TIMELINE_MIN_ZOOM = 1;
const TIMELINE_MAX_ZOOM = 12;

const state = {
  layout: "landscape",
  time: "08:30",
  weather: "sunny",
  season: "fall",
  day: 12,
  stamina: 100,
  money: 860,
  group: "commute",
  item: "phone",
  tag: "准备出发",
  caption: "收拾完毕，准备出门上班",
  clockVisible: true,
  staminaVisible: true,
  toolbarVisible: true,
  captionVisible: true,
  clean: false,
  cleanPreview: false
};

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const canvas = $("#hudCanvas");
const ctx = canvas.getContext("2d");
const stage = $("#previewStage");
const scene = $("#sceneBackground");
const ui = {
  inspectorPanel: $("#inspectorPanel"),
  inspectorTabs: [...document.querySelectorAll(".inspector-tab")],
  dock: $("#timelineDock"),
  dockResize: $("#timelineResizeHandle"),
  library: $("#libraryPanel"),
  libraryToggle: $("#libraryToggle"),
  libraryBackdrop: $("#libraryBackdrop"),
  libraryTabs: [...document.querySelectorAll("[data-library-tab]")],
  libraryPanels: [...document.querySelectorAll("[data-library-panel]")],
  presetList: $("#presetList"),
  topbarMeta: $("#topbarMeta"),
  exportDialog: $("#exportDialog"),
  exportOpen: $("#exportOpenButton"),
  exportClose: $("#exportCloseButton"),
  layoutButtons: [...document.querySelectorAll("[data-layout]")],
  stageNote: $("#stageNote"),
  selectionLayer: $("#selectionLayer"),
  video: $("#videoPreview"),
  videoInput: $("#videoInput"),
  videoName: $("#videoName"),
  videoReminder: $("#videoReminder"),
  videoReminderText: $("#videoReminderText"),
  reimportVideo: $("#reimportVideoButton"),
  play: $("#playButton"),
  back: $("#backButton"),
  forward: $("#forwardButton"),
  addKeyframe: $("#addKeyframeButton"),
  addKeyframeDock: $("#addKeyframeDockButton"),
  deleteKeyframe: $("#deleteKeyframeButton"),
  timelineScroller: $("#timelineScroller"),
  track: $("#timelineTrack"),
  inner: $("#timelineInner"),
  ruler: $("#timelineRuler"),
  lane: $("#timelineLane"),
  markers: $("#keyframeMarkers"),
  playheadEl: $("#timelinePlayhead"),
  videoClip: $("#videoClip"),
  videoClipName: $("#videoClipName"),
  videoClipDuration: $("#videoClipDuration"),
  zoomIn: $("#timelineZoomIn"),
  zoomOut: $("#timelineZoomOut"),
  zoomFit: $("#timelineFitButton"),
  zoomLabel: $("#timelineZoomLabel"),
  snap: $("#snapInput"),
  autoKey: $("#autoKeyInput"),
  currentTime: $("#currentTimeLabel"),
  duration: $("#durationLabel"),
  keyframeCount: $("#keyframeCount"),
  smooth: $("#smoothInput"),
  exportVideo: $("#exportVideoButton"),
  cancelExport: $("#cancelExportButton"),
  exportProgress: $("#exportProgress"),
  exportStatus: $("#exportStatus"),
  exportLog: $("#exportLog"),
  saveProject: $("#saveProjectButton"),
  saveProjectTop: $("#saveProjectTopButton"),
  projectLoad: $("#projectLoadButton"),
  newProjectButton: $("#newProjectButton"),
  autoRestoreInput: $("#autoRestoreInput"),
  projectInput: $("#projectInput"),
  projectMeta: $("#projectMeta"),
  exportSummary: $("#exportSummary"),
  autosaveBar: $("#autosaveBar"),
  autosaveText: $("#autosaveText"),
  autosaveRestore: $("#autosaveRestore"),
  autosaveDiscard: $("#autosaveDiscard"),
  undo: $("#undoButton"),
  redo: $("#redoButton"),
  photo: $("#photoInput"),
  clearPhoto: $("#clearPhotoButton"),
  time: $("#timeInput"),
  weather: $("#weatherInput"),
  season: $("#seasonInput"),
  day: $("#dayInput"),
  money: $("#moneyInput"),
  stamina: $("#staminaInput"),
  staminaOutput: $("#staminaOutput"),
  group: $("#groupInput"),
  itemPicker: $("#itemPicker"),
  selectedItemName: $("#selectedItemName"),
  tag: $("#tagInput"),
  caption: $("#captionInput"),
  captionVisible: $("#captionVisibleInput"),
  captionVisibleOverlay: $("#captionVisibleInputOverlay"),
  clockVisible: $("#clockVisibleInput"),
  staminaVisible: $("#staminaVisibleInput"),
  toolbarVisible: $("#toolbarVisibleInput"),
  selectedLayerName: $("#selectedLayerName"),
  layerX: $("#layerXInput"),
  layerY: $("#layerYInput"),
  layerScale: $("#layerScaleInput"),
  layerScaleOutput: $("#layerScaleOutput"),
  stickerCategory: $("#stickerCategory"),
  stickerGrid: $("#stickerGrid"),
  stickerAssets: $("#stickerAssets"),
  stickerHint: $("#stickerHint"),
  stickerList: $("#stickerList"),
  stickerX: $("#stickerXInput"),
  stickerY: $("#stickerYInput"),
  stickerScale: $("#stickerScaleInput"),
  stickerScaleNumber: $("#stickerScaleNumberInput"),
  stickerScaleOutput: $("#stickerScaleOutput"),
  stickerDelete: $("#stickerDeleteButton"),
  stickerClear: $("#stickerClearButton"),
  stickerUp: $("#stickerUpButton"),
  stickerDown: $("#stickerDownButton"),
  frameSummaryState: $("#frameSummaryState"),
  frameSummaryFrame: $("#frameSummaryFrame"),
  timelineEmpty: $("#timelineEmpty"),
  activeFrameLabel: $("#activeFrameLabel"),
  playheadBubble: $("#playheadBubble"),
  resetLayout: $("#resetLayoutButton"),
  clearImage: $("#clearImageButton"),
  componentImage: $("#componentImageInput"),
  itemImage: $("#itemImageInput"),
  aiTarget: $("#aiTargetInput"),
  aiPrompt: $("#aiPromptInput"),
  aiModel: $("#aiModelInput"),
  aiKey: $("#aiApiKeyInput"),
  aiGenerate: $("#generateImageButton"),
  aiStatus: $("#aiStatus"),
  copyUrl: $("#copyUrlButton"),
  copyStatus: $("#copyStatus"),
  clean: $("#cleanButton"),
  toast: $("#toast")
};

let Cursors;
let MenuTiles;
let DialogueFont;
let SmallFont;
let TinyFont;
const itemImages = {};

/* ------------------------------------------------------------------ */
/* Document model                                                      */
/* ------------------------------------------------------------------ */

let keyframes = [];
let selectedKeyframeIndex = 0;
let playhead = 0;
let componentLayout = {};
let componentImageIds = { clock: null, stamina: null, toolbar: null, caption: null };
const imageLibrary = {};
const imageObjects = {};
const pendingImageLoads = new Set();
const customComponentImages = {};
const customItemImages = {};
const customItemData = {};

let videoFrameRequest = 0;
let mediaAudio = null;
let isExporting = false;
let exportRecorder = null;
let exportCancelled = false;
let exportStream = null;
let timelineInitialized = false;
let selectedComponent = "clock";
let videoMeta = null;
let expectedVideo = null;
let autosaveTimer = 0;
let autosaveAvailable = true;
let autosaveCandidate = null;
let imageCounter = 0;
let docRevision = 0;
let timelineZoom = 1;
let fpsProbe = null;
let ready = false;

let stickers = [];
let selectedStickerId = null;
let stickerCategory = "items";
let stickerCounter = 0;
const stickerSheetImages = {};
const stickerAssetImages = {};

const timelineCache = { rulerKey: "", markerKey: "" };
const autoKeyNotice = { at: -9999, time: -9999 };

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTime(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function formatTimelineTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const remaining = (value % 60).toFixed(2).padStart(5, "0");
  return String(minutes).padStart(2, "0") + ":" + remaining;
}

function formatRulerTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  const text = Number.isInteger(rest) ? String(rest).padStart(2, "0") : rest.toFixed(1).padStart(4, "0");
  return minutes + ":" + text;
}

function parseClockToMinutes(text) {
  const [hour, minute] = String(text).split(":").map(Number);
  return (Number.isFinite(hour) ? hour : 8) * 60 + (Number.isFinite(minute) ? minute : 30);
}

function minutesToClock(value) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  return String(Math.floor(normalized / 60)).padStart(2, "0") + ":" + String(normalized % 60).padStart(2, "0");
}

function videoDuration() {
  return Number.isFinite(ui.video.duration) ? ui.video.duration : 0;
}

function timelineDuration() {
  return Math.max(videoDuration(), keyframes.at(-1)?.at || 0, 0.05);
}

function currentPlayheadTime() {
  if (ui.video.src && !ui.video.paused && Number.isFinite(ui.video.currentTime)) {
    return clamp(ui.video.currentTime, 0, timelineDuration());
  }
  return clamp(playhead, 0, timelineDuration());
}

function parseQuery() {
  if (params.get("layout") === "portrait") state.layout = "portrait";
  if (params.has("time")) state.time = params.get("time");
  if (Object.hasOwn(WEATHERS, params.get("weather"))) state.weather = params.get("weather");
  if (["spring", "summer", "fall", "winter"].includes(params.get("season"))) state.season = params.get("season");
  if (params.has("day")) state.day = clampInt(params.get("day"), 1, 28, 12);
  if (params.has("stamina")) state.stamina = clampInt(params.get("stamina"), 0, 100, 100);
  if (params.has("money")) state.money = Math.max(0, Number(params.get("money")) || 0);
  if (params.has("group") && (Object.hasOwn(GROUPS, params.get("group")) || params.get("group") === "custom")) state.group = params.get("group");
  if (params.has("item") && Object.hasOwn(ITEMS, params.get("item"))) state.item = params.get("item");
  if (params.has("tag")) state.tag = params.get("tag");
  if (params.has("caption")) state.caption = params.get("caption");
  state.clockVisible = params.get("clockVisible") !== "0";
  state.staminaVisible = params.get("staminaVisible") !== "0";
  state.toolbarVisible = params.get("toolbarVisible") !== "0";
  state.captionVisible = params.get("captionVisible") !== "0";
  state.clean = params.get("clean") === "1";
}

/* ------------------------------------------------------------------ */
/* Canvas geometry and default layers                                  */
/* ------------------------------------------------------------------ */

function canvasSizeFor(layout = state.layout) {
  return layout === "portrait" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
}

function captionSize(layout = state.layout) {
  const size = canvasSizeFor(layout);
  return {
    width: layout === "portrait" ? Math.min(880, size.width - 72) : Math.min(720, size.width * 0.45),
    height: 264
  };
}

function defaultComponentLayout(layout = state.layout) {
  const size = canvasSizeFor(layout);
  const caption = captionSize(layout);
  return {
    clock: { x: size.width - 300, y: 8, scale: 1 },
    stamina: { x: size.width - 56, y: size.height - 240, scale: 1 },
    toolbar: { x: size.width / 2 - 400, y: size.height - 104, scale: 1 },
    caption: { x: layout === "portrait" ? 36 : 48, y: size.height - 104 - 18 - caption.height, scale: 1 }
  };
}

function resetComponentLayout(layout = state.layout) {
  componentLayout = defaultComponentLayout(layout);
  updateSelectionBoxes(true);
}

function componentSize(name) {
  if (name === "clock") return { width: 284, height: 248 };
  if (name === "stamina") return { width: 48, height: 224 };
  if (name === "toolbar") return { width: 800, height: 96 };
  if (name === "caption") return captionSize();
  return { width: 1, height: 1 };
}

function componentBounds(name) {
  if (name === "stamina") return { xOffset: -80, width: 128, height: 224 };
  return { xOffset: 0, ...componentSize(name) };
}

function componentVisible(name) {
  if (name === "clock") return state.clockVisible;
  if (name === "stamina") return state.staminaVisible;
  if (name === "toolbar") return state.toolbarVisible;
  if (name === "caption") return state.captionVisible;
  return true;
}

function componentLabel(name) {
  return { clock: "时钟", stamina: "体力", toolbar: "工具栏", caption: "信息卡" }[name] || name;
}

/* ------------------------------------------------------------------ */
/* Frame / layer normalisation                                         */
/* ------------------------------------------------------------------ */

function normalizeLayers(layers, fallback) {
  const base = fallback || defaultComponentLayout(state.layout);
  const result = {};
  for (const name of LAYER_NAMES) {
    const source = layers?.[name] || base[name] || { x: 0, y: 0, scale: 1 };
    result[name] = {
      x: Number(source.x) || 0,
      y: Number(source.y) || 0,
      scale: clamp(Number(source.scale) || 1, 0.2, 4)
    };
  }
  return result;
}

function normalizeImages(images, fallback) {
  const base = fallback || componentImageIds;
  const result = {};
  for (const name of LAYER_NAMES) {
    const value = images?.[name];
    result[name] = typeof value === "string" && value ? value : (base?.[name] || null);
  }
  return result;
}

function captureLiveFrame() {
  return {
    time: state.time,
    weather: state.weather,
    season: state.season,
    day: state.day,
    stamina: state.stamina,
    money: state.money,
    group: state.group,
    item: state.item,
    tag: state.tag,
    caption: state.caption,
    clockVisible: state.clockVisible,
    staminaVisible: state.staminaVisible,
    toolbarVisible: state.toolbarVisible,
    captionVisible: state.captionVisible,
    layers: structuredClone(normalizeLayers(componentLayout)),
    images: { ...componentImageIds }
  };
}

function normalizeFrame(frame, previous) {
  const fallbackLayers = previous?.layers || componentLayout || defaultComponentLayout(state.layout);
  return {
    at: Math.max(0, roundTime(frame.at)),
    time: /^\d{1,2}:\d{2}$/.test(String(frame.time)) ? String(frame.time) : (previous?.time || state.time),
    weather: Object.hasOwn(WEATHERS, frame.weather) ? frame.weather : (previous?.weather || state.weather),
    season: ["spring", "summer", "fall", "winter"].includes(frame.season) ? frame.season : (previous?.season || state.season),
    day: clampInt(frame.day, 1, 28, previous?.day ?? state.day),
    stamina: clampInt(frame.stamina, 0, 100, previous?.stamina ?? state.stamina),
    money: Math.max(0, Number(frame.money) || previous?.money || 0),
    group: Object.hasOwn(GROUPS, frame.group) ? frame.group : (previous?.group || state.group),
    item: Object.hasOwn(ITEMS, frame.item) ? frame.item : (previous?.item || state.item),
    tag: typeof frame.tag === "string" && frame.tag ? frame.tag : (previous?.tag || "今日状态"),
    caption: typeof frame.caption === "string" ? frame.caption : (previous?.caption || ""),
    clockVisible: frame.clockVisible !== false,
    staminaVisible: frame.staminaVisible !== false,
    toolbarVisible: frame.toolbarVisible !== false,
    captionVisible: frame.captionVisible !== false,
    layers: normalizeLayers(frame.layers, fallbackLayers),
    images: normalizeImages(frame.images, previous?.images)
  };
}

function ensureTimeline() {
  if (!keyframes.length) resetTimeline();
}

function normalizeSticker(raw) {
  if (!raw || typeof raw !== "object") return null;
  const kind = raw.kind === "asset" ? "asset" : "sheet";
  const sheet = typeof raw.sheet === "string" ? raw.sheet : null;
  const asset = typeof raw.asset === "string" ? raw.asset : null;
  if (kind === "sheet" && !STICKER_SHEETS[sheet]) return null;
  if (kind === "asset" && !asset) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : "st-" + Date.now().toString(36) + "-" + (++stickerCounter).toString(36),
    kind,
    sheet,
    asset,
    sx: Math.max(0, Number(raw.sx) || 0),
    sy: Math.max(0, Number(raw.sy) || 0),
    sw: Math.max(1, Number(raw.sw) || 16),
    sh: Math.max(1, Number(raw.sh) || 16),
    label: typeof raw.label === "string" && raw.label ? raw.label : "贴纸",
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    scale: clamp(Number(raw.scale) || 1, STICKER_SCALE_MIN, STICKER_SCALE_MAX),
    visible: raw.visible !== false
  };
}
function resetTimeline() {
  keyframes = [{ at: 0, ...captureLiveFrame() }];
  selectedKeyframeIndex = 0;
  playhead = 0;
  renderTimeline();
}

function selectedKeyframe() {
  ensureTimeline();
  return keyframes[selectedKeyframeIndex] || keyframes[0];
}

function findFrameIndexAt(at, epsilon = KEYFRAME_EPSILON) {
  return keyframes.findIndex((frame) => Math.abs(frame.at - at) <= epsilon);
}

function sortKeyframes() {
  keyframes.sort((a, b) => a.at - b.at);
}

function insertFrameAt(at, frame) {
  const created = { at: roundTime(at), ...frame };
  keyframes.push(created);
  sortKeyframes();
  selectedKeyframeIndex = keyframes.indexOf(created);
  return created;
}

function frameHasLayerChange(index) {
  if (index <= 0) return false;
  const previous = keyframes[index - 1]?.layers;
  const current = keyframes[index]?.layers;
  if (!previous || !current) return false;
  return LAYER_NAMES.some((name) => {
    const a = previous[name];
    const b = current[name];
    if (!a || !b) return false;
    return Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5 || Math.abs(a.scale - b.scale) > 0.001;
  });
}

function stateAtTime(seconds) {
  ensureTimeline();
  let previousIndex = 0;
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].at <= seconds + 0.001) previousIndex = i;
    else break;
  }
  const previous = keyframes[previousIndex];
  const next = keyframes[previousIndex + 1];
  const layers = structuredClone(normalizeLayers(previous.layers));
  const result = {
    layout: state.layout,
    time: previous.time,
    weather: previous.weather,
    season: previous.season,
    day: previous.day,
    stamina: previous.stamina,
    money: previous.money,
    group: previous.group,
    item: previous.item,
    tag: previous.tag,
    caption: previous.caption,
    clockVisible: previous.clockVisible !== false,
    staminaVisible: previous.staminaVisible !== false,
    toolbarVisible: previous.toolbarVisible !== false,
    captionVisible: previous.captionVisible,
    layers,
    images: { ...previous.images }
  };
  if (ui.smooth.checked && next && next.at > previous.at) {
    const amount = clamp((seconds - previous.at) / (next.at - previous.at), 0, 1);
    result.time = minutesToClock(parseClockToMinutes(previous.time) + (parseClockToMinutes(next.time) - parseClockToMinutes(previous.time)) * amount);
    result.stamina = Math.round(previous.stamina + (next.stamina - previous.stamina) * amount);
    result.money = Math.round(previous.money + (next.money - previous.money) * amount);
    for (const name of LAYER_NAMES) {
      const a = previous.layers?.[name];
      const b = next.layers?.[name];
      if (!a || !b) continue;
      result.layers[name] = {
        x: a.x + (b.x - a.x) * amount,
        y: a.y + (b.y - a.y) * amount,
        scale: a.scale + (b.scale - a.scale) * amount
      };
    }
  }
  return { index: previousIndex, state: result };
}

function applyTimelineTime(seconds) {
  const found = stateAtTime(seconds);
  selectedKeyframeIndex = found.index;
  playhead = seconds;
  const { layers, images, ...rest } = found.state;
  Object.assign(state, rest);
  componentLayout = layers;
  componentImageIds = images;
  syncComponentImageCache();
}

function seekTo(seconds, { syncVideo = true } = {}) {
  const duration = timelineDuration();
  const at = clamp(Number(seconds) || 0, 0, duration);
  if (syncVideo && ui.video.src && Number.isFinite(ui.video.duration) && ui.video.duration > 0) {
    try {
      ui.video.currentTime = clamp(at, 0, ui.video.duration);
    } catch {
      // seeking can fail while metadata is still loading
    }
  }
  applyTimelineTime(at);
  updateTimelineMeta(at);
  render();
}

function seekRelative(delta) {
  const duration = timelineDuration();
  if (!Number.isFinite(duration) || duration <= 0) return;
  const base = currentPlayheadTime();
  seekTo(base + delta);
}

/* ------------------------------------------------------------------ */
/* Image library                                                       */
/* ------------------------------------------------------------------ */

function syncComponentImageCache() {
  for (const name of LAYER_NAMES) {
    const id = componentImageIds[name];
    if (!id) {
      delete customComponentImages[name];
      continue;
    }
    const image = imageObjects[id];
    if (image) customComponentImages[name] = image;
    else {
      delete customComponentImages[name];
      ensureImageLoaded(id);
    }
  }
}

async function ensureImageLoaded(id) {
  if (!id || imageObjects[id] || pendingImageLoads.has(id) || !imageLibrary[id]) return imageObjects[id] || null;
  pendingImageLoads.add(id);
  try {
    imageObjects[id] = await loadCustomImage(imageLibrary[id]);
    syncComponentImageCache();
    render(false);
    return imageObjects[id];
  } catch (error) {
    console.warn("图层图片解码失败", id, error);
    return null;
  } finally {
    pendingImageLoads.delete(id);
  }
}

async function registerImageData(dataUrl) {
  const id = "img-" + Date.now().toString(36) + "-" + (++imageCounter).toString(36);
  imageLibrary[id] = dataUrl;
  imageObjects[id] = await loadCustomImage(dataUrl);
  return id;
}

function pruneImageLibrary() {
  const used = new Set(Object.values(componentImageIds).filter(Boolean));
  for (const frame of keyframes) {
    for (const id of Object.values(frame.images || {})) if (id) used.add(id);
  }
  for (const id of Object.keys(imageLibrary)) {
    if (!used.has(id)) {
      delete imageLibrary[id];
      delete imageObjects[id];
    }
  }
}

function dataUrlForFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function loadCustomImage(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
}

/* ------------------------------------------------------------------ */
/* Stickers (原版素材贴纸)                                             */
/* ------------------------------------------------------------------ */

const UI_STICKER_FALLBACK = [
  "weather-sunny", "weather-rain", "weather-storm", "weather-snow", "weather-wind",
  "weather-blossom", "weather-green-rain", "weather-festival",
  "season-spring", "season-summer", "season-fall", "season-winter",
  "heart", "quest-button", "money-box", "clock-frame", "clock-hand",
  "toolbar-slot", "toolbar-slot-selected", "toolbar-composed", "stamina-panel-composed",
  "clock-panel-composed", "caption-composed", "energy-top", "energy-middle", "energy-bottom"
];

function stickerMenuSource() {
  return window.STARDEW_ASSETS?.menu || "./assets/stardew/MenuTiles.png";
}

function stickerSheetSource(name) {
  return window.STARDEW_ASSETS?.sheets?.[name] || "./assets/stardew/" + name + ".png";
}

function stickerUiSource(name) {
  return window.STARDEW_ASSETS?.ui?.[name] || "./assets/ui/" + name + ".png";
}

async function loadStickerAssets() {
  for (const item of Object.values(ITEMS)) {
    if (item.heart) continue;
    if (itemImages[item.source]) stickerAssetImages["items:" + item.source] = itemImages[item.source];
  }
  const tasks = Object.keys(STICKER_SHEETS).map(async (name) => {
    try {
      const url = name === "menu" ? stickerMenuSource() : stickerSheetSource(name);
      stickerSheetImages[name] = await loadImage(url);
    } catch (error) {
      console.warn("贴纸图集加载失败", name, error);
    }
  });
  const uiNames = Object.keys(window.STARDEW_ASSETS?.ui || {}).length
    ? Object.keys(window.STARDEW_ASSETS.ui)
    : UI_STICKER_FALLBACK;
  for (const name of uiNames) {
    tasks.push((async () => {
      try {
        stickerAssetImages["ui:" + name] = await loadImage(stickerUiSource(name));
      } catch (error) {
        console.warn("贴纸素材加载失败", name, error);
      }
    })());
  }
  await Promise.all(tasks);
}

function stickerCategoryLabel(id) {
  if (STICKER_SHEETS[id]) return STICKER_SHEETS[id].label;
  if (STICKER_ASSET_GROUPS[id]) return STICKER_ASSET_GROUPS[id].label;
  return id;
}

function stickerAssetEntries(group) {
  if (group === "items") {
    return Object.entries(ITEMS).filter(([, item]) => !item.heart).map(([key, item]) => ({
      key: "items:" + item.source,
      label: item.label,
      image: itemImages[item.source]
    })).filter((entry) => entry.image);
  }
  const names = Object.keys(stickerAssetImages).filter((key) => key.startsWith("ui:"));
  return names.map((key) => ({ key, label: key.slice(3), image: stickerAssetImages[key] }));
}

let stickerGridCells = [];

function stickerGridColumns(cellDisplay) {
  return Math.max(1, Math.floor(212 / cellDisplay));
}

function renderStickerBrowser() {
  if (!ui.stickerGrid) return;
  const isSheet = Boolean(STICKER_SHEETS[stickerCategory]);
  ui.stickerGrid.hidden = !isSheet;
  ui.stickerAssets.hidden = isSheet;
  if (isSheet) ui.stickerAssets.innerHTML = "";
  ui.stickerHint.textContent = isSheet
    ? "点一下加到画面中央，或把它拖进预览"
    : "点一下加到画面中央，或把它拖进预览";
  if (isSheet) {
    const image = stickerSheetImages[stickerCategory];
    if (!image) return;
    const cell = STICKER_SHEETS[stickerCategory].cell;
    const cols = Math.floor(image.width / cell);
    const rows = Math.floor(image.height / cell);
    const cellDisplay = stickerCategory === "menu" ? 44 : 28;
    const columns = stickerGridColumns(cellDisplay);
    const outCols = Math.min(cols, columns);
    const totalRows = Math.ceil((cols * rows) / outCols);
    const canvasEl = ui.stickerGrid;
    canvasEl.width = outCols * cellDisplay;
    canvasEl.height = Math.max(cellDisplay, totalRows * cellDisplay);
    const gridContext = canvasEl.getContext("2d");
    gridContext.imageSmoothingEnabled = false;
    gridContext.clearRect(0, 0, canvasEl.width, canvasEl.height);
    stickerGridCells = [];
    for (let index = 0; index < cols * rows; index++) {
      const sourceCol = index % cols;
      const sourceRow = Math.floor(index / cols);
      const outCol = index % outCols;
      const outRow = Math.floor(index / outCols);
      const dx = outCol * cellDisplay;
      const dy = outRow * cellDisplay;
      // 空隙与底纹，让透明像素也看得出格子
      gridContext.fillStyle = (sourceCol + sourceRow) % 2 === 0 ? "#241a10" : "#1b130c";
      gridContext.fillRect(dx, dy, cellDisplay, cellDisplay);
      const pad = Math.max(1, Math.round(cellDisplay * 0.08));
      gridContext.drawImage(image, sourceCol * cell, sourceRow * cell, cell, cell, dx + pad, dy + pad, cellDisplay - pad * 2, cellDisplay - pad * 2);
      stickerGridCells.push({ x: dx, y: dy, w: cellDisplay, h: cellDisplay, sourceCol, sourceRow, cell, sheet: stickerCategory });
    }
    return;
  }
  // 命名素材：按钮网格
  const entries = stickerAssetEntries(stickerCategory);
  ui.stickerAssets.innerHTML = entries.map((entry) =>
    '<button class="sticker-asset" type="button" data-asset="' + escapeHtml(entry.key) + '" title="' + escapeHtml(entry.label) + '">' +
    '<img src="' + entry.image.src + '" alt="">' +
    '<span>' + escapeHtml(entry.label) + "</span></button>"
  ).join("");
}

function stickerCellAt(clientX, clientY) {
  const canvasEl = ui.stickerGrid;
  const rect = canvasEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (clientX - rect.left) * canvasEl.width / rect.width;
  const y = (clientY - rect.top) * canvasEl.height / rect.height;
  return stickerGridCells.find((cell) => x >= cell.x && x < cell.x + cell.w && y >= cell.y && y < cell.y + cell.h) || null;
}

function stickerSourceFromCell(cell) {
  return {
    kind: "sheet",
    sheet: cell.sheet,
    sx: cell.sourceCol * cell.cell,
    sy: cell.sourceRow * cell.cell,
    sw: cell.cell,
    sh: cell.cell,
    label: stickerCategoryLabel(cell.sheet) + " " + (cell.sourceRow + 1) + "-" + (cell.sourceCol + 1),
    defaultScale: STICKER_SHEETS[cell.sheet].defaultScale
  };
}

function stickerSourceFromAsset(key) {
  const image = stickerAssetImages[key];
  if (!image) return null;
  const itemKey = key.startsWith("items:") ? key.slice(6) : null;
  const label = itemKey
    ? (Object.values(ITEMS).find((item) => item.source === itemKey)?.label || itemKey)
    : key.slice(3);
  return {
    kind: "asset",
    asset: key,
    sx: 0,
    sy: 0,
    sw: image.width,
    sh: image.height,
    label,
    defaultScale: 2
  };
}

function selectedSticker() {
  return stickers.find((sticker) => sticker.id === selectedStickerId) || null;
}

function addSticker(source, x, y) {
  if (!source) return null;
  const scale = clamp(Number(source.defaultScale) || 4, STICKER_SCALE_MIN, STICKER_SCALE_MAX);
  const width = source.sw * scale;
  const height = source.sh * scale;
  const sticker = {
    id: "st-" + Date.now().toString(36) + "-" + (++stickerCounter).toString(36),
    kind: source.kind,
    sheet: source.sheet || null,
    asset: source.asset || null,
    sx: source.sx || 0,
    sy: source.sy || 0,
    sw: source.sw,
    sh: source.sh,
    label: source.label || "贴纸",
    x: Math.round(x != null ? x : canvas.width / 2 - width / 2),
    y: Math.round(y != null ? y : canvas.height / 2 - height / 2),
    scale,
    visible: true
  };
  recordHistory("添加贴纸", { immediate: true });
  stickers.push(sticker);
  selectedStickerId = sticker.id;
  touchDocument();
  render();
  setInspectorTab("stickers");
  showToast("已添加贴纸：" + sticker.label);
  return sticker;
}

function deleteSelectedSticker() {
  const sticker = selectedSticker();
  if (!sticker) return;
  recordHistory("删除贴纸", { immediate: true });
  stickers = stickers.filter((item) => item.id !== sticker.id);
  selectedStickerId = null;
  touchDocument();
  render();
  showToast("已删除贴纸");
}

function clearStickers() {
  if (!stickers.length) return;
  recordHistory("清空贴纸", { immediate: true });
  stickers = [];
  selectedStickerId = null;
  touchDocument();
  render();
  showToast("已清空贴纸");
}

function moveSelectedStickerOrder(delta) {
  const index = stickers.findIndex((sticker) => sticker.id === selectedStickerId);
  if (index < 0) return;
  const target = clamp(index + delta, 0, stickers.length - 1);
  if (target === index) return;
  recordHistory("调整贴纸层级", { immediate: true });
  const [sticker] = stickers.splice(index, 1);
  stickers.splice(target, 0, sticker);
  touchDocument();
  render();
}

function drawStickers() {
  for (const sticker of stickers) {
    if (sticker.visible === false) continue;
    const image = sticker.kind === "asset" ? stickerAssetImages[sticker.asset] : stickerSheetImages[sticker.sheet];
    if (!image) continue;
    const sw = Math.max(1, Math.round(sticker.sw));
    const sh = Math.max(1, Math.round(sticker.sh));
    const dw = Math.max(1, Math.round(sw * sticker.scale));
    const dh = Math.max(1, Math.round(sh * sticker.scale));
    ctx.drawImage(image, sticker.sx || 0, sticker.sy || 0, sw, sh, Math.round(sticker.x), Math.round(sticker.y), dw, dh);
  }
}

function stickerBounds(sticker) {
  return { width: sticker.sw * sticker.scale, height: sticker.sh * sticker.scale };
}

function syncStickerControls() {
  if (!ui.stickerList) return;
  const sticker = selectedSticker();
  if (ui.stickerX) {
    if (document.activeElement !== ui.stickerX) ui.stickerX.value = sticker ? Math.round(sticker.x) : "";
    if (document.activeElement !== ui.stickerY) ui.stickerY.value = sticker ? Math.round(sticker.y) : "";
    ui.stickerX.disabled = !sticker;
    ui.stickerY.disabled = !sticker;
  }
  if (ui.stickerScale) {
    ui.stickerScale.disabled = !sticker;
    ui.stickerScaleOutput.textContent = sticker ? Math.round(sticker.scale * 100) + "%" : "—";
    if (document.activeElement !== ui.stickerScale) ui.stickerScale.value = sticker ? String(Math.round(sticker.scale * 100)) : "100";
  }
  if (ui.stickerScaleNumber) {
    ui.stickerScaleNumber.disabled = !sticker;
    if (document.activeElement !== ui.stickerScaleNumber) {
      ui.stickerScaleNumber.value = sticker ? String(Math.round(sticker.scale * 100)) : "";
    }
  }
  if (ui.stickerDelete) ui.stickerDelete.disabled = !sticker;
  if (ui.stickerUp) ui.stickerUp.disabled = !sticker;
  if (ui.stickerDown) ui.stickerDown.disabled = !sticker;
  const listKey = stickers.map((item) => item.id + ":" + item.label).join("|") + "#" + (selectedStickerId || "");
  if (ui.stickerList.dataset.key === listKey) return;
  ui.stickerList.dataset.key = listKey;
  ui.stickerList.innerHTML = stickers.length
    ? stickers.map((item, index) => {
      const image = item.kind === "asset" ? stickerAssetImages[item.asset] : stickerSheetImages[item.sheet];
      const thumb = image && image.src ? image.src : "";
      return '<button class="sticker-row' + (item.id === selectedStickerId ? " active" : "") + '" type="button" data-sticker="' + item.id + '">' +
        '<img src="' + thumb + '" alt="">' +
        "<span>" + (index + 1) + " · " + escapeHtml(item.label) + "</span></button>";
    }).join("")
    : '<p class="hint">还没有贴纸。到左侧“贴纸”里点一个，或拖进画面。</p>';
}

function beginStickerDrag(event, source) {
  if (!source || event.button !== 0) return false;
  stickerDrag = { source, startX: event.clientX, startY: event.clientY, moved: false, ghost: null };
  return true;
}

function moveStickerDrag(event) {
  if (!stickerDrag) return;
  const dx = event.clientX - stickerDrag.startX;
  const dy = event.clientY - stickerDrag.startY;
  if (!stickerDrag.moved && Math.hypot(dx, dy) < 6) return;
  stickerDrag.moved = true;
  if (!stickerDrag.ghost) {
    const ghost = document.createElement("div");
    ghost.className = "sticker-ghost";
    const image = stickerDrag.source.kind === "asset" ? stickerAssetImages[stickerDrag.source.asset] : stickerSheetImages[stickerDrag.source.sheet];
    const ghostCanvas = document.createElement("canvas");
    const size = 56;
    ghostCanvas.width = size;
    ghostCanvas.height = size;
    const ghostContext = ghostCanvas.getContext("2d");
    ghostContext.imageSmoothingEnabled = false;
    if (image) ghostContext.drawImage(image, stickerDrag.source.sx || 0, stickerDrag.source.sy || 0, stickerDrag.source.sw, stickerDrag.source.sh, 0, 0, size, size);
    ghost.append(ghostCanvas);
    document.body.append(ghost);
    stickerDrag.ghost = ghost;
  }
  stickerDrag.ghost.style.left = event.clientX + "px";
  stickerDrag.ghost.style.top = event.clientY + "px";
}

function finishStickerDrag(event) {
  if (!stickerDrag) return;
  const drag = stickerDrag;
  stickerDrag = null;
  if (drag.ghost) drag.ghost.remove();
  const stageRect = stage.getBoundingClientRect();
  const inside = event.clientX >= stageRect.left && event.clientX <= stageRect.right &&
    event.clientY >= stageRect.top && event.clientY <= stageRect.bottom;
  if (drag.moved) {
    if (!inside) return;
    const scale = drag.source.defaultScale || 4;
    const x = (event.clientX - stageRect.left) * canvas.width / stageRect.width - drag.source.sw * scale / 2;
    const y = (event.clientY - stageRect.top) * canvas.height / stageRect.height - drag.source.sh * scale / 2;
    addSticker(drag.source, x, y);
    return;
  }
  addSticker(drag.source);
}

function bindStickerLibrary() {
  if (!ui.stickerCategory) return;
  ui.stickerCategory.value = stickerCategory;
  ui.stickerCategory.addEventListener("change", () => {
    stickerCategory = ui.stickerCategory.value;
    renderStickerBrowser();
    savePreferences();
  });

  ui.stickerGrid.addEventListener("pointerdown", (event) => {
    const cell = stickerCellAt(event.clientX, event.clientY);
    if (!cell) return;
    if (beginStickerDrag(event, stickerSourceFromCell(cell))) {
      ui.stickerGrid.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  ui.stickerGrid.addEventListener("pointermove", moveStickerDrag);
  ui.stickerGrid.addEventListener("pointerup", finishStickerDrag);
  ui.stickerGrid.addEventListener("pointercancel", finishStickerDrag);

  ui.stickerAssets.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".sticker-asset");
    if (!button) return;
    if (beginStickerDrag(event, stickerSourceFromAsset(button.dataset.asset))) {
      ui.stickerAssets.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  ui.stickerAssets.addEventListener("pointermove", moveStickerDrag);
  ui.stickerAssets.addEventListener("pointerup", finishStickerDrag);
  ui.stickerAssets.addEventListener("pointercancel", finishStickerDrag);
  ui.stickerAssets.addEventListener("click", (event) => {
    // 鼠标点击已由 pointerup 处理；这里只保留键盘回车/空格触发
    if (event.detail !== 0) return;
    const button = event.target.closest(".sticker-asset");
    if (!button) return;
    const source = stickerSourceFromAsset(button.dataset.asset);
    if (source) addSticker(source);
  });

  ui.stickerList.addEventListener("click", (event) => {
    const row = event.target.closest(".sticker-row");
    if (!row) return;
    selectedStickerId = row.dataset.sticker;
    render();
  });
  ui.stickerDelete.addEventListener("click", deleteSelectedSticker);
  ui.stickerClear.addEventListener("click", clearStickers);
  ui.stickerUp.addEventListener("click", () => moveSelectedStickerOrder(1));
  ui.stickerDown.addEventListener("click", () => moveSelectedStickerOrder(-1));

  const moveStickerByInputs = () => {
    const sticker = selectedSticker();
    if (!sticker) return;
    beginGesture("调整贴纸位置");
    const x = Number(ui.stickerX.value);
    const y = Number(ui.stickerY.value);
    if (Number.isFinite(x)) sticker.x = x;
    if (Number.isFinite(y)) sticker.y = y;
    touchDocument();
    render();
  };
  ui.stickerX.addEventListener("input", moveStickerByInputs);
  ui.stickerY.addEventListener("input", moveStickerByInputs);
  ui.stickerX.addEventListener("pointerdown", () => beginGesture("调整贴纸位置"));
  ui.stickerY.addEventListener("pointerdown", () => beginGesture("调整贴纸位置"));
  ui.stickerX.addEventListener("change", () => endGesture());
  ui.stickerY.addEventListener("change", () => endGesture());

  ui.stickerScale.addEventListener("pointerdown", () => beginGesture("缩放贴纸"));
  ui.stickerScale.addEventListener("input", () => {
    const sticker = selectedSticker();
    if (!sticker) return;
    beginGesture("缩放贴纸");
    sticker.scale = clamp(Number(ui.stickerScale.value) / 100, STICKER_SCALE_MIN, STICKER_SCALE_MAX);
    touchDocument();
    render();
  });
  const finishStickerScale = () => endGesture();
  ui.stickerScale.addEventListener("change", finishStickerScale);
  ui.stickerScale.addEventListener("pointerup", finishStickerScale);

  // 精确输入：16px 图块放到 3000% 这种大尺寸时，滑杆不够用
  ui.stickerScaleNumber.addEventListener("pointerdown", () => beginGesture("缩放贴纸"));
  ui.stickerScaleNumber.addEventListener("input", () => {
    const sticker = selectedSticker();
    if (!sticker) return;
    beginGesture("缩放贴纸");
    sticker.scale = clamp(Number(ui.stickerScaleNumber.value) / 100, STICKER_SCALE_MIN, STICKER_SCALE_MAX);
    touchDocument();
    render();
  });
  ui.stickerScaleNumber.addEventListener("change", finishStickerScale);
  ui.stickerScaleNumber.addEventListener("blur", finishStickerScale);
  ui.stickerScaleNumber.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      ui.stickerScaleNumber.blur();
    }
  });
}

let stickerDrag = null;

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

const history = { undo: [], redo: [], lastLabel: "", lastAt: -9999 };
let gesture = null;

function snapshotDocument() {
  return {
    keyframes: keyframes.map((frame) => structuredClone(frame)),
    images: { ...imageLibrary },
    itemImages: { ...customItemData },
    stickers: stickers.map((sticker) => ({ ...sticker })),
    selectedStickerId,
    smooth: ui.smooth.checked,
    autoKey: ui.autoKey.checked,
    snap: ui.snap.checked,
    layoutMode: state.layout,
    selectedKeyframeIndex,
    playhead
  };
}

function updateHistoryButtons() {
  if (!ui.undo) return;
  ui.undo.disabled = history.undo.length === 0;
  ui.redo.disabled = history.redo.length === 0;
  ui.undo.title = history.undo.length ? "撤销：" + history.undo.at(-1).label + " (Ctrl+Z)" : "没有可撤销的操作";
  ui.redo.title = history.redo.length ? "重做：" + history.redo.at(-1).label + " (Ctrl+Shift+Z)" : "没有可重做的操作";
}

function pushUndo(snapshot, label) {
  if (!snapshot) return;
  history.undo.push({ snapshot, label, at: Date.now() });
  if (history.undo.length > HISTORY_LIMIT) history.undo.shift();
  history.redo.length = 0;
  updateHistoryButtons();
}

function recordHistory(label, options = {}) {
  if (gesture) return;
  const now = performance.now();
  if (!options.immediate && history.lastLabel === label && now - history.lastAt < 450) {
    history.lastAt = now;
    return;
  }
  history.lastLabel = label;
  history.lastAt = now;
  pushUndo(snapshotDocument(), label);
}

function beginGesture(label) {
  if (gesture) return;
  gesture = { label, snapshot: snapshotDocument(), revision: docRevision };
}

function endGesture() {
  if (!gesture) return;
  const current = gesture;
  gesture = null;
  if (docRevision === current.revision) return;
  pushUndo(current.snapshot, current.label);
}

async function restoreDocument(snapshot) {
  if (!snapshot) return;
  keyframes = snapshot.keyframes.map((frame) => structuredClone(frame));
  for (const id of Object.keys(imageLibrary)) delete imageLibrary[id];
  Object.assign(imageLibrary, snapshot.images || {});
  for (const id of Object.keys(imageObjects)) delete imageObjects[id];
  for (const key of Object.keys(customItemData)) delete customItemData[key];
  Object.assign(customItemData, snapshot.itemImages || {});
  for (const key of Object.keys(customItemImages)) delete customItemImages[key];
  for (const [key, dataUrl] of Object.entries(customItemData)) {
    try {
      customItemImages[key] = await loadCustomImage(dataUrl);
    } catch (error) {
      console.warn("物品图片恢复失败", key, error);
    }
  }
  ui.smooth.checked = snapshot.smooth !== false;
  ui.autoKey.checked = snapshot.autoKey !== false;
  ui.snap.checked = snapshot.snap !== false;
  stickers = (snapshot.stickers || []).map((sticker) => ({ ...sticker }));
  selectedStickerId = snapshot.selectedStickerId || null;
  state.layout = snapshot.layoutMode === "portrait" ? "portrait" : "landscape";
  selectedKeyframeIndex = clampInt(snapshot.selectedKeyframeIndex, 0, Math.max(0, keyframes.length - 1), 0);
  for (const id of Object.keys(snapshot.images || {})) await ensureImageLoaded(id);
  playhead = clamp(Number(snapshot.playhead) || 0, 0, timelineDuration());
  applyTimelineTime(playhead);
  if (ui.video.src) {
    try {
      ui.video.currentTime = clamp(playhead, 0, videoDuration());
    } catch {
      // ignore
    }
  }
  docRevision++;
  scheduleAutosave();
  updateVideoReminder();
  render();
  syncControls();
  updateTimelineMeta(playhead);
  updateProjectMeta();
}

function undo() {
  if (isExporting) {
    showToast("导出中不能撤销，请先取消导出");
    return;
  }
  const entry = history.undo.pop();
  if (!entry) {
    showToast("没有可撤销的操作");
    return;
  }
  history.redo.push({ snapshot: snapshotDocument(), label: entry.label });
  history.lastLabel = "";
  restoreDocument(entry.snapshot).then(() => {
    updateHistoryButtons();
    showToast("已撤销：" + entry.label);
  });
}

function redo() {
  if (isExporting) {
    showToast("导出中不能重做，请先取消导出");
    return;
  }
  const entry = history.redo.pop();
  if (!entry) {
    showToast("没有可重做的操作");
    return;
  }
  history.undo.push({ snapshot: snapshotDocument(), label: entry.label });
  history.lastLabel = "";
  restoreDocument(entry.snapshot).then(() => {
    updateHistoryButtons();
    showToast("已重做：" + entry.label);
  });
}

/* ------------------------------------------------------------------ */
/* Editing pipeline                                                    */
/* ------------------------------------------------------------------ */

function touchDocument() {
  docRevision++;
  scheduleAutosave();
  updateProjectMeta();
}

function notifyAutoKey(at) {
  const now = performance.now();
  if (now - autoKeyNotice.at < 1200 && Math.abs(at - autoKeyNotice.time) < 0.4) return;
  autoKeyNotice.at = now;
  autoKeyNotice.time = at;
  showToast("已在 " + formatTimelineTime(at) + " 自动记录关键帧");
}

function notifyStoredKeyframe(at) {
  const now = performance.now();
  if (now - autoKeyNotice.at < 1200 && Math.abs(at - autoKeyNotice.time) < 0.4) return;
  autoKeyNotice.at = now;
  autoKeyNotice.time = at;
  showToast("自动关键帧已关闭，修改写入 " + formatTimelineTime(at) + " 的关键帧");
}

function commitLiveState(label, options = {}) {
  const { record = true, renderNow = true } = options;
  const at = clamp(roundTime(currentPlayheadTime()), 0, timelineDuration());
  if (record) recordHistory(label);
  const exactIndex = findFrameIndexAt(at);
  if (exactIndex >= 0) {
    Object.assign(keyframes[exactIndex], captureLiveFrame(), { at: keyframes[exactIndex].at });
    selectedKeyframeIndex = exactIndex;
  } else if (ui.autoKey.checked) {
    insertFrameAt(at, captureLiveFrame());
    notifyAutoKey(at);
  } else {
    const target = selectedKeyframe() || keyframes[0];
    Object.assign(target, captureLiveFrame(), { at: target.at });
    notifyStoredKeyframe(target.at);
  }
  touchDocument();
  if (renderNow) render();
}

function addKeyframeAtPlayhead() {
  if (!ui.video.src) {
    showToast("请先导入视频，再在时间轴上打关键帧");
    return;
  }
  if (!videoDuration()) {
    showToast("视频还在读取中，稍等一下再添加");
    return;
  }
  const at = clamp(roundTime(currentPlayheadTime()), 0, timelineDuration());
  recordHistory("添加关键帧", { immediate: true });
  const existing = findFrameIndexAt(at);
  if (existing >= 0) {
    Object.assign(keyframes[existing], captureLiveFrame(), { at: keyframes[existing].at });
    selectedKeyframeIndex = existing;
    showToast("该时间已有关键帧，已更新 " + formatTimelineTime(at));
  } else {
    insertFrameAt(at, captureLiveFrame());
    showToast("已添加关键帧 " + formatTimelineTime(at));
  }
  touchDocument();
  applyTimelineTime(at);
  updateTimelineMeta(at);
  render();
  flashSelectedKeyframe();
}

function flashSelectedKeyframe() {
  requestAnimationFrame(() => {
    const marker = ui.markers?.querySelector('.keyframe-marker[data-index="' + selectedKeyframeIndex + '"]');
    if (!marker) return;
    marker.classList.add("just-added");
    setTimeout(() => marker.classList.remove("just-added"), 620);
  });
}

function deleteSelectedKeyframe() {
  if (keyframes.length <= 1) {
    showToast("至少保留一个关键帧");
    return;
  }
  recordHistory("删除关键帧", { immediate: true });
  const removed = keyframes.splice(selectedKeyframeIndex, 1)[0];
  selectedKeyframeIndex = Math.max(0, Math.min(selectedKeyframeIndex, keyframes.length - 1));
  const target = keyframes[selectedKeyframeIndex];
  touchDocument();
  seekTo(target.at);
  showToast("已删除 " + formatTimelineTime(removed.at) + " 的关键帧");
}

function changeOrientation(mode) {
  if (mode !== "portrait" && mode !== "landscape") return;
  if (mode === state.layout) return;
  recordHistory("切换画幅", { immediate: true });
  const previous = state.layout;
  const fromSize = canvasSizeFor(previous);
  const toSize = canvasSizeFor(mode);
  const oldDefaults = defaultComponentLayout(previous);
  const newDefaults = defaultComponentLayout(mode);
  const remap = (layers) => {
    const source = normalizeLayers(layers, oldDefaults);
    const result = {};
    for (const name of LAYER_NAMES) {
      const current = source[name];
      const wasDefault = Math.abs(current.x - oldDefaults[name].x) < 0.5
        && Math.abs(current.y - oldDefaults[name].y) < 0.5
        && Math.abs(current.scale - oldDefaults[name].scale) < 0.001;
      result[name] = wasDefault
        ? { ...newDefaults[name] }
        : {
          x: roundTime(current.x * toSize.width / fromSize.width),
          y: roundTime(current.y * toSize.height / fromSize.height),
          scale: current.scale
        };
    }
    return result;
  };
  state.layout = mode;
  componentLayout = remap(componentLayout);
  for (const frame of keyframes) frame.layers = remap(frame.layers);
  touchDocument();
  savePreferences();
  render();
}

/* ------------------------------------------------------------------ */
/* Timeline UI                                                         */
/* ------------------------------------------------------------------ */

function chooseTickStep(duration, width) {
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  for (const step of steps) {
    if ((step / Math.max(duration, 0.001)) * Math.max(width, 60) >= 76) return step;
  }
  return 600;
}

function buildRulerHtml(duration, width) {
  const step = chooseTickStep(duration, width);
  const parts = [];
  const limit = Math.ceil(duration / step) + 1;
  for (let index = 0; index <= Math.min(limit, 200); index++) {
    const at = index * step;
    if (at > duration + 0.001) break;
    const left = duration > 0 ? (at / duration) * 100 : 0;
    parts.push('<span class="timeline-tick" style="left:' + left.toFixed(4) + '%"><b>' + formatRulerTime(at) + "</b></span>");
  }
  return parts.join("");
}

function updatePlayheadMarker() {
  const duration = timelineDuration();
  const ratio = duration > 0 ? clamp(playhead / duration, 0, 1) : 0;
  ui.playheadEl.style.left = (ratio * 100).toFixed(4) + "%";
}

function showTimelineBubble(seconds, label) {
  if (!ui.playheadBubble) return;
  const duration = timelineDuration();
  const ratio = duration > 0 ? clamp(seconds / duration, 0, 1) : 0;
  ui.playheadBubble.style.left = (ratio * 100).toFixed(4) + "%";
  ui.playheadBubble.textContent = label || formatTimelineTime(seconds);
  ui.playheadBubble.hidden = false;
}

function hideTimelineBubble() {
  if (ui.playheadBubble) ui.playheadBubble.hidden = true;
}

function renderTimeline() {
  if (!ui.markers) return;
  const duration = timelineDuration();
  const width = ui.inner.clientWidth || 600;
  const rulerKey = duration.toFixed(3) + "|" + timelineZoom.toFixed(3) + "|" + width;
  if (rulerKey !== timelineCache.rulerKey) {
    timelineCache.rulerKey = rulerKey;
    ui.track.style.width = (timelineZoom * 100).toFixed(2) + "%";
    ui.ruler.innerHTML = buildRulerHtml(duration, width);
    ui.zoomLabel.textContent = Math.round(timelineZoom * 100) + "%";
  }
  const markerKey = keyframes.map((frame, index) =>
    frame.at.toFixed(3) + (frameHasLayerChange(index) ? "l" : "-") + (index === selectedKeyframeIndex ? "*" : "")
  ).join(",") + "|" + duration.toFixed(3);
  if (markerKey !== timelineCache.markerKey) {
    timelineCache.markerKey = markerKey;
    ui.markers.innerHTML = keyframes.map((frame, index) => {
      const left = duration > 0 ? clamp(frame.at / duration, 0, 1) * 100 : 0;
      const classes = ["keyframe-marker"];
      if (index === selectedKeyframeIndex) classes.push("active");
      if (frameHasLayerChange(index)) classes.push("layer-key");
      return '<button class="' + classes.join(" ") + '" type="button" data-index="' + index +
        '" style="left:' + left.toFixed(4) + '%" title="' + escapeHtml(formatTimelineTime(frame.at) + " · " + (frame.caption || "无字幕") +
        (frameHasLayerChange(index) ? " · 图层变化" : "")) + '" aria-label="关键帧 ' + formatTimelineTime(frame.at) + '"></button>';
    }).join("");
  }
  updatePlayheadMarker();
  updateActiveFrameLabel();
  if (ui.timelineEmpty) ui.timelineEmpty.hidden = Boolean(ui.video.src) || keyframes.length > 1;
}

function updateActiveFrameLabel() {
  const label = ui.activeFrameLabel;
  if (!label) return;
  const frame = keyframes[selectedKeyframeIndex] || keyframes[0];
  if (!frame) {
    label.hidden = true;
    return;
  }
  const duration = timelineDuration();
  const ratio = duration > 0 ? clamp(frame.at / duration, 0, 1) : 0;
  label.hidden = false;
  label.style.setProperty("--pos", (ratio * 100).toFixed(4) + "%");
  label.textContent = formatTimelineTime(frame.at);
  label.title = "当前关键帧 " + formatTimelineTime(frame.at);
}

function updateTimelineMeta(seconds) {
  playhead = Number(seconds) || 0;
  ui.currentTime.textContent = formatTimelineTime(playhead);
  ui.duration.textContent = formatTimelineTime(videoDuration());
  const onFrame = findFrameIndexAt(playhead) >= 0;
  ui.keyframeCount.textContent = keyframes.length === 1 && !ui.video.src
    ? "初始场景 · 导入视频后可打关键帧"
    : keyframes.length + " 个关键帧" + (onFrame ? " · 当前帧" : "");
  ui.exportProgress.max = Math.max(0.01, videoDuration());
  ui.exportProgress.value = Math.min(playhead, Math.max(0.01, videoDuration()));
  renderTimeline();
  scrollPlayheadIntoView();
  syncFrameSummary();
  syncVideoClip();
}

function syncVideoClip() {
  if (!ui.videoClip) return;
  const duration = videoDuration();
  const hasVideo = Boolean(ui.video.src) && duration > 0;
  ui.videoClip.hidden = !hasVideo;
  if (!hasVideo) {
    ui.exportOpen.disabled = true;
    ui.exportOpen.title = "请先导入视频后再导出";
    ui.exportVideo.disabled = true;
    ui.addKeyframe.disabled = true;
    ui.addKeyframe.title = "请先导入视频";
    ui.addKeyframeDock.disabled = true;
    ui.addKeyframeDock.title = "请先导入视频";
    ui.dock.classList.add("no-video");
    if (ui.exportSummary) ui.exportSummary.textContent = "尚未导入视频 · 先导入 MP4 / MOV / WebM";
    return;
  }
  ui.addKeyframe.disabled = false;
  ui.addKeyframe.title = "在当前时间添加关键帧 (K)";
  ui.addKeyframeDock.disabled = false;
  ui.addKeyframeDock.title = "在当前时间添加关键帧 (K)";
  ui.dock.classList.remove("no-video");
  const total = timelineDuration();
  const width = total > 0 ? clamp(duration / total, 0, 1) * 100 : 100;
  ui.videoClip.style.width = width.toFixed(3) + "%";
  ui.videoClipName.textContent = videoMeta?.name || "视频";
  ui.videoClipName.title = videoMeta?.name || "";
  ui.videoClipDuration.textContent = formatTimelineTime(duration);
  ui.exportOpen.disabled = false;
  ui.exportOpen.title = "导出整段动画";
  ui.exportVideo.disabled = isExporting;
  if (ui.exportSummary) {
    const size = canvasSizeFor(state.layout);
    let format = "WebM";
    if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === "function") {
      const type = supportedRecordingType();
      format = type.startsWith("video/mp4") ? "MP4 · H.264 + AAC" : "WebM（浏览器不支持 MP4）";
    }
    ui.exportSummary.textContent = "输出 " + format + " · " + size.width + "×" + size.height + " · " + formatTimelineTime(duration);
  }
}

function setTimelineZoom(value) {
  timelineZoom = clamp(Number(value) || 1, TIMELINE_MIN_ZOOM, TIMELINE_MAX_ZOOM);
  renderTimeline();
  scrollPlayheadIntoView();
}

function scrollPlayheadIntoView() {
  const scroller = ui.timelineScroller;
  const innerRect = ui.inner.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  if (!innerRect.width || innerRect.width <= scrollerRect.width) return;
  const x = innerRect.left + clamp(playhead / Math.max(timelineDuration(), 0.001), 0, 1) * innerRect.width;
  const leftEdge = scrollerRect.left + 16;
  const rightEdge = scrollerRect.right - 16;
  if (x < leftEdge) scroller.scrollLeft -= leftEdge - x;
  else if (x > rightEdge) scroller.scrollLeft += x - rightEdge;
}

function timeFromClientX(clientX) {
  const rect = ui.inner.getBoundingClientRect();
  const duration = timelineDuration();
  if (!rect.width) return 0;
  return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration);
}

function snapTime(value, skip) {
  if (!ui.snap.checked) return value;
  const rect = ui.inner.getBoundingClientRect();
  const duration = timelineDuration();
  const pxPerSecond = rect.width / Math.max(duration, 0.001);
  const tolerance = 8 / Math.max(pxPerSecond, 0.001);
  const candidates = [0, duration, playhead, ...keyframes.map((frame) => frame.at)];
  let best = value;
  let bestDelta = Infinity;
  for (const candidate of candidates) {
    if (skip != null && Math.abs(candidate - skip) < 1e-6) continue;
    const delta = Math.abs(value - candidate);
    if (delta <= tolerance && delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

let timelineDrag = null;

function startScrub(event) {
  if (event.button !== 0) return;
  const at = timeFromClientX(event.clientX);
  if (!ui.video.paused) ui.video.pause();
  timelineDrag = { kind: "scrub", pointerId: event.pointerId };
  ui.track.setPointerCapture(event.pointerId);
  showTimelineBubble(at);
  seekTo(at);
}

function startKeyDrag(event, marker) {
  if (event.button !== 0) return;
  const index = Number(marker.dataset.index);
  const frame = keyframes[index];
  if (!frame) return;
  selectedKeyframeIndex = index;
  if (!ui.video.paused) ui.video.pause();
  beginGesture("移动关键帧");
  timelineDrag = { kind: "key", pointerId: event.pointerId, frame, originalAt: frame.at, moved: false };
  marker.classList.add("dragging");
  ui.track.setPointerCapture(event.pointerId);
  showTimelineBubble(frame.at, "◆ " + formatTimelineTime(frame.at));
  renderTimeline();
}

function updateTimelineDrag(event) {
  if (!timelineDrag || event.pointerId !== timelineDrag.pointerId) return;
  if (timelineDrag.kind === "scrub") {
    const at = timeFromClientX(event.clientX);
    showTimelineBubble(at);
    seekTo(at);
    return;
  }
  const at = roundTime(snapTime(timeFromClientX(event.clientX), timelineDrag.frame.at));
  if (Math.abs(at - timelineDrag.frame.at) < 0.0005) return;
  // 不允许两个关键帧落在同一时间点：贴到邻居旁边停住
  const neighbor = keyframes.find((frame) => frame !== timelineDrag.frame && Math.abs(frame.at - at) <= KEYFRAME_EPSILON);
  if (neighbor) timelineDrag.collidedAt = neighbor.at;
  const target = neighbor
    ? roundTime(neighbor.at + (at >= neighbor.at ? KEYFRAME_EPSILON + 0.005 : -KEYFRAME_EPSILON - 0.005))
    : at;
  timelineDrag.frame.at = clamp(target, 0, timelineDuration());
  timelineDrag.moved = true;
  showTimelineBubble(timelineDrag.frame.at, "◆ " + formatTimelineTime(timelineDrag.frame.at));
  sortKeyframes();
  selectedKeyframeIndex = keyframes.indexOf(timelineDrag.frame);
  touchDocument();
  renderTimeline();
}

function endTimelineDrag(event) {
  if (!timelineDrag) return;
  if (event && event.pointerId !== timelineDrag.pointerId) return;
  const drag = timelineDrag;
  timelineDrag = null;
  hideTimelineBubble();
  try {
    ui.track.releasePointerCapture(drag.pointerId);
  } catch {
    // capture may already be released
  }
  ui.markers.querySelectorAll(".keyframe-marker.dragging").forEach((element) => element.classList.remove("dragging"));
  if (drag.kind === "key") {
    endGesture();
    if (drag.moved) {
      seekTo(drag.frame.at);
      showToast(drag.collidedAt != null
        ? "该时间已有关键帧，已停在 " + formatTimelineTime(drag.frame.at)
        : "关键帧已移动到 " + formatTimelineTime(drag.frame.at));
    } else {
      seekTo(drag.frame.at);
    }
    render();
  } else {
    render();
  }
}

function bindTimeline() {
  ui.track.addEventListener("pointerdown", (event) => {
    const marker = event.target.closest(".keyframe-marker");
    if (marker) startKeyDrag(event, marker);
    else startScrub(event);
  });
  ui.track.addEventListener("pointermove", updateTimelineDrag);
  ui.track.addEventListener("pointerup", endTimelineDrag);
  ui.track.addEventListener("pointercancel", endTimelineDrag);
  ui.track.addEventListener("dblclick", (event) => {
    if (event.target.closest(".keyframe-marker")) return;
    const at = timeFromClientX(event.clientX);
    seekTo(at);
    addKeyframeAtPlayhead();
  });
  ui.track.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setTimelineZoom(timelineZoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2));
  }, { passive: false });

  ui.zoomIn.addEventListener("click", () => setTimelineZoom(timelineZoom * 1.5));
  ui.zoomOut.addEventListener("click", () => setTimelineZoom(timelineZoom / 1.5));
  ui.zoomFit.addEventListener("click", () => setTimelineZoom(1));
  ui.snap.addEventListener("change", () => {
    touchDocument();
    savePreferences();
    showToast(ui.snap.checked ? "已开启吸附" : "已关闭吸附");
  });
  ui.autoKey.addEventListener("change", () => {
    touchDocument();
    savePreferences();
    showToast(ui.autoKey.checked ? "已开启自动关键帧" : "自动关键帧已关闭：修改会写回最近关键帧");
  });
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

function drawSprite(image, sx, sy, sw, sh, dx, dy, scale = 1) {
  ctx.drawImage(image, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(sw * scale), Math.round(sh * scale));
}

function drawShadowText(font, text, x, y, color = GAME_TEXT, scale = 1, shadowSize = 3) {
  font.draw(ctx, text, x - shadowSize, y + shadowSize, {
    scale,
    color: SHADOW
  });
  font.draw(ctx, text, x, y + shadowSize, {
    scale,
    color: SHADOW
  });
  font.draw(ctx, text, x, y, {
    scale,
    color
  });
}

function drawCenteredShadowText(font, text, centerX, topY, color = GAME_TEXT, scale = 1, shadowSize = 3) {
  const measured = font.measure(text, scale);
  drawShadowText(font, text, centerX - measured.width / 2, topY, color, scale, shadowSize);
}

function formatGameClock(time) {
  const [hourValue, minuteValue] = time.split(":").map(Number);
  const hour = Number.isFinite(hourValue) ? hourValue : 8;
  const minute = Number.isFinite(minuteValue) ? minuteValue : 30;
  let period;
  if (hour < 6 || hour >= 24) period = "凌晨";
  else if (hour < 12) period = "上午";
  else if (hour < 13) period = "中午";
  else if (hour < 19) period = "下午";
  else period = "晚上";
  const twelveHour = hour % 12 || 12;
  return period + " " + twelveHour + ":" + String(minute).padStart(2, "0");
}

function clockRotation(time) {
  const [hour, minute] = time.split(":").map(Number);
  const gameTime = hour * 100 + Math.floor(minute / 10) * 16.66;
  return Math.PI + Math.min(Math.PI, (gameTime - 600) / 2000 * Math.PI);
}

function drawClockHand(x, y, angle) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(Cursors, 324, 477, 7, 19, -12, -68, 28, 76);
  ctx.restore();
}

function drawNumber(ctx, number, rightX, centerY, color = "#d61f1f") {
  const text = String(Math.max(0, Math.floor(number)));
  let x = rightX;
  for (let i = text.length - 1; i >= 0; i--) {
    const digit = Number(text[i]);
    const sourceX = 512 + (digit * 8) % 48;
    const sourceY = 128 + Math.floor(digit * 8 / 48) * 8;
    const digitCanvas = document.createElement("canvas");
    digitCanvas.width = 8;
    digitCanvas.height = 8;
    const digitContext = digitCanvas.getContext("2d");
    digitContext.drawImage(Cursors, sourceX, sourceY, 8, 8, 0, 0, 8, 8);
    digitContext.globalCompositeOperation = "source-in";
    digitContext.fillStyle = color;
    digitContext.fillRect(0, 0, 8, 8);
    ctx.drawImage(digitCanvas, x - 16, centerY - 16, 32, 32);
    x -= 28;
  }
}

function drawClock() {
  if (!state.clockVisible || !componentLayout.clock) return;
  const layout = componentLayout.clock;
  const base = componentSize("clock");
  ctx.save();
  ctx.translate(Math.round(layout.x), Math.round(layout.y));
  ctx.scale(layout.scale, layout.scale);
  if (customComponentImages.clock) {
    ctx.drawImage(customComponentImages.clock, 0, 0, base.width, base.height);
    ctx.restore();
    return;
  }
  drawSprite(Cursors, 333, 431, 71, 43, 0, 0, 4);

  const weekday = WEEKDAYS[(Math.max(1, Math.min(28, state.day)) - 1) % 7];
  const dateText = weekday + " " + state.day + "日";
  const dateMeasure = DialogueFont.measure(dateText);
  drawShadowText(
    DialogueFont,
    dateText,
    333 * 0.55 - dateMeasure.width / 2,
    431 * 0.1 - dateMeasure.height / 2,
    GAME_TEXT,
    1,
    3
  );

  const weatherSprite = WEATHERS[state.weather]?.sprite ?? 2;
  drawSprite(Cursors, 317 + weatherSprite * 12, 421, 12, 8, 116, 68, 4);
  const seasonIndex = ["spring", "summer", "fall", "winter"].indexOf(state.season);
  drawSprite(Cursors, 406, 441 + Math.max(0, seasonIndex) * 8, 12, 8, 212, 68, 4);

  const timeText = formatGameClock(state.time);
  const timeMeasure = DialogueFont.measure(timeText);
  drawShadowText(
    DialogueFont,
    timeText,
    333 * 0.55 - timeMeasure.width / 2,
    431 * 0.31 - timeMeasure.height / 2,
    GAME_TEXT,
    1,
    3
  );

  // 金币牌：DayTimeMoneyBox 里固定 8 位数字槽，从 position+(68,196) 起每格 24px 前进，
  // 数字来自 Cursors(286, 502-digit*8, 5, 8)，Color.Maroon 染色，4 倍绘制。
  drawSprite(Cursors, 340, 472, 65, 17, 28, 172, 4);
  drawMoneyDigits(state.money);
  drawClockHand(88, 88, clockRotation(state.time));
  ctx.restore();
}

const moneyDigitCache = {};

function moneyDigitCanvas(digit) {
  if (moneyDigitCache[digit]) return moneyDigitCache[digit];
  const canvas = document.createElement("canvas");
  canvas.width = 5;
  canvas.height = 8;
  const digitContext = canvas.getContext("2d");
  digitContext.imageSmoothingEnabled = false;
  digitContext.drawImage(Cursors, 286, 502 - digit * 8, 5, 8, 0, 0, 5, 8);
  digitContext.globalCompositeOperation = "source-in";
  digitContext.fillStyle = "#800000";
  digitContext.fillRect(0, 0, 5, 8);
  moneyDigitCache[digit] = canvas;
  return canvas;
}

function drawMoneyDigits(money) {
  const text = String(Math.max(0, Math.floor(Number(money) || 0))).slice(-8);
  const firstSlot = 8 - text.length;
  for (let index = 0; index < text.length; index++) {
    const digit = Number(text[index]);
    const slot = firstSlot + index;
    ctx.drawImage(moneyDigitCanvas(digit), 68 + slot * 24, 196, 20, 32);
  }
}

function staminaColor(ratio) {
  const r = ratio <= 0.5 ? 255 : Math.round((1 - ratio) * 2 * 255);
  const g = Math.round(Math.min(255, ratio * 2 * 255));
  return "rgb(" + r + "," + g + ",0)";
}

function drawStamina() {
  if (!state.staminaVisible || !componentLayout.stamina) return;
  const layout = componentLayout.stamina;
  const base = componentSize("stamina");
  ctx.save();
  ctx.translate(Math.round(layout.x), Math.round(layout.y));
  ctx.scale(layout.scale, layout.scale);
  if (customComponentImages.stamina) {
    ctx.drawImage(customComponentImages.stamina, 0, 0, base.width, base.height);
    ctx.restore();
    return;
  }
  drawSprite(Cursors, 256, 408, 12, 16, 0, 0, 4);
  ctx.drawImage(Cursors, 256, 424, 12, 16, 0, 64, 48, 104);
  drawSprite(Cursors, 256, 448, 12, 16, 0, 160, 4);

  const ratio = state.stamina / 100;
  const fillHeight = Math.round(MAX_STAMINA * 0.625 * ratio);
  const fillY = Math.round(48 + MAX_STAMINA * (1 - ratio) * 0.625);
  ctx.fillStyle = staminaColor(ratio);
  ctx.fillRect(12, fillY, 24, fillHeight);
  ctx.fillStyle = staminaColor(Math.max(0, ratio - 0.12));
  ctx.fillRect(12, fillY, 24, Math.min(4, fillHeight));

  if (state.stamina <= 0) drawSprite(Cursors, 191, 406, 12, 11, 0, -44, 4);

  const valueText = Math.round(MAX_STAMINA * ratio) + "/" + MAX_STAMINA;
  const valueWidth = SmallFont.measure(valueText).width;
  drawShadowText(SmallFont, valueText, -16 - valueWidth, 60, GAME_TEXT, 1, 2);
  ctx.restore();
}

function drawTextureBox(source, sourceX, sourceY, sourceSize, x, y, width, height, scale = 1) {
  const n = Math.floor(sourceSize / 3);
  const border = Math.round(n * scale);
  ctx.drawImage(source, sourceX + n, sourceY + n, n, n, x + border, y + border, width - border * 2, height - border * 2);
  ctx.drawImage(source, sourceX, sourceY, n, n, x, y, border, border);
  ctx.drawImage(source, sourceX + n * 2, sourceY, n, n, x + width - border, y, border, border);
  ctx.drawImage(source, sourceX, sourceY + n * 2, n, n, x, y + height - border, border, border);
  ctx.drawImage(source, sourceX + n * 2, sourceY + n * 2, n, n, x + width - border, y + height - border, border, border);
  ctx.drawImage(source, sourceX + n, sourceY, n, n, x + border, y, width - border * 2, border);
  ctx.drawImage(source, sourceX + n, sourceY + n * 2, n, n, x + border, y + height - border, width - border * 2, border);
  ctx.drawImage(source, sourceX, sourceY + n, n, n, x, y + border, border, height - border * 2);
  ctx.drawImage(source, sourceX + n * 2, sourceY + n, n, n, x + width - border, y + border, border, height - border * 2);
}

function drawItem(key, slotX, slotY, selected) {
  if (!key || !ITEMS[key]) return;
  const item = ITEMS[key];
  const customImage = customItemImages[key];
  if (customImage) {
    const square = selected ? 56 : 51;
    ctx.drawImage(customImage, slotX + 32 - square / 2, slotY + 32 - square / 2, square, square);
    return;
  }
  if (item.heart) {
    drawSprite(MenuTiles, 64, 768, 32, 32, slotX + 32 - 20, slotY + 32 - 20, 1.25);
    return;
  }

  const image = itemImages[item.source];
  if (!image) return;
  if (item.big) {
    const targetHeight = selected ? 55.8 : 51.2;
    const targetWidth = targetHeight * image.width / image.height;
    ctx.drawImage(image, slotX + 32 - targetWidth / 2, slotY + 32 - targetHeight / 2, targetWidth, targetHeight);
    return;
  }

  const square = selected ? 56 : 51;
  const ratio = image.width / image.height;
  const drawWidth = ratio >= 1 ? square : square * ratio;
  const drawHeight = ratio >= 1 ? square / ratio : square;
  const fitHeight = Math.min(square, drawHeight);
  const fitWidth = Math.min(square, drawWidth);
  ctx.drawImage(image, slotX + 32 - fitWidth / 2, slotY + 32 - fitHeight / 2, fitWidth, fitHeight);
}

function drawToolbar() {
  if (!state.toolbarVisible || !componentLayout.toolbar) return;
  const layout = componentLayout.toolbar;
  const base = componentSize("toolbar");
  ctx.save();
  ctx.translate(Math.round(layout.x), Math.round(layout.y));
  ctx.scale(layout.scale, layout.scale);
  if (customComponentImages.toolbar) {
    ctx.drawImage(customComponentImages.toolbar, 0, 0, base.width, base.height);
    ctx.restore();
    return;
  }
  drawTextureBox(MenuTiles, 0, 256, 60, 0, 0, 800, 96, 1);

  const slots = currentTools();
  const selectedIndex = slots.indexOf(state.item);
  for (let i = 0; i < 12; i++) {
    const slotX = 16 + i * 64;
    const slotY = 16;
    const sourceIndex = i === selectedIndex ? 56 : 10;
    const sourceX = (sourceIndex * 64) % MenuTiles.width;
    const sourceY = Math.floor(sourceIndex * 64 / MenuTiles.width) * 64;
    ctx.drawImage(MenuTiles, sourceX, sourceY, 64, 64, slotX, slotY, 64, 64);
    drawItem(slots[i], slotX, slotY, i === selectedIndex);
    const label = i === 9 ? "0" : i === 10 ? "-" : i === 11 ? "=" : String(i + 1);
    TinyFont.draw(ctx, label, slotX + 4, slotY - 8, { color: "#696969", scale: 1 });
  }
  ctx.restore();
}

function splitGameText(font, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const character of String(text)) {
    const next = line + character;
    if (line && font.measure(next).width > maxWidth) {
      lines.push(line);
      line = character;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function drawDialogueBox(x, y, width, height) {
  ctx.drawImage(MenuTiles, 64, 128, 64, 64, x + 28, y + 28, width - 64, height - 64);
  ctx.drawImage(MenuTiles, 0, 0, 64, 64, x, y, 64, 64);
  ctx.drawImage(MenuTiles, 192, 0, 64, 64, x + width - 64, y, 64, 64);
  ctx.drawImage(MenuTiles, 192, 192, 64, 64, x + width - 64, y + height - 64, 64, 64);
  ctx.drawImage(MenuTiles, 0, 192, 64, 64, x, y + height - 64, 64, 64);
  ctx.drawImage(MenuTiles, 128, 0, 64, 64, x + 64, y, width - 128, 64);
  ctx.drawImage(MenuTiles, 128, 192, 64, 64, x + 64, y + height - 64, width - 128, 64);
  ctx.drawImage(MenuTiles, 0, 128, 64, 64, x, y + 64, 64, height - 128);
  ctx.drawImage(MenuTiles, 192, 128, 64, 64, x + width - 64, y + 64, 64, height - 128);
}

function drawCaption() {
  if (!state.captionVisible || !componentLayout.caption) return;
  const layout = componentLayout.caption;
  const size = captionSize();
  ctx.save();
  ctx.translate(Math.round(layout.x), Math.round(layout.y));
  ctx.scale(layout.scale, layout.scale);
  if (customComponentImages.caption) {
    ctx.drawImage(customComponentImages.caption, 0, 0, size.width, size.height);
    ctx.restore();
    return;
  }
  drawDialogueBox(0, 0, size.width, size.height);
  drawSprite(Cursors, 383, 493, 11, 14, 38, 65, 2);
  drawShadowText(SmallFont, state.tag || "今日状态", 74, 64, GAME_TEXT, 1, 2);
  const captionLines = splitGameText(DialogueFont, state.caption, size.width - 144);
  captionLines.forEach((line, index) => {
    drawShadowText(DialogueFont, line, 72, 98 + index * 34, GAME_TEXT, 1, 3);
  });
  const itemLabel = "手持：" + (ITEMS[state.item]?.label ?? "空");
  drawShadowText(SmallFont, itemLabel, 72, 168, "#6b4a35", 1, 2);
  ctx.restore();
}

function drawPlaceholder() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4e6c8";
  ctx.font = "32px 'Microsoft YaHei', sans-serif";
  ctx.fillText("正在加载原版游戏素材...", 80, 110);
}

function resizeCanvas() {
  if (state.layout === "portrait") {
    canvas.width = 1080;
    canvas.height = 1920;
  } else {
    canvas.width = 1920;
    canvas.height = 1080;
  }
  ctx.imageSmoothingEnabled = false;
}

function render(shouldSync = true) {
  document.body.classList.toggle("clean", state.clean);
  document.body.classList.toggle("clean-preview", !state.clean && state.cleanPreview);
  document.body.classList.toggle("portrait", state.layout === "portrait");
  stage.classList.toggle("has-video", Boolean(ui.video.src));
  resizeCanvas();
  if (!Cursors || !MenuTiles || !DialogueFont || !SmallFont || !TinyFont) {
    drawPlaceholder();
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawClock();
  drawStamina();
  drawToolbar();
  drawCaption();
  drawStickers();
  if (shouldSync) {
    syncControls();
    syncLayerControls();
  }
  renderTimeline();
  updateSelectionBoxes();
  if (shouldSync) updateTimelineMeta(currentPlayheadTime());
}

function syncControls() {
  syncLayoutButtons();
  if (document.activeElement !== ui.time) ui.time.value = state.time;
  ui.weather.value = state.weather;
  ui.season.value = state.season;
  if (document.activeElement !== ui.day) ui.day.value = state.day;
  if (document.activeElement !== ui.money) ui.money.value = state.money;
  if (document.activeElement !== ui.stamina) ui.stamina.value = state.stamina;
  ui.staminaOutput.value = state.stamina;
  ui.group.value = state.group;
  if (document.activeElement !== ui.tag) ui.tag.value = state.tag;
  if (document.activeElement !== ui.caption) ui.caption.value = state.caption;
  ui.captionVisible.checked = state.captionVisible;
  ui.captionVisibleOverlay.checked = state.captionVisible;
  ui.clockVisible.checked = state.clockVisible;
  ui.staminaVisible.checked = state.staminaVisible;
  ui.toolbarVisible.checked = state.toolbarVisible;
  ui.selectedItemName.textContent = ITEMS[state.item]?.label ?? "空";
  ui.itemPicker.querySelectorAll(".item-choice").forEach((button) => {
    button.classList.toggle("active", button.dataset.item === state.item);
  });
  if (ui.stickerCategory && ui.stickerCategory.value !== stickerCategory) ui.stickerCategory.value = stickerCategory;
  syncPresetList();
  syncFrameSummary();
  syncStickerControls();
}

function syncLayerControls() {
  if (!ui.clockVisible) return;
  ui.clockVisible.checked = state.clockVisible;
  ui.staminaVisible.checked = state.staminaVisible;
  ui.toolbarVisible.checked = state.toolbarVisible;
  ui.captionVisible.checked = state.captionVisible;
  ui.captionVisibleOverlay.checked = state.captionVisible;
  ui.selectedLayerName.textContent = componentLabel(selectedComponent);
  const currentLayer = componentLayout[selectedComponent] || { x: 0, y: 0, scale: 1 };
  if (document.activeElement !== ui.layerX) ui.layerX.value = Math.round(currentLayer.x);
  if (document.activeElement !== ui.layerY) ui.layerY.value = Math.round(currentLayer.y);
  const scalePercent = Math.round((currentLayer.scale ?? 1) * 100);
  ui.layerScale.value = String(scalePercent);
  ui.layerScaleOutput.textContent = scalePercent + "%";
  ui.clearImage.disabled = !(selectedComponent === "item" ? customItemData[state.item] : componentImageIds[selectedComponent]);
}

function syncLayoutButtons() {
  ui.layoutButtons.forEach((button) => {
    const active = button.dataset.layout === state.layout;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const size = canvasSizeFor(state.layout);
  ui.stageNote.textContent = size.width + " × " + size.height;
}

function syncFrameSummary() {
  if (!ui.frameSummaryState) return;
  const weekday = WEEKDAYS[(clampInt(state.day, 1, 28, 1) - 1) % 7];
  const weather = WEATHERS[state.weather]?.label || "";
  const summary = weekday + " " + state.day + "日 · " + seasonLabel(state.season) + " · " + weather + " · " + formatGameClock(state.time);
  ui.frameSummaryState.textContent = summary;
  ui.frameSummaryState.title = summary;
  const onFrame = findFrameIndexAt(playhead) >= 0;
  ui.frameSummaryFrame.textContent = (onFrame ? "关键帧 " : "播放头 ") + formatTimelineTime(playhead);
}

let selectionSignature = "";

function selectionSignatureFor(stageRect) {
  return [
    Math.round(stageRect.width), Math.round(stageRect.height), selectedComponent,
    canvas.width, canvas.height,
    ...LAYER_NAMES.map((name) => {
      const layout = componentLayout[name] || {};
      return name + ":" + Math.round(layout.x || 0) + "," + Math.round(layout.y || 0) + "," +
        Number(layout.scale || 1).toFixed(3) + "," + (componentVisible(name) ? 1 : 0);
    }),
    "s:" + stickers.map((sticker) => sticker.id + "," + Math.round(sticker.x) + "," + Math.round(sticker.y) + "," +
      sticker.scale.toFixed(3) + "," + (sticker.visible === false ? 0 : 1) + "," + (sticker.id === selectedStickerId ? 1 : 0)).join(";")
  ].join("|");
}

function updateSelectionBoxes(force = false) {
  if (!ui.selectionLayer) return;
  const stageRect = stage.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return;
  const signature = selectionSignatureFor(stageRect);
  if (!force && signature === selectionSignature) return;
  selectionSignature = signature;
  const scaleX = stageRect.width / canvas.width;
  const scaleY = stageRect.height / canvas.height;
  const components = LAYER_NAMES.filter(componentVisible).map((name) => {
    const layout = componentLayout[name];
    if (!layout) return "";
    const base = componentBounds(name);
    const left = (layout.x + base.xOffset * layout.scale) * scaleX;
    const top = layout.y * scaleY;
    const width = base.width * layout.scale * scaleX;
    const height = base.height * layout.scale * scaleY;
    return '<div class="component-selection ' + (selectedComponent === name && !selectedStickerId ? "active" : "") +
      '" data-component="' + name + '" style="left:' + left + 'px;top:' + top + 'px;width:' + width +
      'px;height:' + height + 'px"><span>' + componentLabel(name) +
      '</span><i class="component-resize" data-resize="' + name + '"></i></div>';
  });
  const stickerBoxes = stickers.filter((sticker) => sticker.visible !== false).map((sticker) => {
    const active = sticker.id === selectedStickerId;
    const left = sticker.x * scaleX;
    const top = sticker.y * scaleY;
    const width = sticker.sw * sticker.scale * scaleX;
    const height = sticker.sh * sticker.scale * scaleY;
    return '<div class="component-selection sticker-selection ' + (active ? "active" : "") +
      '" data-sticker-id="' + sticker.id + '" style="left:' + left + 'px;top:' + top + 'px;width:' + width +
      'px;height:' + height + 'px"><span>' + escapeHtml(sticker.label || "贴纸") +
      '</span><i class="component-resize" data-sticker-resize="' + sticker.id + '"></i></div>';
  });
  ui.selectionLayer.innerHTML = components.join("") + stickerBoxes.join("");
}

function setInspectorTab(tab) {
  ui.inspectorPanel.dataset.activeTab = tab;
  document.querySelectorAll(".inspector-panel[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });
  ui.inspectorTabs.forEach((button) => {
    const active = button.dataset.inspectorTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  const scroller = document.querySelector(".inspector-scroll");
  if (scroller) scroller.scrollTop = 0;
  savePreferences();
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

function populateControls() {
  for (const [key, weather] of Object.entries(WEATHERS)) {
    ui.weather.insertAdjacentHTML("beforeend", '<option value="' + key + '">' + weather.label + "</option>");
  }
  for (const [key, label] of Object.entries(GROUPS_LABELS)) {
    if (key !== "custom") ui.group.insertAdjacentHTML("beforeend", '<option value="' + key + '">' + label + "</option>");
  }
  ui.itemPicker.innerHTML = Object.entries(ITEMS).map(([key, item]) => {
    const image = item.heart
      ? "./assets/ui/heart.png"
      : "./assets/items/" + item.source + ".png";
    return '<button class="item-choice" type="button" data-item="' + key + '" title="' + item.label + '" aria-label="' + item.label + '"><img src="' + image + '" alt=""></button>';
  }).join("");
  ui.itemPicker.addEventListener("click", (event) => {
    const button = event.target.closest(".item-choice");
    if (!button) return;
    state.item = button.dataset.item;
    commitLiveState("选择物品");
  });
  ui.presetList.innerHTML = PRESETS.map((preset, index) =>
    '<button class="preset-chip" type="button" role="listitem" data-preset="' + index + '">' +
    escapeHtml(preset.name) + "<span>" + preset.time + " · " + seasonLabel(preset.season) + "</span></button>"
  ).join("");
}

function seasonLabel(season) {
  return { spring: "春", summer: "夏", fall: "秋", winter: "冬" }[season] || "";
}

function syncPresetList() {
  ui.presetList.querySelectorAll(".preset-chip").forEach((button) => {
    const preset = PRESETS[Number(button.dataset.preset)];
    button.classList.toggle("active", Boolean(preset) && preset.caption === state.caption && preset.tag === state.tag);
  });
}

function updateFromInputs(label = "画面参数") {
  if (label === "修改时间" && !/^\d{1,2}:\d{2}$/.test(ui.time.value)) return;
  state.time = ui.time.value || "08:30";
  state.weather = ui.weather.value;
  state.season = ui.season.value;
  state.day = clampInt(ui.day.value, 1, 28, state.day);
  state.money = Math.max(0, Number(ui.money.value) || 0);
  state.stamina = Number(ui.stamina.value);
  state.group = ui.group.value;
  state.tag = ui.tag.value.trim() || "今日状态";
  state.caption = ui.caption.value.trim() || "今天也有在好好生活";
  state.clockVisible = ui.clockVisible.checked;
  state.staminaVisible = ui.staminaVisible.checked;
  state.toolbarVisible = ui.toolbarVisible.checked;
  state.captionVisible = ui.captionVisible.checked;
  commitLiveState(label);
}

function applyPreset(preset) {
  Object.assign(state, preset, { clean: false, cleanPreview: false });
  commitLiveState("应用预设");
}

function queryUrl() {
  const url = new URL(location.href);
  const out = new URLSearchParams();
  out.set("clean", "1");
  out.set("layout", state.layout);
  out.set("time", state.time);
  out.set("weather", state.weather);
  out.set("season", state.season);
  out.set("day", state.day);
  out.set("stamina", state.stamina);
  out.set("money", state.money);
  out.set("group", state.group);
  out.set("item", state.item);
  out.set("tag", state.tag);
  out.set("caption", state.caption);
  if (!state.clockVisible) out.set("clockVisible", "0");
  if (!state.staminaVisible) out.set("staminaVisible", "0");
  if (!state.toolbarVisible) out.set("toolbarVisible", "0");
  if (!state.captionVisible) out.set("captionVisible", "0");
  url.search = out.toString();
  return url.href;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => ui.toast.classList.remove("show"), 1800);
}

function setClean(clean) {
  state.clean = Boolean(clean);
  if (state.clean) {
    state.cleanPreview = false;
    closeExportDialog();
  }
  render();
}

function setCleanPreview(on) {
  state.cleanPreview = Boolean(on);
  if (state.cleanPreview) {
    state.clean = false;
    closeExportDialog();
  }
  render();
}

function isCleanMode() {
  return state.clean || state.cleanPreview;
}

function exitCleanMode() {
  if (!isCleanMode()) return;
  state.clean = false;
  state.cleanPreview = false;
  render();
}

function enterCleanPreview() {
  if (state.clean || state.cleanPreview) {
    exitCleanMode();
    return;
  }
  setCleanPreview(true);
  showToast("按 E 或 Esc 返回编辑器");
}

function setLibraryOpen(open) {
  document.body.classList.toggle("library-open", Boolean(open));
  if (ui.libraryToggle) ui.libraryToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function setLibraryTab(tab) {
  ui.libraryTabs.forEach((button) => {
    const active = button.dataset.libraryTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  ui.libraryPanels.forEach((panel) => {
    panel.hidden = panel.dataset.libraryPanel !== tab;
  });
  if (tab === "stickers") renderStickerBrowser();
  savePreferences();
}

function openExportDialog() {
  updateProjectMeta();
  syncVideoClip();
  if (ui.exportDialog && !ui.exportDialog.open) {
    if (typeof ui.exportDialog.showModal === "function") ui.exportDialog.showModal();
    else ui.exportDialog.setAttribute("open", "");
  }
}

function closeExportDialog() {
  if (ui.exportDialog?.open) ui.exportDialog.close();
}

function currentTools() {
  const tools = GROUPS[state.group] || GROUPS.commute;
  const list = [...tools];
  if (!list.includes(state.item)) {
    const empty = list.indexOf("");
    list[empty >= 0 ? empty : 0] = state.item;
  }
  return list.slice(0, 12);
}

/* ------------------------------------------------------------------ */
/* Video                                                               */
/* ------------------------------------------------------------------ */

function probeFrameRate() {
  if (typeof ui.video.requestVideoFrameCallback !== "function" || fpsProbe) return;
  const samples = [];
  fpsProbe = { samples };
  const step = (now, metadata) => {
    samples.push(metadata.mediaTime);
    if (samples.length >= 24) {
      const span = samples.at(-1) - samples[0];
      if (span > 0.05) {
        const fps = (samples.length - 1) / span;
        if (fps > 1 && fps < 240) {
          videoMeta = { ...(videoMeta || {}), fps: Math.round(fps * 100) / 100 };
          updateProjectMeta();
          scheduleAutosave();
        }
      }
      fpsProbe = null;
      return;
    }
    if (ui.video.paused || !ui.video.src) {
      fpsProbe = null;
      return;
    }
    ui.video.requestVideoFrameCallback(step);
  };
  ui.video.requestVideoFrameCallback(step);
}

async function loadVideoFile(file) {
  if (!file) return;
  if (ui.video.dataset.url) URL.revokeObjectURL(ui.video.dataset.url);
  const url = URL.createObjectURL(file);
  ui.video.dataset.url = url;
  ui.video.src = url;
  ui.video.hidden = false;
  stage.classList.add("has-video");
  ui.videoName.textContent = file.name;
  fpsProbe = null;
  await new Promise((resolve, reject) => {
    const ready = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("浏览器无法读取这个视频格式"));
    };
    const cleanup = () => {
      ui.video.removeEventListener("loadedmetadata", ready);
      ui.video.removeEventListener("error", fail);
    };
    ui.video.addEventListener("loadedmetadata", ready, { once: true });
    ui.video.addEventListener("error", fail, { once: true });
    ui.video.load();
  });
  videoMeta = {
    name: file.name,
    size: file.size,
    duration: videoDuration(),
    width: ui.video.videoWidth,
    height: ui.video.videoHeight,
    fps: videoMeta?.fps ?? null,
    importedAt: new Date().toISOString()
  };
  ui.video.currentTime = 0;
  if (!timelineInitialized) resetTimeline();
  timelineInitialized = true;
  selectedKeyframeIndex = 0;
  playhead = 0;
  applyTimelineTime(0);
  updateTimelineMeta(0);
  updateVideoReminder();
  updateProjectMeta();
  scheduleAutosave();
  render();
  startVideoLoop();
  showToast("视频已导入，可以开始添加关键帧");
}

function videoMetaMatches(meta) {
  if (!meta || !videoMeta) return false;
  const durationClose = !Number.isFinite(meta.duration) || Math.abs((meta.duration || 0) - (videoMeta.duration || 0)) < 0.08;
  return meta.name === videoMeta.name && durationClose;
}

function updateVideoReminder() {
  if (!ui.videoReminder) return;
  const expected = expectedVideo;
  if (!expected) {
    ui.videoReminder.hidden = true;
    return;
  }
  if (!ui.video.src) {
    ui.videoReminder.hidden = false;
    ui.videoReminderText.textContent = "工程对应的视频：" + expected.name + " · " +
      formatTimelineTime(expected.duration) + " · " + expected.width + "×" + expected.height +
      "。请重新导入匹配的视频后再导出。";
    return;
  }
  if (videoMetaMatches(expected)) {
    ui.videoReminder.hidden = true;
    return;
  }
  ui.videoReminder.hidden = false;
  ui.videoReminderText.textContent = "当前视频与工程记录不一致（工程记录 " + expected.name + " · " +
    formatTimelineTime(expected.duration) + "），关键帧时间可能有偏移。";
}

function startVideoLoop() {
  cancelAnimationFrame(videoFrameRequest);
  const tick = () => {
    if (ui.video.src) {
      if (!isExporting && !ui.video.paused) {
        const current = ui.video.currentTime || 0;
        applyTimelineTime(current);
        updateTimelineMeta(current);
        render(false);
      }
      ui.play.textContent = ui.video.paused ? "▶" : "Ⅱ";
    }
    videoFrameRequest = requestAnimationFrame(tick);
  };
  videoFrameRequest = requestAnimationFrame(tick);
}

async function playVideo() {
  if (!ui.video.src) {
    showToast("请先导入视频");
    return;
  }
  if (ui.video.paused) {
    if (ui.video.ended || ui.video.currentTime >= videoDuration() - 0.02) ui.video.currentTime = 0;
    try {
      await ui.video.play();
      probeFrameRate();
    } catch (error) {
      // 快速连按空格时浏览器会以 AbortError 拒绝上一次 play()，忽略即可
      if (error?.name !== "AbortError") showToast("无法播放这个视频：" + error.message);
    }
  } else {
    ui.video.pause();
  }
  ui.play.textContent = ui.video.paused ? "▶" : "Ⅱ";
}

/* ------------------------------------------------------------------ */
/* Project persistence                                                 */
/* ------------------------------------------------------------------ */

function sanitizeImageMap(map) {
  const result = {};
  for (const [key, value] of Object.entries(map || {})) {
    if (typeof value === "string" && value.startsWith("data:image/")) result[key] = value;
  }
  return result;
}

function normalizeVideoMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  const duration = Number(meta.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return {
    name: typeof meta.name === "string" ? meta.name : "未命名视频",
    size: Number(meta.size) || 0,
    duration,
    width: Number(meta.width) || 0,
    height: Number(meta.height) || 0,
    fps: Number(meta.fps) > 0 ? Number(meta.fps) : null,
    importedAt: typeof meta.importedAt === "string" ? meta.importedAt : null
  };
}

function serializeProject() {
  pruneImageLibrary();
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    layout: state.layout,
    smooth: ui.smooth.checked,
    autoKey: ui.autoKey.checked,
    snap: ui.snap.checked,
    video: videoMeta ? { ...videoMeta } : (expectedVideo ? { ...expectedVideo } : null),
    images: { ...imageLibrary },
    itemImages: { ...customItemData },
    stickers: stickers.map((sticker) => ({ ...sticker })),
    keyframes: keyframes.map((frame) => structuredClone(frame))
  };
}

function migrateProject(raw) {
  if (!raw || typeof raw !== "object") throw new Error("工程文件不是有效的 JSON 对象");
  if (raw.format !== PROJECT_FORMAT) throw new Error("不是有效的星露谷 Vlog 工程文件");
  const version = Number(raw.version) || 1;
  if (version > PROJECT_VERSION) {
    throw new Error("工程版本 v" + version + " 高于当前编辑器支持的 v" + PROJECT_VERSION + "，请更新编辑器");
  }
  if (!Array.isArray(raw.keyframes) || !raw.keyframes.length) throw new Error("工程里没有关键帧");

  let project = raw;
  if (version <= 1) {
    const layout = raw.layout === "portrait" ? "portrait" : "landscape";
    const baseLayers = normalizeLayers(raw.componentLayout, defaultComponentLayout(layout));
    const images = {};
    const imageMap = {};
    for (const [name, dataUrl] of Object.entries(sanitizeImageMap(raw.customComponentImages))) {
      if (!LAYER_NAMES.includes(name)) continue;
      const id = "legacy-" + name;
      images[id] = dataUrl;
      imageMap[name] = id;
    }
    project = {
      ...raw,
      version: 2,
      layout,
      autoKey: true,
      snap: true,
      video: null,
      images,
      itemImages: raw.customItemImages || {},
      keyframes: raw.keyframes.map((frame) => ({
        ...frame,
        layers: structuredClone(baseLayers),
        images: { ...imageMap, ...(frame.images || {}) }
      }))
    };
  }
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    layout: project.layout === "portrait" ? "portrait" : "landscape",
    smooth: project.smooth !== false,
    autoKey: project.autoKey !== false,
    snap: project.snap !== false,
    video: normalizeVideoMeta(project.video),
    images: sanitizeImageMap(project.images),
    itemImages: sanitizeImageMap(project.itemImages),
    stickers: Array.isArray(project.stickers) ? project.stickers : [],
    keyframes: project.keyframes
  };
}

async function applyProjectObject(rawProject, options = {}) {
  const project = migrateProject(rawProject);
  if (!ui.video.paused) ui.video.pause();
  timelineInitialized = true;
  state.layout = project.layout;
  ui.smooth.checked = project.smooth;
  ui.autoKey.checked = project.autoKey;
  ui.snap.checked = project.snap;

  for (const id of Object.keys(imageLibrary)) delete imageLibrary[id];
  for (const id of Object.keys(imageObjects)) delete imageObjects[id];
  Object.assign(imageLibrary, project.images);
  for (const id of Object.keys(imageLibrary)) await ensureImageLoaded(id);

  for (const key of Object.keys(customItemData)) delete customItemData[key];
  for (const key of Object.keys(customItemImages)) delete customItemImages[key];
  Object.assign(customItemData, project.itemImages);
  for (const [key, dataUrl] of Object.entries(customItemData)) {
    try {
      customItemImages[key] = await loadCustomImage(dataUrl);
    } catch (error) {
      console.warn("物品图片解码失败", key, error);
    }
  }

  const frames = [];
  let previous = null;
  for (const rawFrame of [...project.keyframes].sort((a, b) => Number(a.at) - Number(b.at))) {
    const frame = normalizeFrame(rawFrame, previous);
    frames.push(frame);
    previous = frame;
  }
  if (!frames.length) throw new Error("工程里没有可用关键帧");
  keyframes = frames;
  stickers = (project.stickers || []).map(normalizeSticker).filter(Boolean);
  selectedStickerId = null;
  selectedKeyframeIndex = 0;
  expectedVideo = project.video;
  componentLayout = structuredClone(keyframes[0].layers);
  componentImageIds = { ...componentImageIds, ...keyframes[0].images };
  syncComponentImageCache();
  playhead = keyframes[0].at;
  applyTimelineTime(playhead);
  if (ui.video.src) {
    try {
      ui.video.currentTime = clamp(playhead, 0, videoDuration());
    } catch {
      // ignore
    }
  }
  updateVideoReminder();
  history.undo.length = 0;
  history.redo.length = 0;
  history.lastLabel = "";
  docRevision++;
  scheduleAutosave();
  render();
  syncControls();
  updateTimelineMeta(playhead);
  updateProjectMeta();
  updateHistoryButtons();
  if (!options.silent) {
    showToast("工程已加载，共 " + keyframes.length + " 个关键帧" + (project.video ? "；请导入对应视频" : ""));
  }
  return project;
}

function saveProjectFile() {
  const project = serializeProject();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "stardew-vlog-project-" + Date.now() + ".json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 10000);
  const kilobytes = Math.round(blob.size / 1024);
  showToast("工程文件已保存（" + kilobytes + " KB）");
  exportLog("工程已保存：" + kilobytes + " KB · " + keyframes.length + " 个关键帧");
}

async function loadProjectFile(file) {
  const project = JSON.parse(await file.text());
  return applyProjectObject(project);
}

function updateProjectMeta() {
  if (!ui.projectMeta) return;
  const reference = videoMeta || expectedVideo;
  const video = reference
    ? reference.name + " · " + formatTimelineTime(reference.duration) + " · " + reference.width + "×" + reference.height +
      (reference.fps ? " · " + reference.fps + "fps" : "")
    : "未导入视频";
  const suffix = reference === expectedVideo && !videoMeta ? "（待重新导入）" : "";
  ui.projectMeta.textContent = keyframes.length + " 个关键帧 · 视频：" + video + suffix;
  if (ui.topbarMeta) {
    ui.topbarMeta.textContent = reference
      ? reference.name + " · " + formatTimelineTime(reference.duration) + (videoMeta ? "" : " · 待导入") + " · " + keyframes.length + " 个关键帧"
      : "未导入视频 · 初始场景";
  }
}

function scheduleAutosave() {
  if (!autosaveAvailable) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(writeAutosave, 1200);
}

function writeAutosave() {
  if (!autosaveAvailable) return;
  try {
    const project = serializeProject();
    const payload = JSON.stringify({ savedAt: Date.now(), project });
    if (payload.length > 4_500_000) {
      autosaveAvailable = false;
      ui.autosaveBar.hidden = true;
      console.warn("工程体积过大，已关闭自动保存");
      return;
    }
    localStorage.setItem(AUTOSAVE_KEY, payload);
  } catch (error) {
    autosaveAvailable = false;
    ui.autosaveBar.hidden = true;
    console.warn("自动保存不可用", error);
  }
}

function initAutosave() {
  let raw = null;
  try {
    raw = localStorage.getItem(AUTOSAVE_KEY);
  } catch {
    autosaveAvailable = false;
    return;
  }
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (!saved?.project?.keyframes?.length) return;
    autosaveCandidate = saved.project;
    const stamp = new Date(saved.savedAt || Date.now()).toLocaleString("zh-CN", { hour12: false });
    ui.autosaveText.textContent = "发现自动保存：" + stamp + " · " + saved.project.keyframes.length + " 个关键帧";
    ui.autosaveBar.hidden = false;
  } catch {
    // ignore corrupt autosave payloads
  }
}

/* ------------------------------------------------------------------ */
/* Preferences (工作区习惯持久化)                                      */
/* ------------------------------------------------------------------ */

const PREFS_KEY = "stardew-vlog-hud.prefs.v1";
const defaultPreferences = {
  layout: "landscape",
  inspectorTab: "scene",
  libraryTab: "assets",
  stickerCategory: "items",
  timelineHeight: 208,
  autoKey: true,
  snap: true,
  smooth: true,
  group: "commute",
  item: "phone",
  aiModel: "gpt-image-2.5-flare",
  aiPrompt: "棕色木质像素游戏界面，清晰描边，暖色，无文字，透明背景",
  aiTarget: "clock",
  photo: null,
  autoRestore: true
};
let preferences = { ...defaultPreferences };
let prefsTimer = 0;

function loadPreferences() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
  } catch {
    stored = null;
  }
  if (stored && typeof stored === "object") {
    preferences = { ...defaultPreferences, ...stored };
  }
  // 恢复界面与开关
  ui.autoKey.checked = preferences.autoKey !== false;
  ui.snap.checked = preferences.snap !== false;
  ui.smooth.checked = preferences.smooth !== false;
  if (preferences.layout === "portrait" || preferences.layout === "landscape") state.layout = preferences.layout;
  if (Object.hasOwn(GROUPS, preferences.group) && preferences.item && Object.hasOwn(ITEMS, preferences.item)) {
    state.group = preferences.group;
    state.item = preferences.item;
  }
  const height = clamp(Number(preferences.timelineHeight) || 208, 132, 460);
  document.documentElement.style.setProperty("--timeline-height", height + "px");
  stickerCategory = STICKER_SHEETS[preferences.stickerCategory] || STICKER_ASSET_GROUPS[preferences.stickerCategory]
    ? preferences.stickerCategory
    : "items";
  if (ui.stickerCategory) ui.stickerCategory.value = stickerCategory;
  if (ui.aiModel) ui.aiModel.value = preferences.aiModel || defaultPreferences.aiModel;
  if (ui.aiPrompt) ui.aiPrompt.value = preferences.aiPrompt || defaultPreferences.aiPrompt;
  if (ui.aiTarget) ui.aiTarget.value = STICKER_SHEETS[preferences.aiTarget] ? "clock" : (preferences.aiTarget || "clock");
  if (ui.autoRestoreInput) ui.autoRestoreInput.checked = preferences.autoRestore !== false;
  if (preferences.photo && typeof preferences.photo === "string" && preferences.photo.startsWith("data:image/")) {
    scene.style.setProperty("--photo", 'url("' + preferences.photo + '")');
    scene.classList.add("has-photo");
    scene.dataset.persisted = "1";
  }
}

function savePreferences() {
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => {
    try {
      preferences.layout = state.layout;
      preferences.inspectorTab = ui.inspectorPanel?.dataset.activeTab || preferences.inspectorTab;
      preferences.libraryTab = document.querySelector(".library-tab.active")?.dataset.libraryTab || preferences.libraryTab;
      preferences.stickerCategory = stickerCategory;
      preferences.timelineHeight = Math.round(ui.dock?.getBoundingClientRect().height || 208);
      preferences.autoKey = ui.autoKey.checked;
      preferences.snap = ui.snap.checked;
      preferences.smooth = ui.smooth.checked;
      preferences.group = state.group;
      preferences.item = state.item;
      preferences.aiModel = ui.aiModel.value;
      preferences.aiPrompt = ui.aiPrompt.value;
      preferences.aiTarget = ui.aiTarget.value;
      preferences.autoRestore = ui.autoRestoreInput ? ui.autoRestoreInput.checked : preferences.autoRestore;
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn("保存操作习惯失败", error);
    }
  }, 300);
}

async function tryRestoreAutosave() {
  if (preferences.autoRestore === false) {
    initAutosave();
    return false;
  }
  let raw = null;
  try {
    raw = localStorage.getItem(AUTOSAVE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    if (!saved?.project?.keyframes?.length) return false;
    await applyProjectObject(saved.project, { silent: true });
    showToast("已恢复上次工程（" + keyframes.length + " 个关键帧）");
    return true;
  } catch (error) {
    console.warn("自动恢复工程失败", error);
    initAutosave();
    return false;
  }
}

function newProject() {
  if (isExporting) {
    showToast("导出中不能新建工程");
    return;
  }
  recordHistory("新建工程", { immediate: true });
  for (const id of Object.keys(imageLibrary)) delete imageLibrary[id];
  for (const id of Object.keys(imageObjects)) delete imageObjects[id];
  for (const key of Object.keys(customItemData)) delete customItemData[key];
  for (const key of Object.keys(customItemImages)) delete customItemImages[key];
  componentImageIds = { clock: null, stamina: null, toolbar: null, caption: null };
  stickers = [];
  selectedStickerId = null;
  resetComponentLayout(state.layout);
  resetTimeline();
  selectedKeyframeIndex = 0;
  expectedVideo = null;
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
  autosaveCandidate = null;
  ui.autosaveBar.hidden = true;
  docRevision++;
  render();
  syncControls();
  updateTimelineMeta(0);
  updateProjectMeta();
  showToast("已新建空工程");
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

async function setCustomComponentImage(name, dataUrl) {
  const id = await registerImageData(dataUrl);
  componentImageIds[name] = id;
  selectedComponent = name;
  syncComponentImageCache();
  commitLiveState("替换图层图片");
}

async function setCustomItemImage(key, dataUrl) {
  recordHistory("替换物品图片");
  customItemData[key] = dataUrl;
  customItemImages[key] = await loadCustomImage(dataUrl);
  touchDocument();
  render();
}

function clearSelectedCustomImage() {
  if (selectedComponent === "item") {
    recordHistory("恢复物品图片");
    delete customItemImages[state.item];
    delete customItemData[state.item];
    touchDocument();
    render();
    showToast("已恢复该物品的默认图片");
    return;
  }
  recordHistory("恢复默认图片");
  componentImageIds[selectedComponent] = null;
  syncComponentImageCache();
  commitLiveState("恢复默认图片");
  showToast("已恢复该图层的默认图片");
}

async function generateAiImage() {
  if (location.protocol === "file:") {
    ui.aiStatus.textContent = "双击打开时浏览器不能安全请求 API。请运行 start-overlay.cmd 后再生成。";
    return;
  }
  const apiKey = ui.aiKey.value.trim();
  if (!apiKey) {
    ui.aiStatus.textContent = "请填写 OpenAI API Key；密钥只在当前页面内存中使用。";
    return;
  }
  const target = ui.aiTarget.value;
  const prompt = "Transparent background pixel art game UI asset, crisp hard-edged pixels, warm Stardew-like palette, no text, centered, clean silhouette. " + ui.aiPrompt.value.trim();
  ui.aiGenerate.disabled = true;
  ui.aiStatus.textContent = "正在生成像素图片...";
  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        model: ui.aiModel.value.trim() || "gpt-image-2.5-flare",
        prompt,
        size: "1024x1024",
        quality: "low"
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "图片生成失败");
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error("接口没有返回图片数据");
    const dataUrl = "data:image/png;base64," + base64;
    if (target === "item") await setCustomItemImage(state.item, dataUrl);
    else await setCustomComponentImage(target, dataUrl);
    ui.aiStatus.textContent = "生成完成，已经替换到当前目标图层。";
  } catch (error) {
    ui.aiStatus.textContent = error.message;
  } finally {
    ui.aiGenerate.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Selection interactions                                              */
/* ------------------------------------------------------------------ */

function bindSelectionInteractions() {
  let action = null;

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".component-selection")) return;
    if (selectedStickerId) {
      selectedStickerId = null;
      render();
    }
  });

  ui.selectionLayer.addEventListener("pointerdown", (event) => {
    const box = event.target.closest(".component-selection");
    if (!box) return;
    if (box.dataset.stickerId) {
      startStickerDrag(event, box);
      return;
    }
    const name = box.dataset.component;
    selectedStickerId = null;
    selectedComponent = name;
    setInspectorTab(name === "caption" ? "caption" : "layers");
    syncLayerControls();
    updateSelectionBoxes(true);
    const layout = componentLayout[name];
    const stageRect = stage.getBoundingClientRect();
    const resizing = event.target.classList.contains("component-resize");
    beginGesture(resizing ? "缩放图层" : "移动图层");
    action = {
      name,
      resizing,
      startX: event.clientX,
      startY: event.clientY,
      startLayoutX: layout.x,
      startLayoutY: layout.y,
      startScale: layout.scale,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  ui.selectionLayer.addEventListener("pointermove", (event) => {
    if (stickerAction) {
      const { sticker, resizing } = stickerAction;
      const dx = event.clientX - stickerAction.startX;
      const dy = event.clientY - stickerAction.startY;
      if (resizing) {
        const baseWidth = Math.max(1, sticker.sw * stickerAction.startScale * stickerAction.stageWidth / canvas.width);
        const baseHeight = Math.max(1, sticker.sh * stickerAction.startScale * stickerAction.stageHeight / canvas.height);
        // 按比例缩放：拖出一个自身宽度就是 2 倍，小图块也能几拖就放大到几千百分比
        const ratio = (dx / baseWidth + dy / baseHeight) / 2;
        sticker.scale = clamp(stickerAction.startScale * Math.max(0.05, 1 + ratio), STICKER_SCALE_MIN, STICKER_SCALE_MAX);
      } else {
        sticker.x = stickerAction.startStickerX + dx * canvas.width / stickerAction.stageWidth;
        sticker.y = stickerAction.startStickerY + dy * canvas.height / stickerAction.stageHeight;
      }
      touchDocument();
      render();
      return;
    }
    if (!action) return;
    const layout = componentLayout[action.name];
    if (!layout) return;
    const dx = event.clientX - action.startX;
    const dy = event.clientY - action.startY;
    if (action.resizing) {
      const base = componentBounds(action.name);
      const widthOnScreen = base.width * action.startScale * action.stageWidth / canvas.width;
      const heightOnScreen = base.height * action.startScale * action.stageHeight / canvas.height;
      const scaleDelta = (dx / Math.max(1, widthOnScreen) + dy / Math.max(1, heightOnScreen)) / 2;
      layout.scale = Math.max(0.5, Math.min(2, action.startScale + scaleDelta));
    } else {
      layout.x = action.startLayoutX + dx * canvas.width / action.stageWidth;
      layout.y = action.startLayoutY + dy * canvas.height / action.stageHeight;
      const base = componentBounds(action.name);
      layout.x = Math.max(-base.width * layout.scale * 0.4, Math.min(canvas.width - 20, layout.x));
      layout.y = Math.max(-base.height * layout.scale * 0.4, Math.min(canvas.height - 20, layout.y));
    }
    commitLiveState("调整图层", { record: false });
    updateSelectionBoxes(true);
  });

  const finish = () => {
    if (stickerAction) {
      stickerAction = null;
      endGesture();
      render();
      return;
    }
    if (!action) return;
    action = null;
    endGesture();
    updateSelectionBoxes(true);
  };
  ui.selectionLayer.addEventListener("pointerup", finish);
  ui.selectionLayer.addEventListener("pointercancel", finish);
}

let stickerAction = null;

function startStickerDrag(event, box) {
  const sticker = stickers.find((item) => item.id === box.dataset.stickerId);
  if (!sticker) return;
  selectedStickerId = sticker.id;
  setInspectorTab("stickers");
  const stageRect = stage.getBoundingClientRect();
  const resizing = event.target.classList.contains("component-resize");
  beginGesture(resizing ? "缩放贴纸" : "移动贴纸");
  stickerAction = {
    sticker,
    resizing,
    startX: event.clientX,
    startY: event.clientY,
    startStickerX: sticker.x,
    startStickerY: sticker.y,
    startScale: sticker.scale,
    stageWidth: stageRect.width,
    stageHeight: stageRect.height
  };
  ui.selectionLayer.setPointerCapture(event.pointerId);
  updateSelectionBoxes(true);
  event.preventDefault();
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function exportLog(message) {
  if (!ui.exportLog) return;
  const item = document.createElement("li");
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  item.textContent = time + "  " + message;
  ui.exportLog.append(item);
  while (ui.exportLog.children.length > 40) ui.exportLog.firstElementChild.remove();
  ui.exportLog.scrollTop = ui.exportLog.scrollHeight;
}

function drawVideoCover(target, width, height) {
  const videoWidth = ui.video.videoWidth;
  const videoHeight = ui.video.videoHeight;
  if (!videoWidth || !videoHeight) return;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (videoWidth - sourceWidth) / 2;
  const sourceY = (videoHeight - sourceHeight) / 2;
  target.imageSmoothingEnabled = true;
  target.drawImage(ui.video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

async function ensureMediaAudio() {
  if (mediaAudio) {
    await mediaAudio.context.resume();
    return mediaAudio;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  const context = new AudioContextClass();
  const source = context.createMediaElementSource(ui.video);
  const destination = context.createMediaStreamDestination();
  source.connect(destination);
  source.connect(context.destination);
  await context.resume();
  mediaAudio = { context, source, destination };
  return mediaAudio;
}

function supportedRecordingType() {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function stopExportTracks() {
  if (!exportStream) return;
  for (const track of exportStream.getTracks()) {
    try {
      track.stop();
    } catch {
      // ignore
    }
  }
  exportStream = null;
}

function finishExportSession() {
  stopExportTracks();
  isExporting = false;
  exportRecorder = null;
  ui.exportVideo.disabled = false;
  ui.play.disabled = false;
  ui.cancelExport.disabled = true;
  if (ui.exportClose) ui.exportClose.disabled = false;
}

function cancelExport() {
  if (!isExporting) return;
  exportCancelled = true;
  exportLog("收到取消请求");
  ui.exportStatus.textContent = "正在取消导出...";
  ui.cancelExport.disabled = true;
  try {
    ui.video.pause();
  } catch {
    // ignore
  }
  if (exportRecorder && exportRecorder.state !== "inactive") {
    try {
      exportRecorder.stop();
    } catch (error) {
      console.warn("停止录制失败", error);
      finishExportSession();
    }
  } else {
    finishExportSession();
    ui.exportStatus.textContent = "已取消导出。";
    render();
  }
}

async function exportVideo() {
  if (isExporting) {
    showToast("正在导出，请等待或点击取消");
    return;
  }
  if (!ui.video.src || !videoDuration()) {
    showToast("请先导入一个视频");
    return;
  }
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    ui.exportStatus.textContent = "当前浏览器不支持网页视频导出，请使用最新版 Edge 或 Chrome。";
    exportLog("浏览器缺少 MediaRecorder 或 captureStream，无法导出");
    return;
  }

  exportCancelled = false;
  isExporting = true;
  ui.exportVideo.disabled = true;
  ui.play.disabled = true;
  ui.cancelExport.disabled = false;
  if (ui.exportClose) ui.exportClose.disabled = true;
  ui.exportProgress.value = 0;
  ui.exportLog.innerHTML = "";
  exportLog("开始导出：" + (videoMeta?.name || "未命名视频") + " · " + formatTimelineTime(videoDuration()) +
    " · " + canvasSizeFor(state.layout).width + "×" + canvasSizeFor(state.layout).height);
  const mimeType = supportedRecordingType();
  exportLog(mimeType ? "录制编码：" + mimeType : "浏览器未报告可用编码，使用默认设置");
  ui.exportStatus.textContent = "正在准备视频流...";

  ui.video.pause();
  ui.video.currentTime = 0;
  await new Promise((resolve) => {
    if (!ui.video.seeking && ui.video.readyState >= 2) {
      resolve();
      return;
    }
    ui.video.addEventListener("seeked", resolve, { once: true });
  });

  resizeCanvas();
  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const outputContext = output.getContext("2d");
  let stream = output.captureStream(30);

  try {
    if (typeof ui.video.captureStream === "function") {
      const videoStream = ui.video.captureStream();
      const audioTracks = videoStream.getAudioTracks();
      if (audioTracks.length) {
        stream = new MediaStream([...stream.getVideoTracks(), ...audioTracks]);
        exportLog("音频：来自视频音轨");
      }
    } else {
      const audio = await ensureMediaAudio();
      if (audio && audio.destination.stream.getAudioTracks().length) {
        stream = new MediaStream([...stream.getVideoTracks(), ...audio.destination.stream.getAudioTracks()]);
        exportLog("音频：使用 WebAudio 采集");
      }
    }
  } catch (error) {
    console.warn("Audio capture unavailable", error);
    exportLog("音频采集失败：" + error.message);
  }

  exportStream = stream;
  const chunks = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 });
  exportRecorder = recorder;

  recorder.addEventListener("error", (event) => {
    console.error("MediaRecorder error", event.error || event);
    exportLog("录制错误：" + (event.error?.message || "未知错误"));
    ui.exportStatus.textContent = "视频导出失败，请换用最新版 Edge 或 Chrome。";
    finishExportSession();
    render();
  });

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) chunks.push(event.data);
  });

  recorder.addEventListener("stop", async () => {
    const wasCancelled = exportCancelled;
    const resolvedType = mimeType || "video/webm";
    finishExportSession();
    if (wasCancelled) {
      exportLog("已取消导出，临时数据丢弃");
      ui.exportStatus.textContent = "已取消导出。";
      seekTo(0);
      return;
    }
    let blob = new Blob(chunks, { type: resolvedType });
    if (blob.size && !resolvedType.startsWith("video/mp4") && typeof window.ysFixWebmDuration === "function") {
      try {
        blob = await window.ysFixWebmDuration(blob, Math.round(videoDuration() * 1000), { logger: false });
        exportLog("已修复 WebM 时长元数据");
      } catch (error) {
        console.warn("Could not write WebM duration", error);
      }
    }
    if (!blob.size) {
      ui.exportStatus.textContent = "视频流没有生成数据，请重新导入视频后再试。";
      exportLog("导出失败：录制数据为空");
      render();
      return;
    }
    const extension = resolvedType.startsWith("video/mp4") ? ".mp4" : ".webm";
    const download = document.createElement("a");
    download.href = URL.createObjectURL(blob);
    download.download = "stardew-vlog-" + Date.now() + extension;
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(download.href), 15000);
    ui.exportProgress.value = ui.exportProgress.max;
    const kilobytes = Math.round(blob.size / 1024);
    ui.exportStatus.textContent = "导出完成，文件已下载（" + kilobytes + " KB）。";
    exportLog("完成：" + download.download + " · " + kilobytes + " KB · " + formatTimelineTime(videoDuration()));
    seekTo(0);
  });

  let lastLoggedBucket = -1;
  const paintExportFrame = () => {
    const at = ui.video.currentTime;
    applyTimelineTime(at);
    render(false);
    outputContext.clearRect(0, 0, output.width, output.height);
    drawVideoCover(outputContext, output.width, output.height);
    outputContext.imageSmoothingEnabled = false;
    outputContext.drawImage(canvas, 0, 0);
    updateTimelineMeta(at);
    const percent = Math.round(at / videoDuration() * 100);
    ui.exportStatus.textContent = "正在导出 " + percent + "%";
    const bucket = Math.floor(percent / 20);
    if (bucket !== lastLoggedBucket) {
      lastLoggedBucket = bucket;
      exportLog("录制进度 " + percent + "% · " + formatTimelineTime(at));
    }
  };

  paintExportFrame();
  recorder.start(250);
  ui.exportStatus.textContent = "正在导出 0%";
  try {
    await ui.video.play();
    probeFrameRate();
  } catch (error) {
    exportLog("无法播放视频：" + error.message);
    cancelExport();
    return;
  }

  const exportTick = () => {
    if (!isExporting || exportCancelled) return;
    paintExportFrame();
    if (ui.video.ended) {
      setTimeout(() => {
        if (exportRecorder && exportRecorder.state !== "inactive") {
          exportRecorder.requestData();
          setTimeout(() => {
            if (exportRecorder && exportRecorder.state !== "inactive") exportRecorder.stop();
          }, 120);
        }
      }, 180);
      return;
    }
    requestAnimationFrame(exportTick);
  };
  requestAnimationFrame(exportTick);
}

/* ------------------------------------------------------------------ */
/* Bindings                                                            */
/* ------------------------------------------------------------------ */

function bindDockResize() {
  let dockDrag = null;
  ui.dockResize.addEventListener("pointerdown", (event) => {
    dockDrag = { startY: event.clientY, startHeight: ui.dock.getBoundingClientRect().height };
    ui.dockResize.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-dock");
    event.preventDefault();
  });
  ui.dockResize.addEventListener("pointermove", (event) => {
    if (!dockDrag) return;
    const nextHeight = clamp(
      dockDrag.startHeight - (event.clientY - dockDrag.startY),
      132,
      Math.min(window.innerHeight - 240, 460)
    );
    document.documentElement.style.setProperty("--timeline-height", nextHeight + "px");
    timelineCache.rulerKey = "";
    renderTimeline();
    updateSelectionBoxes(true);
  });
  const finishDockResize = () => {
    dockDrag = null;
    document.body.classList.remove("resizing-dock");
    updateSelectionBoxes(true);
    savePreferences();
  };
  ui.dockResize.addEventListener("pointerup", finishDockResize);
  ui.dockResize.addEventListener("pointercancel", finishDockResize);
}

function bindKeyboard() {
  document.addEventListener("keydown", (event) => {
    const typing = event.target.matches("input, textarea, select") || event.target.isContentEditable;
    const meta = event.ctrlKey || event.metaKey;
    if (meta && event.key.toLowerCase() === "s") {
      // 在输入框里按下 Ctrl+S 也要保存工程，而不是弹出浏览器的“保存网页”
      event.preventDefault();
      saveProjectFile();
      return;
    }
    if (isExporting && event.key !== "Escape") {
      // 导出是实时录制，期间不允许播放/拖动/编辑打断画面
      if (event.code === "Space" || event.key === "ArrowLeft" || event.key === "ArrowRight") event.preventDefault();
      if (event.key.toLowerCase() === "k" || event.key === "Delete" || event.key === "Backspace") event.preventDefault();
      return;
    }
    if (meta && !typing) {
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (key === "s") {
        event.preventDefault();
        saveProjectFile();
        return;
      }
    }
    if (typing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (isExporting) {
        cancelExport();
        return;
      }
      if (ui.exportDialog?.open) {
        closeExportDialog();
        return;
      }
      if (selectedStickerId) {
        selectedStickerId = null;
        render();
        return;
      }
      if (document.body.classList.contains("library-open")) {
        setLibraryOpen(false);
        return;
      }
      exitCleanMode();
      return;
    }
    if (event.key.toLowerCase() === "e") {
      if (isCleanMode()) exitCleanMode();
      else enterCleanPreview();
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      playVideo();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.shiftKey ? 1 : 0.1;
      seekRelative(event.key === "ArrowLeft" ? -step : step);
      return;
    }
    if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      addKeyframeAtPlayhead();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      if (selectedStickerId) {
        deleteSelectedSticker();
        return;
      }
      deleteSelectedKeyframe();
      return;
    }
    if (event.key === "[") {
      const previous = keyframes[Math.max(0, selectedKeyframeIndex - 1)];
      if (previous) seekTo(previous.at);
      return;
    }
    if (event.key === "]") {
      const next = keyframes[Math.min(keyframes.length - 1, selectedKeyframeIndex + 1)];
      if (next) seekTo(next.at);
    }
  });
}

function bindControls() {
  ui.inspectorTabs.forEach((button) => {
    button.addEventListener("click", () => setInspectorTab(button.dataset.inspectorTab));
  });
  bindSelectionInteractions();
  bindTimeline();
  bindDockResize();
  bindKeyboard();
  bindStickerLibrary();

  ui.layoutButtons.forEach((button) => {
    button.addEventListener("click", () => changeOrientation(button.dataset.layout));
  });

  ui.undo.addEventListener("click", undo);
  ui.redo.addEventListener("click", redo);

  ui.exportOpen.addEventListener("click", openExportDialog);
  ui.exportClose.addEventListener("click", closeExportDialog);
  ui.exportDialog.addEventListener("click", (event) => {
    if (event.target === ui.exportDialog && !isExporting) closeExportDialog();
  });
  ui.exportDialog.addEventListener("cancel", (event) => {
    if (isExporting) {
      event.preventDefault();
      cancelExport();
    }
  });

  ui.libraryToggle.addEventListener("click", () => setLibraryOpen(!document.body.classList.contains("library-open")));
  ui.libraryBackdrop.addEventListener("click", () => setLibraryOpen(false));
  ui.libraryTabs.forEach((button) => {
    button.addEventListener("click", () => setLibraryTab(button.dataset.libraryTab));
  });

  ui.presetList.addEventListener("click", (event) => {
    const button = event.target.closest(".preset-chip");
    if (!button) return;
    const preset = PRESETS[Number(button.dataset.preset)];
    if (!preset) return;
    applyPreset(preset);
    setInspectorTab("scene");
  });

  ui.layerScale.addEventListener("pointerdown", () => beginGesture("缩放图层"));
  ui.layerScale.addEventListener("input", () => {
    const layout = componentLayout[selectedComponent];
    if (!layout) return;
    beginGesture("缩放图层");
    layout.scale = Math.max(0.5, Math.min(2, Number(ui.layerScale.value) / 100));
    commitLiveState("缩放图层", { record: false });
  });
  const finishScale = () => endGesture();
  ui.layerScale.addEventListener("change", finishScale);
  ui.layerScale.addEventListener("pointerup", finishScale);
  ui.layerScale.addEventListener("pointercancel", finishScale);

  const moveLayerToInputs = () => {
    const layout = componentLayout[selectedComponent];
    if (!layout) return;
    beginGesture("调整图层坐标");
    const x = Number(ui.layerX.value);
    const y = Number(ui.layerY.value);
    if (Number.isFinite(x)) layout.x = x;
    if (Number.isFinite(y)) layout.y = y;
    commitLiveState("调整图层坐标", { record: false });
  };
  ui.layerX.addEventListener("input", moveLayerToInputs);
  ui.layerY.addEventListener("input", moveLayerToInputs);
  ui.layerX.addEventListener("pointerdown", () => beginGesture("调整图层坐标"));
  ui.layerY.addEventListener("pointerdown", () => beginGesture("调整图层坐标"));
  ui.layerX.addEventListener("change", () => endGesture());
  ui.layerY.addEventListener("change", () => endGesture());

  ui.resetLayout.addEventListener("click", () => {
    recordHistory("恢复原版位置");
    componentLayout = defaultComponentLayout(state.layout);
    commitLiveState("恢复原版位置", { record: false });
    showToast("已恢复原版位置");
  });

  ui.clearImage.addEventListener("click", clearSelectedCustomImage);

  ui.componentImage.addEventListener("change", async () => {
    const file = ui.componentImage.files?.[0];
    if (!file) return;
    await setCustomComponentImage(selectedComponent, await dataUrlForFile(file));
    ui.componentImage.value = "";
    showToast("已替换 " + componentLabel(selectedComponent) + " 图片");
  });

  ui.itemImage.addEventListener("change", async () => {
    const file = ui.itemImage.files?.[0];
    if (!file) return;
    await setCustomItemImage(state.item, await dataUrlForFile(file));
    ui.itemImage.value = "";
    showToast("已替换当前物品图片");
  });

  ui.aiGenerate.addEventListener("click", generateAiImage);

  ui.videoInput.addEventListener("change", async () => {
    const file = ui.videoInput.files?.[0];
    if (!file) return;
    try {
      await loadVideoFile(file);
    } catch (error) {
      showToast(error.message);
      ui.videoName.textContent = "视频导入失败";
    }
  });

  ui.reimportVideo.addEventListener("click", () => ui.videoInput.click());

  ui.play.addEventListener("click", () => {
    playVideo().catch((error) => showToast(error.message));
  });
  ui.back.addEventListener("click", () => seekRelative(-0.1));
  ui.forward.addEventListener("click", () => seekRelative(0.1));
  ui.addKeyframe.addEventListener("click", addKeyframeAtPlayhead);
  ui.addKeyframeDock.addEventListener("click", addKeyframeAtPlayhead);
  ui.deleteKeyframe.addEventListener("click", deleteSelectedKeyframe);
  ui.exportVideo.addEventListener("click", exportVideo);
  ui.cancelExport.addEventListener("click", cancelExport);
  ui.saveProject.addEventListener("click", saveProjectFile);
  ui.saveProjectTop.addEventListener("click", saveProjectFile);
  ui.projectLoad.addEventListener("click", () => ui.projectInput.click());
  ui.projectInput.addEventListener("change", async () => {
    const file = ui.projectInput.files?.[0];
    if (!file) return;
    try {
      await loadProjectFile(file);
      ui.projectInput.value = "";
    } catch (error) {
      showToast(error.message);
      exportLog("加载工程失败：" + error.message);
    }
  });

  ui.autosaveRestore.addEventListener("click", async () => {
    if (!autosaveCandidate) return;
    try {
      await applyProjectObject(autosaveCandidate);
      ui.autosaveBar.hidden = true;
      autosaveCandidate = null;
    } catch (error) {
      showToast("自动保存恢复失败：" + error.message);
    }
  });
  ui.autosaveDiscard.addEventListener("click", () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // ignore
    }
    autosaveCandidate = null;
    ui.autosaveBar.hidden = true;
    showToast("已忽略自动保存");
  });

  ui.smooth.addEventListener("change", () => {
    recordHistory("切换平滑");
    applyTimelineTime(currentPlayheadTime());
    touchDocument();
    savePreferences();
    render();
  });

  ui.video.addEventListener("ended", () => {
    ui.play.textContent = "▶";
  });

  const sceneControls = [
    [ui.time, "修改时间"],
    [ui.weather, "修改天气"],
    [ui.season, "修改季节"],
    [ui.day, "修改日期"],
    [ui.money, "修改金币"],
    [ui.stamina, "修改体力"],
    [ui.group, "修改工具组"],
    [ui.tag, "修改小标题"],
    [ui.caption, "修改字幕"],
    [ui.captionVisible, "切换字幕显示"],
    [ui.clockVisible, "切换时钟显示"],
    [ui.staminaVisible, "切换体力显示"],
    [ui.toolbarVisible, "切换工具栏显示"]
  ];
  sceneControls.forEach(([control, label]) => {
    control.addEventListener("input", () => updateFromInputs(label));
    control.addEventListener("change", () => updateFromInputs(label));
  });

  ui.captionVisibleOverlay.addEventListener("change", () => {
    ui.captionVisible.checked = ui.captionVisibleOverlay.checked;
    updateFromInputs("切换信息卡显示");
  });

  ui.photo.addEventListener("change", async () => {
    const file = ui.photo.files?.[0];
    if (!file) return;
    if (scene.dataset.url) URL.revokeObjectURL(scene.dataset.url);
    const url = URL.createObjectURL(file);
    scene.dataset.url = url;
    scene.style.setProperty("--photo", 'url("' + url + '")');
    scene.classList.add("has-photo");
    // 小图直接存成 Data URL，下次打开自动恢复；过大就跳过，避免撑爆 localStorage
    if (file.size <= 1_600_000) {
      try {
        preferences.photo = await dataUrlForFile(file);
      } catch {
        preferences.photo = null;
      }
    } else {
      preferences.photo = null;
    }
    savePreferences();
  });

  ui.clearPhoto.addEventListener("click", () => {
    if (scene.dataset.url) URL.revokeObjectURL(scene.dataset.url);
    delete scene.dataset.url;
    scene.style.removeProperty("--photo");
    scene.classList.remove("has-photo");
    ui.photo.value = "";
    preferences.photo = null;
    savePreferences();
  });

  ui.aiModel.addEventListener("input", savePreferences);
  ui.aiPrompt.addEventListener("input", savePreferences);
  ui.aiTarget.addEventListener("change", savePreferences);
  if (ui.autoRestoreInput) {
    ui.autoRestoreInput.addEventListener("change", () => {
      preferences.autoRestore = ui.autoRestoreInput.checked;
      savePreferences();
      showToast(ui.autoRestoreInput.checked ? "下次打开会自动恢复上次工程" : "下次打开不再自动恢复");
    });
  }
  if (ui.newProjectButton) ui.newProjectButton.addEventListener("click", () => {
    if (!confirm("新建空工程会清空当前关键帧、贴纸和替换图片，确定继续？")) return;
    newProject();
  });

  ui.clean.addEventListener("click", () => {
    enterCleanPreview();
  });

  ui.copyUrl.addEventListener("click", async () => {
    const url = queryUrl();
    const copied = await copyText(url);
    ui.copyStatus.textContent = copied ? "OBS 浏览器地址已复制。页面背景已透明。" : "请复制：" + url;
    showToast(copied ? "已复制 OBS 地址" : "地址已显示在右侧");
  });

  window.addEventListener("resize", () => {
    timelineCache.rulerKey = "";
    updateSelectionBoxes(true);
    renderTimeline();
  });

  if (typeof ResizeObserver === "function") {
    const stageObserver = new ResizeObserver(() => {
      timelineCache.rulerKey = "";
      updateSelectionBoxes(true);
      renderTimeline();
    });
    stageObserver.observe(stage);
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function loadAssets() {
  drawPlaceholder();
  [
    Cursors,
    MenuTiles,
    DialogueFont,
    SmallFont,
    TinyFont
  ] = await Promise.all([
    loadImage("./assets/stardew/Cursors.png"),
    loadImage("./assets/stardew/MenuTiles.png"),
    loadSpriteFont("./assets/stardew/SpriteFont1-zh-CN.json", "./assets/stardew/SpriteFont1-zh-CN.png"),
    loadSpriteFont("./assets/stardew/SmallFont-zh-CN.json", "./assets/stardew/SmallFont-zh-CN.png"),
    loadSpriteFont("./assets/stardew/tinyFont.json", "./assets/stardew/tinyFont.png")
  ]);

  await Promise.all(Object.entries(ITEMS).filter(([, item]) => !item.heart).map(async ([, item]) => {
    itemImages[item.source] = await loadImage("./assets/items/" + item.source + ".png");
  }));
  await loadStickerAssets();
  render();
}

async function init() {
  populateControls();
  loadPreferences();
  parseQuery();
  resetComponentLayout(state.layout);
  bindControls();
  const tabs = ["scene", "caption", "layers", "stickers", "ai"];
  setInspectorTab(tabs.includes(preferences.inspectorTab) ? preferences.inspectorTab : "scene");
  setLibraryTab(preferences.libraryTab === "stickers" ? "stickers" : "assets");
  await loadAssets();
  renderStickerBrowser();
  const restored = await tryRestoreAutosave();
  if (!restored) resetTimeline();
  syncControls();
  updateTimelineMeta(0);
  updateProjectMeta();
  updateHistoryButtons();
  startVideoLoop();
  ready = true;
}

window.vlogHUD = {
  get ready() {
    return ready;
  },
  get state() {
    return structuredClone(state);
  },
  get keyframes() {
    return structuredClone(keyframes);
  },
  get layers() {
    return structuredClone(componentLayout);
  },
  get stickers() {
    return stickers.map((sticker) => ({ ...sticker }));
  },
  get selectedStickerId() {
    return selectedStickerId;
  },
  get videoMeta() {
    return videoMeta ? { ...videoMeta } : null;
  },
  get expectedVideo() {
    return expectedVideo ? { ...expectedVideo } : null;
  },
  get history() {
    return { undo: history.undo.length, redo: history.redo.length };
  },
  get exporting() {
    return isExporting;
  },
  set(patch) {
    if (patch?.layout === "portrait" || patch?.layout === "landscape") {
      const { layout, ...rest } = patch;
      if (Object.keys(rest).length) Object.assign(state, rest);
      changeOrientation(layout);
      if (Object.keys(rest).length) commitLiveState("外部设置");
      return;
    }
    Object.assign(state, patch || {});
    commitLiveState("外部设置");
  },
  setLayer(name, patch) {
    if (!componentLayout[name]) return;
    recordHistory("外部设置图层");
    Object.assign(componentLayout[name], patch || {});
    commitLiveState("外部设置图层", { record: false });
  },
  seek(seconds) {
    seekTo(seconds);
  },
  stateAt(seconds) {
    return structuredClone(stateAtTime(seconds).state);
  },
  layerAtTime(seconds) {
    return structuredClone(stateAtTime(seconds).state.layers);
  },
  addKeyframe: addKeyframeAtPlayhead,
  deleteKeyframe: deleteSelectedKeyframe,
  moveKeyframe(index, at) {
    const frame = keyframes[index];
    if (!frame) return false;
    recordHistory("移动关键帧");
    frame.at = clamp(roundTime(at), 0, timelineDuration());
    sortKeyframes();
    touchDocument();
    seekTo(frame.at);
    return true;
  },
  undo,
  redo,
  newProject,
  get preferences() {
    return { ...preferences };
  },
  queryUrl,
  exportVideo,
  cancelExport,
  components: {
    async setImage(name, dataUrl) {
      if (!LAYER_NAMES.includes(name)) return null;
      await setCustomComponentImage(name, dataUrl);
      return componentImageIds[name];
    },
    clearImage(name) {
      if (!LAYER_NAMES.includes(name)) return;
      recordHistory("恢复默认图片");
      componentImageIds[name] = null;
      syncComponentImageCache();
      commitLiveState("恢复默认图片", { record: false });
    },
    imageId(name) {
      return componentImageIds[name] || null;
    }
  },
  project: {
    serialize: serializeProject,
    migrate: migrateProject,
    load: (project) => applyProjectObject(project),
    save: saveProjectFile
  }
};

init().catch((error) => {
  console.error(error);
  drawPlaceholder();
});
