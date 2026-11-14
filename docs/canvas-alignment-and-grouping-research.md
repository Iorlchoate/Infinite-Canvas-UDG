# DX OS 画布：辅助线吸附与分组功能逆向研究 & 改造建议

> 研究对象：本机安装的 DX OS 便携版（`E:\AI\DXOS-Portable-0.6.8-win-x64`，实际运行 runtime `0.8.5`）
> 目标仓库：`F:\Deepseek PR\Infinite-Canvas-UDG`
> 说明：以下结论来自对本地安装包的行为与前端代码分析，用于独立实现同等交互；没有把对方源码整段搬进本仓库。文中的常量（7px、18/52、16px 等）是交互参数，不是可版权化的表达。
>
> **实施状态（2026-11-14）**：
> - 第一阶段「辅助线吸附」已完成：拖动吸附 + 右下角缩放吸附，并通过浏览器实测。
> - 第二阶段「分组容器」已完成：52px 标题栏、18px 内边距、网格整理、标题重命名、整理按钮、子项拖入/拖出/缩放后的自动贴合。
> - 第三阶段已完成：分组浮动工具栏（全屏 / 下载全部 / 合并长图 / 整理 / 解散 / 删除）与「解散分组」；组内滚动、等间距吸附、吸附开关仍为可选。
> - 性能与 UI 修复已完成：大画布视口裁剪；空画布与新建面板不再重叠；自定义工作流「生成画布」改为吸顶操作条。
> 改动文件：`static/canvas.html`（参考线 DOM）、`static/css/canvas.css`（参考线/分组/工具栏样式）、`static/js/canvas.js`（吸附、分组几何、整理、标题、工具栏、解散、长图合并）。
> 实测：左/中/右/上/中/下吸附、右边缘贴左边缘、多选整体包围盒、37%/159% 两档缩放、Ctrl 关闭吸附、松手隐藏、分组拖动级联、同组子项右下角缩放吸附、分组自动适配、网格整理、标题持久化、工具栏整理/下载/合并/解散，全部通过。

---

## 0. 先说结论

1. **截图里的蓝色虚线是“拖动时的对齐参考线”**，不是素材面板里的东西。截图面板中的文字其实是「素材传输」（URL / Base64），不是「素材辅助线」。蓝线只在拖动节点时出现，松手即消失。
2. DX OS 的吸附规则很克制：**只对 6 个锚点做吸附**（左/中/右、上/中/下），阈值 **7 个屏幕像素**，每个轴只显示**一条最近的参考线**，吸附后节点会真的贴上去，而不是只画线。
3. 参考线的视觉参数是固定的：`#2698ff`、1px、`repeating-linear-gradient` 3px 实 / 6px 空、整体透明度 `0.56`、`scaleX(.78)`。
4. DX OS 的分组是**“容器卡片”模型**：所有卡片平铺存储，子卡片用 `groupId` 指向分组；分组本身也是卡片，有 52px 标题栏、18px 内边距、最小 280×180；移动分组会级联移动所有后代；拖动结束时按“中心点落在哪个分组”重新判定归属；「整理」按宽高比自动排成网格，间距 16px。
5. 当前仓库已经有 70% 的基础：分组节点、分组拖动级联、拖动结束后的中心点归属判断都在。**真正缺的是：吸附/参考线、分组网格整理、分组标题、自动适配分组边框。** 这三块都可以在现有模型上增量完成，不需要重写画布。

---

## 1. 逆向环境与代码位置

### 1.1 安装包结构

便携版本体在：

```
E:\AI\DXOS-Portable-0.6.8-win-x64\
├─ DX OS.exe                         # 启动器
├─ .dx-runtime\versions\
│  └─ runtime-0.8.5-...\             # 实际运行的 Electron runtime
│     ├─ DX OS.exe
│     └─ resources\
│        ├─ app.asar                 # 只有主进程（main.cjs / preload.cjs 等）
│        └─ app.asar.unpacked\
│           ├─ dist\                 # ★ 真正的渲染层（Vue 构建产物）
│           ├─ server\               # ★ 未压缩的后端 TS 源码
│           ├─ shared\
│           └─ src\apps\
└─ data\                             # 用户数据（画布、SQLite、缓存等）
```

两个关键发现：

- **`app.asar` 里没有界面代码**，只有 Electron 主进程。界面在 `resources/app.asar.unpacked/dist`。
- 解包目录里还带着**未压缩的 `server/*.ts`**（`canvas.ts`、`canvasAssetLibrary.ts` 等），比反编译前端 bundle 好读得多。后续要研究画布数据结构、素材库、导出逻辑，优先看这里。

画布前端入口：

```
resources\app.asar.unpacked\dist\assets\CanvasApp-pc5eI935.js   # 1.27 MB
```

本地服务由主进程起在 `http://127.0.0.1:5275`，渲染层就是从这个端口加载的。

### 1.2 我做了什么

- 解包 `app.asar`，确认主进程只负责窗口/更新/本地服务。
- 用 Prettier 把 `CanvasApp-*.js` 格式化成 10 万行可读代码，定位到：
  - 参考线 DOM/CSS/状态：搜索 `alignment-guide`
  - 吸附算法：`SC()` / `mY()` / `pY()`
  - 分组创建：`J8()`
  - 分组整理：`G5()`
  - 分组适配：`W8()` / `Ui()`
  - 分组移动级联：`Yd()`
  - 拖动结束后的归属判定：`PC()` + `ph()` 内的 `groupId` 重写
- 对照本仓库 `static/js/canvas.js` 的节点模型、拖动、分组逻辑，给出下面的增量方案。

> 复现研究环境（可选）：
> ```powershell
> npx @electron/asar extract "<...>\resources\app.asar" .tmp\dxos-asar
> npx prettier "<...>\assets\CanvasApp-pc5eI935.js" --parser babel > CanvasApp.pretty.js
> ```

---

## 2. 辅助线吸附：DX OS 到底怎么做的

### 2.1 DOM 与 CSS

渲染层里只有两个元素：

```html
<div class="alignment-guide vertical"   style="left: ...px"></div>
<div class="alignment-guide horizontal" style="top:  ...px"></div>
```

它们挂在画布视口层（屏幕坐标），不是挂在 world 层，所以线宽不随缩放变粗。位置计算是：

