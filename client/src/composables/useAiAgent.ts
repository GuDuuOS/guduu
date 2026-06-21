import { reactive } from 'vue'
import { workspaceDataMap, workspaces } from '@/data/channels'
import { getTodos, addCampaignTodos, addDealTodos, addCrisisTodos, addReviewTodos, addGrowthTodos } from '@/data/todos'
import { useActiveWorkspace } from '@/composables/useActiveWorkspace'
import { useLiveChannels } from '@/composables/useLiveChannels'
import { tenant } from '@/config/tenant'
import type { ChannelItem } from '@/types/channel'
import type { MessageData } from '@/types/message'

/* ===== 对话消息与结果卡片 ===== */
export interface TaskStatusRow {
  name: string
  pending: number
  inProgress: number
  done: number
  overdue: number
}
/** 建群提案里的候选成员 */
export interface Candidate {
  name: string
  role: string
  reason: string
  selected: boolean
}
/** 选题灵感 */
export interface TopicIdea {
  title: string
  angle: string
  hook: string
  heat: number // 0-100 预估热度
  platform: string
}
/** 数据指标（分析/周报通用）*/
export interface Metric {
  label: string
  value: string
  delta: string
  up: boolean
}
/** 发布排期行 */
export interface ScheduleRow {
  day: string
  time: string
  platform: string
  content: string
  status: string
}
/** 脚本分镜 */
export interface ScriptShot {
  scene: string
  visual: string
  voice: string
}
/** 周报分节 */
export interface ReportSection {
  title: string
  lines: string[]
}
/** 策划全链路步骤 */
export interface PlanStep {
  agent: string
  task: string
  output: string
  /** true=真人协作（主 AI 只能 @ 提醒），false/省略=AI Agent（可直接派单干）*/
  human?: boolean
}
/** 开题问卷的单个选项（仿 Claude Code AskUserQuestion：标题 + 说明）*/
export interface IntakeOption {
  label: string
  desc: string
}
/** 开题问卷的单个问题 */
export interface IntakeQuestion {
  key: 'platform' | 'format' | 'audience' | 'goal'
  /** 短标签 chip，如「平台」 */
  tag: string
  /** 完整问题文案 */
  label: string
  options: IntakeOption[]
  /** 选中项的 label；选「其他」时为空、改用 custom */
  selected: string
  /** 「其他…」自定义输入 */
  custom: string
}
/** 用户对开题问卷的作答，用于个性化方案 */
export interface PlanBrief {
  platform: string
  format: string
  audience: string
  goal: string
}
/** 商单问卷的作答 */
export interface DealBrief {
  industry: string
  form: string
  pricing: string
  bottomLine: string
}
/** 商单报价明细的一行 */
export interface DealQuote {
  form: string
  fans: string
  avgPlay: string
  price: string
}
/** 舆情应对问卷的作答 */
export interface CrisisBrief {
  tone: string
  scope: string
  action: string
  aftercare: string
}
/** 复盘优化问卷的作答 */
export interface ReviewBrief {
  target: string
  problem: string
  fix: string
  redistribute: string
}
/** 私域增长问卷的作答 */
export interface GrowthBrief {
  goal: string
  base: string
  hook: string
  rhythm: string
}

export type AiCard =
  | { kind: 'proposal'; label: string; candidates: Candidate[]; done: boolean }
  | { kind: 'channel'; channelId: string; label: string; workspace: string; members: string[] }
  | { kind: 'tasks'; rows: TaskStatusRow[] }
  | { kind: 'topics'; theme: string; topics: TopicIdea[] }
  | { kind: 'analysis'; theme: string; metrics: Metric[]; spark: number[]; findings: string[] }
  | { kind: 'schedule'; theme: string; rows: ScheduleRow[] }
  | { kind: 'report'; period: string; metrics: Metric[]; sections: ReportSection[] }
  | { kind: 'script'; theme: string; titles: string[]; hook: string; shots: ScriptShot[]; cta: string }
  | { kind: 'intake'; theme: string; flow: 'campaign' | 'deal' | 'crisis' | 'review' | 'growth'; questions: IntakeQuestion[]; step: number; done: boolean }
  | { kind: 'plan'; theme: string; brief: PlanBrief; topic: TopicIdea; steps: PlanStep[]; nextActions: string[]; launched: boolean; channelId?: string }
  | { kind: 'deal'; brand: string; brief: DealBrief; quotes: DealQuote[]; packagePrice: string; steps: PlanStep[]; nextActions: string[]; launched: boolean; channelId?: string }
  | { kind: 'crisis'; event: string; brief: CrisisBrief; draftTitle: string; draftLines: string[]; steps: PlanStep[]; nextActions: string[]; launched: boolean; channelId?: string }
  | { kind: 'review'; subject: string; brief: ReviewBrief; metrics: Metric[]; hooks: string[]; steps: PlanStep[]; nextActions: string[]; launched: boolean; channelId?: string }
  | { kind: 'growth'; theme: string; brief: GrowthBrief; metrics: Metric[]; activities: string[]; steps: PlanStep[]; nextActions: string[]; launched: boolean; channelId?: string }

export interface ThinkStep { label: string; done: boolean }

export interface AiMessage {
  id: number
  role: 'user' | 'ai'
  text?: string
  card?: AiCard
  /** 承办此条结果的 Agent（主 AI 派单后由谁交付）；中枢自办时为空 */
  agent?: string
  /** 思考态：展示分步进度，完成后填充 text / card */
  thinking?: boolean
  steps?: ThinkStep[]
}

/* ===== 团队阵容（4 个 AI bot + 4 位真人协作）===== */
/** AI Agent：主 AI 可直接派单干"数字活" */
const AGENTS = {
  hub: '安其中枢 AI',
  topic: '选题 Agent',
  copy: '文案 Agent',
  data: '数据 Agent'
} as const
/** 真人协作：主 AI 只能 @ 提醒，干"线下/关系活"——老周(摄影)/阿杰(剪辑)/小鹿(商务)/安其(主理人) */

const messages = reactive<AiMessage[]>([])
let seq = 0
let channelSeq = 0

const { activeId } = useActiveWorkspace()

/** 每步思考间隔（ms）*/
const STEP_MS = 520

/* ===== 候选人花名册（带关键词与推荐理由）===== */
interface Roster { name: string; role: string; reason: string; always?: boolean; keys?: RegExp }
const ROSTER: Roster[] = [
  { name: 'CosMac Star',     role: '总控',     reason: '总控协调（默认加入）', always: true },
  { name: '安其',      role: '主理人',   reason: '拍板 / 重大决策',     keys: /(选题|脚本|拍摄|发布|商单|定档|审核|预算)/ },
  { name: '小鹿',      role: '商务运营', reason: '商单 / 私域 / 合作',  keys: /(商单|品牌|合作|报价|私域|社群|合同|回款)/ },
  { name: '老周',      role: '摄影',     reason: '拍摄 / 现场',         keys: /(拍摄|拍|镜头|现场|场地|道具|布景)/ },
  { name: '阿杰',      role: '视频剪辑', reason: '剪辑 / 成片交付',     keys: /(剪辑|成片|初剪|交付|字幕|封面|导出)/ },
  { name: '选题 Agent', role: '选题 bot', reason: '热点 / 选题 / 对标',  keys: /(选题|热点|灵感|对标|爆款|趋势)/ },
  { name: '数据 Agent', role: '数据 bot', reason: '数据复盘 / 增长',     keys: /(数据|播放|涨粉|复盘|完播|转化|增长|舆情|评论)/ },
  { name: '文案 Agent', role: '文案 bot', reason: '标题 / 脚本 / 文案',   keys: /(文案|标题|脚本|分镜|长文|口播|话术)/ }
]

/* ===== 主题识别：把用户话里的赛道抽出来，让产出"对得上" ===== */
interface Theme { key: RegExp; name: string }
const THEMES: Theme[] = [
  { key: /职场|打工|上班|通勤|内卷|内耗|裸辞|离职|副业|搞钱|赚钱/, name: '职场 · 副业搞钱' },
  { key: /护肤|美妆|彩妆|化妆|国货|面膜|精华|口红/, name: '美妆护肤' },
  { key: /探店|美食|餐厅|咖啡|奶茶|火锅|吃/, name: '本地探店美食' },
  { key: /健身|减肥|减脂|增肌|瑜伽|跑步|运动/, name: '健身减脂' },
  { key: /育儿|宝宝|带娃|母婴|孩子|亲子/, name: '育儿亲子' },
  { key: /理财|存钱|攒钱|基金|省钱|记账|预算/, name: '个人理财' },
  { key: /穿搭|时尚|衣服|搭配|显瘦/, name: '穿搭时尚' },
  { key: /数码|手机|电脑|相机|测评/, name: '数码测评' }
]
function detectTheme(text: string): string {
  for (const t of THEMES) if (t.key.test(text)) return t.name
  return '内容创作'
}

