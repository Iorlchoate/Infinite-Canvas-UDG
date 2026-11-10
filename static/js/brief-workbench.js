/* =========================================================================
 * 无限画布-UDG版 · 建筑设计工作台
 * -------------------------------------------------------------------------
 * 四个固定图生图工作流：底图 + 参考图 → 成图。
 * 节点结构：① 底图(image) + ② 参考图(image) + 提示词(prompt)
 *            → API 出图(generator) → 成果(output)
 * 两个 image 节点为空白上传占位；连线顺序固定，保证「图 1 结构 / 图 2 风格」。
 * 出图引擎默认走已配置的 API 模型（type: generator）。
 * 依赖：/api/providers、/api/config、/api/canvases
 * 不改动既有页面逻辑；通过 postMessage 请求外壳切换到目标画布。
 * ========================================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ---------------------------------------------------------------------
   * 四条工作流。prompt 采用建筑学长式的动作化指令表达：
   * 上传什么 → 一键生成什么 → 严格保持什么 → 禁止什么。
   * 双图角色写死：第一张结构底图，第二张仅作风格参考。
   * ------------------------------------------------------------------- */
  const FLOWS = [
    {
      id: 'axon',
      no: '01',
      title: 'SU 轴测体块 → 鸟瞰效果图',
      desc: '上传 SU 轴测白模与风格参考图，保持体量与场地关系不变，一键生成鸟瞰效果图。',
      input: 'SU 轴测体块模型 + 参考图',
      output: '鸟瞰效果图',
      ratio: 'wide',                    // 16:9，画布 SIZE_MAP key
      ratioLabel: '16:9 · 鸟瞰',
      baseName: '① 底图 · 拖入 SU 轴测体块',
      refName: '② 参考图 · 拖入风格参考',
      prompt: [
        '【任务】以第一张 SU 轴测体块模型为结构底图，参考第二张效果图的渲染调性，一键生成该方案的鸟瞰效果图。',
        '【底图 · 严格保持】完整保留轴测模型中的体量关系、建筑轮廓、层数与高度、屋顶形式、场地边界、道路与绿化位置，以及原有视角与透视关系；不增减建筑，不改变体块比例、朝向与构图。',
        '【参考图 · 只借风格】第二张图仅提供材质语言、光影时段、色调与配景密度，不迁移其建筑造型与空间布局。',
        '【画面】与底图一致的 45° 轴测鸟瞰视角，真实建筑材质：清水混凝土、暖木格栅、通透玻璃与金属收口，屋面与场地铺装区分清晰；绿化低饱和灰绿、道路浅米白、水面淡蓝；清晨柔和侧光，天光干净，薄雾，阴影方向统一；配景克制，人物与树木尺度合理。',
        '【禁止】不出现任何文字、标注、尺寸、图例、Logo 与水印；不改变视角与构图；不出现夸张配景、透视失真与结构错误。'
      ].join('\n')
    },
    {
      id: 'sketch',
      no: '02',
      title: '手绘线稿 → 建筑效果图',
      desc: '上传手绘线稿与参考图，保留透视、体量与开窗位置，一键生成真实效果图。',
      input: '手绘线稿 + 参考图',
      output: '建筑效果图',
      ratio: 'landscape',              // 3:2
      ratioLabel: '3:2 · 人视',
      baseName: '① 底图 · 拖入手绘线稿',
      refName: '② 参考图 · 拖入风格参考',
      prompt: [
        '【任务】以第一张建筑手绘线稿为结构底图，参考第二张效果图的风格，精准生成真实建筑效果图。',
        '【底图 · 严格保持】严格保持线稿的体量轮廓、透视关系、构图、开窗位置、门洞、构件节奏与细部线条；只补材质、光影与环境，不重新设计造型。',
        '【参考图 · 只借风格】第二张图仅提供材质、配色、光线时段与渲染质感，不改变线稿已经确定的建筑形态与机位。',
        '【画面】1.5 米人视高度、28mm 镜头，与线稿同一机位；清水混凝土与暖木、大面积通透玻璃，玻璃有柔和反射；午后柔和侧光在墙面与地面拉出清晰长影；低饱和灰与暖米色，浅景深，环境配景简洁，尺度真实。',
        '【禁止】不出现任何文字、标注、尺寸、图例、Logo 与水印；不改变透视与构图；不新增构件、不修改窗位；不出现手绘残留线条与画面噪点。'
      ].join('\n')
    },
    {
      id: 'masterplan',
      no: '03',
      title: '黑白总平 → 彩色总图',
      desc: '上传黑白总平面图与参考图，按原有路网与绿化范围精准填色，一键生成彩色总平面图。',
      input: '黑白总平面图 + 参考图',
      output: '彩色总平面图',
      ratio: 'landscape43',            // 4:3
      ratioLabel: '4:3 · 图纸',
      baseName: '① 底图 · 拖入黑白总平面',
      refName: '② 参考图 · 拖入配色参考',
      prompt: [
        '【任务】将第一张黑白总平面图按第二张参考图的配色与图面表达，精准转换为彩色总平面图。',
        '【底图 · 严格保持】严格保留原有建筑轮廓与层数、路网走向与宽度、水体边界、绿化范围、铺装分区、出入口与指北方向；不移动、增删或合并任何建筑与场地要素，布局与比例完全一致。',
        '【参考图 · 只借风格】第二张图仅提供配色、明度与图面表达方式，不引入其布局与形体。',
        '【画面】正投影俯视、与底图完全同构；建筑屋面浅灰并按高度做轻微明度区分，绿地低饱和灰绿、乔木以柔和点状树冠表达，道路与硬质铺装浅米白，水面淡蓝；分区以平涂色块区分，线宽层次分明、轮廓线清晰；柔和均匀顶光，整体低饱和、图面干净，可直接用于方案汇报。',
        '【禁止】不出现任何文字、路名、标注、尺寸、图例文字、Logo 与水印；不改变布局与比例；不使用写实渲染、投影与透视效果。'
      ].join('\n')
    },
    {
      id: 'floorplan',
      no: '04',
      title: '黑白户型 → 彩平填色',
      desc: '上传黑白户型图与参考图，保留墙体门窗与家具布置，一键完成彩平填色。',
      input: '黑白户型平面图 + 参考图',
      output: '彩色户型平面图',
      ratio: 'landscape43',            // 4:3
      ratioLabel: '4:3 · 图纸',
      baseName: '① 底图 · 拖入黑白户型图',
      refName: '② 参考图 · 拖入配色参考',
      prompt: [
        '【任务】将第一张黑白户型平面图按第二张参考图的配色，精准填色为彩色户型平面图。',
        '【底图 · 严格保持】严格保留墙体厚度与位置、门洞与开启方向、窗位、承重结构、家具轮廓与洁具布置；只做色彩与材质填充，不调整平面布局。',
        '【参考图 · 只借风格】第二张图仅提供材质配色与明度关系，不引入其家具样式与空间划分。',
        '【画面】正投影俯视；起居与餐厅浅橡木地板、卧室米白微水泥、厨卫浅灰石材、阳台浅灰铺装，家具以极简低饱和体块表达并保留清晰白色间隙；墙体为深灰细线、轮廓线宽统一；柔和均匀顶光、无投影，低饱和米白与浅木色，线面清晰，图面干净。',
        '【禁止】不出现任何文字、房间名称、尺寸标注、面积数字、图例、Logo 与水印；不改变墙体与门窗位置；不新增家具、不出现三维透视与写实光影。'
      ].join('\n')
    }
  ];

  const state = {
    flow: FLOWS[0],
    prompts: {},                     // 每个工作流独立的编辑缓冲
    online: false,
    provider: null,                  // { id, name, model, hasKey }
    fallbackModel: '',
    busy: false
  };

  /* ---------------- 基础工具 ---------------- */

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function uid(prefix) { return 'bw_' + prefix + '_' + Math.random().toString(36).slice(2, 9); }
  function applyTheme(theme) { document.documentElement.classList.toggle('theme-dark', theme === 'dark'); }
  function safeLS(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function currentPrompt() {
    return state.prompts[state.flow.id] != null ? state.prompts[state.flow.id] : state.flow.prompt;
  }
  function finalPrompt() {
    const extra = $('extra').value.trim();
    return extra ? currentPrompt() + '\n【项目补充】' + extra : currentPrompt();
  }
  function setNotice(text) {
    $('notice').textContent = text || '';
    $('notice').classList.toggle('show', Boolean(text));
  }

  /* ---------------- 连接与模型配置 ---------------- */

  async function checkConnection() {
    const el = $('conn');
    try {
      const res = await fetch('/api/canvases', { method: 'GET' });
      if (!res.ok) throw new Error('bad status');
      state.online = true;
      el.classList.add('online');
      el.querySelector('span').textContent = '已连接';
    } catch (e) {
      state.online = false;
      el.querySelector('span').textContent = '预览模式';
    }
  }

  async function loadApiConfig() {
    const note = $('model-note');
    try {
      const [pr, cf] = await Promise.all([
        fetch('/api/providers').then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch('/api/config').then(r => r.ok ? r.json() : {}).catch(() => ({}))
      ]);
      state.fallbackModel = cf.image_model || '';
      const list = pr.providers || [];
      const usable = list.filter(p => p.id !== 'modelscope' && p.enabled !== false && (p.image_models || []).length);
      const pick = usable.find(p => p.primary) || usable.find(p => p.has_key) || usable[0];
      if (pick) {
        state.provider = {
          id: pick.id,
          name: pick.name || pick.id,
          model: (pick.image_models || [])[0] || state.fallbackModel,
          hasKey: Boolean(pick.has_key)
        };
        note.textContent = '出图引擎：API · ' + state.provider.name +
          (state.provider.model ? ' / ' + state.provider.model : '') +
          (state.provider.hasKey ? '' : '（未检测到 Key，请到「模型设置」配置）');
      } else {
        note.textContent = '未检测到 API 出图平台，请到「模型设置」添加';
      }
    } catch (e) {
      note.textContent = '预览模式 · 无法读取模型配置';
    }
  }

  /* ---------------- 卡片与详情 ---------------- */

  function renderCards() {
    $('wf-grid').innerHTML = FLOWS.map(f => `
      <button class="wf-card ${f.id === state.flow.id ? 'active' : ''}" data-id="${f.id}">
        <span class="wf-no">${f.no} / ${esc(f.ratioLabel)}</span>
        <span class="wf-t">${esc(f.title)}</span>
        <span class="wf-d">${esc(f.desc)}</span>
        <span class="wf-io">${esc(f.input)}<i>→</i>${esc(f.output)}</span>
      </button>`).join('');
  }

  function renderDetail() {
    const f = state.flow;
    $('d-title').textContent = f.title;
    $('d-desc').textContent = f.input + '  →  ' + f.output + ' · 严格保持底图形体，参考图只控制风格';
    $('prompt').value = currentPrompt();
    updateCount();
    renderGraph();
  }

  function updateCount() { $('prompt-count').textContent = $('prompt').value.length + ' 字'; }

  function selectFlow(id) {
    const f = FLOWS.find(x => x.id === id);
    if (!f) return;
    // 离开前把当前编辑内容存起来，切换回来不丢
    state.prompts[state.flow.id] = $('prompt').value;
    state.flow = f;
    renderCards();
    renderDetail();
  }

  /* ---------------- 节点流程图 ---------------- */

  const NW = 182, NH = 54, GAP = 16, PAD = 16;
  const CX = [16, 262, 508];
  const NODE_STYLE = {
    image:   { badge: 'I', bg: '#e9eef3', ink: '#3d5b74' },
    prompt:  { badge: 'P', bg: '#e9eef3', ink: '#3d5b74' },
    gen:     { badge: 'G', bg: '#e8eef0', ink: '#356272' },
    output:  { badge: 'O', bg: '#e7efe9', ink: '#3a6b51' }
  };

  function bezier(x1, y1, x2, y2) {
    const dx = Math.max(26, (x2 - x1) * 0.45);
    return `<path d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}"
      fill="none" stroke="var(--border-strong)" stroke-width="1.3" marker-end="url(#bwArrow)"/>`;
  }

  function renderGraph() {
    const f = state.flow;
    const rows = 3;
    const height = PAD * 2 + rows * NH + (rows - 1) * GAP;
    const width = CX[2] + NW + PAD;
    const svg = $('graph');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const y = i => PAD + i * (NH + GAP);
    const centerY = y(0) + (height - PAD * 2 - NH) / 2;
    const nodes = [
      { id: 'base', type: 'image',  col: 0, y: y(0), label: '① 底图', sub: '拖入 · 结构保持' },
      { id: 'ref',  type: 'image',  col: 0, y: y(1), label: '② 参考图', sub: '拖入 · 只借风格' },
      { id: 'p',    type: 'prompt', col: 0, y: y(2), label: '提示词', sub: '可编辑 · 已写好' },
      { id: 'g',    type: 'gen',    col: 1, y: centerY, label: 'API 出图', sub: f.ratioLabel + ' · 1K' },
      { id: 'o',    type: 'output', col: 2, y: centerY, label: '成果', sub: '1 张成图' }
    ];

    const pos = {};
    nodes.forEach(n => { pos[n.id] = { x: CX[n.col], y: n.y }; });
    const arrow = '<defs><marker id="bwArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)"/></marker></defs>';

    let paths = '';
    ['base', 'ref', 'p'].forEach(id => {
      const a = pos[id], b = pos.g;
      paths += bezier(a.x + NW, a.y + NH / 2, b.x, b.y + NH / 2);
    });
    paths += bezier(pos.g.x + NW, pos.g.y + NH / 2, pos.o.x, pos.o.y + NH / 2);

    let cards = '';
    nodes.forEach(n => {
      const p = pos[n.id], m = NODE_STYLE[n.type];
      cards += `<g>
        <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="6"
          fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1"/>
        <rect x="${p.x + 10}" y="${p.y + 13}" width="28" height="28" rx="5" fill="${m.bg}"/>
        <text x="${p.x + 24}" y="${p.y + 32}" text-anchor="middle" font-size="11" font-weight="700" fill="${m.ink}">${m.badge}</text>
        <text x="${p.x + 47}" y="${p.y + 24}" font-size="11.5" font-weight="600" fill="var(--text)">${esc(n.label)}</text>
        <text x="${p.x + 47}" y="${p.y + 41}" font-size="10" fill="var(--text-3)">${esc(n.sub)}</text>
      </g>`;
    });
    svg.innerHTML = arrow + paths + cards;
  }

  /* ---------------- 生成真正的画布节点 ---------------- */

  function generatorNode(inputs) {
    return {
      type: 'generator',
      apiProvider: state.provider ? state.provider.id : '',
      model: (state.provider && state.provider.model) || state.fallbackModel,
      ratio: state.flow.ratio,
      resolution: '1k',
      customRatio: '', customSize: '', customRatioWidth: '', customRatioHeight: '',
      customWidth: '', customHeight: '',
      count: 1,
      inputs: inputs.slice(),          // 固定顺序：底图 → 参考图 → 提示词
      running: false
    };
  }

  function buildCanvasPayload() {
    const f = state.flow;
    const baseId = uid('img_base'), refId = uid('img_ref');
    const promptId = uid('prompt'), genId = uid('gen'), outId = uid('out');

    const nodes = [
      // 空白图片节点：画布原生上传占位，拖入 / 双击即可放图
      { id: baseId, type: 'image', x: 60,  y: 90,  url: '', name: f.baseName, role: '' },
      { id: refId,  type: 'image', x: 60,  y: 430, url: '', name: f.refName,  role: '' },
      { id: promptId, type: 'prompt', x: 60, y: 770, text: finalPrompt() },
      Object.assign({ id: genId, x: 470, y: 430 }, generatorNode([baseId, refId, promptId])),
      { id: outId, type: 'output', x: 880, y: 430, images: [] }
    ];

    // 连线顺序即参考图顺序：图 1 = 结构底图，图 2 = 风格参考
    const connections = [
      { id: uid('c'), from: baseId,   to: genId },
      { id: uid('c'), from: refId,    to: genId },
      { id: uid('c'), from: promptId, to: genId },
      { id: uid('c'), from: genId,    to: outId }
    ];

    return {
      title: f.title.replace(' → ', ' · ') + ' · ' + nowLabel(),
      icon: '',
      nodes, connections,
      viewport: { x: 0, y: 0, scale: 0.5 },
      logs: [],
      settings: {
        brief_source: 'brief-workbench',
        domain: 'architecture',
        workflow_id: f.id,
        workflow_name: f.title,
        image_roles: { base: baseId, reference: refId },
        input: f.input,
        output: f.output,
        prompt: finalPrompt(),
        extra: $('extra').value.trim(),
        engine: 'api',
        api_provider: state.provider ? state.provider.id : '',
        api_model: (state.provider && state.provider.model) || state.fallbackModel,
        ratio: f.ratio,
        created_from_workbench_at: Date.now()
      },
      client_id: 'brief-workbench',
      base_updated_at: 0
    };
  }

  function nowLabel() {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' +
           String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  }

  function goToCanvas(id, url) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'udg-open-canvas', id: id, url: url }, location.origin);
    } else {
      setTimeout(() => { location.href = url; }, 300);
    }
  }

  async function generateCanvas() {
    if (state.busy) return;
    if (!state.online) {
      toast('本地服务未连接，请先启动 START.exe');
      return;
    }
    state.busy = true;
    const btn = $('btn-go');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span><span>写入中…</span>';
    try {
      const payload = buildCanvasPayload();
      const created = await fetch('/api/canvases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, icon: '', kind: 'classic' })
      });
      if (!created.ok) throw new Error('创建画布失败 ' + created.status);
      const cdata = await created.json();
      const id = cdata && cdata.canvas && cdata.canvas.id;
      if (!id) throw new Error('创建画布未返回 ID');

      const saved = await fetch('/api/canvases/' + encodeURIComponent(id), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!saved.ok) throw new Error('写入节点失败 ' + saved.status);

      toast('画布已生成，把底图与参考图拖入 ①② 节点后即可运行');
      setNotice('画布「' + payload.title + '」已写入。打开后把底图拖入 ①、参考图拖入 ②，再运行「API 出图」节点。');
      goToCanvas(id, '/static/canvas.html?id=' + encodeURIComponent(id));
    } catch (e) {
      toast('生成画布失败：' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>生成画布</span><span class="arrow">→</span>';
      state.busy = false;
    }
  }

  /* 顶栏「打开画布」→ 直接进入最近使用的画布；没有则新建空白画布 */
  async function openExistingCanvas() {
    if (!state.online) { toast('本地服务未连接，请先启动 START.exe'); return; }
    const btn = $('btn-canvas');
    btn.disabled = true;
    try {
      const res = await fetch('/api/canvases');
      if (!res.ok) throw new Error('读取画布列表失败');
      const list = (await res.json()).canvases || [];
      let id, url;
      if (list.length) {
        const c = list[0];
        id = c.id;
        url = (c.kind === 'smart' ? '/static/smart-canvas.html?id=' : '/static/canvas.html?id=') + encodeURIComponent(id);
      } else {
        const created = await fetch('/api/canvases', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '新建画布', icon: '', kind: 'classic' })
        });
        if (!created.ok) throw new Error('创建画布失败');
        id = (await created.json()).canvas.id;
        url = '/static/canvas.html?id=' + encodeURIComponent(id);
      }
      toast('正在打开画布');
      goToCanvas(id, url);
      setTimeout(() => { btn.disabled = false; }, 1200);
    } catch (e) {
      toast('打开画布失败：' + e.message);
      btn.disabled = false;
    }
  }

  async function copyPrompt() {
    const text = finalPrompt();
    try { await navigator.clipboard.writeText(text); toast('提示词已复制'); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('提示词已复制'); }
      catch (e2) { toast('复制失败，请检查浏览器权限'); }
      ta.remove();
    }
  }

  /* ---------------- 事件绑定 ---------------- */

  function init() {
    applyTheme(safeLS('studio_theme') || safeLS('canvas_theme') || 'light');
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (!d) return;
      if (d.type === 'studio-theme') applyTheme(d.theme);
      if (d.type === 'studio-lang') document.documentElement.lang = d.lang === 'en' ? 'en' : 'zh-CN';
    });

    renderCards();
    renderDetail();

    $('wf-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.wf-card');
      if (card) selectFlow(card.dataset.id);
    });
    $('prompt').addEventListener('input', () => {
      state.prompts[state.flow.id] = $('prompt').value;
      updateCount();
    });
    $('btn-reset').addEventListener('click', () => {
      delete state.prompts[state.flow.id];
      $('prompt').value = state.flow.prompt;
      updateCount();
      toast('已还原为默认提示词');
    });
    $('btn-copy').addEventListener('click', copyPrompt);
    $('btn-go').addEventListener('click', generateCanvas);
    $('btn-canvas').addEventListener('click', openExistingCanvas);
    $('btn-list').addEventListener('click', () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'udg-open-canvas-list' }, location.origin);
      } else { location.href = '/static/canvas-list.html'; }
    });
    $('btn-settings').addEventListener('click', () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'udg-open-page', page: 'api-settings' }, location.origin);
      } else { location.href = '/static/api-settings.html'; }
    });

    checkConnection().then(loadApiConfig);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