```js
left = guideX * viewport.scale + viewport.x
top  = guideY * viewport.scale + viewport.y
```

对应 CSS（`Be1wzNGj.css`，`data-v-08583592`）：

```css
.alignment-guide {
  position: absolute;
  z-index: 6;
  pointer-events: none;
  opacity: .56;
}
.alignment-guide.vertical {
  top: 0; bottom: 0;
  width: 1px;
  transform: translate(-.5px) scaleX(.78);
  background: repeating-linear-gradient(to bottom, #2698ff 0 3px, transparent 3px 9px);
}
.alignment-guide.horizontal {
  left: 0; right: 0;
  height: 1px;
  transform: translateY(-.5px) scaleY(.78);
  background: repeating-linear-gradient(to right, #2698ff 0 3px, transparent 3px 9px);
}
```

要点：

- 线是**整屏贯穿**的，不是只画在两个节点之间。
- 虚线段是 3px 实、6px 空（3px 到 9px），不是常见的 4/4。
- `scaleX(.78)` 让 1px 线在视觉上更细，接近 0.78px。
- 颜色 `#2698ff` 与选中框 `#168cff` 是两套蓝，不要混用。

### 2.2 吸附算法

#### 拖动开始时：一次性建立吸附计划

`SC(origin, cardById, threshold)`：

1. 取所有“正在移动”的卡片（多选时是多个，分组时包含后代）。
2. 算出移动集合的包围盒：
   ```js
   left   = min(x)
   top    = min(y)
   right  = max(x + w)
   bottom = max(y + h)
   ```
3. 取所有**不参与移动**且可见的卡片，把它们的 3 条 X 锚点和 3 条 Y 锚点收集成有序数组：
   ```js
   targetX = [x, x + w / 2, x + w, ...]
   targetY = [y, y + h / 2, y + h, ...]
   ```
4. 阈值：
   ```js
   threshold = Math.max(7 * scaleX, 7 * scaleY)
   ```
   其中 `scaleX/scaleY` 是“屏幕 1px 对应多少世界单位”，所以**无论画布缩放多少，手感都是 7 个屏幕像素**。

#### 拖动过程中：纯算术，不再读 DOM

`mY(plan, dx, dy)`：

```js
movingX = [left + dx, (left + right) / 2 + dx, right + dx]
movingY = [top + dy,  (top + bottom) / 2 + dy, bottom + dy]
```

对每个移动锚点，在目标锚点里找**最近的**一个；如果距离 ≤ 阈值，就记录 `delta = target - moving`。X、Y 各自只保留距离最小的一个：

```js
return {
  dx: dx + (bestX?.delta || 0),
  dy: dy + (bestY?.delta || 0),
  guideX: bestX?.guide ?? null,
  guideY: bestY?.guide ?? null,
};
```

关键行为：

- **吸附的是移动集合的包围盒**，不是单个节点。多选 3 个节点时，看的是 3 个节点的整体外框；整体外框的左/中/右会分别去贴目标。
- **每个轴只显示一条线**，不会同时出现“左对齐 + 右对齐”两条。
- 线画在**目标锚点**上（`guide = target`），不是移动锚点上。
- 没有吸附时 `guideX/guideY = null`，线隐藏。
- 只做“边/中心对齐”，**不做等间距（spacing）吸附**，也没有网格吸附。

#### 参与吸附的对象

- 所有未选中的、可见的卡片，**包括分组卡片本身的边框**。
- 拖动分组时，分组及其全部后代从目标集合里排除，避免自己贴自己。
- 分组内的子卡片跟着分组一起移动（`Yd` 级联），所以它们也属于移动集合。

### 2.3 为什么值得学

- 计划只在 `pointerdown` 时算一次，`pointermove` 里只有几十次比较，几百个节点也不掉帧。
- 阈值用屏幕像素换算，缩放后手感一致。
- 只给一条线，视觉干净，不会出现“满屏参考线”。

---

## 3. 分组：DX OS 的“容器卡片”模型

### 3.1 数据模型

DX OS 的卡片是**平铺数组**，没有 `items` 嵌套：

```ts
type Card = {
  id: string
  kind: 'image' | 'video' | 'prompt' | 'group' | ...
  x: number; y: number; w: number; h: number
  groupId?: string          // 指向父分组；分组自己也可以有 groupId（支持嵌套）
  title?: string
  params: { protocolParams?: Record<string, any> }
  inputs: MediaRef[]
  ...
}
```

层级关系靠 `groupId` 反查，配合：

- `Qb(card, id)`：祖先链上是否有 `id`，用来防环。
- `zs(card)` / `ln(card)`：分组滚动/折叠时修正视觉 y 与高度。
- `PC(card)`：判断卡片中心落在哪个分组里。

分组本身也是卡片，有 `kind: 'group'`、`title`、`w/h`。

### 3.2 创建分组

`J8()`：把选中的非分组卡片包成一个新分组。

```js
const left   = min(card.x)
const top    = min(card.y)
const right  = max(card.x + card.w)
const bottom = max(card.y + ln(card))

group.x = left - 18
group.y = top - 70          // 52 标题栏 + 18 内边距
group.w = max(280, right - left + 36)
group.h = max(180, bottom - top + 88)   // 52 + 18 + 18
group.title = '新建分组'
```

然后把每个子卡片的 `groupId` 指向新分组，再调用 `W8()` 做一次适配。

空分组（双击空白处）默认 `560 × 380`，标题也是「新建分组」。

### 3.3 分组外观

- 外框：`1.5px` 实线，颜色是 `ink-faint` 48% 混合，圆角 `18px`，`overflow: hidden`。
- 选中：边框 `#2698ff`，外加 `0 0 0 2px rgba(38,152,255,.2)` 的光环。
- 标题栏：高 `52px`，左侧一个分组图标，中间是可编辑的 `input`（`field-sizing: content`），右侧显示 `N 张 · 2 图片 · 1 文本`。
- 空分组：标题栏下方居中显示「把卡片拖到这里」，整块区域可拖动。
- 分组 `z-index: 0`，子卡片在它上面；所以分组是一个“底板”，不是盖住内容的卡片。

### 3.4 移动分组：级联

`Yd(canvas, group, nextX, nextY)`：

