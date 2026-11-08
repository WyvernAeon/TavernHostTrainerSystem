// ---- lib/host.js ----
// 宿主桥：只在这里碰 SillyTavern 的上下文与事件。
class Host {
  constructor() {
    this.ctx = null;
    this.disposers = [];
  }

  async ready(timeout = 30000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
        this.ctx = SillyTavern.getContext();
        return this;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    throw new Error('SillyTavern 上下文未就绪');
  }

  context() {
    try {
      if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
        this.ctx = SillyTavern.getContext();
      }
    } catch {}
    return this.ctx || {};
  }

  on(name, handler) {
    const ctx = this.context();
    const es = ctx.eventSource;
    if (!es || typeof es.on !== 'function') return () => {};
    const mapped = (ctx.eventTypes && ctx.eventTypes[name]) || name;
    es.on(mapped, handler);
    const off = () => {
      try {
        if (typeof es.removeListener === 'function') es.removeListener(mapped, handler);
        else if (typeof es.off === 'function') es.off(mapped, handler);
      } catch {}
    };
    this.disposers.push(off);
    return off;
  }

  clearListeners() {
    for (const off of this.disposers.splice(0)) {
      try { off(); } catch {}
    }
  }

  chatId() {
    const ctx = this.context();
    return String(ctx.chatId || ctx.getCurrentChatId?.() || 'default');
  }

  messages() {
    const ctx = this.context();
    return Array.isArray(ctx.chat) ? ctx.chat : [];
  }

  characterName() {
    const ctx = this.context();
    const ch = ctx.characters?.[ctx.characterId];
    return ch?.name || ctx.name2 || '角色';
  }

  userName() {
    const ctx = this.context();
    return ctx.name1 || '你';
  }

  isGenerating() {
    const ctx = this.context();
    return Boolean(ctx.is_generating || ctx.generating);
  }

  setPrompt(key, text, opts = {}) {
    const ctx = this.context();
    if (typeof ctx.setExtensionPrompt !== 'function') return false;
    try {
      ctx.setExtensionPrompt(
        key,
        String(text || ''),
        opts.position ?? 1,
        opts.depth ?? 1,
        opts.scan ?? false,
        opts.role ?? 0,
        opts.filter ?? null,
      );
      return true;
    } catch {
      return false;
    }
  }

  clearPrompt(key) {
    const ctx = this.context();
    try {
      if (ctx.extensionPrompts && key in ctx.extensionPrompts) delete ctx.extensionPrompts[key];
    } catch {}
    return this.setPrompt(key, '');
  }

  async generate({ prompt, systemPrompt = '', responseLength = 1800, timeout = 90000 }) {
    const ctx = this.context();
    if (!ctx) throw new Error('没有 SillyTavern 上下文');
    const run = async () => {
      if (typeof ctx.generateRaw === 'function') {
        return ctx.generateRaw({
          prompt,
          systemPrompt,
          quietToLoud: false,
          responseLength,
        });
      }
      if (typeof ctx.generateQuietPrompt === 'function') {
        return ctx.generateQuietPrompt({
          quietPrompt: prompt,
          quietToLoud: false,
          skipWIAN: false,
          responseLength,
        });
      }
      throw new Error('当前酒馆没有 generateRaw / generateQuietPrompt');
    };
    let timer = 0;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('sidecar 超时')), timeout);
    });
    try {
      return await Promise.race([run(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  setTextarea(text) {
    const el = document.querySelector('#send_textarea');
    if (!el) return false;
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    return true;
  }
}

// ---- lib/demo.js ----
const DEMO_STATE = {
  version: 1,
  宿主: {
    姓名: '林晚',
    性别: '女',
    年龄: 27,
    身份: '广告公司文案',
    等级: 3,
    积分: 1280,
    性格: {
      淫堕值: 46,
      服从度: 58,
      堕落度: 41,
      综合: '一个正在把「被强迫」改写成「想要」的人。',
    },
    身体: {
      身高: 168,
      体重: 52,
      罩杯: 'D',
      敏感度: 62,
      身体变化: '腰侧多了两枚黑桃烙印，触碰时会发热。',
      部位: {
        表情: '表面镇定，耳尖发红。',
        头部: '黑色长发，眼下有一颗小痣。',
        躯干: '匀称偏瘦。',
        左手: '黑桃纹身。',
        右手: '未记录。',
        下体: '湿软，收缩得厉害。',
        左腿: '未记录。',
        右腿: '未记录。',
      },
      子宫: '发育度 18 / 闭合度 42',
      体液: '小穴 12 ml / 肠道 34 ml',
      毛发: '修剪整齐，保留一小块。',
    },
    衣饰: {
      服装: {
        上装: '白衬衫，第三颗扣子解开',
        下装: '黑色包臀裙',
        内衣: '黑色蕾丝',
        鞋: '黑色高跟鞋 7cm',
      },
      饰品: ['黑桃项圈'],
      穿孔: [],
      玩具: ['遥控跳蛋'],
      状态: '衬衫下摆从裙腰里滑出来一截。',
    },
    关系: {
      人物列表: [
        { 姓名: '周屿', 身份: '部门主管', 关系: '上司 / 调教者', 好感: 72, 备注: '知道系统存在。' },
        { 姓名: '林晚', 身份: '宿主', 关系: '本人', 好感: 100, 备注: '档案本人。' },
      ],
      性关系对象: [
        { 对象: '周屿', 次数: 6, 类型: '插入 / 口交', 初次: '10-31 加班后', 备注: '在办公室。' },
        { 对象: '未知黑人男性', 次数: 2, 类型: '插入', 初次: '11-02 酒吧', 备注: '未留名。' },
      ],
      性经验: '已开发；对羞辱与命令有反应。',
      性癖标签: ['服从', '露出', '语言羞辱'],
      风评: '同事眼里是可靠的文案；夜里是系统的所有物。',
    },
    },
  系统: {
    投影模式: '可见',
    主推主题: 'monster_rbq',
    激活主题线: ['bnwo_queen', 'insect_wife', 'monster_rbq'],
    主题线: {
      bnwo_queen: {
        名称: '媚黑女王', 图标: 'bnwo', 状态: '暂停', 阶段: '第 6 阶', 称号: '黑桃皇后预备',
        主进度标签: '媚黑度', 主进度: 46, 副进度标签: '雌堕度', 副进度: 58,
        简介: '城市夜场、黑桃皇后、QOS/BNWO 秩序。',
      },
      insect_wife: {
        名称: '虫妻线', 图标: 'insect', 状态: '暂停', 阶段: 'T6', 称号: '虫姦出轨堕胎',
        主进度标签: '虫姦中毒度', 主进度: 62, 副进度标签: '虫化度', 副进度: 55,
        简介: '地下虫巢、虫精中毒与虫巢苗床。',
      },
      monster_rbq: {
        名称: '异种肉便器', 图标: 'monster', 状态: '激活', 阶段: 'M7', 称号: '协会受印',
        主进度标签: '异种沉迷', 主进度: 64, 副进度标签: '肉便器度', 副进度: 38,
        简介: '地下异种、冒险者协会、夜潮沙龙与黑市。',
      },
      dog_wife: {
        名称: '犬妻', 图标: 'dog', 状态: '暂停', 阶段: 'D2', 称号: '被饲',
        主进度标签: '犬化沉迷', 主进度: 22, 副进度标签: '驯化度', 副进度: 31,
        简介: '对犬科身体与犬类交配的沉迷。',
      },
      horse_wife: {
        名称: '马妻', 图标: 'horse', 状态: '暂停', 阶段: 'H2', 称号: '初交',
        主进度标签: '马化沉迷', 主进度: 18, 副进度标签: '服从度', 副进度: 24,
        简介: '对马科身体与马类交配的沉迷。',
      },
    },
    主题进度: {
      bnwo_queen: { 主进度: 46, 副进度: 58 },
      insect_wife: { 主进度: 62, 副进度: 55 },
      monster_rbq: { 主进度: 64, 副进度: 38 },
      dog_wife: { 主进度: 22, 副进度: 31 },
      horse_wife: { 主进度: 18, 副进度: 24 },
    },
    主线任务: {
      编号: 'M-007', 标题: '在加班夜完成一次公开的服从', 时限: '今晚 23:00 前',
      目标: '让至少一名同事听见你承认「我是系统的东西」。',
      判定: '被听见且未被拆穿。', 奖励: '300 积分 + 黑桃发圈', 惩罚: '主进度 -5',
    },
    支线任务: [
      { 编号: 'S-012', 标题: '把跳蛋开到中档，撑过整场会议', 时限: '明天', 奖励: '60 CR', 惩罚: '无' },
      { 编号: 'S-013', 标题: '让周屿替你整理一次项圈', 时限: '三天内', 奖励: '黑桃发圈 ×1', 惩罚: '-20 CR' },
    ],
    商店: {
      货架: [
        { 编号: 'SH-001', 名称: '进阶肛珠', 类目: '道具', 部位标签: ['后穴'], 简介: '逐颗渐入，前三颗微胀，后两颗还在体外；体外端有拉环。', 价格: 820, 库存: 3, 效果: '开发度 +6', 状态: '在售' },
        { 编号: 'SH-002', 名称: '较大的犬类锁结肛塞', 类目: '道具', 部位标签: ['后穴'], 简介: '较大塞体，进入时撑开，膨胀后锁结卡住，拔出前会有一阵明显的酸胀。', 价格: 680, 库存: 2, 效果: '扩张 +4 / 服从 +2', 状态: '在售' },
        { 编号: 'SH-003', 名称: '遥控跳蛋', 类目: '玩具', 部位标签: ['小穴', '阴蒂'], 简介: '手机控制，三档震动；信号范围十米，静音模式仍有一点点嗡鸣。', 价格: 400, 库存: 5, 效果: '敏感度 +2', 状态: '在售' },
        { 编号: 'SH-004', 名称: '黑桃项圈', 类目: '饰品', 部位标签: ['颈部'], 简介: '刻着编号的皮革项圈，可锁紧并留下浅浅的压痕；钥匙由主人保管。', 价格: 260, 库存: 1, 效果: '服从 +3', 状态: '在售' },
        { 编号: 'SH-005', 名称: '避孕套发圈', 类目: '饰品', 部位标签: ['头发', '手腕'], 简介: '把使用过的避孕套扎在发束上，数量随次数增加；也可以串成腰链或腿环。', 价格: 120, 库存: 9, 效果: '媚黑度 +1', 状态: '在售' },
        { 编号: 'SH-006', 名称: '黑色蕾丝开裆连裤袜', 类目: '服装', 部位标签: ['腿部', '下体'], 简介: '40D 哑光黑，裆部可开合；腰头有暗扣，穿在包臀裙里不会显出边。', 价格: 340, 库存: 4, 效果: '露出 +2', 状态: '在售' },
        { 编号: 'SH-007', 名称: '细跟束缚高跟鞋', 类目: '服装', 部位标签: ['足部'], 简介: '10cm 细跟，脚踝有可锁扣带；站久了小腿会发抖，走路时只能小步。', 价格: 520, 库存: 2, 效果: '服从 +2', 状态: '在售' },
        { 编号: 'SH-008', 名称: '子宫保暖栓', 类目: '道具', 部位标签: ['子宫'], 简介: '温热的小栓体，进入后持续散发低热；取出后会有短暂的空虚感。', 价格: 760, 库存: 1, 效果: '子宫开发 +3', 状态: '在售' },
        { 编号: 'SH-009', 名称: '异种黏液润滑剂', 类目: '消耗品', 部位标签: ['小穴', '后穴'], 简介: '半透明、拉丝很长；接触体温后变得更滑，带一点腥甜气味。', 价格: 180, 库存: 12, 效果: '润滑 / 敏感 +1', 状态: '在售' },
        { 编号: 'SH-010', 名称: '协会临时通行证', 类目: '服务', 部位标签: [], 简介: '夜潮沙龙发放的临时纸卡，背面印着地下城前庭的入口地图与暗号。', 价格: 900, 库存: 1, 效果: '解锁地下城前庭', 状态: '在售' },
      ],
    },
    记录: {
      改造时间线: [
        { 时间: '11-06 22:10', 部位: '子宫', 改造: '异种适配', 阶段: 'M6', 来源: '异种肉便器', 状态: '永久', 标签: ['异种', '腔室'], 备注: '子宫内壁出现环状褶皱，容纳上限提高；被异种精液灌满后，收缩速度比之前慢，但回缩时会把触感留得更久。' },
        { 时间: '11-07 01:35', 部位: '肠道', 改造: '触手扩张', 阶段: 'M5', 来源: '异种肉便器', 状态: '永久', 标签: ['异种', '触手'], 备注: '肠道壁被反复撑开又收紧，恢复速度变慢；遇到粗大异种时不再先疼，而是先热。' },
        { 时间: '11-08 03:20', 部位: '乳房', 改造: '泌乳启动', 阶段: 'M6', 来源: '异种肉便器', 状态: '永久', 标签: ['异种', '泌乳'], 备注: '乳腺被异种精液和催情素共同刺激后开始泌乳，量不大；闻到异种气味时会先渗出来。' },
        { 时间: '11-09 23:45', 部位: '皮肤', 改造: '黏液膜', 阶段: 'M6', 来源: '异种肉便器', 状态: '永久', 标签: ['异种', '皮肤'], 备注: '小腹和腿根被黏液膜覆盖，出汗时带一点甜腥；衣服摩擦会留下淡红痕。' },
        { 时间: '11-10 21:10', 部位: '子宫', 改造: '虫卵附着', 阶段: 'M5', 来源: '虫妻线', 状态: '永久', 标签: ['虫妻', '虫卵'], 备注: '虫卵附着在子宫内壁，B 超看不见，但夜里会有细小的蠕动感。' },
      ],
      装备档案: [
        { 名称: '避孕套发圈', 来源: '系统商城', 状态: '已装备', 备注: '已佩戴；颜色：黑；精液来源：周屿。' },
        { 名称: '黑桃项圈', 来源: '任务奖励', 状态: '已装备', 备注: '已佩戴；刻着编号 HQ-031。' },
        { 名称: '进阶肛珠', 来源: '系统商城', 状态: '已装备', 备注: '已佩戴；状态：已塞入。' },
      ],
      计数: [
        { 名称: '避孕套发圈计数', 当前: 4, 上限: 10 },
        { 名称: '欠款', 当前: 120, 上限: null },
      ],
      事件: [
        { 时间: '10-31', 内容: '第一次被看到乳头变硬。' },
        { 时间: '11-01', 内容: '系统要求她在便利店承认归属。' },
      ],
      其他记录: '临时标记：今晚 23:00 前有效。',
    },
  },
  世界: {
    时间: '22:41',
    地点: '公司 17 楼茶水间',
    环境: '雨，空调有点冷',
  },
};

// ---- lib/store.js ----

const KEY = 'hq_system_v7_';
const clone = (value) => JSON.parse(JSON.stringify(value));

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(root, path) {
  const parts = String(path || '').replace(/^\//, '').split('/').filter(Boolean);
  let node = root;
  for (const part of parts) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

function setPath(root, path, value) {
  const parts = String(path || '').replace(/^\//, '').split('/').filter(Boolean);
  if (!parts.length) return false;
  if (parts.some((part) => part === '__proto__' || part === 'prototype' || part === 'constructor')) return false;
  let node = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!isObject(node[part]) && !Array.isArray(node[part])) node[part] = {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
  return true;
}

function dedupeBy(list, keyFn) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((item) => {
    const key = keyFn(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeState(state) {
  try {
    state.系统.激活主题线 = [...new Set((state.系统.激活主题线 || []).filter(Boolean))];
    const people = state.宿主?.关系?.人物列表;
    state.宿主.关系.人物列表 = dedupeBy(people, (p) => p && (p.人物 || p.姓名 || p.名字 || p.名称));
    const partners = state.宿主?.关系?.性关系对象;
    state.宿主.关系.性关系对象 = dedupeBy(partners, (p) => p && (p.人物 || p.对象 || p.姓名 || p.名称));
    const equip = state.系统?.记录?.装备档案;
    state.系统.记录.装备档案 = dedupeBy(equip, (e) => e && (e.名称 || e.编号));
    const timeline = state.系统?.记录?.改造时间线;
    state.系统.记录.改造时间线 = dedupeBy(timeline, (t) => t && `${t.时间 || ''}|${t.部位 || ''}|${t.改造 || ''}`);
    const shelf = state.系统?.商店?.货架;
    state.系统.商店.货架 = dedupeBy(shelf, (item) => item && (item.编号 || item.名称));
  } catch {}
  return state;
}

function normalizeState(raw) {
  const state = raw && typeof raw === 'object' ? raw : clone(DEMO_STATE);
  state.version = 1;
  state.宿主 ||= clone(DEMO_STATE.宿主);
  state.系统 ||= clone(DEMO_STATE.系统);
  state.世界 ||= clone(DEMO_STATE.世界);
  state.系统.主题线 ||= {};
  state.系统.主题进度 ||= {};
  state.系统.商店 ||= { 货架: [] };
  state.系统.商店.货架 = Array.isArray(state.系统.商店.货架) ? state.系统.商店.货架 : [];
  state.系统.记录 ||= {};
  state.系统.记录.改造时间线 ||= [];
  state.系统.记录.装备档案 ||= [];
  state.系统.记录.计数 ||= [];
  state.系统.记录.事件 ||= [];
  state.宿主.关系 ||= {};
  state.宿主.关系.人物列表 ||= [];
  state.宿主.关系.性关系对象 ||= [];
  state.宿主.关系.性癖标签 ||= [];
  return dedupeState(state);
}

class Store {
  constructor(chatId = 'default') {
    this.chatId = String(chatId || 'default');
    this.state = null;
    this.listeners = new Set();
    this.snapshots = [];
  }

  key() {
    return `${KEY}${this.chatId}`;
  }

  load() {
    let raw = null;
    try {
      const text = localStorage.getItem(this.key());
      if (text) raw = JSON.parse(text);
    } catch {}
    this.state = normalizeState(raw || clone(DEMO_STATE));
    if (!raw) this.save();
    return this.state;
  }

  save() {
    try {
      localStorage.setItem(this.key(), JSON.stringify(this.state));
    } catch (error) {
      console.warn('[HQ] store save failed', error);
    }
    this.emit();
  }

  emit() {
    for (const fn of this.listeners) {
      try { fn(this.state); } catch {}
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot() {
    this.snapshots.push(clone(this.state));
    if (this.snapshots.length > 10) this.snapshots.shift();
  }

  undo() {
    const last = this.snapshots.pop();
    if (!last) return false;
    this.state = last;
    this.save();
    return true;
  }

  reset() {
    this.snapshot();
    this.state = normalizeState(clone(DEMO_STATE));
    this.save();
  }

  exportJSON() {
    return JSON.stringify({ chatId: this.chatId, exportedAt: new Date().toISOString(), state: this.state }, null, 2);
  }

  importJSON(text) {
    const parsed = JSON.parse(String(text || ''));
    const next = parsed?.state && typeof parsed.state === 'object' ? parsed.state : parsed;
    this.snapshot();
    this.state = normalizeState(next);
    this.save();
    return true;
  }

  applyOps(ops, { snapshot = true } = {}) {
    if (!Array.isArray(ops) || !ops.length) return { applied: 0, rejected: [] };
    if (snapshot) this.snapshot();
    const rejected = [];
    let applied = 0;
    for (const op of ops.slice(0, 40)) {
      try {
        const path = String(op?.path || '');
        if (!/^\/(宿主|系统|世界)(\/|$)/.test(path)) {
          rejected.push({ path, reason: '路径不在白名单' });
          continue;
        }
        const current = getPath(this.state, path);
        switch (op.op) {
          case 'replace':
          case 'set':
            if (!setPath(this.state, path, op.value)) throw new Error('无法写入路径');
            break;
          case 'delta': {
            const base = Number(current) || 0;
            const delta = Number(op.value) || 0;
            if (!setPath(this.state, path, base + delta)) throw new Error('无法写入路径');
            break;
          }
          case 'add': {
            if (Array.isArray(current)) {
              current.push(op.value);
            } else if (path.endsWith('/-')) {
              const parentPath = path.slice(0, -2);
              const parent = getPath(this.state, parentPath);
              if (!Array.isArray(parent)) throw new Error('目标不是数组');
              parent.push(op.value);
            } else {
              throw new Error('add 目标不是数组');
            }
            break;
          }
          case 'remove': {
            if (Array.isArray(current)) {
              const value = op.value;
              const index = typeof value === 'number'
                ? value
                : current.findIndex((item) => JSON.stringify(item) === JSON.stringify(value));
              if (index >= 0) current.splice(index, 1);
            } else if (isObject(current) && op.key) {
              delete current[op.key];
            } else {
              throw new Error('remove 目标不支持');
            }
            break;
          }
          default:
            throw new Error(`未知操作 ${op.op}`);
        }
        applied += 1;
      } catch (error) {
        rejected.push({ path: op?.path, reason: String(error.message || error) });
      }
    }
    dedupeState(this.state);
    this.save();
    return { applied, rejected };
  }
}

// ---- lib/sidecar.js ----
const MAX_FACT_CHARS = 1800;
const MAX_MESSAGE_CHARS = 4200;

function clip(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function themeSummary(state) {
  const active = new Set(state.系统?.激活主题线 || []);
  const lines = [];
  for (const [id, meta] of Object.entries(state.系统?.主题线 || {})) {
    const progress = state.系统?.主题进度?.[id] || {};
    lines.push(`${id}｜${meta.状态 || '暂停'}｜${meta.阶段 || ''}｜${meta.称号 || ''}｜${meta.主进度标签 || '进度'} ${progress.主进度 ?? meta.主进度 ?? 0}｜${meta.副进度标签 || '副进度'} ${progress.副进度 ?? meta.副进度 ?? 0}${active.has(id) ? '｜已激活' : ''}`);
  }
  return lines.join('\n');
}

function recordSummary(state) {
  const timeline = (state.系统?.记录?.改造时间线 || []).slice(-4).map((t) => `${t.时间 || ''} ${t.部位 || ''} ${t.改造 || ''} ${t.阶段 || ''} ${t.状态 || ''}`);
  const equip = (state.系统?.记录?.装备档案 || []).slice(-6).map((e) => `${e.名称 || ''}｜${e.状态 || ''}｜${e.备注 || ''}`);
  return `改造时间线:\n${timeline.join('\n') || '无'}\n装备:\n${equip.join('\n') || '无'}`;
}

function buildFactBlock(state) {
  const host = state.宿主 || {};
  const world = state.世界 || {};
  const body = host.身体 || {};
  const relation = host.关系 || {};
  const people = (relation.人物列表 || []).slice(0, 8).map((p) => `${p.姓名 || p.名称 || '?'}(${p.身份 || ''}/${p.关系 || ''}/好感${p.好感 ?? '?'})`).join('；');
  const partners = (relation.性关系对象 || []).slice(0, 8).map((p) => `${p.对象 || '?'}×${p.次数 ?? '?'}(${p.类型 || ''})`).join('；');
  const text = [
    `时间 ${world.时间 || '?'}｜地点 ${world.地点 || '?'}｜环境 ${world.环境 || '?'}`,
    `宿主 ${host.姓名 || '?'}｜${host.性别 || '?'}｜${host.年龄 || '?'}岁｜${host.身份 || '?'}｜Lv.${host.等级 ?? '?'}｜积分 ${host.积分 ?? '?'}`,
    `性格 淫堕${host.性格?.淫堕值 ?? '?'}/服从${host.性格?.服从度 ?? '?'}/堕落${host.性格?.堕落度 ?? '?'}`,
    `身体 ${body.身高 || '?'}cm/${body.体重 || '?'}kg/${body.罩杯 || '?'}｜敏感${body.敏感度 ?? '?'}｜${body.身体变化 || ''}`,
    `衣饰 ${JSON.stringify(host.衣饰?.服装 || {})}｜饰品 ${(host.衣饰?.饰品 || []).join('、')}｜状态 ${host.衣饰?.状态 || ''}`,
    `关系 ${people || '无'}｜性关系 ${partners || '无'}`,
    `主题\n${themeSummary(state)}`,
    `记录\n${recordSummary(state)}`,
    `当前任务 ${state.系统?.主线任务?.编号 || ''} ${state.系统?.主线任务?.标题 || ''}`,
  ];
  return clip(text.join('\n'), MAX_FACT_CHARS);
}

function buildSidecarPrompt(state, messages, { mode = 'manual', turn = 0 } = {}) {
  const facts = buildFactBlock(state);
  const recent = (messages || [])
    .filter((m) => m && !m.is_system && m.mes)
    .slice(-6)
    .map((m) => {
      const who = m.is_user ? '用户' : (m.name || '角色');
      return `${who}: ${clip(m.mes, 700)}`;
    })
    .join('\n');
  const recentClipped = clip(recent, MAX_MESSAGE_CHARS);
  return [
    '你是角色卡的“状态记录员”，只负责把最近对话中已经发生的可验证变化写成 JSON 操作。',
    '不要写正文，不要编造未发生的剧情，不要新增人物关系；没有变化就返回 []。',
    '只允许路径 /宿主、/系统、/世界。可用操作：replace、set、delta、add、remove。',
    'add 只能对数组使用；remove 对数组用 value，对对象用 key。',
    '商品货架最多保留 30 件，单次生成不超过 10 件；新商品必须有类目和部位标签。',
    '改造时间线只追加；装备重复时用 replace 更新状态而不是重复 add。',
    '输出一个 JSON 数组，不要 markdown 代码围栏，不要解释。',
    `模式：${mode}；回合：${turn}`,
    '【当前状态】',
    facts,
    '【最近对话】',
    recentClipped || '(无)',
    '【输出】',
  ].join('\n');
}

function parseOps(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : raw;
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(body.slice(start, end + 1));
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  const objStart = body.indexOf('{');
  const objEnd = body.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) {
    try {
      const parsed = JSON.parse(body.slice(objStart, objEnd + 1));
      if (Array.isArray(parsed?.ops)) return parsed.ops;
      if (parsed?.op && parsed?.path) return [parsed];
    } catch {}
  }
  return [];
}

async function runSidecar({ host, store, mode = 'manual' }) {
  if (!host || !store) throw new Error('sidecar 缺少 host/store');
  if (host.isGenerating()) throw new Error('正文正在生成，稍后再同步');
  const messages = host.messages();
  const turn = messages.length;
  const prompt = buildSidecarPrompt(store.state, messages, { mode, turn });
  const raw = await host.generate({ prompt, responseLength: 1400, timeout: 90000 });
  const ops = parseOps(raw);
  if (!ops.length) return { applied: 0, rejected: [], raw, empty: true };
  const result = store.applyOps(ops);
  return { ...result, raw };
}

// ---- lib/ui.js ----

const THEME_ORDER = ['bnwo_queen', 'insect_wife', 'monster_rbq', 'dog_wife', 'horse_wife'];
const THEME_GROUP = {
  bnwo_queen: '媚黑',
  insect_wife: '虫妻线',
  monster_rbq: '异种',
  dog_wife: '兽妻线',
  horse_wife: '兽妻线',
};
const THEME_ACCENT = {
  bnwo_queen: '#d9b86a',
  insect_wife: '#a8c46a',
  monster_rbq: '#c98a5a',
  dog_wife: '#c9a77a',
  horse_wife: '#b9a58a',
};
const TABS = [
  ['role', '角色'],
  ['body', '肉体'],
  ['clothes', '衣饰'],
  ['relations', '关系'],
  ['system', '系统'],
  ['records', '记录'],
];

const ICONS = {
  core: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l8 4.6v9.6l-8 4.6-8-4.6V7.2l8-4.6z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>',
  bnwo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8c3.8 4.8 7 8.7 7 12.1A7 7 0 0 1 5 14.9c0-3.4 3.2-7.3 7-12.1z" fill="currentColor"/><path d="M12 15.2v6" stroke="currentColor" stroke-width="2.2"/></svg>',
  insect: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 9.2c0-2.7 1.9-4.7 4.2-4.7s4.2 2 4.2 4.7v5.1c0 2.4-1.8 4.2-4.2 4.2s-4.2-1.8-4.2-4.2V9.2z" fill="currentColor"/><path d="M7.8 8.6L4.8 5.8M16.2 8.6l3-2.8M7.8 12H3.6M16.2 12h4.2M7.8 15.2l-3.4 3M16.2 15.2l3.4 3M10.2 4.8L8.8 2.4M13.8 4.8l1.4-2.4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  femboy: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.2" cy="13.8" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14.2 9.8L20 4M16.4 4H20v3.6" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M10.2 17.2v4.4M8 19.4h4.4" stroke="currentColor" stroke-width="1.8"/></svg>',
  dog: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="17.2" rx="4.2" ry="3.4" fill="currentColor"/><circle cx="6.2" cy="10.2" r="2.1" fill="currentColor"/><circle cx="9.8" cy="7.4" r="2.1" fill="currentColor"/><circle cx="14.2" cy="7.4" r="2.1" fill="currentColor"/><circle cx="17.8" cy="10.2" r="2.1" fill="currentColor"/></svg>',
  horse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5v8.2c0 4.5 2.5 7.2 6 7.2s6-2.7 6-7.2V4.5h-3v8.2c0 2.7-1.2 4.2-3 4.2s-3-1.5-3-4.2V4.5H6z" fill="currentColor"/><circle cx="7.2" cy="7.2" r="1.1" fill="#171512"/><circle cx="16.8" cy="7.2" r="1.1" fill="#171512"/></svg>',
  monster: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9.5A4.5 4.5 0 0 1 9.5 5h5A4.5 4.5 0 0 1 19 9.5V19h-3v-3.2c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2V19H5z" fill="currentColor"/><path d="M8 5l-2-2M16 5l2-2" stroke="currentColor" stroke-width="1.8"/><circle cx="9.5" cy="10" r="1.2" fill="#171512"/><circle cx="14.5" cy="10" r="1.2" fill="#171512"/></svg>',
};

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function icon(name) {
  return ICONS[name] || ICONS.core;
}

function themeMeta(state, id) {
  if (id === 'core') {
    return {
      名称: '通用核心', 图标: 'core', 状态: '常驻', 阶段: '', 称号: '',
      主进度标签: '服从度', 主进度: 0, 副进度标签: '堕落度', 副进度: 0,
      简介: '不绑定主题的通用壳；主题线可以并行叠加。',
    };
  }
  return state.系统?.主题线?.[id] || {
    名称: id,
    图标: id === 'monster_rbq' ? 'monster' : 'core',
    状态: '暂停',
    阶段: '',
    称号: '',
    主进度标签: '进度',
    主进度: 0,
    副进度标签: '副进度',
    副进度: 0,
    简介: '',
  };
}

function themeDisplayName(meta, fallback) {
  return meta?.名称 || fallback;
}

function bar(label, value, max = 100, tone = 'gold') {
  const pct = Math.max(0, Math.min(100, (num(value) / (max || 100)) * 100));
  return `<div class="hq-bar"><div class="hq-bar-head"><span>${esc(label)}</span><b>${esc(value ?? 0)}</b></div><div class="hq-track"><i class="hq-tone-${esc(tone)}" style="width:${pct}%"></i></div></div>`;
}

function kv(label, value) {
  return `<div class="hq-kv"><span>${esc(label)}</span><b>${esc(value ?? '未记录')}</b></div>`;
}

function section(title, body, extra = '') {
  return `<section class="hq-section"><div class="hq-section-head"><h3>${esc(title)}</h3>${extra}</div>${body}</section>`;
}

function pill(text, tone = '') {
  return `<span class="hq-pill ${tone ? `hq-pill-${tone}` : ''}">${esc(text)}</span>`;
}

function renderRole(state, host) {
  const h = state.宿主 || {};
  const p = h.性格 || {};
  return `
    <div class="hq-hero">
      <div>
        <div class="hq-eyebrow">HOST PROFILE / ${esc(h.性别 || '未记录')}</div>
        <h2>${esc(h.姓名 || '未命名宿主')}</h2>
        <p>${esc(h.年龄 || '?')} 岁 · ${esc(h.身份 || '身份未记录')} · ${esc(h.关系?.风评 || '风评未记录')}</p>
      </div>
      <div class="hq-level"><b>Lv.${esc(h.等级 ?? '?')}</b><span>${esc(h.积分 ?? 0)} 积分</span></div>
    </div>
    <div class="hq-stat-row">
      ${bar('淫堕值', p.淫堕值 ?? 0, 100, 'rose')}
      ${bar('服从度', p.服从度 ?? 0, 100, 'rose')}
      ${bar('堕落度', p.堕落度 ?? 0, 100, 'violet')}
    </div>
    <p class="hq-quote">${esc(p.综合 || '还没有形成完整的性格判断。')}</p>
    ${section('基本信息', `<div class="hq-grid-2">
      ${kv('时间', state.世界?.时间)}${kv('地点', state.世界?.地点)}
      ${kv('环境', state.世界?.环境)}${kv('身份', h.身份)}
      ${kv('外貌', h.身体?.部位?.头部)}${kv('体力 / 精神', `${h.体力 ?? 60} / ${h.精神 ?? 45}`)}
      ${kv('身体数据', `${h.身体?.身高 ?? '?'}cm · ${h.身体?.体重 ?? '?'}kg · ${h.身体?.罩杯 ?? '?'}`)}
      ${kv('当前任务', `${state.系统?.主线任务?.编号 || ''} ${state.系统?.主线任务?.标题 || '无'}`)}
    </div>`)}
    ${section('内心', `<p class="hq-prose">${esc(h.内心 || '她没有把现在的自己说出口。')}</p>`)}
    ${section('身体变化', `<p class="hq-prose">${esc(h.身体?.身体变化 || '暂无记录')}</p>${bar('敏感度', h.身体?.敏感度 ?? 0, 100, 'rose')}`)}
    <div class="hq-actions"><button class="hq-btn hq-btn-primary" data-action="open-wizard">建立开局档案</button><button class="hq-btn" data-action="open-sync">让 AI 补记状态</button></div>
  `;
}

function renderBody(state) {
  const h = state.宿主 || {};
  const b = h.身体 || {};
  const parts = b.部位 || {};
  return `
    ${section('身体状态', `<div class="hq-grid-2">${bar('敏感度', b.敏感度 ?? 0, 100, 'rose')}${bar('子宫开发', b.子宫开发 ?? 18, 100, 'violet')}</div>`)}
    ${section('身体部位', `<div class="hq-grid-2">${Object.entries(parts).map(([k, v]) => kv(k, v)).join('')}</div>`)}
    ${section('内腔与体液', `<div class="hq-grid-2">${kv('子宫', b.子宫)}${kv('体液', b.体液)}${kv('毛发', b.毛发)}${kv('身体变化', b.身体变化)}</div>`)}
    ${section('衣饰接触', `<p class="hq-prose">${esc(h.衣饰?.状态 || '暂无记录')}</p>`)}
  `;
}

function renderClothes(state) {
  const c = state.宿主?.衣饰 || {};
  const clothes = c.服装 && typeof c.服装 === 'object' ? Object.entries(c.服装) : [];
  const list = (arr) => (Array.isArray(arr) && arr.length ? arr.map((x) => pill(x)).join('') : '<span class="hq-muted">未记录</span>');
  return `
    ${section('服装', `<div class="hq-list">${clothes.map(([k, v]) => `<div class="hq-list-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('') || '<p class="hq-muted">未记录</p>'}</div>`)}
    ${section('饰品 / 穿孔 / 玩具', `<div class="hq-pill-row">${list(c.饰品)}${list(c.穿孔)}${list(c.玩具)}</div>`)}
    ${section('衣饰状态', `<p class="hq-prose">${esc(c.状态 || '暂无记录')}</p>`)}
  `;
}

function renderRelations(state) {
  const r = state.宿主?.关系 || {};
  const people = Array.isArray(r.人物列表) ? r.人物列表 : [];
  const partners = Array.isArray(r.性关系对象) ? r.性关系对象 : [];
  const tags = Array.isArray(r.性癖标签) ? r.性癖标签 : [];
  return `
    ${section('人物记录', `<div class="hq-cards">${people.map((p) => `<article class="hq-mini-card"><div class="hq-mini-head"><b>${esc(p.姓名 || p.名字 || '未命名')}</b>${pill(p.关系 || '关系未记', 'muted')}</div><p>${esc(p.身份 || '')}${p.好感 != null ? ` · 好感 ${esc(p.好感)}` : ''}</p><small>${esc(p.备注 || '')}</small></article>`).join('') || '<p class="hq-muted">还没有人物记录。</p>'}</div>`, `<span class="hq-note">按姓名去重</span>`)}
    ${section('性关系对象', `<div class="hq-list">${partners.map((p) => `<div class="hq-list-row"><div><b>${esc(p.对象 || p.姓名 || '未知')}</b><small>${esc(p.类型 || '')} · 初次 ${esc(p.初次 || '未记')}</small></div><span>${esc(p.次数 ?? 0)} 次</span></div>`).join('') || '<p class="hq-muted">还没有性关系记录。</p>'}</div>`, `<span class="hq-note">按对象去重</span>`)}
    ${section('性经验 / 性癖', `<p class="hq-prose">${esc(r.性经验 || '未记录')}</p><div class="hq-pill-row">${tags.map((t) => pill(t, 'violet')).join('') || '<span class="hq-muted">未记录</span>'}</div>`)}
    ${section('风评', `<p class="hq-prose">${esc(r.风评 || '未记录')}</p>`)}
  `;
}

function themeCard(state, id) {
  const meta = themeMeta(state, id);
  const progress = state.系统?.主题进度?.[id] || {};
  const active = meta.状态 === '激活';
  const primary = state.系统?.主推主题 === id;
  return `<article class="hq-theme-card ${active ? 'is-active' : ''} ${primary ? 'is-primary' : ''}" style="--theme-accent:${THEME_ACCENT[id] || '#d9b86a'}">
    <div class="hq-theme-top"><span class="hq-theme-icon">${icon(meta.图标 === 'monster_meat' ? 'monster' : meta.图标)}</span><div><b>${esc(themeDisplayName(meta, id))}</b><small>${esc(THEME_GROUP[id] || '主题')}${meta.阶段 ? ` · ${esc(meta.阶段)}` : ''}</small></div><span class="hq-theme-state">${esc(meta.状态 || '暂停')}</span></div>
    <p>${esc(meta.简介 || '')}</p>
    <div class="hq-theme-progress">${bar(meta.主进度标签 || '主进度', progress.主进度 ?? meta.主进度 ?? 0, 100, 'gold')}${bar(meta.副进度标签 || '副进度', progress.副进度 ?? meta.副进度 ?? 0, 100, 'rose')}</div>
    <div class="hq-theme-actions"><button class="hq-btn hq-btn-xs" data-action="toggle-theme" data-theme="${esc(id)}">${active ? '暂停' : '激活'}</button><button class="hq-btn hq-btn-xs" data-action="primary-theme" data-theme="${esc(id)}" ${primary ? 'disabled' : ''}>${primary ? '主推中' : '设为主推'}</button></div>
  </article>`;
}

function renderShop(state) {
  const shelf = state.系统?.商店?.货架 || [];
  const groups = new Map();
  for (const item of shelf) {
    const cat = item.类目 || '未分类';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }
  return `<div class="hq-shop-top"><p>货架 ${shelf.length} 件 · 单次生成上限 10 件 · 按类目折叠</p><button class="hq-btn hq-btn-xs" data-action="open-sync">让 AI 补货</button></div>
    <div class="hq-shop-groups">${[...groups.entries()].map(([cat, items]) => `<details class="hq-shop-group" open><summary><span>${esc(cat)}</span><small>${items.length} 件</small></summary>${items.map((item) => `<article class="hq-shop-item" data-item="${esc(item.编号 || item.名称)}">
      <div class="hq-shop-head"><b>${esc(item.名称)}</b><span>${esc(item.价格 ?? 0)} CR</span></div>
      <p>${esc(item.简介 || '')}</p>
      <div class="hq-pill-row">${(item.部位标签 || []).map((t) => pill(t, 'muted')).join('')}${pill(item.状态 || '在售', 'ok')}</div>
      <div class="hq-shop-foot"><small>库存 ${esc(item.库存 ?? '?')} · ${esc(item.效果 || '')}</small><button class="hq-btn hq-btn-xs" data-action="buy" data-id="${esc(item.编号 || item.名称)}">兑换</button></div>
    </article>`).join('')}</details>`).join('') || '<p class="hq-muted">货架为空。</p>'}</div>`;
}

function renderSystem(state) {
  const primary = state.系统?.主推主题 || 'core';
  const primaryMeta = themeMeta(state, primary);
  return `
    <div class="hq-section-head"><h3>主题线</h3><span class="hq-note">主推 ${esc(themeDisplayName(primaryMeta, '通用核心'))} · 激活不设上限</span></div>
    <div class="hq-theme-grid">${THEME_ORDER.map((id) => themeCard(state, id)).join('')}</div>
    ${section('投影模式', `<div class="hq-segmented">${['可见', '半透明', '隐藏'].map((mode) => `<button class="${state.系统?.投影模式 === mode ? 'active' : ''}" data-action="projection" data-mode="${mode}">${mode}</button>`).join('')}</div><p class="hq-note">只影响系统投影在正文中的可见度，不改变正文事件。</p>`)}
    ${section('主线任务', taskCard(state.系统?.主线任务))}
    ${section('支线任务', `<div class="hq-list">${(state.系统?.支线任务 || []).map((t) => `<div class="hq-list-row"><div><b>${esc(t.编号)} ${esc(t.标题)}</b><small>${esc(t.奖励 || '')}${t.惩罚 ? ` · ${esc(t.惩罚)}` : ''}</small></div><span>${esc(t.时限 || '')}</span></div>`).join('') || '<p class="hq-muted">无</p>'}</div>`)}
    ${section('系统商店', renderShop(state))}
    <div class="hq-actions"><button class="hq-btn hq-btn-primary" data-action="open-sync">让 AI 补记状态</button><button class="hq-btn" data-action="open-profile">查看开局档案</button></div>
  `;
}

function taskCard(task) {
  if (!task) return '<p class="hq-muted">无主线任务。</p>';
  return `<div class="hq-task"><div class="hq-task-head"><b>${esc(task.编号)} ${esc(task.标题)}</b><span>${esc(task.时限 || '')}</span></div><p>${esc(task.目标 || '')}</p><div class="hq-task-foot"><span>${esc(task.判定 || '')}</span><span>${esc(task.奖励 || '')}${task.惩罚 ? ` · ${esc(task.惩罚)}` : ''}</span></div></div>`;
}

function renderRecords(state) {
  const r = state.系统?.记录 || {};
  const timeline = r.改造时间线 || [];
  return `
    ${section('改造时间线', `<div class="hq-timeline">${timeline.map((t) => `<article class="hq-timeline-item"><div class="hq-timeline-dot"></div><div class="hq-timeline-body"><div class="hq-timeline-head"><b>${esc(t.部位 || '未记')}</b><span>${esc(t.时间 || '')}</span></div><p>${esc(t.改造 || '')}</p><div class="hq-pill-row">${pill(t.阶段 || '阶段未记', 'muted')}${pill(t.来源 || '来源未记', 'muted')}${pill(t.状态 || '未记', 'ok')}${(t.标签 || []).map((x) => pill(x, 'violet')).join('')}</div><small>${esc(t.备注 || '')}</small></div></article>`).join('') || '<p class="hq-muted">还没有改造记录。</p>'}</div>`, `<span class="hq-note">只追加 · ${timeline.length} 条</span>`)}
    ${section('装备档案', `<div class="hq-list">${(r.装备档案 || []).map((e) => `<div class="hq-list-row"><div><b>${esc(e.名称)}</b><small>${esc(e.来源 || '')}</small></div><div class="hq-list-end">${pill(e.状态 || '未记', 'muted')}<small>${esc(e.备注 || '')}</small></div></div>`).join('') || '<p class="hq-muted">无</p>'}</div>`, `<span class="hq-note">按名称去重</span>`)}
    ${section('计数', `<div class="hq-list">${(r.计数 || []).map((c) => `<div class="hq-list-row"><span>${esc(c.名称)}</span><b>${esc(c.当前 ?? 0)}${c.上限 ? ` / ${esc(c.上限)}` : ''}</b></div>`).join('') || '<p class="hq-muted">无</p>'}</div>`)}
    ${section('事件', `<div class="hq-list">${(r.事件 || []).map((e) => `<div class="hq-list-row"><span>${esc(e.时间 || '')}</span><b>${esc(e.内容 || '')}</b></div>`).join('') || '<p class="hq-muted">无</p>'}</div>`)}
    ${section('其他记录', `<p class="hq-prose">${esc(r.其他记录 || '无')}</p>`)}
    ${section('系统信息', `<div class="hq-grid-2">${kv('主推主题', themeDisplayName(themeMeta(state, state.系统?.主推主题), '通用核心'))}${kv('激活主题线', (state.系统?.激活主题线 || []).map((id) => themeDisplayName(themeMeta(state, id), id)).join('、'))}${kv('名称', state.系统?.名称)}${kv('等级', state.宿主?.等级)}${kv('货币', `${state.宿主?.积分 ?? 0} 积分`)}${kv('投影模式', state.系统?.投影模式)}</div>`)}
  `;
}

function renderWizard(state) {
  const h = state.宿主 || {};
  return `<div class="hq-modal-backdrop" data-action="close-wizard">
    <div class="hq-modal" role="dialog" aria-modal="true" aria-label="建立开局档案">
      <div class="hq-modal-head"><div><span class="hq-eyebrow">OPENING PROFILE</span><h2>建立开局档案</h2></div><button class="hq-icon-btn" data-action="close-wizard" aria-label="关闭">×</button></div>
      <p class="hq-note">这一步只写入档案，不自动发送。你可以先改选项，再把整理好的文字放进输入框。</p>
      <div class="hq-form-grid">
        <label>姓名<input name="name" value="${esc(h.姓名 || '林晚')}" maxlength="20"></label>
        <label>性别<select name="sex"><option ${h.性别 === '女' ? 'selected' : ''}>女</option><option ${h.性别 === '男' ? 'selected' : ''}>男</option><option ${h.性别 === '其他' ? 'selected' : ''}>其他</option></select></label>
        <label>年龄<input name="age" type="number" min="18" max="99" value="${esc(h.年龄 || 27)}"></label>
        <label>身份<input name="identity" value="${esc(h.身份 || '广告公司文案')}" maxlength="30"></label>
        <label>身高<input name="height" type="number" min="120" max="230" value="${esc(h.身体?.身高 || 168)}"></label>
        <label>体重<input name="weight" type="number" min="30" max="200" value="${esc(h.身体?.体重 || 52)}"></label>
        <label>罩杯<input name="cup" value="${esc(h.身体?.罩杯 || 'D')}" maxlength="4"></label>
        <label>初始主题<select name="theme">${THEME_ORDER.map((id) => `<option value="${id}" ${state.系统?.主推主题 === id ? 'selected' : ''}>${esc(themeDisplayName(themeMeta(state, id), id))}</option>`).join('')}</select></label>
      </div>
      <label class="hq-form-wide">一句话性格<input name="personality" value="${esc(h.性格?.综合 || '一个正在把「被强迫」改写成「想要」的人。')}" maxlength="80"></label>
      <div class="hq-modal-actions"><button class="hq-btn" data-action="close-wizard">取消</button><button class="hq-btn" data-action="wizard-fill" data-target="textarea">只填入输入框</button><button class="hq-btn hq-btn-primary" data-action="wizard-save">写入档案并填入</button></div>
    </div>
  </div>`;
}

function renderSync(state, status) {
  return `<div class="hq-modal-backdrop" data-action="close-sync">
    <div class="hq-modal hq-modal-sm" role="dialog" aria-modal="true" aria-label="AI 补记状态">
      <div class="hq-modal-head"><div><span class="hq-eyebrow">SIDE CAR / MANUAL</span><h2>AI 补记状态</h2></div><button class="hq-icon-btn" data-action="close-sync" aria-label="关闭">×</button></div>
      <p class="hq-prose">只读取最近 6 层对话和当前状态，生成 JSON 补丁。没有变化就返回空数组。不会改写正文，不会自动发送。</p>
      <div class="hq-sync-box"><b>${esc(status?.phase || '待命')}</b><p>${esc(status?.message || '手动触发，最多 40 条操作。')}</p></div>
      <div class="hq-modal-actions"><button class="hq-btn" data-action="close-sync">关闭</button><button class="hq-btn hq-btn-primary" data-action="sync-run" ${status?.busy ? 'disabled' : ''}>${status?.busy ? '读取中…' : '开始补记'}</button></div>
    </div>
  </div>`;
}

function renderProfile(state) {
  const h = state.宿主 || {};
  return `<div class="hq-modal-backdrop" data-action="close-profile">
    <div class="hq-modal" role="dialog" aria-modal="true" aria-label="开局档案">
      <div class="hq-modal-head"><div><span class="hq-eyebrow">OPENING PROFILE</span><h2>当前开局档案</h2></div><button class="hq-icon-btn" data-action="close-profile" aria-label="关闭">×</button></div>
      <pre class="hq-profile-text">${esc(profileText(state))}</pre>
      <div class="hq-modal-actions"><button class="hq-btn" data-action="close-profile">关闭</button><button class="hq-btn hq-btn-primary" data-action="profile-fill">填入输入框</button></div>
    </div>
  </div>`;
}

function profileText(state) {
  const h = state.宿主 || {};
  const b = h.身体 || {};
  const theme = themeDisplayName(themeMeta(state, state.系统?.主推主题), '通用核心');
  return `【开局档案】\n姓名：${h.姓名 || '未定'}\n性别：${h.性别 || '未定'}\n年龄：${h.年龄 || '未定'}\n身份：${h.身份 || '未定'}\n外貌：${b.部位?.头部 || '未记录'}\n身体：${b.身高 || '?'}cm / ${b.体重 || '?'}kg / ${b.罩杯 || '?'}\n性格：${h.性格?.综合 || '未定'}\n主推主题：${theme}\n投影模式：${state.系统?.投影模式 || '可见'}\n\n请从临湾的一个普通日常场景开始，让系统第一次介入；不要一次把设定倒完，给我 2–4 个可执行选择。`;
}

class UI {
  constructor({ host, store }) {
    this.host = host;
    this.store = store;
    this.tab = 'role';
    this.open = false;
    this.status = { phase: '待命', message: '手动触发，最多 40 条操作。', busy: false };
    this.root = null;
    this.off = null;
  }

  mount() {
    if (this.root) return;
    const root = document.createElement('div');
    root.className = 'hq-root';
    root.innerHTML = `<button class="hq-launcher" type="button" data-action="open" aria-label="打开宿主调教系统"><span class="hq-launcher-icon">${icon('monster')}</span><span>宿主系统</span><i></i></button><div class="hq-drawer" hidden></div>`;
    document.body.appendChild(root);
    this.root = root;
    this.off = this.store.subscribe(() => {
      if (this.open) this.render();
    });
    root.addEventListener('click', (event) => this.onClick(event));
    root.addEventListener('change', (event) => this.onChange(event));
    this.render();
  }

  unmount() {
    try { this.off?.(); } catch {}
    this.off = null;
    this.root?.remove();
    this.root = null;
  }

  openDrawer() {
    this.open = true;
    const drawer = this.root?.querySelector('.hq-drawer');
    if (drawer) {
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('is-open'));
    }
    this.render();
  }

  closeDrawer() {
    this.open = false;
    const drawer = this.root?.querySelector('.hq-drawer');
    if (drawer) {
      drawer.classList.remove('is-open');
      setTimeout(() => { if (!this.open) drawer.hidden = true; }, 220);
    }
  }

  render() {
    if (!this.root) return;
    const state = this.store.state;
    const primary = state.系统?.主推主题 || 'core';
    const primaryMeta = themeMeta(state, primary);
    const accent = THEME_ACCENT[primary] || '#d9b86a';
    const drawer = this.root.querySelector('.hq-drawer');
    if (!drawer) return;
    drawer.style.setProperty('--hq-accent', accent);
    const view = {
      role: () => renderRole(state, this.host),
      body: () => renderBody(state),
      clothes: () => renderClothes(state),
      relations: () => renderRelations(state),
      system: () => renderSystem(state),
      records: () => renderRecords(state),
    }[this.tab] || (() => renderRole(state, this.host));
    drawer.innerHTML = `<div class="hq-backdrop" data-action="close"></div>
      <aside class="hq-shell" aria-label="宿主调教系统">
        <header class="hq-header">
          <div class="hq-brand"><span class="hq-brand-icon">${icon(primaryMeta.图标 === 'monster_meat' ? 'monster' : primaryMeta.图标)}</span><div><b>宿主调教系统</b><small>${esc(themeDisplayName(primaryMeta, '通用核心'))} · ${esc(primaryMeta.状态 || '待机')} · 插件预览</small></div></div>
          <div class="hq-header-actions"><span class="hq-dot"></span><button class="hq-icon-btn" data-action="close" aria-label="关闭">×</button></div>
        </header>
        <nav class="hq-tabs">${TABS.map(([id, label]) => `<button class="${this.tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</nav>
        <main class="hq-main">${view()}</main>
        <footer class="hq-footer"><span>localStorage · ${esc(this.store.chatId)}</span><span>v0.7.0-preview · C0</span></footer>
      </aside>`;
    if (this.modal === 'wizard') drawer.insertAdjacentHTML('beforeend', renderWizard(state));
    if (this.modal === 'sync') drawer.insertAdjacentHTML('beforeend', renderSync(state, this.status));
    if (this.modal === 'profile') drawer.insertAdjacentHTML('beforeend', renderProfile(state));
  }

  onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'open') return this.openDrawer();
    if (action === 'close') return this.closeDrawer();
    if (action === 'tab') { this.tab = target.dataset.tab; this.modal = null; return this.render(); }
    if (action === 'open-wizard') { this.modal = 'wizard'; return this.render(); }
    if (action === 'close-wizard') { if (event.target === target || target.classList.contains('hq-icon-btn') || target.tagName === 'BUTTON') { this.modal = null; this.render(); } return; }
    if (action === 'open-sync') { this.modal = 'sync'; return this.render(); }
    if (action === 'close-sync') { if (event.target === target || target.classList.contains('hq-icon-btn') || target.tagName === 'BUTTON') { this.modal = null; this.render(); } return; }
    if (action === 'open-profile') { this.modal = 'profile'; return this.render(); }
    if (action === 'close-profile') { if (event.target === target || target.classList.contains('hq-icon-btn') || target.tagName === 'BUTTON') { this.modal = null; this.render(); } return; }
    if (action === 'toggle-theme') return this.toggleTheme(target.dataset.theme);
    if (action === 'primary-theme') return this.setPrimary(target.dataset.theme);
    if (action === 'buy') return this.buy(target.dataset.id);
    if (action === 'wizard-save') return this.saveWizard(true);
    if (action === 'wizard-fill') return this.saveWizard(false);
    if (action === 'profile-fill') return this.fillTextarea(profileText(this.store.state));
    if (action === 'sync-run') return this.runSync();
    if (action === 'projection') {
      const mode = target.dataset.mode;
      if (!mode) return;
      this.store.state.系统.投影模式 = mode;
      this.store.save();
      return;
    }
  }

  onChange(event) {
    const target = event.target.closest('[data-action="projection"]');
    if (target) {
      const mode = target.value;
      if (mode) {
        this.store.state.系统.投影模式 = mode;
        this.store.save();
      }
    }
  }

  toggleTheme(id) {
    if (!id) return;
    const meta = this.store.state.系统.主题线[id];
    if (!meta) return;
    const active = meta.状态 === '激活';
    meta.状态 = active ? '暂停' : '激活';
    const set = new Set(this.store.state.系统.激活主题线 || []);
    if (active) set.delete(id);
    else set.add(id);
    this.store.state.系统.激活主题线 = [...set];
    this.store.save();
  }

  setPrimary(id) {
    if (!id || !this.store.state.系统.主题线[id]) return;
    this.store.state.系统.主推主题 = id;
    this.store.state.系统.主题线[id].状态 = '激活';
    const set = new Set(this.store.state.系统.激活主题线 || []);
    set.add(id);
    this.store.state.系统.激活主题线 = [...set];
    this.store.save();
  }

  async buy(id) {
    const item = (this.store.state.系统.商店?.货架 || []).find((x) => x.编号 === id || x.名称 === id);
    if (!item) return;
    const price = num(item.价格);
    const points = num(this.store.state.宿主.积分);
    if (points < price) {
      this.toast('积分不够');
      return;
    }
    this.store.snapshot();
    this.store.state.宿主.积分 = points - price;
    item.库存 = Math.max(0, num(item.库存) - 1);
    const text = `【兑换】${item.名称}｜${price} 积分｜库存 ${item.库存}`;
    this.store.save();
    this.host.setTextarea(text);
    this.toast('已扣除积分，兑换请求已放入输入框');
  }

  saveWizard(fill) {
    const form = this.root.querySelector('.hq-modal');
    if (!form) return;
    const get = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim() || '';
    const h = this.store.state.宿主;
    h.姓名 = get('name') || h.姓名;
    h.性别 = get('sex') || h.性别;
    h.年龄 = Number(get('age')) || h.年龄;
    h.身份 = get('identity') || h.身份;
    h.身体 ||= {};
    h.身体.身高 = Number(get('height')) || h.身体.身高;
    h.身体.体重 = Number(get('weight')) || h.身体.体重;
    h.身体.罩杯 = get('cup') || h.身体.罩杯;
    h.性格 ||= {};
    h.性格.综合 = get('personality') || h.性格.综合;
    const theme = get('theme');
    if (theme) this.store.state.系统.主推主题 = theme;
    this.store.save();
    this.modal = null;
    if (fill) this.fillTextarea(profileText(this.store.state));
    this.render();
  }

  async fillTextarea(text) {
    if (this.host.setTextarea(text)) {
      this.toast('已填入输入框，未发送');
    } else {
      try {
        await navigator.clipboard.writeText(text);
        this.toast('输入框不可用，已复制到剪贴板');
      } catch {
        this.toast('没有找到输入框');
      }
    }
    this.modal = null;
    this.render();
  }

  async runSync() {
    if (this.status.busy) return;
    this.status = { phase: '读取中', message: '正在整理最近对话与当前状态…', busy: true };
    this.render();
    try {
      const result = await runSidecar({ host: this.host, store: this.store, mode: 'manual' });
      this.status = {
        phase: result.empty ? '没有变化' : `已应用 ${result.applied || 0} 条`,
        message: result.rejected?.length ? `${result.rejected.length} 条被拒绝：${result.rejected.map((x) => x.reason).join('；')}` : '状态已合并；正文不会被改写。',
        busy: false,
      };
      this.store.save();
    } catch (error) {
      this.status = { phase: '补记失败', message: String(error.message || error), busy: false };
    }
    this.render();
  }

  toast(message) {
    const el = document.createElement('div');
    el.className = 'hq-toast';
    el.textContent = message;
    this.root?.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }
}


// ---- index.js ----



let host = null;
let store = null;
let ui = null;
let listeners = [];
let active = false;

function disposeUi() {
  try { ui?.unmount(); } catch {}
  ui = null;
}

function bindChat(chatId) {
  disposeUi();
  store = new Store(chatId);
  store.load();
  ui = new UI({ host, store });
  ui.mount();
}

function bindEvents() {
  if (!host) return;
  listeners.push(host.on('CHAT_CHANGED', () => {
    if (!active) return;
    bindChat(host.chatId());
  }));
  listeners.push(host.on('GENERATION_ENDED', () => {
    if (!active || !ui) return;
    if (ui.open) ui.render();
  }));
  listeners.push(host.on('MESSAGE_RECEIVED', () => {
    if (!active || !ui) return;
    if (ui.open) ui.render();
  }));
}

async function onActivate() {
  if (active) return;
  active = true;
  try {
    host = await new Host().ready();
    bindChat(host.chatId());
    bindEvents();
    window.HQSystem = {
      host,
      get store() { return store; },
      get ui() { return ui; },
      open: () => ui?.openDrawer(),
      close: () => ui?.closeDrawer(),
      sync: () => ui?.runSync(),
    };
    console.info('[HQ] 宿主调教系统插件预览已加载');
  } catch (error) {
    active = false;
    console.warn('[HQ] 插件初始化失败', error);
  }
}

function onDisable() {
  active = false;
  for (const off of listeners.splice(0)) {
    try { off(); } catch {}
  }
  disposeUi();
  try { delete window.HQSystem; } catch {}
}

function onClean() {
  onDisable();
  try { store?.listeners?.clear?.(); } catch {}
  store = null;
  host = null;
}


export { onActivate, onDisable, onClean };