/* ===== 智能预填：从用户原话里识别关键词，预选问卷选项 ===== */
const OPT_SYNONYMS: Record<string, RegExp> = {
  // 平台
  抖音: /抖音/, 小红书: /小红书|种草/, 视频号: /视频号/, 公众号: /公众号|长文/,
  // 内容形式
  口播干货: /口播|干货/, 剧情演绎: /剧情|短剧/, 街访对比: /街访|对比/, 'Vlog 记录': /vlog|日常/i,
  // 受众
  职场新人: /职场|新人|打工/, '35+ 转型': /35|中年|转型/, 管理者: /管理者|老板|团队/, 自由职业: /自由职业|freelanc/i,
  // 内容目标
  涨粉: /涨粉|涨粉丝|做大/, 引流私域: /引流|私域|加微/, 带货变现: /带货|变现|卖货/, 接商单: /商单|恰饭|广告/,
  // 商单行业
  美妆护肤: /护肤|美妆|彩妆|国货/, 食品饮料: /食品|饮料|零食/, '3C 数码': /数码|3c|手机|电脑/i, 知识付费: /知识付费|课程|训练营/,
  // 商单形式
  抖音口播: /抖音/, 小红书图文: /图文/, 全平台打包: /全平台|打包/,
  // 报价策略
  走刊例价: /刊例|标准价/, 略低冲案例: /冲案例|让点|降价/, 溢价做独家: /溢价|独家|加价/, 对等议价: /对等|议价/,
  // 舆情基调
  诚恳道歉: /道歉|认错|致歉/, 澄清说明: /澄清|解释|说明/, 冷处理观察: /冷处理|观察|不回应/, 据理力争: /反驳|力争/,
  // 复盘问题
  '前 3 秒钩子': /钩子|开头|前\s?3/, 中段节奏: /节奏|拖|废话/, 封面标题: /封面|标题/, 选题角度: /选题|角度/,
  换钩子重发: /换钩子|重发/, 重剪节奏: /重剪|重新剪/,
  // 私域目标 / 阵地 / 钩子
  公域引流: /引流|拉新/, 群活跃: /拉活|活跃|盘活|沉/, 付费转化: /转化|付费/, 复购裂变: /复购|裂变|老带新/,
  微信群: /微信群|社群|粉丝群/, 企业微信: /企微|企业微信/,
  免费咨询: /免费咨询|1v1|咨询/, 资料包: /资料包|资料/, 抽奖福利: /抽奖|福利/, 话题打卡: /打卡/
}
function optHit(label: string, text: string): boolean {
  const syn = OPT_SYNONYMS[label]
  if (syn) return syn.test(text)
  return text.includes(label)
}
/** 按用户原话预选问卷选项；返回被命中的 (tag,label) 便于在开场白里回显 */
function applyPrefill(questions: IntakeQuestion[], text: string): { tag: string; label: string }[] {
  const hits: { tag: string; label: string }[] = []
  for (const q of questions) {
    const opt = q.options.find((o) => optHit(o.label, text))
    if (opt) { q.selected = opt.label; hits.push({ tag: q.tag, label: opt.label }) }
  }
  return hits
}
/** 开场白里回显"我已默认选了 X"的智能感提示 */
function prefillNote(hits: { tag: string; label: string }[]): string {
  if (!hits.length) return ''
  return `\n（我从你的描述里默认选了 ${hits.map((h) => `${h.label}`).join('、')}，可在下面改其它项）`
}

/* ===== 稳定伪随机：同一句话产出一致，不同话产出有别 ===== */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}
function rotate<T>(arr: T[], by: number, n: number): T[] {
  const out: T[] = []
  for (let i = 0; i < n; i++) out.push(arr[(by + i) % arr.length])
  return out
}

/* ===== 意图解析：建群 ===== */
function extractGroupName(text: string): string {
  const quoted = text.match(/[「"'《]([^」"'》\n]{1,20})[」"'》]/)
  if (quoted) return quoted[1].trim()
  const m = text.match(/([一-龥A-Za-z0-9·\-]{2,16})(群|组|频道|专班)/)
  if (m) {
    const stem = m[1].replace(/^(请|帮我|帮忙|麻烦)?\s*(新建|创建|建立|建|开|拉|搞|起)?\s*一?\s*个?\s*/, '')
    return (stem || m[1]) + m[2]
  }
  return '临时协作群'
}

/** 按任务匹配候选人，命中者预选；至少预选 2 人 */
function proposeMembers(text: string): Candidate[] {
  const list: Candidate[] = ROSTER.map((r) => ({
    name: r.name,
    role: r.role,
    reason: r.reason,
    selected: !!r.always || (r.keys ? r.keys.test(text) : false)
  }))
  if (list.filter((c) => c.selected).length <= 1) {
    for (const n of ['安其', '小鹿']) {
      const c = list.find((x) => x.name === n)
      if (c) c.selected = true
    }
  }
  return list
}

/* ===== 意图判定（按优先级从专到泛）===== */
const isReviewIntent   = (t: string) => /(优化重发|重发|重剪|改钩子|救.{0,3}条|完播.{0,2}低|数据.{0,2}差|跑.{0,2}差|没.{0,2}爆|复盘.{0,3}优化|优化.{0,3}这条)/.test(t)
const isGrowthIntent   = (t: string) => /(私域|社群|加微|涨群|拉活|沉淀粉丝|公私域|社群运营|群活跃|建群运营|粉丝群)/.test(t)
const isCrisisIntent   = (t: string) => /(舆情|负评|差评|黑评|公关|危机|翻车|塌房|被骂|被喷|带节奏|挂热搜|评论区.{0,4}(炸|翻|出事|负面|骂))/.test(t)
const isDealIntent     = (t: string) => /(商单|恰饭|带货合作|广告合作|品牌方?合作|找我.{0,4}合作|想.{0,4}(合作|找我)|接.{0,3}(商单|单子|广告|私单)|报价单)/.test(t)
const isCreateIntent   = (t: string) => /(群|组|频道|专班)/.test(t) && /(建|创建|新建|建立|组建|开|拉|搞|起)/.test(t)
const isTaskIntent     = (t: string) => /(任务|进度|待办|逾期|状态)/.test(t) && !/(选题|脚本|涨粉|排期)/.test(t)
const isReportIntent   = (t: string) => /(周报|日报|月报|简报|报表|报告)/.test(t) || (/(导出|生成|出一?份)/.test(t) && /报/.test(t))
const isScheduleIntent = (t: string) => /(排期|档期|发布计划|发布日历|错峰|定档)/.test(t) || (/(排|安排|规划)/.test(t) && /(发布|内容|本周)/.test(t))
const isAnalysisIntent = (t: string) => /(涨粉|趋势|复盘|完播|播放量|数据分析|增长|转化|流量)/.test(t) || (/(分析|看看|诊断|拆解)/.test(t) && /(数据|账号|内容|表现)/.test(t))
const isScriptIntent   = (t: string) => /(脚本|分镜|口播|文案稿)/.test(t) || (/(写|起草|生成|来一?[段条])/.test(t) && /(脚本|文案|口播)/.test(t))
const isTopicIntent    = (t: string) => /(选题|灵感|拍什么|想个|想几个|出几个)/.test(t)
const isPlanIntent     = (t: string) => /(策划|爆款|全链路|从.*到.*变现)/.test(t) || /(帮我|来一?条|做一?条).*(视频|内容|爆款)/.test(t)

/* ===== 内容生成器 ===== */
const ANGLES = ['反常识观点', '避坑清单', '亲测对比', '保姆级教程', '热点蹭评', '人设故事', '数据打脸', '沉浸式 Vlog']
const HOOKS = [
  '前 3 秒甩出反常识结论，制造"等等？"',
  '用一个真实翻车故事开场，代入感拉满',
  '直接上对比画面，左错右对一眼分高下',
  '抛一个"你是不是也这样"的扎心提问',
  '甩一组冲突数据，先把人留住再讲',
  '用"我替你踩过这些坑"建立信任'
]
const PLATFORMS = ['抖音', '小红书', '视频号', '公众号', 'B站']
const PEAK_TIMES = ['12:30', '18:00', '20:30', '21:15', '07:30']
const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function genTopics(theme: string, seed: number, n = 5): TopicIdea[] {
  const angles = rotate(ANGLES, seed, n)
  const hooks = rotate(HOOKS, seed + 2, n)
  const plats = rotate(PLATFORMS, seed + 1, n)
  return angles.map((angle, i) => ({
    title: `${theme}｜${angle}：${topicTail(theme, angle, seed + i)}`,
    angle,
    hook: hooks[i],
    heat: 72 + ((seed + i * 13) % 27), // 72-98
    platform: plats[i]
  }))
}
function topicTail(theme: string, angle: string, s: number): string {
  const tails = [
    '90% 的人第一步就做错了',
    '这 3 个细节决定成败',
    '我亲测一个月后的真实结果',
    '别再被"经验之谈"骗了',
    '新手最该先做的一件事',
    '花最少的钱拿到最好的效果',
    '一条公式直接套用'
  ]
  return tails[(s + angle.length) % tails.length]
}

function genSpark(seed: number): number[] {
  const out: number[] = []
  let v = 40 + (seed % 20)
  for (let i = 0; i < 7; i++) {
    v += ((seed >> i) % 13) - 4
    out.push(Math.max(8, Math.min(100, v)))
  }
  return out
}

function genAnalysis(theme: string, seed: number): { metrics: Metric[]; spark: number[]; findings: string[] } {
  const metrics: Metric[] = [
    { label: '播放量', value: `${(38 + (seed % 40))}.${seed % 9}w`, delta: `+${12 + (seed % 18)}%`, up: true },
    { label: '净涨粉', value: `+${1200 + (seed % 900)}`, delta: `+${8 + (seed % 22)}%`, up: true },
    { label: '完播率', value: `${28 + (seed % 14)}%`, delta: `${(seed % 3) === 0 ? '-' : '+'}${1 + (seed % 6)}.${seed % 9}pt`, up: (seed % 3) !== 0 },
    { label: '主页访问', value: `${(5 + (seed % 9))}.${seed % 9}k`, delta: `+${5 + (seed % 15)}%`, up: true }
  ]
  const findings = [
    `「${theme}」赛道本周完播率比账号均值高 ${3 + (seed % 6)} 个百分点，前 3 秒钩子是主要增量。`,
    `发布时段集中在晚 20:00–21:00 时，互动率最高；午间档表现偏弱，建议减配。`,
    `评论区高频词「${['有用', '收藏了', '求更新', '太真实'][seed % 4]}」占比上升，可据此做一条追更/合集。`
  ]
  return { metrics, spark: genSpark(seed), findings }
}

function genSchedule(theme: string, seed: number): ScheduleRow[] {
  const topics = genTopics(theme, seed, 5)
  const status = ['待拍摄', '待剪辑', '已排期', '待审核', '已排期']
  return topics.map((t, i) => ({
    day: WEEK[(seed + i) % 5],
    time: PEAK_TIMES[i % PEAK_TIMES.length],
    platform: t.platform,
    content: t.title.split('：')[0],
    status: status[i % status.length]
  }))
}