```js
const dx = nextX - group.x
const dy = nextY - group.y
group.x = nextX; group.y = nextY

// 递归移动所有后代（支持嵌套分组）
const stack = [group.id]
const seen = new Set()
while (stack.length) {
  const id = stack.pop()
  if (seen.has(id)) continue
  seen.add(id)
  for (const child of canvas.cards.filter(c => c.groupId === id)) {
    child.x += dx
    child.y += dy
    if (child.kind === 'group') stack.push(child.id)
  }
}
```

### 3.5 拖动结束：重新判定归属

`ph()` 的 `pointerup` 分支里：

1. 对每个被拖动的非分组卡片，取它的**中心点**。
2. 用 `PC(card)` 找到中心点所在的分组（从最上层分组开始，排除自己）。
3. 如果归属变了：
   - 旧分组记入待整理集合；
   - 新分组记入待整理集合；
   - `card.groupId = newGroup.id`，或删除 `groupId`。
4. 对每个受影响的分组调用 `Gg()`（内部会走 `W8()` / `Ui()`）重新适配。
5. 分组的输出连接（分组作为素材输出）同步迁移。

注意：**拖动分组本身时不重新判定归属**，否则会把分组自己从父分组里甩出去。

### 3.6 适配：`W8()`

```js
const pad = 18
const head = 52
const left   = min(child.x)
const top    = min(child.y)
const right  = max(child.x + child.w)
const bottom = max(child.y + ln(child))

group.x = left - pad
group.y = top - head - pad
group.w = max(280, right - left + pad * 2)
group.h = max(180, bottom - top + head + pad * 2)
```

### 3.7 整理：`G5()` 的网格算法

这是「整理」按钮真正做的事，不是简单排成一行：

```js
const n = children.length
const aspect = (maxRight - minLeft) / max(1, maxBottom - minTop)  // 当前分组宽高比
const ratio  = clamp(aspect, 0.5, 3)
const cols   = max(1, min(n, round(sqrt(n * ratio))))
const rows   = ceil(n / cols)

const colW = 每列子卡片的最大宽度
const rowH = 每行子卡片的最大高度

// 子卡片位置
x = group.x + 18 + prefixSum(colW) + col * 16
y = group.y + 52 + 18 + prefixSum(rowH) + row * 16

// 分组尺寸
group.w = max(280, 36 + sum(colW) + (cols - 1) * 16)
group.h = max(180, 88 + sum(rowH) + (rows - 1) * 16)
```

几个细节：

- 列数由**当前分组宽高比**决定，所以横长分组排成一行，竖长分组排成多行。
- 行列尺寸取该行/列的**最大值**，不是等分。
- 间距固定 16px，四周 18px，标题栏 52px。
- 先按 `y` 再按 `x` 排序，保持视觉顺序。
- 对“生成结果分组”有另一套 `Ui()`/`Sp()` 布局，这里不展开。

### 3.8 解散分组：`Z5()`

- 删除分组卡片本身；
- 清除所有子卡片的 `groupId`；
- 把分组作为输出源的连接，迁移回原来的子卡片；
- 选中子卡片。

---

## 4. 当前仓库的差距

先看现有实现的关键位置（`static/js/canvas.js`）：

| 能力 | 当前实现 | 位置 |
| --- | --- | --- |
| 节点数据 | `nodes[]`，`x/y/w/h` 直接存 | 344 行附近 |
| 分组节点 | `type: 'group'`，`items: [nodeId]` | `groupSelectedImages()` 10944 |
| 分组创建 | `x = box.x - 24, y = box.y - 58, w = box.w + 48, h = box.h + 90` | 10951 |
| 分组拖动 | `startNodeDrag` 递归收集 `items`，一起改坐标 | 11397–11435 |
| 归属判定 | 拖动结束按中心点重写 `items` | `updateGroupMembership()` 11768 |
| 分组渲染 | 普通节点 + 标题 `Group` + 数量文字 | `renderNode()` 5931 |
| 分组整理 | 只有“整理选中”（按连接深度分列），没有分组网格整理 | `arrangeIdsByConnections()` 11717 |
| 分组标题 | 无，固定 `Group` | 5806 |
| 分组自动适配 | 无，创建后尺寸不再变 | — |
| 分组解散 | 无 | — |
| 辅助线 | 无 | — |
| 拖动 | 直接 `dx = (clientX - sx) / scale` | `onNodeDrag()` 11437 |

差距可以归纳为：

1. **没有吸附层**：拖动是“裸拖”，没有任何对齐反馈。
2. **分组只有“数据容器”语义，没有“视觉容器”语义**：创建时框住一次，之后子节点怎么动，框都不跟着变。
3. **没有整理网格**：现有“整理选中”是按连接关系分列（数据流布局），不适合素材分组。
4. **分组没有标题**：截图里的「新建分组」在仓库里显示为 `Group`。
5. **没有解散分组**：只能删组，子节点会一起被删（`deleteSelected` 会连带 `items`）。

好消息是：分组拖动级联、中心点归属、框在子节点下方（`.group-node { z-index: 0 }`）都已经有了，改造是增量的。

---

## 5. 修改建议

### 5.0 总体原则

- **不要改数据模型**：继续用 `items` 数组，别迁移到 `groupId`。仓库的 `items` 已经能表达嵌套（`collect()` 递归），迁移只会引入兼容问题。
- **吸附做成独立层**：新增加速函数 + 两个 DOM 元素 + 三处 hook，不动节点渲染。
- **分组整理复用现有 `items`**：整理只改子节点坐标和分组 `w/h`，不改归属。
- **所有新行为都要能撤销**：在 `tidyGroup` / `fitGroup` 前调用 `pushUndo()`。
- **视觉参数统一常量**：`GROUP_PAD = 18`、`GROUP_HEAD = 52`、`GROUP_GAP = 16`、`SNAP_PX = 7`。

---

### 5.1 第一阶段：辅助线吸附（0.5–1 天）

#### 5.1.1 加 DOM

`static/canvas.html`，在 `#board` 里、`#selectionBox` 之后加：

```html
<div id="snapGuides" class="snap-guides" aria-hidden="true">
    <div id="snapGuideV" class="alignment-guide vertical"></div>
    <div id="snapGuideH" class="alignment-guide horizontal"></div>
</div>
```

