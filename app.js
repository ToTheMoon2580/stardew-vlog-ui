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
const PROJECT_FORMAT = "stardew-vlog-hud";
const PROJECT_VERSION = 2;
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
  clean: false
};

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const canvas = $("#hudCanvas");
const ctx = canvas.getContext("2d");
const stage = $("#previewStage");
const scene = $("#sceneBackground");
const ui = {
  editorPanel: $("#editorPanel"),
  editorTabs: [...document.querySelectorAll(".editor-tab")],
  editorResize: $("#editorResizeHandle"),
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
  deleteKeyframe: $("#deleteKeyframeButton"),
  timelineScroller: $("#timelineScroller"),
  track: $("#timelineTrack"),
  inner: $("#timelineInner"),
  ruler: $("#timelineRuler"),
  lane: $("#timelineLane"),
  markers: $("#keyframeMarkers"),
  playheadEl: $("#timelinePlayhead"),
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
  projectInput: $("#projectInput"),
  projectMeta: $("#projectMeta"),
  autosaveBar: $("#autosaveBar"),
  autosaveText: $("#autosaveText"),
  autosaveRestore: $("#autosaveRestore"),
  autosaveDiscard: $("#autosaveDiscard"),
  undo: $("#undoButton"),
  redo: $("#redoButton"),
  layout: $("#layoutInput"),
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
  layerScale: $("#layerScaleInput"),
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
  randomPreset: $("#randomPresetButton"),
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
  if (ui.video.src && Number.isFinite(ui.video.currentTime)) {
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
/* History                                                             */
/* ------------------------------------------------------------------ */

const history = { undo: [], redo: [], lastLabel: "", lastAt: -9999 };
let gesture = null;

function snapshotDocument() {
  return {
    keyframes: keyframes.map((frame) => structuredClone(frame)),
    images: { ...imageLibrary },
    itemImages: { ...customItemData },
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

function recordHistory(label) {
  if (gesture) return;
  const now = performance.now();
  if (history.lastLabel === label && now - history.lastAt < 450) {
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
  }
  touchDocument();
  if (renderNow) render();
}

function addKeyframeAtPlayhead() {
  const at = clamp(roundTime(currentPlayheadTime()), 0, timelineDuration());
  recordHistory("添加关键帧");
  const existing = findFrameIndexAt(at);
  if (existing >= 0) {
    Object.assign(keyframes[existing], captureLiveFrame(), { at: keyframes[existing].at });
    selectedKeyframeIndex = existing;
    showToast("已更新 " + formatTimelineTime(at) + " 的关键帧");
  } else {
    insertFrameAt(at, captureLiveFrame());
    showToast("已添加关键帧 " + formatTimelineTime(at));
  }
  touchDocument();
  applyTimelineTime(at);
  updateTimelineMeta(at);
  render();
}

function deleteSelectedKeyframe() {
  if (keyframes.length <= 1) {
    showToast("至少保留一个关键帧");
    return;
  }
  recordHistory("删除关键帧");
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
  recordHistory("切换画幅");
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
}

function updateTimelineMeta(seconds) {
  playhead = Number(seconds) || 0;
  ui.currentTime.textContent = formatTimelineTime(playhead);
  ui.duration.textContent = formatTimelineTime(videoDuration());
  const onFrame = findFrameIndexAt(playhead) >= 0;
  ui.keyframeCount.textContent = keyframes.length + " 个关键帧" + (onFrame ? " · 当前帧" : "");
  ui.exportProgress.max = Math.max(0.01, videoDuration());
  ui.exportProgress.value = Math.min(playhead, Math.max(0.01, videoDuration()));
  renderTimeline();
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
  renderTimeline();
}

function updateTimelineDrag(event) {
  if (!timelineDrag || event.pointerId !== timelineDrag.pointerId) return;
  if (timelineDrag.kind === "scrub") {
    seekTo(timeFromClientX(event.clientX));
    return;
  }
  const at = roundTime(snapTime(timeFromClientX(event.clientX), timelineDrag.frame.at));
  if (Math.abs(at - timelineDrag.frame.at) < 0.0005) return;
  timelineDrag.frame.at = clamp(at, 0, timelineDuration());
  timelineDrag.moved = true;
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
      showToast("关键帧已移动到 " + formatTimelineTime(drag.frame.at));
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
    showToast(ui.snap.checked ? "已开启吸附" : "已关闭吸附");
  });
  ui.autoKey.addEventListener("change", () => {
    touchDocument();
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

  drawSprite(Cursors, 340, 472, 65, 17, 28, 172, 4);
  const moneyText = String(state.money);
  const moneyMeasure = SmallFont.measure(moneyText);
  drawShadowText(SmallFont, moneyText, 150 - moneyMeasure.width / 2, 188, "#d61f1f", 1, 1);
  drawClockHand(88, 88, clockRotation(state.time));
  ctx.restore();
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
  ctx.fillStyle = "#221122";
  ctx.font = "24px sans-serif";
  ctx.fillText("正在加载原版游戏素材...", 80, 100);
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
  if (shouldSync) {
    syncControls();
    syncLayerControls();
  }
  renderTimeline();
  updateSelectionBoxes();
}

function syncControls() {
  ui.layout.value = state.layout;
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
}

function syncLayerControls() {
  if (!ui.clockVisible) return;
  ui.clockVisible.checked = state.clockVisible;
  ui.staminaVisible.checked = state.staminaVisible;
  ui.toolbarVisible.checked = state.toolbarVisible;
  ui.captionVisible.checked = state.captionVisible;
  ui.captionVisibleOverlay.checked = state.captionVisible;
  ui.selectedLayerName.textContent = "当前图层：" + componentLabel(selectedComponent);
  ui.layerScale.value = String(Math.round((componentLayout[selectedComponent]?.scale ?? 1) * 100));
  ui.clearImage.disabled = !(selectedComponent === "item" ? customItemData[state.item] : componentImageIds[selectedComponent]);
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
    })
  ].join("|");
}

function updateSelectionBoxes(force = false) {
  if (!ui.selectionLayer) return;
  const stageRect = stage.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return;
  const signature = selectionSignatureFor(stageRect);
  if (!force && signature === selectionSignature) return;
  selectionSignature = signature;
  ui.selectionLayer.innerHTML = LAYER_NAMES.filter(componentVisible).map((name) => {
    const layout = componentLayout[name];
    if (!layout) return "";
    const base = componentBounds(name);
    const left = (layout.x + base.xOffset * layout.scale) * stageRect.width / canvas.width;
    const top = layout.y * stageRect.height / canvas.height;
    const width = base.width * layout.scale * stageRect.width / canvas.width;
    const height = base.height * layout.scale * stageRect.height / canvas.height;
    return '<div class="component-selection ' + (selectedComponent === name ? "active" : "") +
      '" data-component="' + name + '" style="left:' + left + 'px;top:' + top + 'px;width:' + width +
      'px;height:' + height + 'px"><span>' + componentLabel(name) +
      '</span><i class="component-resize" data-resize="' + name + '"></i></div>';
  }).join("");
}

function setEditorTab(tab) {
  ui.editorPanel.dataset.activeTab = tab;
  document.querySelectorAll(".control-section[data-panel]").forEach((section) => {
    section.classList.toggle("panel-hidden", section.dataset.panel !== tab);
  });
  ui.editorTabs.forEach((button) => {
    const active = button.dataset.editorTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  const scroller = document.querySelector(".editor-scroll");
  if (scroller) scroller.scrollTop = 0;
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
}

function updateFromInputs(label = "画面参数") {
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
  Object.assign(state, preset, { clean: false });
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
  state.clean = clean;
  render();
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
        scrollPlayheadIntoView();
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
    await ui.video.play();
    probeFrameRate();
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
    keyframes: project.keyframes
  };
}

async function applyProjectObject(rawProject, options = {}) {
  const project = migrateProject(rawProject);
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
  ui.projectMeta.textContent = "工程 v" + PROJECT_VERSION + " · " + keyframes.length + " 个关键帧 · 视频：" + video + suffix;
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
  ui.selectionLayer.addEventListener("pointerdown", (event) => {
    const box = event.target.closest(".component-selection");
    if (!box) return;
    const name = box.dataset.component;
    selectedComponent = name;
    setEditorTab(name === "caption" ? "caption" : name === "toolbar" ? "assets" : "scene");
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
    if (!action) return;
    action = null;
    endGesture();
    updateSelectionBoxes(true);
  };
  ui.selectionLayer.addEventListener("pointerup", finish);
  ui.selectionLayer.addEventListener("pointercancel", finish);
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

function bindEditorResize() {
  let editorResize = null;
  ui.editorResize.addEventListener("pointerdown", (event) => {
    const currentHeight = ui.editorPanel.getBoundingClientRect().height;
    editorResize = { startY: event.clientY, startHeight: currentHeight };
    ui.editorResize.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-editor");
    event.preventDefault();
  });
  ui.editorResize.addEventListener("pointermove", (event) => {
    if (!editorResize) return;
    const nextHeight = Math.max(220, Math.min(window.innerHeight - 260, editorResize.startHeight - (event.clientY - editorResize.startY)));
    document.body.style.setProperty("--editor-height", nextHeight + "px");
    updateSelectionBoxes(true);
  });
  const finishEditorResize = () => {
    editorResize = null;
    document.body.classList.remove("resizing-editor");
    updateSelectionBoxes(true);
  };
  ui.editorResize.addEventListener("pointerup", finishEditorResize);
  ui.editorResize.addEventListener("pointercancel", finishEditorResize);
}

function bindKeyboard() {
  document.addEventListener("keydown", (event) => {
    const typing = event.target.matches("input, textarea, select") || event.target.isContentEditable;
    const meta = event.ctrlKey || event.metaKey;
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
      setClean(!state.clean);
      return;
    }
    if (event.key.toLowerCase() === "e") {
      setClean(!state.clean);
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
  ui.editorTabs.forEach((button) => {
    button.addEventListener("click", () => setEditorTab(button.dataset.editorTab));
  });
  bindSelectionInteractions();
  bindTimeline();
  bindEditorResize();
  bindKeyboard();

  ui.undo.addEventListener("click", undo);
  ui.redo.addEventListener("click", redo);

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
  ui.deleteKeyframe.addEventListener("click", deleteSelectedKeyframe);
  ui.exportVideo.addEventListener("click", exportVideo);
  ui.cancelExport.addEventListener("click", cancelExport);
  ui.saveProject.addEventListener("click", saveProjectFile);
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
    render();
  });

  ui.layout.addEventListener("change", () => changeOrientation(ui.layout.value));

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

  ui.photo.addEventListener("change", () => {
    const file = ui.photo.files?.[0];
    if (!file) return;
    if (scene.dataset.url) URL.revokeObjectURL(scene.dataset.url);
    const url = URL.createObjectURL(file);
    scene.dataset.url = url;
    scene.style.setProperty("--photo", 'url("' + url + '")');
    scene.classList.add("has-photo");
  });

  ui.clearPhoto.addEventListener("click", () => {
    if (scene.dataset.url) URL.revokeObjectURL(scene.dataset.url);
    delete scene.dataset.url;
    scene.style.removeProperty("--photo");
    scene.classList.remove("has-photo");
    ui.photo.value = "";
  });

  ui.randomPreset.addEventListener("click", () => {
    const current = PRESETS.findIndex((preset) => preset.caption === state.caption);
    applyPreset(PRESETS[(current + 1) % PRESETS.length]);
  });

  ui.clean.addEventListener("click", () => {
    setClean(true);
    showToast("按 E 或 Esc 返回编辑器");
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
  render();
}

async function init() {
  populateControls();
  parseQuery();
  resetComponentLayout(state.layout);
  bindControls();
  setEditorTab("video");
  await loadAssets();
  resetTimeline();
  syncControls();
  updateTimelineMeta(0);
  updateProjectMeta();
  updateHistoryButtons();
  initAutosave();
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