function genScript(theme: string, seed: number): Extract<AiCard, { kind: 'script' }> {
  const titles = [
    `我不允许还有人不知道：${theme}这样做`,
    `${theme}｜我踩过的坑，你别再踩`,
    `做对这 3 步，${theme}少走半年弯路`
  ]
  const shots: ScriptShot[] = [
    { scene: '开场钩子 0–3s', visual: '正脸怼镜头，背景虚化', voice: HOOKS[seed % HOOKS.length] },
    { scene: '冲突铺垫 3–10s', visual: '错误做法快剪 + 红叉特效', voice: `先说说大多数人是怎么翻车的——${theme}里这几个动作最容易踩雷。` },
    { scene: '干货正文 10–35s', visual: '分点字幕条 + 实拍演示', voice: '正确的做法其实只有三步，我一条条拆给你看。' },
    { scene: '收尾 CTA 35–42s', visual: '回正脸 + 关注引导动效', voice: '觉得有用就点赞收藏，关注我，下条讲进阶玩法。' }
  ]
  return { kind: 'script', theme, titles, hook: shots[0].voice, shots, cta: '点赞 + 收藏 + 关注三连，评论区扣「1」抽更新' }
}

function genPlan(theme: string, seed: number, brief: PlanBrief): Extract<AiCard, { kind: 'plan' }> {
  const topic = genTopics(theme, seed, 1)[0]
  // 按问卷个性化：平台、形式、受众都吃进方案
  topic.platform = brief.platform
  const steps: PlanStep[] = [
    { agent: '选题 Agent', task: `扫描热点 + 对标拆解（面向${brief.audience}）`, output: `锁定选题：${topic.title}` },
    { agent: '文案 Agent', task: `按「${brief.format}」出标题与脚本`, output: '3 个爆款标题 + 4 镜脚本初稿' },
    { agent: '老周（摄影）', task: '按分镜表实拍', output: '原始素材 12 段，标注可用片段', human: true },
    { agent: '阿杰（剪辑）', task: '成片 + 字幕 + 封面', output: '横竖双版本成片 + 3 张封面备选', human: true },
    { agent: '数据 Agent', task: `算${brief.platform}流量高峰 + 错峰排期`, output: `${brief.platform} ${PEAK_TIMES[seed % 5]} 首发，其余平台跟发` }
  ]
  const nextActions = [
    `确认选题与标题（围绕「${brief.goal}」这个目标）`,
    '把脚本同步到「拍摄-脚本分镜」频道，@老周 约拍',
    '发布后 24h 数据 Agent 自动拉复盘'
  ]
  return { kind: 'plan', theme, brief, topic, steps, nextActions, launched: false }
}

/** 开题问卷：仿 Claude Code 选项卡（标题 + 说明 + 其他）。默认选第一项，可改 */
function buildIntake(): IntakeQuestion[] {
  return [
    {
      key: 'platform', tag: '平台', label: '这条主发哪个平台？', selected: '抖音', custom: '',
      options: [
        { label: '抖音', desc: '流量大、完播为王，适合强钩子短视频' },
        { label: '小红书', desc: '种草属性强，图文/口播都行，利于带货' },
        { label: '视频号', desc: '中老年触达广，私域转化好' },
        { label: '公众号', desc: '长文深度，适合沉淀与私域' }
      ]
    },
    {
      key: 'format', tag: '形式', label: '用什么内容形式？', selected: '口播干货', custom: '',
      options: [
        { label: '口播干货', desc: '正脸输出观点，信任感强、好涨粉' },
        { label: '剧情演绎', desc: '情景短剧，代入感强、易传播' },
        { label: '街访对比', desc: '真实采访/左右对比，冲突感强' },
        { label: 'Vlog 记录', desc: '沉浸式日常，养人设、黏性高' }
      ]
    },
    {
      key: 'audience', tag: '受众', label: '主要讲给谁听？', selected: '职场新人', custom: '',
      options: [
        { label: '职场新人', desc: '23–28 岁，焦虑成长、性价比敏感' },
        { label: '35+ 转型', desc: '中年危机、副业刚需' },
        { label: '管理者', desc: '团队 / 效率 / 认知向' },
        { label: '自由职业', desc: '搞钱 / 自律 / 个人品牌' }
      ]
    },
    {
      key: 'goal', tag: '目标', label: '这条的核心目标是？', selected: '涨粉', custom: '',
      options: [
        { label: '涨粉', desc: '做大盘子，强钩子 + 蹭话题' },
        { label: '引流私域', desc: '主页挂载、评论引导加微' },
        { label: '带货变现', desc: '选品 + 种草 + 转化链路' },
        { label: '接商单', desc: '拉刊例、做案例、谈合作' }
      ]
    }
  ]
}