位置建议放在第 63 行 `selectionBox` 后面。它在 `#world` 之外，所以是屏幕坐标。

#### 5.1.2 加 CSS

`static/css/canvas.css` 末尾（或 `.selection-box` 附近）加：

```css
.snap-guides { position:absolute; inset:0; pointer-events:none; z-index:23; display:none; }
.snap-guides.on { display:block; }
.alignment-guide { position:absolute; display:none; pointer-events:none; opacity:.56; }
.alignment-guide.on { display:block; }
.alignment-guide.vertical {
    top:0; bottom:0; width:1px;
    transform:translate(-.5px) scaleX(.78);
    background:repeating-linear-gradient(to bottom, #2698ff 0 3px, transparent 3px 9px);
}
.alignment-guide.horizontal {
    left:0; right:0; height:1px;
    transform:translateY(-.5px) scaleY(.78);
    background:repeating-linear-gradient(to right, #2698ff 0 3px, transparent 3px 9px);
}
```

`z-index: 23` 要比 `selection-box`（22）高、比 minimap/弹层低。

#### 5.1.3 加状态与算法

在 `canvas.js` 的全局状态区（`let dragNode = null;` 附近）加：

```js
// ── 对齐吸附 ─────────────────────────────────────────────
const SNAP_PX = 7;                 // 屏幕像素阈值，和 DX OS 一致
let dragSnapPlan = null;
const snapGuides = document.getElementById('snapGuides');
const snapGuideV = document.getElementById('snapGuideV');
const snapGuideH = document.getElementById('snapGuideH');
```

在 `nodeRect()` 之后加以下函数（都是新增，不改旧函数）：

```js
function snapRectOf(node){
    const r = nodeRect(node);
    return { x:r.x, y:r.y, w:r.w, h:r.h, right:r.x + r.w, bottom:r.y + r.h };
}

function buildSnapPlan(movingIds){
    const movers = nodes.filter(n => movingIds.has(n.id));
    if(!movers.length) return null;

    const rects = movers.map(snapRectOf);
    const box = {
        left:   Math.min(...rects.map(r => r.x)),
        top:    Math.min(...rects.map(r => r.y)),
        right:  Math.max(...rects.map(r => r.right)),
        bottom: Math.max(...rects.map(r => r.bottom))
    };

    const xs = [];
    const ys = [];
    for(const n of nodes){
        if(movingIds.has(n.id)) continue;       // 自己不能贴自己
        const r = snapRectOf(n);
        xs.push(r.x, r.x + r.w / 2, r.right);
        ys.push(r.y, r.y + r.h / 2, r.bottom);
    }

    return {
        box,
        xs: [...new Set(xs)],
        ys: [...new Set(ys)],
        threshold: SNAP_PX / (viewport.scale || 1)
    };
}

function resolveSnap(plan, dx, dy){
    if(!plan) return { dx, dy, guideX:null, guideY:null };
    const b = plan.box;

    const movingX = [b.left + dx, (b.left + b.right) / 2 + dx, b.right + dx];
    const movingY = [b.top + dy,  (b.top + b.bottom) / 2 + dy, b.bottom + dy];

    let bestX = null;
    for(const mx of movingX){
        for(const tx of plan.xs){
            const delta = tx - mx;
            const dist = Math.abs(delta);
            if(dist <= plan.threshold && (!bestX || dist < bestX.dist)){
                bestX = { delta, guide:tx, dist };
            }
        }
    }

    let bestY = null;
    for(const my of movingY){
        for(const ty of plan.ys){
            const delta = ty - my;
            const dist = Math.abs(delta);
            if(dist <= plan.threshold && (!bestY || dist < bestY.dist)){
                bestY = { delta, guide:ty, dist };
            }
        }
    }

    return {
        dx: dx + (bestX ? bestX.delta : 0),
        dy: dy + (bestY ? bestY.delta : 0),
        guideX: bestX ? bestX.guide : null,
        guideY: bestY ? bestY.guide : null
    };
}

function renderSnapGuides(guideX, guideY){
    if(!snapGuides) return;
    const on = guideX !== null || guideY !== null;
    snapGuides.classList.toggle('on', on);
    if(guideX !== null){
        snapGuideV.classList.add('on');
        snapGuideV.style.left = `${guideX * viewport.scale + viewport.x}px`;
    } else {
        snapGuideV.classList.remove('on');
    }
    if(guideY !== null){
        snapGuideH.classList.add('on');
        snapGuideH.style.top = `${guideY * viewport.scale + viewport.y}px`;
    } else {
        snapGuideH.classList.remove('on');
    }
}

function hideSnapGuides(){ renderSnapGuides(null, null); }
```

性能说明：`xs/ys` 是数组，`resolveSnap` 每次移动做 `3 × (2N)` 次比较。200 个节点以内完全够用；如果以后上千个节点，把 `xs/ys` 排序后二分查找即可（DX OS 就是这么做的）。

#### 5.1.4 三处 hook

**(1) `startNodeDrag()`：在 `children` 算完之后**

```js
const children = [...collected.values()];
dragSnapPlan = buildSnapPlan(new Set([dragTarget.id, ...children.map(c => c.node.id)]));
dragNode = { node: dragTarget, children, sx:e.clientX, sy:e.clientY, ox:dragTarget.x, oy:dragTarget.y };
```

注意要放在 `duplicateNodesForAltDrag` 之后，这样 Alt 复制时吸附的是复制出来的节点。

**(2) `onNodeDrag()`：把原始 dx/dy 换成吸附后的**

```js
let dx = (e.clientX - dragNode.sx) / viewport.scale;
let dy = (e.clientY - dragNode.sy) / viewport.scale;

// Ctrl/⌘ 暂时关闭吸附，方便微调。
// 不用 Shift：Shift 是画布“小刀模式”的全局修饰键，会吃掉拖动；
// 不用 Alt：Alt 在按下时已被“复制拖动”占用。
const snapDisabled = e.ctrlKey || e.metaKey;
if(dragSnapPlan && !snapDisabled){
    const snapped = resolveSnap(dragSnapPlan, dx, dy);
    dx = snapped.dx;
    dy = snapped.dy;
    renderSnapGuides(snapped.guideX, snapped.guideY);
} else {
    hideSnapGuides();
}
```

