# 星露谷风 Vlog HUD 编辑器交接文档

交接日期：2026-11-11（第二轮迭代）
项目目录：§D:\Agent\stardew-vlog-ui-exact§
当前完成度：可本地使用的 Vlog HUD 编辑器、关键帧动画工具和 MP4 合成导出工具；本轮补齐了时间轴、撤销重做、工程持久化（v2 + 迁移 + 自动保存）和图层关键帧。

## 1. 项目目标

这个项目用于给生活 Vlog 叠加《星露谷物语》原版 HUD，包括：

- 原版时钟、日期、天气、季节、金币栏
- 原版纵向体力条
- 原版 12 格工具栏
- 中文游戏 SpriteFont 字幕框
- 横屏 16:9 和竖屏 9:16
- 视频关键帧控制
- MP4 视频与 HUD 合成导出
- HUD 模块显示、隐藏、拖动、缩放、替换图片
- 可选 OpenAI Images API 像素图生成

素材来自用户本机 Steam 安装的正版游戏：

§D:\Software\Steam\steamapps\common\Stardew Valley§

不要重新设计一套“类似风”的 UI。这个项目的核心要求是直接使用原版游戏资源。

## 2. 最快运行方式

直接双击：

§§§text
overlay.html
§§§

普通编辑、关键帧和 MP4 导出都能在 §file://§ 下工作。

AI 生图需要本地代理，双击：

§§§text
start-overlay.cmd
§§§

它会执行 §node server.mjs§ 并打开：

§§§text
http://127.0.0.1:8766/overlay.html
§§§

命令行方式：

§§§powershell
cd D:\Agent\stardew-vlog-ui-exact
npm start
§§§

项目没有第三方 Node 运行时依赖。Node.js 需要支持 ESM、§fetch()§ 和 §import.meta.dirname§。

## 3. 非常重要的构建关系

页面实际加载的是 §app-bundle.js§，不是 §app.js§。

源码关系：