/* ===== 「爆款专班」群内运转：kickoff + 各成员陆续发言 ===== */
function fmtTime(offsetMin: number): string {
  const base = 9 * 60 + 30 + offsetMin // 以 09:30 为基准，避免依赖真实时钟
  const h = Math.floor((base % (24 * 60)) / 60)
  const m = base % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 中枢派单开场（建群即发）*/
function hubKickoff(card: Extract<AiCard, { kind: 'plan' }>): MessageData {
  return {
    id: `${card.channelId}-k0`,
    sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' },
    time: fmtTime(0),
    html: `🚀 <b>爆款专班启动</b>：${card.topic.title}<br/>平台 <b>${card.brief.platform}</b> · 形式 <b>${card.brief.format}</b> · 面向 <b>${card.brief.audience}</b> · 主攻 <b>${card.brief.goal}</b>。已按全链路派单，各位就位：`,
    doc: {
      title: '派单表 · 各就各位',
      subtitle: 'AI Agent 自动开工；@ 的真人请认领',
      sections: [{
        title: '分工',
        table: {
          headers: ['承办', '任务', '交付'],
          rows: card.steps.map((s) => [
            s.human ? `@${s.agent}` : s.agent,
            s.task,
            { text: s.output, color: s.human ? '#a07050' : '#6b8e4e' }
          ])
        }
      }],
      footer: '// dispatched by 安其中枢 AI'
    }
  }
}

/** 各成员依次响应，模拟群里真实运转 */
function campaignDrip(card: Extract<AiCard, { kind: 'plan' }>): MessageData[] {
  const id = card.channelId
  const p = card.brief.platform
  return [
    {
      id: `${id}-d1`, sender: { type: 'bot', name: '选题 Agent', avatar: '题' }, time: fmtTime(1),
      html: `收到派单 ✅ 已锁定选题「${card.topic.title}」，并关联到你历史同类爆款（播放 186w）。<b>角度</b>：${card.topic.angle}；<b>钩子</b>：${card.topic.hook}`
    },
    {
      id: `${id}-d2`, sender: { type: 'bot', name: '文案 Agent', avatar: '文' }, time: fmtTime(2),
      html: `已按「${card.brief.format}」出 3 个备选标题 + 4 镜脚本初稿，黄金 3 秒钩子放第 1 镜。@老周 拍摄清单同步给你了。`
    },
    {
      id: `${id}-d3`, sender: { type: 'human', name: '老周', avatar: '周', color: '#a07050' }, time: fmtTime(4),
      html: '收到，分镜看了，明天上午开拍没问题。第 4 镜室外我备个雨天预案。'
    },
    {
      id: `${id}-d4`, sender: { type: 'human', name: '阿杰', avatar: '杰', color: '#7a8a5a' }, time: fmtTime(5),
      html: '素材给我后我按 <b>周四交付初剪</b>，横竖双版本，封面出 3 张备选。'
    },
    {
      id: `${id}-d5`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(6),
      html: `已算好流量高峰：<b>${p} ${PEAK_TIMES[hash(card.topic.title) % 5]} 首发</b>，其余平台错峰跟发，并写入「发布-排期日历」。发布后 24h 我自动出复盘。`
    },
    {
      id: `${id}-d6`, sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' }, time: fmtTime(7),
      html: `全员就位 ✅ 进度看板已建：选题✓ 脚本✓ 待拍摄 → 待剪辑 → 待发布。<b>需要你拍板的 3 个节点已加进「待办事宜」</b>（确认标题 / 审脚本约拍 / 审成片定档）。有卡点我会 @ 对应的人，无需你盯。`,
      rich: {
        variant: 'ok', tag: 'RUNNING', title: '专班运转中',
        meta: `${card.brief.platform} · 目标「${card.brief.goal}」`,
        kv: [
          { k: '选题', v: '已锁定 ✅' },
          { k: '脚本', v: '初稿完成 ✅' },
          { k: '拍摄', v: '老周 · 明日开拍' },
          { k: '剪辑', v: '阿杰 · 周四初剪' },
          { k: '发布', v: `数据 Agent · 已排期` }
        ]
      }
    }
  ]
}

/* ===== 商单变现：问卷 / 报价 / 派单 / 群内运转 ===== */
function buildDealIntake(): IntakeQuestion[] {
  return [
    {
      key: 'platform', tag: '行业', label: '对方是什么行业的品牌？', selected: '美妆护肤', custom: '',
      options: [
        { label: '美妆护肤', desc: '客单高、复购强，内容合规要求高' },
        { label: '食品饮料', desc: '预算稳、转化直接，适合带货' },
        { label: '3C 数码', desc: '看重测评背书、专业度' },
        { label: '知识付费', desc: '看重信任与转化链路' }
      ]
    },
    {
      key: 'format', tag: '形式', label: '合作要哪种内容形式？', selected: '抖音口播', custom: '',
      options: [
        { label: '抖音口播', desc: '60s 口播植入，转化快' },
        { label: '小红书图文', desc: '种草笔记，长尾搜索好' },
        { label: '视频号', desc: '中老年触达、私域沉淀' },
        { label: '全平台打包', desc: '一鱼多吃，报价更高' }
      ]
    },
    {
      key: 'audience', tag: '报价', label: '报价策略走哪种？', selected: '走刊例价', custom: '',
      options: [
        { label: '走刊例价', desc: '按近 90 天真实数据标准报价' },
        { label: '略低冲案例', desc: '让 10–15% 换案例与长期' },
        { label: '溢价做独家', desc: '加价换同类目独家窗口' },
        { label: '对等议价', desc: '按对方预算反向定制' }
      ]
    },
    {
      key: 'goal', tag: '底线', label: '这单你最在意什么？', selected: '现结优先', custom: '',
      options: [
        { label: '现结优先', desc: '压账期，验收后尽快回款' },
        { label: '长期合作', desc: '让点价，换季度框架' },
        { label: '案例背书', desc: '要可对外露出的合作案例' },
        { label: '规避风险', desc: '严守广告法、不做绝对化承诺' }
      ]
    }
  ]
}

/** 按行业/形式/报价策略生成报价明细 */
function genDeal(brand: string, seed: number, brief: DealBrief): Extract<AiCard, { kind: 'deal' }> {
  const mult = brief.pricing === '溢价做独家' ? 1.3 : brief.pricing === '略低冲案例' ? 0.85 : 1
  const douyin = Math.round((11000 + (seed % 5) * 1000) * mult)
  const xhs = Math.round((5500 + (seed % 4) * 500) * mult)
  const pkg = Math.round((douyin + xhs) * 0.9)
  const yuan = (n: number) => `¥ ${n.toLocaleString('en-US')}`
  const quotes: DealQuote[] = [
    { form: '抖音 60s 口播', fans: '48.2w', avgPlay: '8.6w', price: yuan(douyin) },
    { form: '小红书图文', fans: '21.6w', avgPlay: '3.2w', price: yuan(xhs) },
    { form: `打包价（${brief.form}）`, fans: '—', avgPlay: '—', price: yuan(pkg) }
  ]
  const steps: PlanStep[] = [
    { agent: '数据 Agent', task: '调刊例 + 近 90 天均播', output: `按「${brief.pricing}」给出建议报价` },
    { agent: '文案 Agent', task: '拟合作话术 + 广告法自检', output: '合规话术 + 植入脚本框架' },
    { agent: '小鹿（商务）', task: '发报价 + 谈判', output: '对方确认打包价与档期', human: true },
    { agent: '安其中枢 AI', task: '占位排期 + 合同流转', output: '排期占位 + 合同进「合作-合同报价」' }
  ]
  const nextActions = [
    `确认报价单与底价（围绕「${brief.bottomLine}」）`,
    '@小鹿 把报价发给品牌方',
    '对方接受后：审合同条款 + 占位拍摄档期'
  ]
  return { kind: 'deal', brand, brief, quotes, packagePrice: yuan(pkg), steps, nextActions, launched: false }
}

/** 商单 kickoff：中枢发报价单派单 */
function hubKickoffDeal(card: Extract<AiCard, { kind: 'deal' }>): MessageData {
  return {
    id: `${card.channelId}-k0`,
    sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' },
    time: fmtTime(0),
    html: `💼 <b>商单专班启动</b>：${card.brand}<br/>形式 <b>${card.brief.form}</b> · 报价策略 <b>${card.brief.pricing}</b> · 底线 <b>${card.brief.bottomLine}</b>。报价单已出，派单如下：`,
    doc: {
      title: `商单报价单 · ${card.brand}`,
      subtitle: '基于近 90 天真实数据 · 仅供内部参考',
      sections: [{
        title: '报价明细',
        table: {
          headers: ['形式', '粉丝量', '近 30 天均播', '建议报价'],
          rows: card.quotes.map((q, i) => [
            q.form, q.fans, q.avgPlay,
            { text: q.price, color: i === card.quotes.length - 1 ? '#c96442' : '#6b8e4e' }
          ])
        }
      }],
      footer: '// generated by 数据 Agent · 含 1 次免费修改'
    }
  }
}

/** 商单群内各成员陆续运转 */
function dealDrip(card: Extract<AiCard, { kind: 'deal' }>): MessageData[] {
  const id = card.channelId
  return [
    {
      id: `${id}-d1`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(1),
      html: `收到派单 ✅ 已按「${card.brief.pricing}」核算：打包价 <b>${card.packagePrice}</b>，对标同类目报价处于中位偏上，<b>有 8% 议价空间</b>。`
    },
    {
      id: `${id}-d2`, sender: { type: 'bot', name: '文案 Agent', avatar: '文' }, time: fmtTime(2),
      html: '合作话术已拟好，<b>已移除「全网最低 / 第一 / 最」等绝对化用语</b>，规避广告法风险。植入脚本框架同步给小鹿。'
    },
    {
      id: `${id}-d3`, sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' }, time: fmtTime(4),
      html: `报价我发过去了，按底线「${card.brief.bottomLine}」跟对方谈。`
    },
    {
      id: `${id}-d4`, sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' }, time: fmtTime(6),
      html: `对方接受 <b>打包价 ${card.packagePrice}</b>，要排到下周，合同随后发来。`
    },
    {
      id: `${id}-d5`, sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' }, time: fmtTime(7),
      html: `已在「发布-排期日历」<b>占位下周档期</b>，合同流转到「合作-合同报价」自动审条款。<b>需要你拍板的 3 个节点已进「待办事宜」</b>（确认报价 / 审合同 / 回款跟进）。`,
      rich: {
        variant: 'ok', tag: 'RUNNING', title: '商单运转中',
        meta: `${card.brand} · ${card.packagePrice}`,
        kv: [
          { k: '报价', v: '已发出 ✅' },
          { k: '话术合规', v: '已自检 ✅' },
          { k: '对方', v: `接受打包价` },
          { k: '合同', v: '待审条款' },
          { k: '排期', v: '已占位下周' }
        ]
      }
    }
  ]
}

/* ===== 舆情危机：问卷 / 应对方案 / 派单 / 群内运转 ===== */
function buildCrisisIntake(): IntakeQuestion[] {
  return [
    {
      key: 'platform', tag: '基调', label: '这次回应走什么基调？', selected: '诚恳道歉', custom: '',
      options: [
        { label: '诚恳道歉', desc: '认错 + 给具体整改动作，最稳' },
        { label: '澄清说明', desc: '摆事实、解释误会，不卑不亢' },
        { label: '冷处理观察', desc: '暂不回应，先盯扩散趋势' },
        { label: '据理力争', desc: '确有冤情时，附证据反驳' }
      ]
    },
    {
      key: 'format', tag: '范围', label: '在哪些平台回应？', selected: '抖音+小红书', custom: '',
      options: [
        { label: '仅抖音', desc: '只在主战场处理，控制扩散' },
        { label: '抖音+小红书', desc: '覆盖已搬运的平台' },
        { label: '全平台同步', desc: '统一口径，避免次生舆情' },
        { label: '私域先安抚', desc: '先稳住核心粉丝群' }
      ]
    },
    {
      key: 'audience', tag: '动作', label: '主要处理动作是？', selected: '置顶澄清', custom: '',
      options: [
        { label: '置顶澄清', desc: '置顶一条说明，统一引导' },
        { label: '逐条回复', desc: '高赞争议评论逐条回应' },
        { label: '出回应视频', desc: '正脸回应，诚意最足' },
        { label: '补标整改', desc: '补广告标 / 下架问题内容' }
      ]
    },
    {
      key: 'goal', tag: '善后', label: '善后怎么做？', selected: '内部复盘', custom: '',
      options: [
        { label: '内部复盘', desc: '复盘流程，避免再犯' },
        { label: '补偿粉丝', desc: '抽奖 / 福利安抚情绪' },
        { label: '法务介入', desc: '涉及谣言 / 诽谤时取证' },
        { label: '暂不额外动作', desc: '回应到位即可，观察为主' }
      ]
    }
  ]
}

/** 生成舆情应对方案：置顶说明草稿 + 派单 */
function genCrisis(event: string, seed: number, brief: CrisisBrief): Extract<AiCard, { kind: 'crisis' }> {
  const draftTitle = `置顶说明 · ${event}`
  const draftLines = [
    brief.tone === '诚恳道歉'
      ? '大家的批评我收到了，也认了 🙏 这件事确实是我的疏忽，先跟各位说声对不起。'
      : brief.tone === '澄清说明'
        ? '看到不少讨论，我来把事情说清楚，避免误会继续扩散。'
        : brief.tone === '据理力争'
          ? '关于这件事的几个说法与事实不符，我把证据一并放出来。'
          : '我们正在核实情况，会尽快给大家一个明确回应。',
    brief.action === '补标整改'
      ? '已第一时间补上「广告」标签 / 整改问题内容，该补的流程一个不少。'
      : brief.action === '出回应视频'
        ? '稍后会发一条正脸回应视频，把来龙去脉讲清楚。'
        : '已把这条说明在评论区置顶，方便大家看到。',
    '以后但凡涉及合作，一定第一时间标注清楚，也欢迎大家继续监督。'
  ]
  const steps: PlanStep[] = [
    { agent: '数据 Agent', task: '聚合争议评论 + 定性', output: `负面占比 ${28 + (seed % 12)}%、高频词「恰饭/不标注/割韭菜」` },
    { agent: '文案 Agent', task: `按「${brief.tone}」拟回应 + 广告法自检`, output: '置顶说明定稿（真诚、不甩锅）' },
    { agent: '小鹿（商务）', task: `在${brief.scope}执行${brief.action}`, output: '三平台置顶 + 盯评论区', human: true },
    { agent: '安其中枢 AI', task: '盯舆情曲线 + 复盘归档', output: `善后：${brief.aftercare}，2h 内出回落报告` }
  ]
  const nextActions = [
    `审定置顶说明文案（基调：${brief.tone}）`,
    `@小鹿 在${brief.scope}置顶并盯评论区`,
    `善后：${brief.aftercare}，并把本次写进「钩子库/避雷库」`
  ]
  return { kind: 'crisis', event, brief, draftTitle, draftLines, steps, nextActions, launched: false }
}

/** 舆情 kickoff：中枢发置顶说明派单 */
function hubKickoffCrisis(card: Extract<AiCard, { kind: 'crisis' }>): MessageData {
  return {
    id: `${card.channelId}-k0`,
    sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' },
    time: fmtTime(0),
    html: `🚨 <b>舆情应对启动</b>：${card.event}<br/>基调 <b>${card.brief.tone}</b> · 范围 <b>${card.brief.scope}</b> · 动作 <b>${card.brief.action}</b>。回应稿已出，派单如下：`,
    doc: {
      title: card.draftTitle,
      subtitle: '建议同步到抖音 / 小红书 / 评论区置顶',
      sections: [{ title: '正文', body: card.draftLines.join('<br/>') }],
      footer: '// drafted by 文案 Agent · 已通过广告法合规自检'
    }
  }
}

/** 舆情群内各成员陆续运转 */
function crisisDrip(card: Extract<AiCard, { kind: 'crisis' }>): MessageData[] {
  const id = card.channelId
  return [
    {
      id: `${id}-d1`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(1),
      html: `已聚合争议评论并比对历史相似案例（3 例处理得当未掉粉）。<b>建议 2 小时内公开回应</b>，避免扩散到其他平台。`,
      rich: {
        variant: 'alert', tag: 'CRITICAL', title: '评论区负面情绪激增 · 疑似信任危机',
        meta: `${card.event} · 近 1 小时 +218 条负面`,
        kv: [
          { k: '负面占比', v: '37%（昨日 6%）' },
          { k: '高频关键词', v: '恰饭 / 不标注 / 割韭菜' },
          { k: '扩散平台', v: '抖音 → 小红书已有搬运' },
          { k: '处理窗口', v: '建议 2h 内' }
        ]
      }
    },
    {
      id: `${id}-d2`, sender: { type: 'bot', name: '文案 Agent', avatar: '文' }, time: fmtTime(2),
      html: `置顶说明已定稿（基调「${card.brief.tone}」），<b>已通过广告法合规自检</b>，语气真诚不甩锅、给了具体动作。@小鹿 可以发了。`
    },
    {
      id: `${id}-d3`, sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' }, time: fmtTime(4),
      html: `已在${card.brief.scope}完成${card.brief.action} ✅ 我盯着评论区，有新情况随时同步。`
    },
    {
      id: `${id}-d4`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(6),
      html: `回应后 30 分钟：<b>负面占比 37% → 14%</b>，情绪明显回落，未向其他平台进一步扩散，高赞评论转向「知错能改」。`
    },
    {
      id: `${id}-d5`, sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' }, time: fmtTime(7),
      html: `舆情已控住 ✅ 善后「${card.brief.aftercare}」已安排，本次已写进「平台规则与避雷库」。<b>需要你拍板的 3 个节点已进「待办事宜」</b>（审文案 / 盯舆情 / 复盘整改）。`,
      rich: {
        variant: 'ok', tag: 'RESOLVED', title: '舆情已控住',
        meta: `${card.event} · 负面回落至 14%`,
        kv: [
          { k: '回应稿', v: '已置顶 ✅' },
          { k: '合规自检', v: '通过 ✅' },
          { k: '负面占比', v: '37% → 14%' },
          { k: '扩散', v: '已止住' },
          { k: '善后', v: card.brief.aftercare }
        ]
      }
    }
  ]
}

/* ===== 数据复盘 → 优化重发：问卷 / 方案 / 派单 / 群内运转 ===== */
function buildReviewIntake(): IntakeQuestion[] {
  return [
    {
      key: 'platform', tag: '对象', label: '优化哪条内容？', selected: '上一条', custom: '',
      options: [
        { label: '上一条', desc: '刚发不久、数据不及预期的那条' },
        { label: '本周最差', desc: '本周完播 / 涨粉垫底的一条' },
        { label: '指定一条', desc: '你点名的某条历史内容' },
        { label: '近期爆款', desc: '想把已爆的再放大' }
      ]
    },
    {
      key: 'format', tag: '问题', label: '你觉得问题主要在？', selected: '前 3 秒钩子', custom: '',
      options: [
        { label: '前 3 秒钩子', desc: '开头太平、留不住人' },
        { label: '中段节奏', desc: '废话多、节奏拖' },
        { label: '封面标题', desc: '点击率低、没吸引力' },
        { label: '选题角度', desc: '选题本身偏了' }
      ]
    },
    {
      key: 'audience', tag: '动作', label: '主要优化动作？', selected: '换钩子重发', custom: '',
      options: [
        { label: '换钩子重发', desc: '只改前 3 秒，原片重发' },
        { label: '重剪节奏', desc: '阿杰重剪，砍废镜头' },
        { label: '换封面标题', desc: '同片换封面 / 标题再分发' },
        { label: '原选题新角度', desc: '同主题换角度重做一条' }
      ]
    },
    {
      key: 'goal', tag: '分发', label: '重发策略走哪种？', selected: '原账号重发', custom: '',
      options: [
        { label: '原账号重发', desc: '错峰重发，标 A/B 测试' },
        { label: '小号先测', desc: '小号试水，数据好再上大号' },
        { label: '多平台分发', desc: '改标题分发到其它平台' },
        { label: '做成合集', desc: '与同类合成一条合集' }
      ]
    }
  ]
}

function genReview(subject: string, seed: number, brief: ReviewBrief): Extract<AiCard, { kind: 'review' }> {
  const lose3s = 38 + (seed % 12)
  const metrics: Metric[] = [
    { label: '播放量', value: `${(3 + (seed % 4))}.${seed % 9}w`, delta: '低于均值', up: false },
    { label: '完播率', value: `${15 + (seed % 8)}%`, delta: `-${8 + (seed % 6)}pt`, up: false },
    { label: '前3秒流失', value: `${lose3s}%`, delta: `高于均值`, up: false },
    { label: '点赞率', value: `${3 + (seed % 3)}.${seed % 9}%`, delta: '健康', up: true }
  ]
  const hooks = [
    `"我做${subject}亏了 2 万，这 3 个坑你别踩"（损失厌恶）`,
    `"别信那些教你${subject}的，先看这条"（制造对立）`
  ]
  const steps: PlanStep[] = [
    { agent: '数据 Agent', task: '拉流失曲线 + 定位流失点', output: `前 3 秒流失 ${lose3s}%，「${brief.problem}」是主因` },
    { agent: '文案 Agent', task: `按问题改「${brief.fix}」`, output: '2 个更抓人的新钩子 + 改写脚本' },
    { agent: '阿杰（剪辑）', task: brief.fix === '重剪节奏' ? '重剪、砍废镜头' : '配合换钩子/封面', output: '新版成片 + 封面', human: true },
    { agent: '数据 Agent', task: `按「${brief.redistribute}」排重发 + A/B`, output: '错峰重发，自动对比新旧数据' }
  ]
  const nextActions = [
    `确认新钩子方向（问题：${brief.problem}）`,
    brief.fix === '重剪节奏' ? '@阿杰 重剪后回群审片' : '审新封面 / 标题',
    `按「${brief.redistribute}」重发，24h 后看 A/B 结果`
  ]
  return { kind: 'review', subject, brief, metrics, hooks, steps, nextActions, launched: false }
}

function hubKickoffReview(card: Extract<AiCard, { kind: 'review' }>): MessageData {
  return {
    id: `${card.channelId}-k0`,
    sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' },
    time: fmtTime(0),
    html: `🔧 <b>复盘优化启动</b>：${card.subject}<br/>问题 <b>${card.brief.problem}</b> · 动作 <b>${card.brief.fix}</b> · 分发 <b>${card.brief.redistribute}</b>。诊断已出，派单如下：`,
    doc: {
      title: `单条诊断 · ${card.subject}`,
      subtitle: '流失曲线 + 优化建议',
      sections: [{
        title: '诊断指标',
        table: {
          headers: ['指标', '数值', '判断'],
          rows: card.metrics.map((mt) => [mt.label, mt.value, { text: mt.delta, color: mt.up ? '#6b8e4e' : '#c0563f' }])
        }
      }],
      footer: '// diagnosed by 数据 Agent'
    }
  }
}

function reviewDrip(card: Extract<AiCard, { kind: 'review' }>): MessageData[] {
  const id = card.channelId
  return [
    {
      id: `${id}-d1`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(1),
      html: `流失曲线已出：<b>${card.metrics[2].value} 集中在前 3 秒</b>，后半段留存其实不错。问题锁定在「${card.brief.problem}」，不是内容不行，是开头没留住人。`
    },
    {
      id: `${id}-d2`, sender: { type: 'bot', name: '文案 Agent', avatar: '文' }, time: fmtTime(2),
      html: `两个更抓人的钩子改写（同样内容）：<br/>① ${card.hooks[0]}<br/>② ${card.hooks[1]}<br/>已记进「钩子库」，标 A/B。`
    },
    {
      id: `${id}-d3`, sender: { type: 'human', name: '阿杰', avatar: '杰', color: '#7a8a5a' }, time: fmtTime(4),
      html: card.brief.fix === '重剪节奏' ? '收到，我把中段拖的地方砍掉，重剪一版给你。' : '换钩子 / 封面我配合，半小时给你新版。'
    },
    {
      id: `${id}-d4`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(6),
      html: `已按「${card.brief.redistribute}」排好重发，标了 A/B 测试。<b>预测新版完播 +${9 + (hash(card.subject) % 6)}pt</b>，发后 24h 自动对比新旧数据。`
    },
    {
      id: `${id}-d5`, sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' }, time: fmtTime(7),
      html: `优化方案就绪 ✅ 钩子已沉淀进库，下条同类选题会自动推荐沿用。<b>需要你拍板的 3 个节点已进「待办事宜」</b>（定钩子 / 审片 / 看 A/B）。`,
      rich: {
        variant: 'ok', tag: 'OPTIMIZED', title: '优化方案就绪',
        meta: `${card.subject} · ${card.brief.fix}`,
        kv: [
          { k: '问题', v: card.brief.problem },
          { k: '新钩子', v: '2 条 · 已入库' },
          { k: '动作', v: card.brief.fix },
          { k: '重发', v: card.brief.redistribute },
          { k: 'A/B', v: '已开启' }
        ]
      }
    }
  ]
}

/* ===== 私域增长作战：问卷 / 方案 / 派单 / 群内运转 ===== */
function buildGrowthIntake(): IntakeQuestion[] {
  return [
    {
      key: 'platform', tag: '目标', label: '这轮私域主攻什么？', selected: '公域引流', custom: '',
      options: [
        { label: '公域引流', desc: '把抖音/小红书的人导进私域' },
        { label: '群活跃', desc: '盘活沉睡群、拉高打开率' },
        { label: '付费转化', desc: '私域里做咨询/课程转化' },
        { label: '复购裂变', desc: '老带新、复购拉裂变' }
      ]
    },
    {
      key: 'format', tag: '阵地', label: '主阵地在哪？', selected: '微信群', custom: '',
      options: [
        { label: '微信群', desc: '社群运营，强互动' },
        { label: '企业微信', desc: '可批量 SOP、好管理' },
        { label: '公众号', desc: '内容沉淀 + 菜单转化' },
        { label: '视频号', desc: '直播 + 私域联动' }
      ]
    },
    {
      key: 'audience', tag: '钩子', label: '用什么钩子拉人/拉活？', selected: '免费咨询', custom: '',
      options: [
        { label: '免费咨询', desc: '抽免费 1v1，诱因强' },
        { label: '资料包', desc: '干货资料引导加微' },
        { label: '抽奖福利', desc: '低成本、参与门槛低' },
        { label: '话题打卡', desc: '连续打卡，养习惯' }
      ]
    },
    {
      key: 'goal', tag: '节奏', label: '活动节奏怎么排？', selected: '3 天快闪', custom: '',
      options: [
        { label: '3 天快闪', desc: '短平快、集中拉活' },
        { label: '1 周打卡', desc: '一周连续话题打卡' },
        { label: '长期 SOP', desc: '固化成每周固定动作' },
        { label: '配合大促', desc: '蹭节点做一波转化' }
      ]
    }
  ]
}

function genGrowth(theme: string, seed: number, brief: GrowthBrief): Extract<AiCard, { kind: 'growth' }> {
  const metrics: Metric[] = [
    { label: '私域人数', value: `${1.2 + (seed % 9) / 10}k`, delta: `3 群`, up: true },
    { label: '本周新增', value: `+${280 + (seed % 120)}`, delta: `+${8 + (seed % 14)}%`, up: true },
    { label: '7日活跃', value: `${52 + (seed % 14)}%`, delta: '高于行业', up: true },
    { label: '付费转化', value: `${9 + (seed % 8)} 单`, delta: `¥ ${(2 + seed % 4)}.${seed % 9}k`, up: true }
  ]
  const activities = [
    'Day1「你今年最想戒掉的工作习惯」',
    'Day2「分享一个你的搞钱小技巧」',
    'Day3「晒晒你的副业第一桶金」'
  ]
  const steps: PlanStep[] = [
    { agent: '数据 Agent', task: `算${brief.base}画像 + 转化测算`, output: `预计 3 天拉活 +${30 + (seed % 12)}%，成本近 0` },
    { agent: '文案 Agent', task: `写群公告 + 「${brief.hook}」话题`, output: `群公告 + 3 天打卡话题 + 海报文案` },
    { agent: '小鹿（商务）', task: `在${brief.base}上线 + 盯互动`, output: '活动上线、答疑、催参与', human: true },
    { agent: '安其中枢 AI', task: `按「${brief.rhythm}」排 SOP + 复盘`, output: '固化 SOP + 自动周复盘' }
  ]
  const nextActions = [
    `确认活动机制与福利（钩子：${brief.hook}）`,
    `@小鹿 在${brief.base}发群公告、开打卡`,
    `按「${brief.rhythm}」跑，结束后看拉活与转化`
  ]
  return { kind: 'growth', theme, brief, metrics, activities, steps, nextActions, launched: false }
}

function hubKickoffGrowth(card: Extract<AiCard, { kind: 'growth' }>): MessageData {
  return {
    id: `${card.channelId}-k0`,
    sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' },
    time: fmtTime(0),
    html: `📣 <b>私域增长启动</b>：${card.brief.goal}<br/>阵地 <b>${card.brief.base}</b> · 钩子 <b>${card.brief.hook}</b> · 节奏 <b>${card.brief.rhythm}</b>。活动方案已出，派单如下：`,
    doc: {
      title: `私域增长方案 · ${card.brief.goal}`,
      subtitle: `${card.brief.base} · ${card.brief.rhythm}`,
      sections: [{
        title: '现状',
        table: {
          headers: ['指标', '数值', '判断'],
          rows: card.metrics.map((mt) => [mt.label, mt.value, { text: mt.delta, color: '#6b8e4e' }])
        }
      }],
      footer: '// planned by 数据 + 文案 Agent'
    }
  }
}

function growthDrip(card: Extract<AiCard, { kind: 'growth' }>): MessageData[] {
  const id = card.channelId
  return [
    {
      id: `${id}-d1`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(1),
      html: `已算好${card.brief.base}画像与转化路径：按「${card.brief.hook}」拉活，<b>预计 3 天 +${30 + (hash(card.theme) % 12)}%</b>，成本几乎为零。`
    },
    {
      id: `${id}-d2`, sender: { type: 'bot', name: '文案 Agent', avatar: '文' }, time: fmtTime(2),
      html: `✅ 已拟好：<br/>· 群公告（含规则 + 截止时间）<br/>· ${card.activities.join('<br/>· ')}<br/>要不要顺手生成 3 张话题海报？`
    },
    {
      id: `${id}-d3`, sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' }, time: fmtTime(4),
      html: `公告我发各群了，打卡活动已上线，我盯着互动催参与。`
    },
    {
      id: `${id}-d4`, sender: { type: 'bot', name: '数据 Agent', avatar: '数' }, time: fmtTime(6),
      html: `上线首日：<b>沉睡群打开率 +${22 + (hash(card.brief.base) % 18)}%</b>，打卡参与 ${120 + (hash(card.theme) % 80)} 人次，已有 ${3 + (hash(card.theme) % 6)} 人主动咨询付费。`
    },
    {
      id: `${id}-d5`, sender: { type: 'bot', name: '安其中枢 AI', avatar: 'G' }, time: fmtTime(7),
      html: `私域这波跑起来了 ✅ 已按「${card.brief.rhythm}」固化 SOP，结束自动出复盘。<b>需要你拍板的 3 个节点已进「待办事宜」</b>（定机制 / 开打卡 / 看转化）。`,
      rich: {
        variant: 'ok', tag: 'GROWING', title: '私域增长运转中',
        meta: `${card.brief.goal} · ${card.brief.base}`,
        kv: [
          { k: '目标', v: card.brief.goal },
          { k: '钩子', v: card.brief.hook },
          { k: '公告', v: '已发各群 ✅' },
          { k: '打卡', v: '已上线' },
          { k: 'SOP', v: card.brief.rhythm }
        ]
      }
    }
  ]
}

function push(role: AiMessage['role'], text?: string, card?: AiCard) {
  messages.push({ id: ++seq, role, text, card })
}

/**
 * 推一条"思考中"的 AI 消息，按 STEP_MS 逐步完成各步骤，
 * 全部完成后调用 produce(m) 把结果填进同一条消息。
 * assignee：本次主 AI 派单的承办 Agent；传入后会先演一步"中枢 · 派单 → XX"，
 * 并把结果署名给该 Agent。传 null = 中枢自办（建群 / 查任务等编排动作）。
 */
function respond(assignee: string | null, steps: string[], produce: (m: AiMessage) => void) {
  const dispatch = assignee && assignee !== AGENTS.hub ? [`安其中枢 · 派单 → ${assignee}`] : []
  const m: AiMessage = reactive({
    id: ++seq,
    role: 'ai',
    agent: assignee && assignee !== AGENTS.hub ? assignee : undefined,
    thinking: true,
    steps: [...dispatch, ...steps].map((s) => ({ label: s, done: false }))
  })
  messages.push(m)
  let i = 0
  const tick = () => {
    if (!m.steps) return
    if (i < m.steps.length) {
      m.steps[i].done = true
      i++
      setTimeout(tick, STEP_MS)
    } else {
      m.thinking = false
      m.steps = undefined
      produce(m)
    }
  }
  setTimeout(tick, STEP_MS)
}

function buildTaskRows(): TaskStatusRow[] {
  return workspaces.map((w) => {
    const s = getTodos(w.id).summary
    return { name: w.title, pending: s.pending, inProgress: s.inProgress, done: s.done, overdue: s.overdue }
  })
}

export function useAiAgent() {
  return {
    messages,
    reset() { messages.splice(0, messages.length) },

    runCommand(raw: string) {
      const text = raw.trim()
      if (!text) return
      push('user', text)
      const seed = hash(text)
      const theme = detectTheme(text)

      /* —— 建群（中枢自办的编排动作）—— */
      if (isCreateIntent(text)) {
        const label = extractGroupName(text)
        respond(null, ['理解需求', '匹配相关人员', '生成建群提案'], (m) => {
          m.text = `要建「${label}」。我按任务匹配，建议拉入下面这些人（已勾选推荐人选）。你确认或调整后我再建群：`
          m.card = { kind: 'proposal', label, candidates: proposeMembers(text), done: false }
        })

      /* —— 任务状态（中枢自办的汇总）—— */
      } else if (isTaskIntent(text)) {
        respond(null, ['连接各频道', '汇总任务数据', '生成报表'], (m) => {
          const rows = buildTaskRows()
          const overdue = rows.reduce((a, r) => a + r.overdue, 0)
          const pending = rows.reduce((a, r) => a + r.pending, 0)
          m.text = `已汇总工作室任务状态：合计待办 ${pending} 项、逾期 ${overdue} 项。`
          m.card = { kind: 'tasks', rows }
        })

      /* —— 舆情危机 → 数据 Agent 主动预警 + 中枢反问回应基调 —— */
      } else if (isCrisisIntent(text)) {
        respond(AGENTS.data, ['数据 Agent 扫描全平台评论', '识别负面 + 比对历史案例', '触发舆情预警'], (m) => {
          const qs = buildCrisisIntake(); const hits = applyPrefill(qs, text)
          m.text = '⚠ 数据 Agent 监测到评论区负面激增：负面占比 37%（昨日 6%），高频词「恰饭/不标注/割韭菜」，已扩散到小红书。回应前先定个基调（一次一个）：' + prefillNote(hits)
          m.card = { kind: 'intake', theme: '探店视频未标广告', flow: 'crisis', questions: qs, step: 0, done: false }
        })

      /* —— 数据复盘 → 优化重发：中枢反问、确认后派单 —— */
      } else if (isReviewIntent(text)) {
        respond(AGENTS.data, ['数据 Agent 调出该内容数据', '拉流失曲线', '准备优化问题'], (m) => {
          const qs = buildReviewIntake(); const hits = applyPrefill(qs, text)
          m.text = `要把这条「${theme}」救一救。我先跟你对齐几个点（一次一个），确认后让数据/文案/剪辑一起优化重发：` + prefillNote(hits)
          m.card = { kind: 'intake', theme, flow: 'review', questions: qs, step: 0, done: false }
        })

      /* —— 私域增长 → 中枢反问、确认后派单 —— */
      } else if (isGrowthIntent(text)) {
        respond(null, ['理解私域目标', '准备增长问题'], (m) => {
          const qs = buildGrowthIntake(); const hits = applyPrefill(qs, text)
          m.text = `做一波「${theme}」私域增长。先跟你对齐几个关键点（一次一个），确认后我让数据/文案 Agent 出方案、@小鹿 执行：` + prefillNote(hits)
          m.card = { kind: 'intake', theme, flow: 'growth', questions: qs, step: 0, done: false }
        })

      /* —— 商单变现 → 中枢先反问、确认后派单出报价方案 —— */
      } else if (isDealIntent(text)) {
        respond(null, ['识别商单线索', '准备议价问题'], (m) => {
          const qs = buildDealIntake(); const hits = applyPrefill(qs, text)
          m.text = '收到一条商单线索。报价前我先跟你对齐几个关键点（一次一个），你选完我让数据/文案 Agent 出报价与话术、@小鹿 去谈：' + prefillNote(hits)
          m.card = { kind: 'intake', theme, flow: 'deal', questions: qs, step: 0, done: false }
        })

      /* —— 数据周报 → 派单数据 Agent —— */
      } else if (isReportIntent(text)) {
        respond(AGENTS.data, ['数据 Agent 拉取全平台数据', '逐项对比上周', '提炼亮点与问题', '生成周报'], (m) => {
          const { metrics } = genAnalysis(theme, seed)
          m.text = `数据 Agent 已出本周数据周报（${theme}）。可一键导出 PDF 或推送到「数据-涨粉复盘」频道。`
          m.card = {
            kind: 'report',
            period: '本周 6/08–6/14',
            metrics,
            sections: [
              { title: '本周亮点', lines: [
                `播放量 ${metrics[0].value}，环比 ${metrics[0].delta}；净涨粉 ${metrics[1].value}。`,
                `「${theme}」选题贡献了本周 ${48 + (seed % 30)}% 的新增播放。`
              ] },
              { title: '问题诊断', lines: [
                `完播率 ${metrics[2].value}，${metrics[2].up ? '小幅回升' : '低于均值'}，前 3 秒留存仍是短板。`,
                `午间档发布表现弱，建议把资源挪到晚间高峰。`
              ] },
              { title: '下周重点', lines: [
                '围绕高完播选题做一条「合集/追更」。',
                '测试 2 条不同钩子的同选题 A/B。'
              ] }
            ]
          }
        })

      /* —— 发布排期 → 派单数据 Agent（按流量高峰算档期）—— */
      } else if (isScheduleIntent(text)) {
        respond(AGENTS.data, ['数据 Agent 读取待发内容', '匹配各平台流量高峰', '错峰排期', '写入发布日历'], (m) => {
          m.text = `数据 Agent 已按各平台流量高峰为「${theme}」错峰排好本周发布计划，可直接同步到「发布-排期日历」。`
          m.card = { kind: 'schedule', theme, rows: genSchedule(theme, seed) }
        })

      /* —— 数据/涨粉分析 → 派单数据 Agent —— */
      } else if (isAnalysisIntent(text)) {
        respond(AGENTS.data, ['数据 Agent 连接全平台数据', '计算趋势与环比', '定位增长点'], (m) => {
          const a = genAnalysis(theme, seed)
          m.text = `数据 Agent 跑完「${theme}」近 7 天分析，定位了 ${a.findings.length} 个可执行增长点：`
          m.card = { kind: 'analysis', theme, ...a }
        })

      /* —— 脚本/文案 → 派单文案 Agent —— */
      } else if (isScriptIntent(text)) {
        respond(AGENTS.copy, ['文案 Agent 确定选题角度', '设计前 3 秒钩子', '拆分镜脚本', '写口播与 CTA'], (m) => {
          m.text = `文案 Agent 已为「${theme}」起草一条短视频脚本（含 3 个备选标题与分镜）：`
          m.card = genScript(theme, seed)
        })

      /* —— 选题灵感 → 派单选题 Agent —— */
      } else if (isTopicIntent(text)) {
        respond(AGENTS.topic, ['选题 Agent 扫描全网热点', '对标账号拆解', '匹配你的人设', '生成选题'], (m) => {
          m.text = `选题 Agent 结合本周热点与你的「${theme}」人设，出了 5 条可直接开拍的选题（按预估热度排序）：`
          const topics = genTopics(theme, seed).sort((x, y) => y.heat - x.heat)
          m.card = { kind: 'topics', theme, topics }
        })

      /* —— 策划一条爆款（全链路）→ 中枢先反问、确认后再派单 —— */
      } else if (isPlanIntent(text)) {
        respond(null, ['理解目标', '准备开题问题'], (m) => {
          const qs = buildIntake(); const hits = applyPrefill(qs, text)
          m.text = `好的，要做一条「${theme}」爆款。开拍前我逐项跟你对齐几个设定（一次一个），选完我再派单给各 Agent 出全链路方案：` + prefillNote(hits)
          m.card = { kind: 'intake', theme, flow: 'campaign', questions: qs, step: 0, done: false }
        })

      /* —— 兜底：给出能力清单 + 可点指令 —— */
      } else {
        respond(null, ['理解你的意图'], (m) => {
          m.text = '我可以在系统里直接帮你跑这些（点一下就执行）：\n· 生成本周选题　· 分析涨粉趋势　· 起草短视频脚本\n· 排期发布本周内容　· 导出数据周报　· 策划一条爆款\n也可以说「建一个 XX 群」或「查任务状态」。'
        })
      }
    },

    /** 用户确认提案 → 思考片刻后真正建群并拉入所选成员 */
    confirmProposal(card: Extract<AiCard, { kind: 'proposal' }>) {
      if (card.done) return
      const chosen = card.candidates.filter((c) => c.selected)
      if (chosen.length === 0) {
        push('ai', '至少选择 1 位成员再建群吧～')
        return
      }
      card.done = true
      respond(null, ['核对所选成员', '创建频道', '拉入成员并通知'], (m) => {
        const id = `ai-grp-${++channelSeq}`
        const wsId = activeId.value
        const ws = workspaceDataMap[wsId] ?? workspaceDataMap[tenant.hqId]
        const ch: ChannelItem = {
          id,
          label: card.label,
          routeName: 'ops',
          routeParams: { id },
          visibility: 'public',
          emphasized: true
        }
        ws.channels.push(ch)
        m.text = `已在「${ws.name}」建群 #${card.label}，并拉入 ${chosen.length} 人。`
        m.card = { kind: 'channel', channelId: id, label: card.label, workspace: ws.name, members: chosen.map((c) => c.name) }
      })
    },

    /** 取消提案 */
    cancelProposal(card: Extract<AiCard, { kind: 'proposal' }>) {
      if (card.done) return
      card.done = true
      push('ai', '好的，已取消本次建群。')
    },

    /**
     * 回答当前这一个开题问题（Claude Code 式逐题推进）：
     * 选中后若还有下一题就前进，最后一题答完则中枢派单出全链路方案。
     */
    answerIntake(card: Extract<AiCard, { kind: 'intake' }>, value: string) {
      if (card.done) return
      const q = card.questions[card.step]
      if (!q) return
      q.selected = value
      if (card.step < card.questions.length - 1) {
        card.step++
        return
      }
      // 最后一题答完 → 收口、派单
      card.done = true
      const pick = (k: IntakeQuestion['key']) => card.questions.find((x) => x.key === k)?.selected ?? ''

      if (card.flow === 'deal') {
        const brief: DealBrief = {
          industry: pick('platform'),  // 复用 key：行业
          form: pick('format'),
          pricing: pick('audience'),    // 复用 key：报价策略
          bottomLine: pick('goal')      // 复用 key：底线
        }
        const brand = `${brief.industry}品牌`
        push('user', `行业：${brief.industry}｜形式：${brief.form}｜报价：${brief.pricing}｜底线：${brief.bottomLine}`)
        const seed = hash(brand + brief.form + brief.pricing + brief.bottomLine)
        respond(
          null,
          ['中枢拆解商单', '派单数据 Agent 出报价单', '派单文案 Agent 拟话术', '@小鹿 待命谈判', '汇总报价方案'],
          (m) => {
            m.text = `收到设定，「${brand}」这单我拆好了：数据 Agent 出报价、文案 Agent 拟合规话术、@小鹿 去谈。你确认报价后一键启动，我建商单专班把活派进去：`
            m.card = genDeal(brand, seed, brief)
          }
        )
        return
      }

      if (card.flow === 'crisis') {
        const brief: CrisisBrief = {
          tone: pick('platform'),       // 复用 key：基调
          scope: pick('format'),        // 复用 key：范围
          action: pick('audience'),     // 复用 key：动作
          aftercare: pick('goal')       // 复用 key：善后
        }
        push('user', `基调：${brief.tone}｜范围：${brief.scope}｜动作：${brief.action}｜善后：${brief.aftercare}`)
        const seed = hash(card.theme + brief.tone + brief.scope + brief.action + brief.aftercare)
        respond(
          null,
          ['中枢拆解应对', '派单文案 Agent 拟回应稿', '@小鹿 待命置顶', '数据 Agent 盯舆情曲线', '汇总应对方案'],
          (m) => {
            m.text = `收到。我把「${card.theme}」的应对拆好了：文案 Agent 按你的基调拟稿、@小鹿 去置顶、数据 Agent 盯回落。你审完稿一键启动，我建舆情应对频道把活派进去：`
            m.card = genCrisis(card.theme, seed, brief)
          }
        )
        return
      }

      if (card.flow === 'review') {
        const brief: ReviewBrief = {
          target: pick('platform'),
          problem: pick('format'),
          fix: pick('audience'),
          redistribute: pick('goal')
        }
        push('user', `对象：${brief.target}｜问题：${brief.problem}｜动作：${brief.fix}｜分发：${brief.redistribute}`)
        const seed = hash(card.theme + brief.target + brief.problem + brief.fix + brief.redistribute)
        respond(
          null,
          ['数据 Agent 定位流失点', '派单文案 Agent 改钩子', '@阿杰 待命重剪', '排重发 + A/B', '汇总优化方案'],
          (m) => {
            m.text = `收到，「${card.theme}」这条的优化方案拆好了：数据 Agent 给诊断、文案 Agent 改钩子、@阿杰 重剪、再排重发做 A/B。你确认后一键启动，我建复盘专班把活派进去：`
            m.card = genReview(card.theme, seed, brief)
          }
        )
        return
      }

      if (card.flow === 'growth') {
        const brief: GrowthBrief = {
          goal: pick('platform'),
          base: pick('format'),
          hook: pick('audience'),
          rhythm: pick('goal')
        }
        push('user', `目标：${brief.goal}｜阵地：${brief.base}｜钩子：${brief.hook}｜节奏：${brief.rhythm}`)
        const seed = hash(card.theme + brief.goal + brief.base + brief.hook + brief.rhythm)
        respond(
          null,
          ['中枢拆解增长', '派单数据 Agent 算画像', '派单文案 Agent 出公告话题', '@小鹿 待命执行', '汇总增长方案'],
          (m) => {
            m.text = `收到，「${brief.goal}」这波私域我拆好了：数据 Agent 算画像转化、文案 Agent 出公告与话题、@小鹿 在${brief.base}执行。你确认后一键启动，我建私域增长频道把活派进去：`
            m.card = genGrowth(card.theme, seed, brief)
          }
        )
        return
      }

      const brief: PlanBrief = {
        platform: pick('platform'),
        format: pick('format'),
        audience: pick('audience'),
        goal: pick('goal')
      }
      push('user', `平台：${brief.platform}｜形式：${brief.format}｜受众：${brief.audience}｜目标：${brief.goal}`)
      const seed = hash(card.theme + brief.platform + brief.format + brief.audience + brief.goal)
      respond(
        null,
        ['中枢拆解目标', '派单选题 Agent 锁定方向', '派单文案 Agent 出脚本', '@老周/阿杰 排拍摄剪辑', '汇总执行方案'],
        (m) => {
          m.text = `收到设定，我把「${card.theme}」这条爆款拆成了全链路方案：数字活派给 Agent、拍摄/剪辑 @ 真人。你拍板后即可一键启动，我会建一个专班频道、把活派进去：`
          m.card = genPlan(card.theme, seed, brief)
        }
      )
    },

    /**
     * 一键启动全链路：建「爆款专班」频道、把方案派单进去，
     * 群里各 Agent 与真人陆续发言运转。返回新频道 id 供组件跳转。
     */
    launchPlan(card: Extract<AiCard, { kind: 'plan' }>): string {
      if (card.launched && card.channelId) return card.channelId
      card.launched = true
      const id = `campaign-${++channelSeq}`
      card.channelId = id

      // 1) 频道加入侧边栏当前工作区
      const ws = workspaceDataMap[activeId.value] ?? workspaceDataMap[tenant.hqId]
      ws.channels.push({
        id,
        label: `爆款专班 · ${card.theme}`,
        routeName: 'ops',
        routeParams: { id },
        visibility: 'public',
        emphasized: true
      })

      // 2) 建运行时频道 + 中枢 kickoff 派单
      const lc = useLiveChannels()
      lc.create(id, {
        title: `爆款专班 · ${card.theme}`,
        topic: `${card.brief.platform} · ${card.brief.format} · 目标「${card.brief.goal}」— 由安其中枢统筹`,
        memberCount: 6,
        stack: [
          { label: 'G', bot: true },
          { label: '题', bot: true },
          { label: '文', bot: true },
          { label: '数', bot: true },
          { label: '雨', color: '#7a5a3a' }
        ]
      })
      lc.push(id, hubKickoff(card))

      // 3) 各成员按节奏陆续响应，群里"运转"起来
      lc.drip(id, campaignDrip(card))

      // 4) 把需要本人拍板的关键节点写进个人待办
      addCampaignTodos(activeId.value, {
        theme: card.theme,
        platform: card.brief.platform,
        firstTime: PEAK_TIMES[hash(card.topic.title) % 5],
        topicTitle: card.topic.title,
        channelId: id
      })
      return id
    },

    /**
     * 一键启动商单：建「商单专班」频道、把报价方案派单进去，
     * 数据/文案 Agent 与小鹿陆续运转。返回新频道 id 供组件跳转。
     */
    launchDeal(card: Extract<AiCard, { kind: 'deal' }>): string {
      if (card.launched && card.channelId) return card.channelId
      card.launched = true
      const id = `deal-${++channelSeq}`
      card.channelId = id

      const ws = workspaceDataMap[activeId.value] ?? workspaceDataMap[tenant.hqId]
      ws.channels.push({
        id,
        label: `商单专班 · ${card.brand}`,
        routeName: 'ops',
        routeParams: { id },
        visibility: 'public',
        emphasized: true
      })

      const lc = useLiveChannels()
      lc.create(id, {
        title: `商单专班 · ${card.brand}`,
        topic: `${card.brief.form} · ${card.brief.pricing} · 打包价 ${card.packagePrice} — 由安其中枢统筹`,
        memberCount: 5,
        stack: [
          { label: 'G', bot: true },
          { label: '数', bot: true },
          { label: '文', bot: true },
          { label: '鹿', color: '#5a7a8a' },
          { label: '雨', color: '#7a5a3a' }
        ]
      })
      lc.push(id, hubKickoffDeal(card))
      lc.drip(id, dealDrip(card))

      addDealTodos(activeId.value, {
        brand: card.brand,
        packagePrice: card.packagePrice,
        channelId: id
      })
      return id
    },

    /**
     * 一键启动舆情应对：建「舆情应对」频道、把应对方案派单进去，
     * 文案/数据 Agent 与小鹿陆续运转。返回新频道 id 供组件跳转。
     */
    launchCrisis(card: Extract<AiCard, { kind: 'crisis' }>): string {
      if (card.launched && card.channelId) return card.channelId
      card.launched = true
      const id = `crisis-${++channelSeq}`
      card.channelId = id

      const ws = workspaceDataMap[activeId.value] ?? workspaceDataMap[tenant.hqId]
      ws.channels.push({
        id,
        label: `舆情应对 · ${card.event}`,
        routeName: 'ops',
        routeParams: { id },
        visibility: 'public',
        emphasized: true
      })

      const lc = useLiveChannels()
      lc.create(id, {
        title: `舆情应对 · ${card.event}`,
        topic: `${card.brief.tone} · ${card.brief.scope} · ${card.brief.action} — 由安其中枢统筹`,
        memberCount: 5,
        stack: [
          { label: 'G', bot: true },
          { label: '数', bot: true },
          { label: '文', bot: true },
          { label: '鹿', color: '#5a7a8a' },
          { label: '雨', color: '#7a5a3a' }
        ]
      })
      lc.push(id, hubKickoffCrisis(card))
      lc.drip(id, crisisDrip(card))

      addCrisisTodos(activeId.value, {
        event: card.event,
        tone: card.brief.tone,
        aftercare: card.brief.aftercare,
        channelId: id
      })
      return id
    },

    /** 一键启动复盘优化：建「复盘专班」频道并把优化方案派单运转 */
    launchReview(card: Extract<AiCard, { kind: 'review' }>): string {
      if (card.launched && card.channelId) return card.channelId
      card.launched = true
      const id = `review-${++channelSeq}`
      card.channelId = id
      const ws = workspaceDataMap[activeId.value] ?? workspaceDataMap[tenant.hqId]
      ws.channels.push({ id, label: `复盘专班 · ${card.subject}`, routeName: 'ops', routeParams: { id }, visibility: 'public', emphasized: true })
      const lc = useLiveChannels()
      lc.create(id, {
        title: `复盘专班 · ${card.subject}`,
        topic: `${card.brief.problem} · ${card.brief.fix} · ${card.brief.redistribute} — 由安其中枢统筹`,
        memberCount: 5,
        stack: [
          { label: 'G', bot: true }, { label: '数', bot: true }, { label: '文', bot: true },
          { label: '杰', color: '#7a8a5a' }, { label: '雨', color: '#7a5a3a' }
        ]
      })
      lc.push(id, hubKickoffReview(card))
      lc.drip(id, reviewDrip(card))
      addReviewTodos(activeId.value, { subject: card.subject, problem: card.brief.problem, fix: card.brief.fix, channelId: id })
      return id
    },

    /** 一键启动私域增长：建「私域增长」频道并把方案派单运转 */
    launchGrowth(card: Extract<AiCard, { kind: 'growth' }>): string {
      if (card.launched && card.channelId) return card.channelId
      card.launched = true
      const id = `growth-${++channelSeq}`
      card.channelId = id
      const ws = workspaceDataMap[activeId.value] ?? workspaceDataMap[tenant.hqId]
      ws.channels.push({ id, label: `私域增长 · ${card.brief.goal}`, routeName: 'ops', routeParams: { id }, visibility: 'public', emphasized: true })
      const lc = useLiveChannels()
      lc.create(id, {
        title: `私域增长 · ${card.brief.goal}`,
        topic: `${card.brief.base} · ${card.brief.hook} · ${card.brief.rhythm} — 由安其中枢统筹`,
        memberCount: 5,
        stack: [
          { label: 'G', bot: true }, { label: '数', bot: true }, { label: '文', bot: true },
          { label: '鹿', color: '#5a7a8a' }, { label: '雨', color: '#7a5a3a' }
        ]
      })
      lc.push(id, hubKickoffGrowth(card))
      lc.drip(id, growthDrip(card))
      addGrowthTodos(activeId.value, { goal: card.brief.goal, base: card.brief.base, hook: card.brief.hook, channelId: id })
      return id
    },

    /** 把一条选题直接交给 AI 起草脚本 */
    draftFromTopic(topic: TopicIdea) {
      this.runCommand(`帮我把这条选题写成脚本：${topic.title}`)
    }
  }
}