**(3) `endDrag()`：清状态**

在函数开头加：

```js
dragSnapPlan = null;
hideSnapGuides();
```

同时在 `startNodeResize()` 开头也加 `hideSnapGuides()`，避免拖拽中切到缩放时残留。

#### 5.1.5 边界情况

- **多选**：`children` 已经包含所有选中节点和分组后代，包围盒逻辑自动成立。
- **分组**：`collect()` 会递归 `items`，分组移动时子节点也在 `movingIds` 里，不会自己贴自己。
- **缩放**：阈值是 `7 / scale`，缩放后手感一致。
- **Alt 复制**：`dragSnapPlan` 在复制之后构建，贴的是副本。
- **Shift**：按住 Shift 会进入“小刀模式”，不能用来关闭吸附。
- **Ctrl/⌘**：按住 Ctrl（macOS 为 ⌘）拖动时不吸附，适合 1px 微调。
- **缩放动画/惯性**：如果以后加平滑缩放，参考线用的是 `viewport` 当前值，拖动中缩放会实时更新；但 `plan.threshold` 是按下时算的，极端情况下略有偏差，可接受。

---

### 5.1.6 右下角缩放吸附（追加）

拖动是“整体移动”，缩放是“固定左上、改右下”。两者不能共用同一个计划，否则缩放时会把左/上边也拿去吸附。实现上单独一套：

- **锚点**：只取缩放节点的 `right` 和 `bottom`，去匹配其他节点的 3 条 X / 3 条 Y 锚点；
- **阈值**：同样 `7 / viewport.scale`，和拖动一致；
- **目标集合**：所有其他节点，包括同组子项和分组框本身；
- **关闭键**：Ctrl/⌘；
- **最小尺寸保护**：如果命中的目标比节点最小宽/高还小，尺寸会被夹住，此时隐藏对应轴的参考线，避免“线在但没对齐”。

```js
function buildResizeSnapPlan(node){
    const xs = [], ys = [];
    nodes.forEach(n => {
        if(n.id === node.id) return;
        const r = snapRectOf(n);
        if(!r.w || !r.h) return;
        xs.push(r.x, r.x + r.w / 2, r.right);
        ys.push(r.y, r.y + r.h / 2, r.bottom);
    });
    return {
        xs: [...new Set(xs)],
        ys: [...new Set(ys)],
        threshold: SNAP_PX / (viewport.scale || 1)
    };
}
function resolveResizeSnap(plan, right, bottom){
    const bx = closestSnapAnchor(plan.xs, right, plan.threshold);
    const by = closestSnapAnchor(plan.ys, bottom, plan.threshold);
    return {
        right: right + (bx ? bx.delta : 0),
        bottom: bottom + (by ? by.delta : 0),
        guideX: bx ? bx.guide : null,
        guideY: by ? by.guide : null
    };
}
```

`startNodeResize()` 里记录 `left/top` 并构建计划；`onNodeResize()` 里把 `left + nextW`、`top + nextH` 交给 `resolveResizeSnap()`，再反算 `nextW/nextH`；`endDrag()` 清空 `resizeSnapPlan`。

实测（同组两个子项）：把 A 的右下角拖到 B 的左边缘/下边缘附近 6px，A 会自动贴到 `A.right = B.left`、`A.bottom = B.bottom`，竖线和横线同时出现；Ctrl 关闭后保留 6px 间距。

---

### 5.2 第二阶段：分组容器补齐（已完成）

#### 5.2.1 统一常量

在 `canvas.js` 顶部或分组函数附近：

```js
const GROUP_PAD = 18;     // 左右/底部内边距
const GROUP_HEAD = 52;    // 标题栏高度
const GROUP_GAP = 16;     // 整理时间距
const GROUP_MIN_W = 280;
const GROUP_MIN_H = 180;
```

如果不想动现有 42px 的 `.node-head`，也可以先用 `GROUP_HEAD = 42 + 16 = 58`、`GROUP_PAD = 24`，和现有 `groupSelectedImages()` 的 24/58 对齐；但推荐一步到位改成 52/18，视觉更接近截图。改法：

```css
.group-node .node-head,
.promptGroup-node .node-head {
    height:52px;
    flex:0 0 52px;
    border-radius:17px 17px 0 0;
}
.group-node,
.promptGroup-node {
    background:transparent;
    border:1.5px solid #cbd5e1;
    box-shadow:none;
}
.group-node.selected,
.promptGroup-node.selected {
    outline:none;
    border-color:#2698ff;
    box-shadow:0 0 0 2px rgba(38,152,255,.2);
}
```

#### 5.2.2 自动适配：`fitGroupToItems()`

```js
function fitGroupToItems(group){
    if(!group || group.type !== 'group') return;
    const items = (group.items || []).map(id => nodes.find(n => n.id === id)).filter(Boolean);
    if(!items.length){
        group.w = Math.max(GROUP_MIN_W, group.w || 300);
        group.h = Math.max(GROUP_MIN_H, group.h || 220);
        return;
    }
    const rects = items.map(nodeRect);
    const left   = Math.min(...rects.map(r => r.x));
    const top    = Math.min(...rects.map(r => r.y));
    const right  = Math.max(...rects.map(r => r.x + r.w));
    const bottom = Math.max(...rects.map(r => r.y + r.h));

    group.x = left - GROUP_PAD;
    group.y = top - GROUP_HEAD - GROUP_PAD;
    group.w = Math.max(GROUP_MIN_W, right - left + GROUP_PAD * 2);
    group.h = Math.max(GROUP_MIN_H, bottom - top + GROUP_HEAD + GROUP_PAD * 2);
}
```

#### 5.2.3 整理网格：`tidyGroup()`