§§§text
app.js
items.js
spritefont.js
assets/stardew/*.png
assets/stardew/*.json
assets/items/*.png
        |
        v
scripts/build-bundle.mjs
        |
        v
app-bundle.js
        |
        v
overlay.html
§§§

修改以下文件后必须重新构建：

- §app.js§
- §items.js§
- §spritefont.js§
- §assets/items/§ 中的图片
- 字体图集、字体 JSON、§Cursors.png§ 或 §MenuTiles.png§

构建命令：

§§§powershell
cd D:\Agent\stardew-vlog-ui-exact
npm run build
§§§

等价命令：

§§§powershell
node scripts/build-bundle.mjs
§§§

不要手动修改 §app-bundle.js§。它由构建脚本重新生成。

构建脚本靠字面量替换改写资源路径，因此下面这些写法的代码行必须保持原样（新增代码时不要改写成别的形式）：

- §loadImage("./assets/stardew/Cursors.png")§ / §MenuTiles.png§
- §loadSpriteFont("./assets/stardew/...json", "./assets/stardew/...png")§ 三处
- §"./assets/items/" + item.source + ".png"§
- §"./assets/ui/heart.png"§
- §await Promise.all(Object.entries(ITEMS)§ 这一行的开头
- 文件顶部的 §import ...§ 行（构建时整行删除）

## 4. 为什么需要 app-bundle.js

直接通过 §file://§ 打开页面时，浏览器会阻止 ES Module、JSON fetch 和部分本地资源读取。更麻烦的是，本地图片一旦画入 Canvas，Canvas 会变为跨域污染状态，随后无法执行 §captureStream()§，导致视频导出失败。

§scripts/build-bundle.mjs§ 会：

1. 把 §app.js§、§items.js§、§spritefont.js§ 转成普通脚本并合并。
2. 把中文字体数据和字形 JSON 内嵌进 bundle。
3. 把时钟、菜单、字体、物品图片转成 Base64 Data URL 内嵌。
4. 生成可离线运行的 §app-bundle.js§。

因此：

- 页面可以直接双击打开。
- Canvas 保持 origin-clean。
- MediaRecorder 可以正常录制 Canvas。
- ZIP 体积会比源码大，这是内嵌素材造成的。

## 5. 主要文件

| 文件 | 职责 |
| --- | --- |
| §overlay.html§ | 页面结构、时间轴、底部编辑工作区、顶部分页导航 |
| §style.css§ | 页面、预览舞台、时间轴、拖动框和按钮样式 |
| §app.js§ | 全部核心逻辑：文档模型、绘制、关键帧、历史、交互、导出、AI |
| §items.js§ | 物品列表、工具组、预设场景 |
| §spritefont.js§ | Stardew SpriteFont 渲染器 |
| §scripts/build-bundle.mjs§ | 离线 bundle 构建器 |
| §app-bundle.js§ | 生成文件，浏览器实际运行它 |
| §server.mjs§ | 静态文件服务器和 OpenAI 图片 API 本地代理 |
| §start-overlay.cmd§ | Windows 启动入口 |
| §asset-map.json§ | 原版资源坐标与物品 ID |
| §qa/browser.mjs§ | 零依赖 CDP 驱动（启动 Edge/Chrome、截图、点按、文件注入） |
| §qa/verify.mjs§ | 回归测试套件（页面基线 / 时间轴 / 自动关键帧 / 撤销重做 / 工程 / 图层 / 导出） |
| §qa/screens.mjs§ | 生成参考截图 |
| §vendor/fix-webm-duration.js§ | 修复 WebM 缺失时长元数据的第三方兼容库 |
| §README.md§ | 面向最终使用者的说明 |

## 6. 页面布局

2026-11-11 第二轮把原来的“上方预览 + 下方分页编辑器”改成了剪辑软件式的工作台：

§§§text
┌──────────────────────────────────────────────────────────────┐
│ 顶栏：品牌 · 视频/关键帧摘要 · 撤销重做 · 打开 保存 · 导出成片 │
│ 自动保存提示条（有缓存时出现）                               │
├──────────────┬───────────────────────────────┬───────────────┤
│ 素材库 252px │ 监看台                        │ 检查器 336px  │
│ 视频导入     │  画幅 16:9 / 9:16 + 尺寸      │ 画面 字幕     │
│ 背景照片     │  HUD 预览（等比、可拖动组件）  │ 图层 AI 生图  │
│ 工具组道具   │  播放控制 + 时间码 + 加关键帧  │ 当前状态摘要  │
│ 快捷键       │                               │               │
├──────────────┴───────────────────────────────┴───────────────┤
│ 时间轴（通栏、可拖高 132–460px）                             │
│ 删除关键帧 · 吸附 · 自动关键帧 · 平滑      − 100% + 适应      │
│ 标尺 + 视频轨 + 关键帧菱形 + 播放头 + 时间气泡                     │
└──────────────────────────────────────────────────────────────┘
§§§

要点：

- 顶栏 §.topbar§ 固定 52px；§#topbarMeta§ 显示当前视频名、时长、关键帧数。顶栏还有打开/保存工程，没有视频时“导出成片”自动禁用。
- 三栏由 §.workspace§ 网格控制：§252px minmax(0,1fr) 336px§；≤1280px 收成 §224px … 300px§；≤1080px 素材库变成抽屉（§body.library-open§）。
- 监看台用容器查询单位把 §#previewStage§ 锁在 16:9 或 9:16：§width: min(100cqw, calc(100cqh * 16 / 9))§，不要改回 §height:100% + max-width§ 的写法（会破坏比例）。
- 时间轴高度由 CSS 变量 §--timeline-height§（默认 208px）控制，拖动 §#timelineResizeHandle§ 修改，夹在 132–460px。
- 时间轴内部从上到下是：标尺、视频轨（§#videoClip§，宽度按片长占比）、关键帧轨、播放头；拖动播放头或菱形时出现 §#playheadBubble§ 时间气泡。
- 检查器分页由 §setInspectorTab(tab)§ 控制，用 §.inspector-panel[data-panel]§ 的 §hidden§ 属性切换：

| 分页 | §data-inspector-tab§ | 内容 |
| --- | --- | --- |
| 画面 | §scene§ | 时间、天气、季节、日期、金币、体力、场景预设 |
| 字幕 | §caption§ | 信息卡小标题与正文、显示开关 |
| 图层 | §layers§ | 显隐、X/Y 坐标、缩放、替换图片与物品 |
| 贴纸 | §stickers§ | 贴纸列表、坐标、大小、层级、删除/清空 |
| AI 生图 | §ai§ | OpenAI 图片生成 |

- 导出是 §<dialog id="exportDialog">§：顶栏“导出成片”调用 §showModal()§，Esc 关闭；导出中按 Esc 先取消导出。
- 纯画面预览（§body.clean-preview§，顶栏按钮 / E）：隐藏全部编辑器界面，保留视频与背景，舞台按画幅比例居中（§width: min(100vw, 100vh × 16/9)§），不再拉伸；Esc / E 退出。
- OBS 透明模式（§body.clean§，§?clean=1§）：隐藏界面、视频、背景，页面与舞台背景透明，同样按画幅比例居中，交给 OBS 叠加。两种模式共用同一套 CSS 尺寸规则，注意别把 §aspect-ratio§ 改成 §auto§ 再写死 §100vw×100vh§——那会在非 16:9 窗口里把 HUD 拉变形。
- 选中贴纸时再点组件：组件分支会先清空 §selectedStickerId§，否则组件永远不显示 active 框，看起来像“点其他元素没反应”。
- 移动/窄屏（≤860px）切到单列：监看台在上、检查器在下、时间轴吸底。
- 所有控件都保留了原有 id，只有分页容器相关的 §#editorPanel / .editor-tab / .control-section§ 改成了 §#inspectorPanel / .inspector-tab / .inspector-panel§；批量改选择器时以 §app.js§ 顶部的 §ui§ 表为准。

## 7. 数据模型（v2）

### 当前状态

§state§ 表示播放头当前的 HUD 状态，核心字段：

§§§text
layout（画幅：landscape / portrait，全局，不随关键帧变化）
time / weather / season / day / stamina / money
group / item / tag / caption
clockVisible / staminaVisible / toolbarVisible / captionVisible
clean
§§§

### 图层与图片

两个与 §state§ 并列的“当前值”，它们会一起写进关键帧：

§§§text
componentLayout = { clock:{x,y,scale}, stamina:{...}, toolbar:{...}, caption:{...} }
componentImageIds = { clock:id|null, stamina:id|null, toolbar:id|null, caption:id|null }
§§§

图片本体放在图片库里，关键帧只存 id：

§§§text
imageLibrary  id -> dataURL（会写进工程 JSON）
imageObjects  id -> 已解码的 Image（仅内存）
§§§

§customComponentImages§ 是由 §componentImageIds§ 派生出来的缓存，绘制代码仍然读它。物品图标替换（§customItemData§ / §customItemImages§）按物品 key 全局保存，不随关键帧变化；物品本身是随关键帧切换的。

### 关键帧

§keyframes§ 是按 §at§ 排序的数组，每个关键帧是完整快照：

§§§text
at
time / weather / season / day / stamina / money
group / item / tag / caption
clockVisible / staminaVisible / toolbarVisible / captionVisible
layers = { clock:{x,y,scale}, ... }
images = { clock:id|null, ... }
§§§

关键函数：

- §captureLiveFrame()§：把当前 §state§ + §componentLayout§ + §componentImageIds§ 打包成一帧。
- §normalizeFrame(frame, previous)§：加载和迁移时的字段校验与补全。
- §stateAtTime(seconds)§：找到播放头之前的最近关键帧；“平滑”开启时插值时间、体力、金币、图层 x/y/scale，并对图片 id 做阶梯切换。
- §applyTimelineTime(seconds)§：把结果写回 §state§、§componentLayout§、§componentImageIds§，刷新图片缓存。
- §findFrameIndexAt(at)§：以 §KEYFRAME_EPSILON = 0.045§ 秒判定“播放头正好在关键帧上”。

### 画幅与图层重映射

§changeOrientation(mode)§ 不会简单丢弃布局：

- 仍然是横屏/竖屏默认位置的图层（误差 0.5px、0.001 缩放以内）直接换成新画幅的默认位置。
- 用户调过的图层按画布尺寸比例重映射（1920×1080 ↔ 1080×1920），缩放保持不变。
- 所有关键帧里的 §layers§ 一起重映射，并记入历史。

## 8. 编辑管线与自动关键帧

所有“会改变文档”的编辑都走 §commitLiveState(label, options)§：

1. 取当前播放头时间（§currentPlayheadTime()§）。
2. §recordHistory(label)§ 记录编辑前快照（拖动中通过 §gesture§ 合并）。
3. 播放头正好在关键帧上 → 更新该帧。
4. 不在关键帧上且“自动关键帧”开启（默认）→ 在播放头插入新帧，并弹出节流后的提示。
5. 不在关键帧上且“自动关键帧”关闭 → 写回当前选中的关键帧，不移动播放头。
6. §touchDocument()§ 递增修订号、安排自动保存、刷新工程信息。

拖动类交互（组件拖动、缩放、关键帧拖动、大小滑块）使用手势事务：

§§§text
beginGesture(label)  -> 记录手势开始时的快照与 docRevision
... 多次 commitLiveState({ record:false }) ...
endGesture()         -> 只有 docRevision 变了才压入一条历史
§§§

因此一次拖动只产生一步撤销。

## 9. 时间轴实现

DOM 结构：

§§§text
#timelineScroller        （横向滚动容器）
  #timelineTrack         （宽度 = 缩放倍数 × 100%）
    #timelineInner       （左右各 12px 内缩，所有百分比定位都以它为基准）
      #timelineRuler     （刻度）
      #timelineLane      （轨道，指针事件入口）
        #keyframeMarkers （菱形按钮）
      #timelinePlayhead  （播放头）
§§§

要点：

- 缩放 §timelineZoom§ 范围 1–12 倍，按钮 `−` / `＋` / `适应`，Ctrl + 滚轮也能缩放。
- 刻度步长由 §chooseTickStep()§ 按“至少 76px 一个标签”自动选择。
- 关键帧按 §at / duration§ 的百分比定位，所以缩放、滚动都不用重算像素。
- 拖动菱形调用 §snapTime()§：吸附阈值 8px，候选是 0、片尾、播放头和其他关键帧。
- 点击/拖动空白处定位播放头；双击空白处新增关键帧。
- 播放时 §scrollPlayheadIntoView()§ 自动跟随播放头。
- §renderTimeline()§ 用 §timelineCache.rulerKey / markerKey§ 做增量刷新，播放时不会每帧重建 DOM。
- 绿色小点（§.layer-key::after§）表示该帧相对上一帧改变了图层位置/缩放。

## 10. 撤销 / 重做

§history§ 保存的是“文档快照”：

§§§text
{ keyframes, images, itemImages, smooth, autoKey, snap, layoutMode, selectedKeyframeIndex, playhead }
§§§

- 上限 §HISTORY_LIMIT = 120§ 步。
- §recordHistory(label)§ 在 450ms 内同名操作会合并，避免输入框每个字符一步。
- §undo()/redo()§ 先压入当前文档，再 §restoreDocument(snapshot)§ 恢复；恢复会重新解码需要的图片。
- 顶部按钮和 §Ctrl+Z§ / §Ctrl+Shift+Z§ / §Ctrl+Y§ 都可用；按钮 title 显示将要撤销的操作名。
- 视频文件信息不在历史里：导入视频不是可撤销的文档修改。

## 11. 工程文件 v3

保存结构：

§§§json
{
  "format": "stardew-vlog-hud",
  "version": 3,
  "savedAt": "2026-11-12T...",
  "layout": "landscape",
  "smooth": true,
  "autoKey": true,
  "snap": true,
  "video": { "name": "...", "size": 109113, "duration": 2.37, "width": 1920, "height": 1080, "fps": 30, "importedAt": "..." },
  "images": { "img-xxx": "data:image/png;base64,..." },
  "itemImages": { "phone": "data:image/png;base64,..." },
  "stickers": [ { "id": "st-...", "kind": "sheet", "sheet": "springobjects", "sx": 0, "sy": 0, "sw": 16, "sh": 16, "label": "随手物 1-1", "x": 928, "y": 508, "scale": 4, "visible": true } ],
  "keyframes": [ { "at": 0, "...": "场景字段", "layers": { "clock": { "x": 1620, "y": 8, "scale": 1 } }, "images": { "clock": null } } ]
}
§§§

### 贴纸

贴纸是**工程级**对象（不随关键帧变化），按数组顺序绘制在 HUD 之上：

- §kind: "sheet"§：从原版图集按 §sx/sy/sw/sh§ 取一块（§springobjects / Craftables / tools / weapons / BuffsIcons / Objects_2 / menu§）。
- §kind: "asset"§：整张命名素材（§items:*§ 常用道具、§ui:*§ 界面零件）。
- §x / y§ 是画布坐标，§scale§ 夹在 0.05–50（5%–5000%）；默认 16px 图块 4 倍、64px 图块 1 倍、命名素材 2 倍。检查器里既有滑杆也有“精确大小（%）”输入框，拖右下角把手的缩放是**按比例**的（拖出一个自身宽度约等于 2 倍），否则 16px 小图块永远放不大。
- 渲染入口 §drawStickers()§，选区在 §updateSelectionBoxes()§ 里追加 §.sticker-selection[data-sticker-id]§。
- 操作：从素材库点按或拖入画布、拖虚线框移动、拖右下角缩放；检查器“贴纸”页可改 X/Y/大小、上下移层、删除、清空。
- 删除键在选中贴纸时删贴纸，否则删关键帧；Esc 先取消贴纸选中。

### 迁移

§migrateProject(raw)§：

- 格式不是 §stardew-vlog-hud§ → 报“不是有效的星露谷 Vlog 工程文件”。
- §version > 3§ → 报错提示更新编辑器。
- §version 1§ → 自动迁移：§componentLayout§ 复制到每个关键帧的 §layers§；§customComponentImages§ 进入 §images§，id 为 §legacy-<组件名>§，并写到所有关键帧；补 §autoKey/snap/video§ 默认值。
- §version ≤ 2§ → 补 §stickers: []§。
- 迁移和加载都会丢弃非 §data:image/§ 的图片值，避免坏工程。

### 自动保存与长期偏好

- 工程自动保存 localStorage key：§stardew-vlog-hud.autosave.v2§，每次文档变化后 1.2 秒防抖写入；超过约 4.5MB 或存储抛错时自动关闭。
- 默认**启动即自动恢复**上次工程（含贴纸和替换图片），恢复后 toast 提示；可在导出弹窗取消“启动时恢复上次工程”，此时退回顶部提示条手动恢复。
- “新建空工程”会清空关键帧、贴纸、替换图片和自动保存，保留已导入的视频。
- 操作习惯存于 §stardew-vlog-hud.prefs.v1§（§loadPreferences/savePreferences§）：画幅、检查器页签、素材库页签、贴纸分类、时间轴高度、自动关键帧/吸附/平滑、工具组与物品、AI 模型/提示词/目标、背景照片（≤1.6MB 时存 Data URL）、自动恢复开关。写回 300ms 防抖。

### 视频提醒

- §videoMeta§：当前真正导入的视频信息。
- §expectedVideo§：工程里记录的视频信息。
- 加载工程但没导入视频时，“剪辑”页显示工程对应视频的大小/时长/分辨率，并提供“重新导入匹配视频”。
- 导入后名称或时长（0.08 秒容差）不一致时提示关键帧时间可能有偏移。
- 保存工程时优先写当前视频信息；没有导入视频则保留工程里的参考信息。
- 帧率通过 §requestVideoFrameCallback§ 在播放或导出时测量，属于“尽力而为”，未播放过的视频可能为 §null§。

## 12. HUD 绘制

主绘制入口：

§render(shouldSync = true)§

主要函数：

- §drawClock()§
- §drawStamina()§
- §drawToolbar()§
- §drawCaption()§
- §drawStickers()§（贴纸，画在 HUD 之上）
- §drawDialogueBox()§
- §drawTextureBox()§
- §drawItem()§

### 金币栏（按 1.6 源码还原）

1.6 的金币显示在 §DayTimeMoneyBox§ 里，不在 HUD 主类：

- 底板：§mouseCursors (340,472,65,17)§，画在组件局部坐标 §(28,172)§、4 倍。
- 数字：§MoneyDial.draw(position + (68,196))§，固定 8 个数字槽，每格前进 §24px§；逐位取 §mouseCursors (286, 502 - digit*8, 5, 8)§，用 §Color.Maroon (#800000)§ 染色后 4 倍绘制。前导 0 不画但仍占槽位，所以数字天然右对齐。
- 不要再用 SmallFont / 红色文字画金币，这是上一版的错误实现。§moneyDigitCanvas(digit)§ 里有按数字缓存好的染色小图。

Canvas 固定逻辑尺寸：

- 横屏：1920×1080
- 竖屏：1080×1920

素材坐标和游戏物品 ID 见 §asset-map.json§。

### 选区对齐

这是之前多次出问题的位置，修改时要特别小心。

预览区域必须保持与 Canvas 相同宽高比。§.preview-stage§ 使用 §outline§ 做外框，不使用会缩小内容区的 §border§。

选区计算必须使用 §componentBounds()§：

| 模块 | 实际选区尺寸 |
| --- | --- |
| 时钟 | 包含下方金币栏，284×248 |
| 体力 | 包含左侧数值，x 偏移 -80，宽 128，高 224 |
| 工具栏 | 800×96 |
| 信息卡 | 横屏 720×264；竖屏 880×264 |

§updateSelectionBoxes()§ 现在带签名缓存：布局、选中项、舞台尺寸都没变时不会重建 DOM；强制刷新用 §updateSelectionBoxes(true)§。拖动时指针捕获在 §#selectionLayer§ 上，重建子元素不会丢事件。

拖动或缩放后必须调用 §render()§，其中会继续调用 §updateSelectionBoxes()§。

## 13. 视频与导出

视频输入使用 §HTMLVideoElement§。预览时视频位于 Canvas 下方；导出时逐帧绘制到临时 Canvas：

§§§text
原视频画面 -> 按 cover 裁切 -> 绘制 HUD Canvas -> CanvasCaptureStream
§§§

录制优先级：

1. §video/mp4;codecs=avc1.42E01E,mp4a.40.2§
2. §video/mp4;codecs=avc1.42E01E§
3. §video/mp4§
4. VP9 WebM
5. VP8 WebM
6. WebM

当前版 Edge 157 实测输出：

- 横屏：H.264 + AAC，1920×1080
- 竖屏：H.264 + AAC，1080×1920
- 2.37 秒测试片导出的 MP4 时长约 2.5 秒

新增能力：

- “取消导出”按钮：停止录制、丢弃临时数据、恢复按钮状态；日志记录取消。
- 导出日志（§#exportLog§）：开始时间、编码类型、音频来源、每 20% 进度、完成文件名与体积、错误原因。
- 导出结束会回到片头并刷新预览。

如果输出 WebM，会调用 §ysFixWebmDuration()§ 修复时长元数据。

已知限制：

- 导出是实时录制，速度约等于视频原时长。
- 不包含剪辑、裁剪、变速、转场和多轨音频。
- 浏览器不支持 MP4 MediaRecorder 时会回退 WebM。
- Safari、Firefox 和低版本 Chromium 尚未完整测试。
- §file://§ 下导出的下载文件名由浏览器决定，Edge 偶尔会追加编号。

## 14. AI 图片生成

前端入口：§generateAiImage()§
本地代理：§POST /api/generate-image§

请求由浏览器发给 §server.mjs§，再由服务端携带 API Key 调 OpenAI Images API：

§§§text
POST https://api.openai.com/v1/images/generations
§§§

默认模型：

§§§text
gpt-image-2.5-flare
§§§

2026-11-11 时的官方建议见：

§§§text
https://developers.openai.com/api/reference/resources/images/methods/generate
§§§

安全约定：

- API Key 只保留在当前页面输入框和本地代理请求中。
- 不写入工程 JSON。
- 不写进源码。
- 不要记录含 API Key 的请求体到日志。
- 没有 Key 时仍可手动上传外部生成的 PNG。

注意：目前只直接适配 OpenAI Images API，没有接 ComfyUI、Stable Diffusion WebUI 或其他供应商。若要接其他服务，建议在 §server.mjs§ 增加 provider 分支，不要让浏览器直接请求第三方 API。

## 15. 自动化测试

`qa/` 下是一套零依赖的浏览器回归测试，通过 Chrome DevTools Protocol 驱动本机 Edge/Chrome：

§§§powershell
cd D:\Agent\stardew-vlog-ui-exact
node qa/verify.mjs              # 全部用例
node qa/verify.mjs timeline     # 只跑分组
node qa/verify.mjs --headed     # 打开可见窗口观察
node qa/screens.mjs             # 重新生成 qa/shots 下的参考截图
§§§

分组：

| 分组 | 覆盖内容 |
| --- | --- |
| §baseline§ | 无异常、控件数量、三栏结构、时间轴高度、画幅切换与图层重映射、帧摘要、导出禁用态 |
| §shell§ | 导出弹窗开关、素材库抽屉、纯画面预览（画幅不拉伸）、OBS 透明模式、横向溢出 |
| §timeline§ | 视频导入、视频轨、标尺、拖动定位、关键帧新增与插值、菱形拖动、缩放、双击新增、空状态 |
| §timelineEdge§ | 无视频时禁用加帧、点标尺后加帧落点、重复添加只更新、拖拽不允许重叠、放大滚动后定位、删除 |
| §autokey§ | 自动关键帧开/关两种写入路径、计数同步 |
| §history§ | 撤销重做、快捷键、关键帧增删、图层拖动、至少保留一帧 |
| §shortcuts§ | 空格、方向键、K、[ ]、Delete、Ctrl+Z、E、Ctrl+S |
| §stickers§ | 贴纸库切换、点击/拖拽加入、选中与选区、移动缩放、撤销删除、工程往返、清空 |
| §project§ | v3 保存、v1 迁移、图片库、文件加载、无视频提醒、顶栏摘要、自动保存与自动恢复 |
| §projectDeep§ | 画幅/图层坐标/替换图片/开关状态全量往返、v1 物品图片迁移 |
| §prefs§ | 页签/开关/时间轴高度/AI 提示词持久化、自动恢复工程、新建空工程 |
| §layers§ | 图层关键帧、插值、X/Y 输入、图片随帧切换、工程往返、无效工程 |
| §controls§ | 天气/时间/季节/日期/金币/体力/字幕/显隐/工具组/道具/预设/画幅/背景照片/AI 表单 |
| §robustness§ | 损坏视频、重复导入、连按空格、撤销重做连击、缩放上限、拖拽越界 |
| §export§ | 导出中键盘隔离、取消导出、H.264 + AAC、横竖屏尺寸 |
| §compact§ | 1180×760 与 1000×760 下的三栏/抽屉行为、比例、无溢出 |

本轮基线：**201 项全部通过**（Edge 157 headless，`file://` 直接打开）。

另有 HTTP 模式与 AI 代理检查（会自己启动静态服务器）：

§§§powershell
node qa/http-check.mjs   # 8 项：HTTP 加载、HUD 绘制、无 Key/错误 Key 的 AI 提示
§§§

导出编码断言依赖 `ffprobe`：优先用环境变量 `DSH_FFPROBE`，其次 PATH 里的 `ffprobe`，最后回退到本机 `D:\AI产物\_tools\ffmpeg\ffprobe.exe`；都没有时会跳过编码断言。

## 16. 当前测试基线（人工）

最终 ZIP 解压后通过 §file://§ 实测：

- 页面无 JavaScript 运行时错误
- 天气选项 7 个、工具组 6 个、物品按钮 17 个、场景预设 9 个
- 三栏工作台 + 通栏时间轴，窄屏素材库收进抽屉；素材库分“视频与道具 / 贴纸素材”两页
- 检查器 5 个页签（画面/字幕/图层/贴纸/AI）
- 金币栏按 DayTimeMoneyBox/MoneyDial 还原：8 位数字槽、Maroon 像素数字、右对齐
- 贴纸可从图集或命名素材点击/拖入画面，可移动、缩放、删除，随工程与自动保存持久化
- 操作习惯（页签、时间轴高度、开关、AI 提示词、贴纸分类、背景照片）跨会话保留
- 重新打开页面自动恢复上次工程，可关闭自动恢复或新建空工程
- 4 个 HUD 选区，预览与 Canvas 比例一致
- 时间轴默认高度 208px，可拖到 132–460px
- 模块拖动、画幅切换与图层重映射有效
- 检查器四个分页切换有效
- 时间轴拖动、菱形改时间、缩放、双击新增有效
- 撤销 / 重做（按钮与快捷键）有效
- 工程 v3 保存 / 加载 / v1 迁移 / 自动保存有效
- 图层位置与图片随关键帧变化有效
- MP4 导出有效，横屏 1920×1080、竖屏 1080×1920
- MP4 同时含 H.264 视频和 AAC 音频
- 导出可取消，导出弹窗可用 Esc 关闭
- 纯画面预览保留视频/背景且不拉伸；OBS 透明模式保留透明底、只留 HUD
- 贴纸可点选、拖入、缩放、删除，选中贴纸后仍能正常切换其他组件

最终分发包：

§§§text
D:\Agent\stardew-vlog-ui-handoff-v2.zip
§§§

源码目录：

§§§text
D:\Agent\stardew-vlog-ui-exact
§§§

项目已经是 Git 仓库（本轮初始化），继续开发前建议先确认工作区干净。

## 17. 常用调试检查

### 页面能打开但没有 HUD

检查：

1. 是否加载了最新的 §app-bundle.js§。
2. 修改源码后是否运行了 §npm run build§。
3. 浏览器控制台是否有字体或图片加载错误。
4. §window.vlogHUD.ready§ 是否为 §true§（测试脚本等的就是它）。
5. §previewStage§ 与 §hudCanvas§ 是否具有相同纵横比。

### 拖动框和素材不对齐

重点检查：

- 是否误给 §.preview-stage§ 加了占空间的 §border§。
- §componentBounds()§ 是否仍包含金币栏和体力数值区。
- §updateSelectionBoxes()§ 是否使用 §stageRect§ 的实际宽高。
- Canvas 宽高比是否被 CSS 改变。

### 关键帧行为异常

检查：

1. “自动关键帧”开关状态（§#autoKeyInput§）。
2. 播放头是否正好落在某个关键帧上（0.045 秒容差）。
3. §stateAtTime()§ 的关键帧排序是否仍然有序（拖动后会重新排序）。
4. 图层插值只在“平滑”开启且两帧都有对应图层时生效。

### MP4 导出失败

检查：

1. 是否使用新版 Edge 或 Chrome。
2. §MediaRecorder.isTypeSupported("video/mp4")§ 的结果。
3. Canvas 是否被本地图片污染。
4. 是否重新运行过 bundle 构建。
5. 原视频是否带有浏览器无法解码的编码。
6. 导出日志 §#exportLog§ 里的编码和错误行。

### AI 生图不可用

检查：

1. 是否通过 §start-overlay.cmd§ 从 HTTP 打开页面。
2. 是否填写 API Key。
3. 当前账号是否有目标模型权限。
4. §server.mjs§ 是否能访问 §api.openai.com§。
5. 浏览器控制台和终端是否有错误响应。

### 自动保存不生效

1. §file://§ 下 Chrome/Edge 的 localStorage 可用，但不同路径的 file:// 页面共享同一个存储域。
2. 工程超过约 4.5MB 会自动关闭自动保存，控制台有提示。
3. 浏览器隐私模式或禁用站点数据时不可用。

## 18. 建议后续优先级

### P0（本轮已完成）

- ✅ 撤销 / 重做（含手势合并与快捷键）。
- ✅ 工程 JSON 版本迁移（v1 → v2）。
- ✅ 保存时记录视频文件名、时长、分辨率和帧率（帧率尽力而为）。
- ✅ 导出取消按钮和编码状态日志。
- ⬜ 大视频（数十分钟、4K）下的内存与长时间导出测试仍待做；建议用 10 分钟 1080p 片源跑一次导出，观察内存曲线和 MediaRecorder 稳定性。

### P1

- ⬜ 时间轴多轨道（场景 / 字幕 / 图层分轨显示与独立编辑）。
- ⬜ 关键帧缓动曲线（目前只有开关式线性平滑）。
- ⬜ 文本自动换行样式、字号和颜色配置。
- ⬜ 内置裁剪功能，让上传图片直接裁成透明像素图标。
- ⬜ ComfyUI 等本地 AI 后端适配。
- ⬜ 导出分辨率选项（1080p/720p）与码率设置。

### P2

- ⬜ 使用 WebCodecs + MP4 muxer 或 FFmpeg.wasm 实现非实时、帧精确导出。
- ⬜ 自动化测试接入 CI（目前是本地 CDP 脚本）。
- ⬜ 移动端触控布局。
- ⬜ 工程内嵌原视频的“打包导出”模式（体积大，需权衡）。

## 19. 视觉与交互约定（工作台改版）

改版方向叫“谷仓剪辑台”：深胡桃木工作台、黄铜控件、羊皮纸标签，原版像素 HUD 是画面里唯一的亮色。所有视觉决定都围绕这一条，新增元素如果不能强化它就不要加。

### 颜色与表面

| 变量 | 值 | 用途 |
| --- | --- | --- |
| §--ink-0…--ink-4§ | #0f0a06 / #171009 / #1f160e / #281c12 / #322417 | 外壳、面板、浮起面、输入底 |
| §--line / --line-strong§ | #3d2c1c / #5a4128 | 细分隔线 / 强分隔与输入边框 |
| §--text / --text-dim / --text-mute§ | #f4e6c8 / #c2a97f / #a38c69 | 正文 / 次要 / 说明 |
| §--brass / --brass-bright§ | #e9c169 / #f6d78d | 主操作、选中、播放头高亮 |
| §--ember§ | #e07a3f | 当前关键帧、取消/危险提示 |
| §--danger§ | #d1543a | 取消导出 |

- 一套表面只用一层线：分区块用 1px §--line§，输入用 §--line-strong§，主按钮用 2px 硬阴影，不做双层边框。
- 像素风意味着直角、硬阴影、无模糊；不要给按钮加圆角和柔和投影。

### 字体与尺度

- 中文界面字体：§"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", sans-serif§，正文 13px。
- 数字与时间码：§Consolas, monospace§ + §font-variant-numeric: tabular-nums§，避免拖动时数字跳动。
- 分区标题 12px + 0.08em 字距；英文小标签（LIBRARY / CLOCK / EXPORT）9px + 0.16em；说明文字 10–11px。
- 时间码、帧号这类会变化的数字一律等宽，位置固定。

### 结构与响应式

- 三栏尺寸：252 / 1fr / 336；≤1280px 为 224 / 1fr / 300；≤1080px 素材库变抽屉；≤860px 单列 + 时间轴吸底。
- 监看台比例靠容器查询单位维持，不要用 JS 计算尺寸。
- 顶部状态摘要（§#frameSummary§）常驻，显示当前日期/天气/时间与“关键帧/播放头 + 时间”，任何场景参数变化都要同步。

### 动效

只保留三处，全部是像素风短促过渡（§steps(3, end)§、90–140ms）：

1. 检查器分页切换：§panel-in§ 淡入 + 4px 上移。
2. 导出弹窗打开：§dialog-in§ 淡入 + 8px 上移。
3. 关键帧菱形与按钮：hover 放大、按下位移、时间轴播放头跟随。

§prefers-reduced-motion: reduce§ 时全部压到 1ms。

### 独立评审与修正（2026-11-11）

改版完成后派了两个不带历史上下文的子代理：一个只看 6 张截图做视觉评审（6.0/10：气质 8.5、骨架 4.5），一个用浏览器从真实入口走主流程做 UX 走查（顺畅度 3/5）。已据此修正：

- 时间轴补了视频轨（文件名 + 时长 + 宽度按片长占比），标尺与轨道共轴。
- 顶栏补了“打开 / 保存”工程入口，不再只藏在导出弹窗里；Ctrl+S 仍然可用。
- 无视频时禁用“导出成片”，避免空操作；导出弹窗加“关键帧数 · 时长 · 分辨率”摘要，按钮改叫“导出整段动画”。
- 自动建帧后底部的关键帧计数立即同步（之前要等下一条指令才刷新）。
- 时间输入只接受完整的 §HH:MM§，不会再因为输入中间态被写成 08:30。
- 播放头加粗并加了拖动时间气泡；拖动菱形时同样显示时间。
- 图层页加了 X / Y 数值输入，缩放手柄从 10px 放大到 14px。
- 只有选中的图层显示缩放手柄，其余只留虚线框；禁用按钮改为降饱和 + 暗底，能一眼看出点不动。
- 场景预设改成 3 列 3 行，避免右下空一格；≤1280×820 视口压缩了间距和道具列数，1180×760 下左右两栏不再中途截断。
- 监看台提示从不必要的“快捷键清单”移到播放器右侧，左栏只留素材与道具。

仍未做（评审提出、但属于下一轮骨架工作）：时间轴的视频 trim 与缩略图条、右侧检查器合并成单页折叠、竖屏下按画幅锚点重排 HUD 模块、把导出参数（格式/码率/帧率/预计大小）显式列出。

### 第四轮：关键帧落点与体验修正（2026-11-11 晚）

用户反馈“点了添加关键帧，没有按进度条的位置落帧”。复现后确认在“已导入视频 + 用鼠标拖播放头/点标尺”的路径下落点是准确的（`qa/verify.mjs timelineEdge`），真正的问题是两类：

1. **没有视频时时间轴仍可拖动、点加帧只会在 0 秒默默更新**——用户很容易把它当成“加帧失灵”。
2. **加帧/更新只弹一句 toast，新帧又被播放头压住**，看不出加在哪。

对应修正：

- 无视频时禁用“添加关键帧”（播放器与时间轴两处），时间轴标尺/轨道降透明度并显示空状态；顶栏显示“未导入视频 · 初始场景”，底栏显示“初始场景 · 导入视频后可打关键帧”。
- 加帧按钮移到时间轴工具条（`#addKeyframeDockButton`）与播放器（`#addKeyframeButton`）两处，都按当前播放头落帧；重复落点只更新，不复用旧内容。
- 新帧播放一次 `kf-pop` 闪烁，选中帧在轨道上方常驻时间标签（`#activeFrameLabel`）。
- 暂停时以 `playhead` 为准、播放时才以 `video.currentTime` 为准，避免视频 seek 未落地时落帧位置漂移。
- 拖动菱形与已有帧重叠时贴到邻居旁边停住，并明确提示“该时间已有关键帧，已停在 00:00.05”。
- 播放头把手加大，标尺改为 `cursor: ew-resize`，底栏提示改成“点/拖时间轴定位播放头”。
- 导出期间屏蔽空格/方向键/K/Delete 和撤销重做，避免实时录制被打断；快速连按空格触发的 `play()` AbortError 不再冒到控制台。
- 加载工程会暂停播放并清空撤销历史；`Ctrl+S` 在输入框里也会保存工程而不是弹出浏览器保存网页。
- 新增干净测试片 `previews/vlog-sample.mp4`（6 秒 1080p + AAC），避免演示视频里自带 HUD 造成“双 HUD”误解。

新增回归分组：`timelineEdge`（9 项落点/去重/重叠/缩放）、`controls`（21 项全控件）、`shortcuts`（11 项）、`projectDeep`（7 项全量往返）、`robustness`（9 项异常路径），以及 `node qa/http-check.mjs` 的 HTTP + AI 代理 8 项。

### 改版时容易踩的坑

- §body.clean§ 不能隐藏 §.app-shell§，否则 OBS 透明模式会把画布一起隐藏；只隐藏各区。
- 时间轴、检查器都依赖 §app.js§ 顶部 §ui§ 表里的 id；重命名 HTML 时同步改 §ui§ 和 §qa/verify.mjs§。
- 素材库与预设列表用 §minmax(0, 1fr)§，普通 §1fr§ 会被图片的固有宽度撑破。
- 不要用 PowerShell 批量替换 UTF-8 文本文件（曾把中文注释写坏），统一用编辑工具改。

## 20. 素材使用边界

项目里包含从用户本机 Steam 游戏文件提取的原版图片和字体。它们不是项目作者原创的公开素材。

- 保留在本机作为个人剪辑模板使用问题较小。
- 如果准备商业化、投流、转发素材包或公开展示原版美术资源，需要另行确认授权。
- 分发代码时，建议把原版素材替换为可公开授权的资源，或在打包时排除。
