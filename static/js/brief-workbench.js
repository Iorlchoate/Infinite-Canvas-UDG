/* =========================================================================
 * 自定义工作流（原建筑设计工作台）
 * -------------------------------------------------------------------------
 * 模板 = 底图(image) + 参考图(image) + 提示词(prompt)
 *        → API 出图(generator) → 成果(output)
 * 四个建筑模板只是内置起点，名称 / 描述 / 画幅 / 节点名 / 提示词 / 关键词
 * 替换规则都可以改；全部改动自动保存在本机 localStorage，可新建、另存为、
 * 删除自定义模板或把内置模板还原默认。
 * 依赖：/api/providers、/api/config、/api/canvases
 * ========================================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };

  const LS_KEY = 'custom_workflows_v1';
  const RATIO_OPTIONS = [
    ['wide', '16:9 · 横图'], ['landscape', '3:2 · 横图'], ['landscape43', '4:3 · 图纸'],
    ['square', '1:1 · 方图'], ['portrait', '2:3 · 竖图'], ['portrait43', '3:4 · 竖图'],
    ['story', '9:16 · 竖屏'], ['ultrawide', '21:9 · 超宽'], ['ultratall', '9:21 · 超高']
  ];
  const RATIO_SHORT = {
    wide: '16:9', landscape: '3:2', landscape43: '4:3', square: '1:1',
    portrait: '2:3', portrait43: '3:4', story: '9:16', ultrawide: '21:9', ultratall: '9:21'
  };

  /* ---------------------------------------------------------------------
   * 内置模板：双图角色固定为「图 1 结构底图 / 图 2 风格参考」。
   * ------------------------------------------------------------------- */
  const DEFAULT_FLOWS = [
    {
      id: 'axon',
      title: 'SU 轴测体块 → 鸟瞰效果图',
      desc: '上传 SU 轴测白模与风格参考图，保持体量与场地关系不变，一键生成鸟瞰效果图。',
      input: 'SU 轴测体块模型 + 参考图',
      output: '鸟瞰效果图',
      ratio: 'wide',
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
      title: '手绘线稿 → 建筑效果图',
      desc: '上传手绘线稿与参考图，保留透视、体量与开窗位置，一键生成真实效果图。',
      input: '手绘线稿 + 参考图',
      output: '建筑效果图',
      ratio: 'landscape',
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
      title: '黑白总平 → 彩色总图',
      desc: '上传黑白总平面图与参考图，按原有路网与绿化范围精准填色，一键生成彩色总平面图。',
      input: '黑白总平面图 + 参考图',
      output: '彩色总平面图',
      ratio: 'landscape43',
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
      title: '黑白户型 → 彩平填色',
      desc: '上传黑白户型图与参考图，保留墙体门窗与家具布置，一键完成彩平填色。',
      input: '黑白户型平面图 + 参考图',
      output: '彩色户型平面图',
      ratio: 'landscape43',
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
    flows: [],
    flow: null,
    online: false,
    provider: null,                  // { id, name, model, hasKey }
    fallbackModel: '',
    busy: false,
    saveTimer: null
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
  function currentPrompt() { return state.flow ? state.flow.prompt : ''; }
  function finalPrompt() {
    const extra = $('extra').value.trim();
    return extra ? currentPrompt() + '\n【项目补充】' + extra : currentPrompt();
  }
  function setNotice(text) {
    $('notice').textContent = text || '';
    $('notice').classList.toggle('show', Boolean(text));
  }

  /* ---------------- 模板存取：本机 localStorage 自动保存 ---------------- */

  function normalizeFlow(raw, fallback) {
    const base = fallback || {};
    const f = Object.assign({}, base, raw || {});
    f.id = String(f.id || uid('flow'));
    f.custom = Boolean(f.custom);
    f.title = f.title || '未命名模板';
    f.desc = f.desc || '';
    f.input = f.input || '底图 + 参考图';
    f.output = f.output || '成图';
    f.ratio = RATIO_SHORT[f.ratio] ? f.ratio : 'wide';
    f.baseName = f.baseName || '① 底图 · 拖入结构底图';
    f.refName = f.refName || '② 参考图 · 拖入风格参考';
    f.prompt = typeof f.prompt === 'string' ? f.prompt : (base.prompt || '');
    f.keywords = Array.isArray(f.keywords)
      ? f.keywords.filter(k => k && typeof k.from === 'string').map(k => ({ from: k.from, to: k.to || '' }))
      : [];
    return f;
  }

  function loadFlows() {
    let saved = null;
    try { saved = JSON.parse(safeLS(LS_KEY) || 'null'); } catch (e) { saved = null; }
    if (saved && Array.isArray(saved.flows) && saved.flows.length) {
      return saved.flows.map(f => normalizeFlow(f, DEFAULT_FLOWS.find(d => d.id === f.id)));
    }
    return DEFAULT_FLOWS.map(f => normalizeFlow(f, f));
  }

  function saveFlows() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), flows: state.flows }));
      $('save-state').textContent = '已自动保存到本机';
    } catch (e) {
      $('save-state').textContent = '保存失败：浏览器存储不可用';
    }
    renderCards();
    refreshHeadings();
    renderGraph();
  }

  function scheduleSave() {
    $('save-state').textContent = '保存中…';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveFlows, 350);
  }

  // 把表单当前值写回内存中的模板（切换模板 / 生成画布前都会调用）
  function syncFlowFromUI() {
    const f = state.flow;
    if (!f) return;
    f.title = $('tpl-title').value;
    f.desc = $('tpl-desc').value;
    f.input = $('tpl-input').value;
    f.output = $('tpl-output').value;
    f.ratio = $('tpl-ratio').value;
    f.baseName = $('tpl-base').value;
    f.refName = $('tpl-ref').value;
    f.prompt = $('prompt').value;
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
    $('wf-grid').innerHTML = state.flows.map((f, i) => `
      <button class="wf-card ${f.id === state.flow.id ? 'active' : ''}" data-id="${esc(f.id)}">
        <span class="wf-no">${String(i + 1).padStart(2, '0')} / ${esc(RATIO_SHORT[f.ratio] || '')}
          <span class="wf-tag">${f.custom ? '自定义' : '内置模板'}</span></span>
        <span class="wf-t">${esc(f.title)}</span>
        <span class="wf-d">${esc(f.desc)}</span>
        <span class="wf-io">${esc(f.input)}<i>→</i>${esc(f.output)}</span>
      </button>`).join('');
  }

  function refreshHeadings() {
    const f = state.flow;
    if (!f) return;
    $('d-title').textContent = f.title;
    $('d-desc').textContent = f.input + '  →  ' + f.output + ' · 严格保持底图形体，参考图只控制风格';
    const genTemplate = $('gen-template');
    if (genTemplate) genTemplate.textContent = f.title;
  }

  function renderDetail() {
    const f = state.flow;
    if (!f) return;
    refreshHeadings();
    $('tpl-title').value = f.title;
    $('tpl-desc').value = f.desc;
    $('tpl-input').value = f.input;
    $('tpl-output').value = f.output;
    $('tpl-ratio').value = f.ratio;
    $('tpl-base').value = f.baseName;
    $('tpl-ref').value = f.refName;
    $('prompt').value = f.prompt;
    $('btn-delete').style.display = f.custom ? '' : 'none';
    $('btn-reset').style.display = f.custom ? 'none' : '';
    updateCount();
    renderKeywords();
    renderGraph();
  }

  function updateCount() { $('prompt-count').textContent = $('prompt').value.length + ' 字'; }

  function selectFlow(id) {
    const f = state.flows.find(x => x.id === id);
    if (!f || f === state.flow) return;
    syncFlowFromUI();
    state.flow = f;
    renderCards();
    renderDetail();
    saveFlows();
  }

  /* ---------------- 模板定制动作 ---------------- */

  function blankFlow() {
    return normalizeFlow({
      id: uid('flow'),
      custom: true,
      title: '新工作流模板',
      desc: '自定义「底图 + 参考图 → 成图」流程，按需要改提示词与画幅。',
      input: '底图 + 参考图',
      output: '成图',
      ratio: 'wide',
      prompt: [
        '【任务】以第一张图为结构底图，参考第二张图的风格生成目标画面。',
        '【底图 · 严格保持】保留底图的构图、透视与主要内容，不重新设计。',
        '【参考图 · 只借风格】第二张图仅提供材质、配色与光影，不迁移其形体。',
        '【画面】',
        '【禁止】不出现任何文字、标注、Logo 与水印。'
      ].join('\n'),
      keywords: []
    });
  }

  function createFlow() {
    syncFlowFromUI();
    const f = blankFlow();
    state.flows.push(f);
    state.flow = f;
    renderCards();
    renderDetail();
    saveFlows();
    toast('已新建模板，改动会自动保存');
  }

  function saveAsFlow() {
    syncFlowFromUI();
    const copy = normalizeFlow(Object.assign({}, state.flow, {
      id: uid('flow'),
      custom: true,
      title: state.flow.title + ' · 副本'
    }));
    copy.keywords = (state.flow.keywords || []).map(k => ({ from: k.from, to: k.to }));
    state.flows.push(copy);
    state.flow = copy;
    renderCards();
    renderDetail();
    saveFlows();
    toast('已另存为新模板，可继续修改');
  }

  function deleteFlow() {
    if (!state.flow.custom) { toast('内置模板不可删除，可用「还原默认」恢复'); return; }
    if (!confirm('删除模板「' + state.flow.title + '」？此操作不可恢复。')) return;
    const idx = state.flows.indexOf(state.flow);
    state.flows.splice(idx, 1);
    if (!state.flows.length) state.flows = DEFAULT_FLOWS.map(f => normalizeFlow(f, f));
    state.flow = state.flows[Math.max(0, Math.min(idx, state.flows.length - 1))];
    renderCards();
    renderDetail();
    saveFlows();
    toast('模板已删除');
  }

  function resetFlow() {
    const def = DEFAULT_FLOWS.find(d => d.id === state.flow.id);
    if (!def) { toast('自定义模板没有内置默认，可继续编辑或删除'); return; }
    if (!confirm('把「' + def.title + '」恢复为内置默认内容？你的修改会被覆盖。')) return;
    const fresh = normalizeFlow(def, def);
    state.flows[state.flows.indexOf(state.flow)] = fresh;
    state.flow = fresh;
    renderCards();
    renderDetail();
    saveFlows();
    toast('已还原为默认模板');
  }

  /* ---------------- 关键词替换 ---------------- */

  function renderKeywords() {
    const list = state.flow.keywords || [];
    $('kw-empty').style.display = list.length ? 'none' : 'block';
    $('kw-list').innerHTML = list.map((k, i) => `
      <div class="kw-row">
        <input data-kw="from" data-i="${i}" value="${esc(k.from)}" placeholder="原词，如：鸟瞰">
        <span class="kw-arrow">→</span>
        <input data-kw="to" data-i="${i}" value="${esc(k.to)}" placeholder="替换为，如：人视">
        <button class="kw-del" data-del="${i}" title="删除这条">×</button>
      </div>`).join('');
  }

  function addKeyword() {
    state.flow.keywords.push({ from: '', to: '' });
    renderKeywords();
    scheduleSave();
    const inputs = $('kw-list').querySelectorAll('input[data-kw="from"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function applyKeywords() {
    const pairs = (state.flow.keywords || []).filter(k => k.from && k.from.trim());
    if (!pairs.length) { toast('先添加至少一条「原词 → 替换为」'); return; }
    let text = $('prompt').value;
    let count = 0;
    pairs.forEach(p => {
      const from = p.from.trim();
      if (!from) return;
      const parts = text.split(from);
      if (parts.length > 1) {
        count += parts.length - 1;
        text = parts.join(p.to || '');
      }
    });
    $('prompt').value = text;
    state.flow.prompt = text;
    updateCount();
    scheduleSave();
    toast(count ? '已替换 ' + count + ' 处关键词' : '提示词里没有找到这些词');
  }

  /* ---------------- 节点流程图 ---------------- */

  const NW = 168, NH = 52, GAP = 14, PAD = 14;
  const CX = [14, 200, 386];
  const NODE_STYLE = {
    image:   { badge: 'I', bg: '#eef2f7', ink: '#3c4149' },
    prompt:  { badge: 'P', bg: '#eef2f7', ink: '#3c4149' },
    gen:     { badge: 'G', bg: '#eef2f7', ink: '#111827' },
    output:  { badge: 'O', bg: '#e7efe9', ink: '#3a6b51' }
  };

  function bezier(x1, y1, x2, y2) {
    const dx = Math.max(26, (x2 - x1) * 0.45);
    return `<path d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}"
      fill="none" stroke="var(--line-strong)" stroke-width="1.3" marker-end="url(#bwArrow)"/>`;
  }

  function renderGraph() {
    const f = state.flow;
    if (!f) return;
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
      { id: 'p',    type: 'prompt', col: 0, y: y(2), label: '提示词', sub: '可编辑 · 自动保存' },
      { id: 'g',    type: 'gen',    col: 1, y: centerY, label: 'API 出图', sub: (RATIO_SHORT[f.ratio] || '') + ' · 1K' },
      { id: 'o',    type: 'output', col: 2, y: centerY, label: '成果', sub: '1 张成图' }
    ];

    const pos = {};
    nodes.forEach(n => { pos[n.id] = { x: CX[n.col], y: n.y }; });
    const arrow = '<defs><marker id="bwArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-strong)"/></marker></defs>';

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
        <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="12"
          fill="var(--card)" stroke="var(--line-strong)" stroke-width="1"/>
        <rect x="${p.x + 10}" y="${p.y + 13}" width="28" height="28" rx="9" fill="${m.bg}"/>
        <text x="${p.x + 24}" y="${p.y + 32}" text-anchor="middle" font-size="11" font-weight="700" fill="${m.ink}">${m.badge}</text>
        <text x="${p.x + 47}" y="${p.y + 24}" font-size="11.5" font-weight="700" fill="var(--ink)">${esc(n.label)}</text>
        <text x="${p.x + 47}" y="${p.y + 41}" font-size="10" fill="var(--muted)">${esc(n.sub)}</text>
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
        custom_workflow: Boolean(f.custom),
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
    syncFlowFromUI();
    saveFlows();
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
      btn.innerHTML = '<i data-lucide="zap" class="icon"></i><span>生成画布</span>';
      icons();
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
    syncFlowFromUI();
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

  function fillRatioOptions() {
    $('tpl-ratio').innerHTML = RATIO_OPTIONS.map(([v, label]) => `<option value="${v}">${label}</option>`).join('');
  }

  function init() {
    applyTheme(safeLS('studio_theme') || safeLS('canvas_theme') || 'light');
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (!d) return;
      if (d.type === 'studio-theme') applyTheme(d.theme);
      if (d.type === 'studio-lang') document.documentElement.lang = d.lang === 'en' ? 'en' : 'zh-CN';
    });

    state.flows = loadFlows();
    state.flow = state.flows[0];
    fillRatioOptions();
    renderCards();
    renderDetail();
    icons();

    $('wf-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.wf-card');
      if (card) selectFlow(card.dataset.id);
    });

    // 模板设置字段：输入即更新内存，防抖后自动保存并刷新卡片/流程图
    const FIELD_MAP = {
      'tpl-title': 'title', 'tpl-desc': 'desc', 'tpl-input': 'input', 'tpl-output': 'output',
      'tpl-ratio': 'ratio', 'tpl-base': 'baseName', 'tpl-ref': 'refName'
    };
    Object.keys(FIELD_MAP).forEach(id => {
      $(id).addEventListener('input', () => {
        state.flow[FIELD_MAP[id]] = $(id).value;
        scheduleSave();
      });
      $(id).addEventListener('change', () => {
        state.flow[FIELD_MAP[id]] = $(id).value;
        scheduleSave();
      });
    });

    $('prompt').addEventListener('input', () => {
      state.flow.prompt = $('prompt').value;
      updateCount();
      scheduleSave();
    });

    $('kw-list').addEventListener('input', (e) => {
      const el = e.target.closest('input[data-kw]');
      if (!el) return;
      const row = state.flow.keywords[Number(el.dataset.i)];
      if (row) { row[el.dataset.kw] = el.value; scheduleSave(); }
    });
    $('kw-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-del]');
      if (!btn) return;
      state.flow.keywords.splice(Number(btn.dataset.del), 1);
      renderKeywords();
      scheduleSave();
    });
    $('btn-kw-add').addEventListener('click', addKeyword);
    $('btn-kw-apply').addEventListener('click', applyKeywords);

    $('btn-new').addEventListener('click', createFlow);
    $('btn-saveas').addEventListener('click', saveAsFlow);
    $('btn-delete').addEventListener('click', deleteFlow);
    $('btn-reset').addEventListener('click', resetFlow);
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