```js
function tidyGroup(group){
    if(!group || group.type !== 'group') return;
    const items = (group.items || [])
        .map(id => nodes.find(n => n.id === id))
        .filter(Boolean)
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    if(!items.length) return;

    pushUndo();

    const n = items.length;
    const rects = items.map(nodeRect);
    const width  = Math.max(1, group.w || 560);
    const height = Math.max(1, group.h || 380);
    const ratio  = Math.max(0.5, Math.min(3, width / height));
    const cols   = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * ratio))));
    const rows   = Math.ceil(n / cols);

    const colW = Array.from({ length: cols }, (_, c) =>
        Math.max(...items.filter((_, i) => i % cols === c).map(node => nodeRect(node).w))
    );
    const rowH = Array.from({ length: rows }, (_, r) =>
        Math.max(...items.slice(r * cols, r * cols + cols).map(node => nodeRect(node).h))
    );

    const x0 = group.x + GROUP_PAD;
    const y0 = group.y + GROUP_HEAD + GROUP_PAD;

    items.forEach((node, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = x0 + colW.slice(0, c).reduce((a, b) => a + b, 0) + c * GROUP_GAP;
        const y = y0 + rowH.slice(0, r).reduce((a, b) => a + b, 0) + r * GROUP_GAP;
        node.x = Math.round(x);
        node.y = Math.round(y);
        // 不要强行改 node.w / node.h：图片节点的高度是自适应的，写死会变形。
        // 只有原本就没有尺寸的节点才兜底。
        if(!node.w) node.w = Math.max(220, colW[c]);
        if(!node.h) node.h = Math.max(96, rowH[r]);
    });

    group.w = Math.max(GROUP_MIN_W, GROUP_PAD * 2 + colW.reduce((a, b) => a + b, 0) + (cols - 1) * GROUP_GAP);
    group.h = Math.max(GROUP_MIN_H, GROUP_HEAD + GROUP_PAD * 2 + rowH.reduce((a, b) => a + b, 0) + (rows - 1) * GROUP_GAP);

    render();
    scheduleSave();
}
```

和 DX OS 的差异：DX OS 会按子卡片的自然尺寸调整 `w/h`；仓库的图片节点已经有自己的尺寸，不要强行改成单元格大小，否则会变形。上面只在节点没有尺寸时兜底。

#### 5.2.4 加「整理」按钮和标题

在 `renderNode()` 里，`el.innerHTML = ...` 之后加：

```js
if(node.type === 'group'){
    const head = el.querySelector('.node-head');
    const tidyBtn = document.createElement('button');
    tidyBtn.className = 'group-tidy-btn';
    tidyBtn.type = 'button';
    tidyBtn.title = '整理分组内容';
    tidyBtn.innerHTML = '<i data-lucide="layout-grid" class="w-4 h-4"></i>';
    tidyBtn.onclick = e => { e.stopPropagation(); tidyGroup(node); };
    head.insertBefore(tidyBtn, head.lastElementChild);
}
```

标题部分，把 5806 行的三元表达式改成：

```js
const title = node.type === 'group'
    ? (node.title || '分组')
    : node.type === 'image' ? 'Image' : ...;
```

再做双击重命名：

```js
if(node.type === 'group'){
    const titleEl = el.querySelector('.node-title');
    titleEl.style.cursor = 'text';
    titleEl.title = '双击重命名';
    titleEl.ondblclick = e => {
        e.stopPropagation();
        const next = window.prompt('分组名称', node.title || '分组');
        if(next && next.trim()){
            node.title = next.trim().slice(0, 40);
            titleEl.textContent = node.title;
            scheduleSave();
        }
    };
}
```

如果不想用 `prompt`，可以换成 `contenteditable`，但 `prompt` 最省事，也不会和画布快捷键冲突。

#### 5.2.5 拖动结束后自动适配

在 `endDrag()` 里，`updateGroupMembership(moved)` 之后：

```js
const movedIds = new Set(moved.map(n => n.id));
// 归属变更前可能属于旧分组，先收集旧分组
const touched = new Set(
    nodes.filter(g => g.type === 'group' && (g.items || []).some(id => movedIds.has(id)))
);
updateGroupMembership(moved);
// 归属变更后再收集新分组
nodes.filter(g => g.type === 'group' && (g.items || []).some(id => movedIds.has(id)))
    .forEach(g => touched.add(g));
touched.forEach(fitGroupToItems);
```

注意：`updateGroupMembership` 内部已经会 `render()` 和 `scheduleSave()`，所以 `fitGroupToItems` 之后再 `render()` 一次即可；或者把适配逻辑放进 `updateGroupMembership` 的 `changed` 分支里，避免重复渲染。

#### 5.2.6 创建分组时改用常量

把 `groupSelectedImages()` 里的：

```js
group = {id:uid('grp'), type:'group', x:box.x - 24, y:box.y - 58, w:box.w + 48, h:box.h + 90, items:...};
```

改成：

```js
group = {
    id: uid('grp'),
    type: 'group',
    title: '新建分组',
    x: box.x - GROUP_PAD,
    y: box.y - GROUP_HEAD - GROUP_PAD,
    w: Math.max(GROUP_MIN_W, box.w + GROUP_PAD * 2),
    h: Math.max(GROUP_MIN_H, box.h + GROUP_HEAD + GROUP_PAD * 2),
    items: targets.map(n => n.id)
};
```

`connectSelectionToGenerator()` 里同样的 24/58 也一起改。

#### 5.2.7 分组解散（可选，但建议）

```js
function ungroup(group){
    if(!group || group.type !== 'group') return;
    pushUndo();
    const items = (group.items || []).map(id => nodes.find(n => n.id === id)).filter(Boolean);
    items.forEach(n => {
        // 分组作为输出源时，把连接迁移回子节点
        connections
            .filter(c => c.from === group.id)
            .forEach(c => {
                if(!connections.some(x => x.from === n.id && x.to === c.to) && canConnect(n.id, c.to)){
                    connections.push({ id:uid('c'), from:n.id, to:c.to });
                }
            });
    });
    connections = connections.filter(c => c.from !== group.id && c.to !== group.id);
    nodes = nodes.filter(n => n.id !== group.id);
    selected.clear();
    items.forEach(n => selected.add(n.id));
    syncGeneratorInputs();
    render();
    scheduleSave();
}
```

入口可以放在分组标题栏右键菜单，或选中分组时按 `Ctrl+Shift+G`。

#### 5.2.8 实施记录（2026-11-14）

实际落地的内容：

- 常量：`GROUP_PAD=18`、`GROUP_HEAD=52`、`GROUP_GAP=16`、`GROUP_MIN_W=280`、`GROUP_MIN_H=180`。
- `fitGroupToItems(group)`：按子项包围盒 + 18/52 内边距重算分组 `x/y/w/h`，空分组保持最小 280×180。
- `tidyGroup(group)`：按当前分组宽高比算列数，列宽/行高取该列/行最大值，间距 16，整理前 `pushUndo()`。
- 分组标题：新分组默认「新建分组」，旧分组回退「分组」；双击标题 `prompt` 重命名，刷新后保留。
- 标题栏右侧：节点数量 pill + 「整理」按钮（`layout-grid` 图标）。
- 分组框：透明底板、1.5px 边框、52px 标题栏；选中时蓝色描边 + 2px 光环；子节点始终在框上方。
- 自动适配触发点：
  - 创建分组（`groupSelectedImages` / `connectSelectionToGenerator` / 上传建组）；
  - 子项拖动结束后（无论归属是否变化，父分组都重新贴合）；
  - 子项归属在旧/新分组之间切换时，旧分组和新分组都重新贴合；
  - 子项右下角缩放结束后，父分组重新贴合。
- 未实现：解散分组（5.2.7 仍是可选建议）、组内滚动、分组工具栏。

实测（Playwright + Edge headless）：

| 用例 | 结果 |
| --- | --- |
| 创建分组：标题「新建分组」、数量 3、52px 标题栏、子项在框内 | 通过 |
| 双击重命名「我的素材组」，刷新后仍保留 | 通过 |
| 点击「整理」：子项不重叠、都在框内 | 通过 |
| 拖出子项：分组框收缩、数量变 2 | 通过 |
| 拖回子项：数量变 3、子项在框内 | 通过 |
| 子项贴边但未出组：分组框跟着扩张 | 通过 |
| 子项右下角缩放：分组框跟着变宽 | 通过 |

---

### 5.3 第三阶段（已实现工具栏 / 解散 / 合并长图）

做完前两阶段，基本交互已经对齐。要更接近截图，可以继续：

1. **分组工具栏**：已实现。选中分组时在分组上方浮出「全屏 / 下载全部 / 合并长图 / 整理 / 解散 / 删除」，位置跟随分组；`renderSelectionHub()` 已不再是空函数。
2. **分组内滚动**：子节点超出分组高度时，分组内部滚动（DX OS 的 `result-group-scrollbar`）。仓库可以先用 `overflow:auto` + `y` 偏移，复杂度较高，建议后置。
3. **嵌套分组**：`items` 允许放分组 id，`collect()` 已经递归，`tidyGroup()` 也能处理；注意 `nodeRect()` 对分组取的是分组框尺寸。
4. **等间距吸附**：DX OS 没有，但 Figma 有。如果要做，在 `buildSnapPlan` 里额外收集“相邻节点间距”，拖动时比较三组间距；建议单独开关，避免和边/中心吸附抢优先级。
5. **吸附开关**：在画布设置里加「对齐辅助线」开关，默认开；状态存 `localStorage`。

#### 5.3.1 实施记录（2026-11-14）

- **分组工具栏**：`renderSelectionHub()` 在单选分组时构建浮动工具条，按分组屏幕坐标定位，按钮为 `全屏 / 下载全部 / 合并长图 / 整理 / 解散 / 删除`；图片少于 2 张时隐藏「合并长图」，无图片时隐藏「全屏 / 下载全部」。
- **全屏**：复用 `openGroupLightbox(group.id)`。
- **下载全部**：复用 `downloadGroupNodeImages(group.id)`，导出 zip。
- **合并长图**：新增 `mergeGroupToLongImage(group)`，按最大宽度等比缩放后纵向拼接，导出 `分组名-长图.png`；超过 30000px 时整体缩放，避免 canvas 高度上限。
- **整理**：复用 `tidyGroup(group)`。
- **解散**：新增 `ungroupGroup(group)`，把 `group -> target` 迁移成每个子项 -> target，把 `source -> group` 迁移成 source -> 每个子项，然后把分组从父分组 `items` 中移除并删掉分组本身；子项保留并进入选中状态。
- **删除**：复用 `deleteNodeFromButton(group.id, event)`，只删分组，不删子项。
- **未做**：批量抠图（需要本地/远端抠图通道）、组内滚动、等间距吸附、吸附开关。

实测（Playwright + Edge headless）：

| 用例 | 结果 |
| --- | --- |
| 选中分组出现 6 个工具栏按钮 | 通过 |
| 点击「整理」后子项在框内 | 通过 |
| 点击「合并长图」下载 `素材组-长图.png` | 通过 |
| 点击「下载全部」下载 zip | 通过 |
| 点击「解散」后分组消失、3 个子项保留 | 通过 |

---

## 6. 风险与回归清单

| 风险 | 说明 | 规避 |
| --- | --- | --- |
| `nodeRect()` 布局抖动 | 它读 `offsetWidth/offsetHeight`，每帧调用会强制重排 | 吸附计划只在 `pointerdown` 构建一次；整理时一次性读 |
| 高节点数性能 | `resolveSnap` 是 O(3×2N) | 200 节点内没问题；上千节点改成排序 + 二分 |
| Alt 冲突 | Alt 已被“复制拖动”占用 | 用 Ctrl/⌘ 临时关闭吸附；Shift 是小刀模式，不能用 |
| 分组子节点 z-index | 分组框必须始终在子节点下方 | 保持 `.group-node { z-index:0 }`，不要给分组加 `selected` 提升层级 |
| 缩放阈值 | 阈值是按下时算的 | 拖动中缩放属于极端情况；可在 `wheel` 时重建 plan |
| 撤销 | 整理/适配会改多个坐标 | 操作前 `pushUndo()` |
| 保存兼容 | 新增 `title` 字段 | 旧画布没有 `title` 时回退到「分组」，不影响加载 |
| 删除分组 | 现有 `deleteSelected` 会连带删子节点 | 解散分组要单独实现，不要走删除 |

---

## 7. 验收清单

### 辅助线

- [ ] 两个图片节点，拖动其中一个靠近另一个的左边缘，出现一条竖向蓝虚线，松手后节点边缘与目标对齐。
- [ ] 靠近中心/右边缘同样吸附，且同一时刻只有一条竖线。
- [ ] 上下边缘/中心同理，横线只出现一条。
- [ ] 画布缩放到 50% 和 200%，吸附手感仍是约 7 个屏幕像素。
- [ ] 多选 3 个节点拖动，吸附的是整体外框，不是单个节点。
- [ ] 拖动分组时，分组和子节点一起吸附，且不会吸附到自己的子节点。
- [ ] 按住 Ctrl（macOS 为 ⌘）拖动，不吸附、不显示线。
- [ ] 松手/取消/切到缩放，参考线立即消失。
- [ ] 连线、框选、小地图不受影响。

### 分组

- [ ] 选中 3 张图片点「分组」，分组框刚好包住 3 张图，标题为「新建分组」。
- [ ] 点分组标题栏的「整理」，3 张图按当前宽高比排成 1 行或 2 行，间距 16px。
- [ ] 拖动分组，子节点跟随；拖动子节点出框，归属被移除；拖入另一个分组，归属切换。
- [ ] 归属变化后，旧分组和新分组都自动适配边框。
- [ ] 双击标题可重命名，刷新后仍保留。
- [ ] 缩放分组/画布，参考线和分组框不错位。
- [ ] 撤销「整理」能回到整理前的坐标。
- [ ] 旧画布（没有 `title` 的分组）能正常加载。

---

## 8. 建议的实施顺序

1. **先做吸附**：改动最小，收益最直观，不碰数据模型。预计 100–150 行新代码 + 3 处 hook。
2. **再做分组整理/适配**：复用现有 `items`，只改坐标和 `w/h`，风险可控。
3. **最后做标题/工具栏/解散**：纯 UI 增强，可以按需迭代。

如果只想要“截图里的效果”，第一阶段 + 5.2.2/5.2.3 就够了；5.3 是锦上添花。

---

## 9. DX OS 超大画布性能逆向（追加）

DX OS 画布在卡片很多时不卡，核心不是“某个神奇 API”，而是四层叠加：

1. **视口裁剪（决定性）**
   - 卡片数据仍全量在内存里，但**只把视口附近的卡片挂进 DOM**。
   - `hg` 计算渲染列表：卡片数 `< 40` 时全量渲染；达到 40 后走视口查询。
   - 视口外扩 margin：`max(256, max(viewportW, viewportH) * 0.35)` 屏幕像素。
   - 始终保留：运行中/排队中的卡片、选中卡片、hover 卡片、连线端点、拖拽源/目标、远端协作光标对应卡片。
   - 这样即使画布有几千张卡片，DOM 里通常也只有几十到一两百个。

2. **空间哈希索引**
   - `Mw(entries, cellSize=512, maxCellSpan=4096)` 把卡片按 512px 网格分桶；跨度超过 4096 格的超大卡片放入 `globalEntries`，避免一个卡片塞满整个网格。
   - `wf(index, rect)` 只遍历与查询矩形相交的格子，再按矩形精确相交过滤。
   - 视口查询、框选、hit-test 都走这个索引，避免每次 O(N) 扫描。

3. **浏览器自身的跳过渲染**
   - 卡片视觉层 `.node-visual`：
     ```css
     content-visibility: auto;
     contain-intrinsic-size: auto 320px 240px;
     contain: layout paint style;
     ```
   - 画布视口层 `camera-viewport { overflow: hidden; contain: paint; }`
   - 世界层 `world { contain: layout style; isolation: isolate; }`
   - 图片统一 `loading="lazy"`，视口外的图不请求、不解码。

4. **拖动/缩放时减少主线程工作**
   - 拖动只写 `transform: translate3d(...)`，并给拖拽中的卡片加 `will-change: transform`，不触发布局。
   - `pointermove` 用 `requestAnimationFrame` 合并，一帧最多处理一次。
   - 只做位移，不做重排；松手后再落数据。

### 本仓库已落地的版本

`static/js/canvas.js` 新增：

- `CULL_MIN_NODES = 60`：低于 60 个节点继续全量渲染，保证小画布行为不变。
- `CULL_MARGIN_PX = 700`：视口外扩 700 屏幕像素，减少平移时频繁挂载/卸载。
- `fastNodeRect()`：用节点存储的 `x/y/w/h` 估算矩形，不读 DOM。
- `currentVisibleNodeIds()`：视口裁剪 + 选中/运行中/待输出/拖拽节点保底 + 父分组保底。
- `syncViewportNodes()`：平移/缩放时按 rAF 增量挂载/卸载，不重建全部节点。
- `render()` 只渲染可见节点；小画布自动回到全量。
- `content-visibility` 本仓库暂未加（节点本身已被裁剪），后续可作为第二道保险。

实测：300 个节点的大画布，首屏 DOM 只挂 3 个节点；把视口移到远端集群后挂载 72 个；拖动、缩放、连线正常，页面无 `pageerror`。

### 还可以继续做

- 把 `currentVisibleNodeIds()` 的线性扫描换成 512px 空间哈希（DX OS 的 `Mw/wf`），万级节点更稳。
- 连线按视口裁剪：只绘制与视口相交的连线。
- 小地图改为 canvas 绘制，避免几千个 `.minimap-node` DOM。
- 图片 LOD：远景用低分辨率，近景/选中再换高分辨率（仓库已有部分逻辑）。

---

## 附：关键代码位置速查

| 内容 | 文件 | 行号（当前 HEAD） |
| --- | --- | --- |
| 节点状态 | `static/js/canvas.js` | 344–370 |
| 屏幕/世界坐标 | `static/js/canvas.js` | 1115–1121 |
| 节点渲染 | `static/js/canvas.js` | 5781 |
| 分组渲染 | `static/js/canvas.js` | 5931 |
| 创建分组 | `static/js/canvas.js` | 10944 |
| 节点包围盒 | `static/js/canvas.js` | 10965 |
| 拖动开始 | `static/js/canvas.js` | 11397 |
| 拖动中 | `static/js/canvas.js` | 11437 |
| 拖动结束 | `static/js/canvas.js` | 11609 |
| 节点矩形 | `static/js/canvas.js` | 11638 |
| 归属判定 | `static/js/canvas.js` | 11768 |
| 按连接整理 | `static/js/canvas.js` | 11717 |
| 画布 DOM | `static/canvas.html` | 61–85 |
| 选择框 CSS | `static/css/canvas.css` | 775 |
| 分组 CSS | `static/css/canvas.css` | 604–605 |
