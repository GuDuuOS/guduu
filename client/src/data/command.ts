/**
 * 创作驾驶舱「一人公司操作系统」区块数据
 * --------------------------------------------------------------
 * 对标 TITAN ONE OS 的核心功能，落到筱雨工作室（个人创业者 · 内容创作）语境：
 * AI 指令中枢 / AI Agent 团队 / 实时任务 / 核心业务模块 / 模型成本监控 / 系统事件。
 * 全部为演示用 mock 数据。
 */

/** AI Agent 团队成员 */
export interface TeamAgent {
  name: string
  role: string
  avatar: string
  online: boolean
}
/**
 * AI Agent（4 个 bot）：主 AI 可直接派单干"数字活"。
 * 中枢负责总控调度，把选题 / 文案 / 数据三类任务派给对应子 Agent。
 */
export const teamAgents: TeamAgent[] = [
  { name: '筱雨中枢 AI', role: '主控 · 派单调度', avatar: 'G', online: true },
  { name: '选题 Agent', role: '热点 · 选题灵感', avatar: '题', online: true },
  { name: '文案 Agent', role: '标题 · 脚本文案', avatar: '文', online: true },
  { name: '数据 Agent', role: '复盘 · 排期增长', avatar: '数', online: true }
]

/** 真人协作（4 位）：主 AI 不能代干，只能 @ 提醒——拍摄 / 剪辑 / 商单 / 拍板。 */
export interface Collaborator {
  name: string
  role: string
  avatar: string
}
export const humanCollaborators: Collaborator[] = [
  { name: '筱雨', role: '主理人 · 拍板', avatar: '雨' },
  { name: '小鹿', role: '商务 · 商单变现', avatar: '鹿' },
  { name: '老周', role: '摄影 · 现场拍摄', avatar: '周' },
  { name: '阿杰', role: '剪辑 · 成片交付', avatar: '杰' }
]

/** 指令中枢「目标 → 落地」4 步流程 */
export interface FlowStep {
  n: number
  title: string
  desc: string
}
export const flowSteps: FlowStep[] = [
  { n: 1, title: '一句话下达目标', desc: '自然语言说出你想做的事' },
  { n: 2, title: '拆解任务卡', desc: 'AI 拆解为可执行任务' },
  { n: 3, title: 'Agent 协同执行', desc: '多 Agent 自动落地' },
  { n: 4, title: '结果沉淀', desc: '选题 / 脚本 / 数据持续沉淀' }
]

/** 指令中枢的快捷指令建议 */
export const commandSuggestions: string[] = [
  '帮我策划一条职场爆款',
  '接个品牌商单',
  '处理评论区舆情',
  '优化重发上一条',
  '做一波私域增长',
  '分析本月涨粉趋势',
  '生成本周选题',
  '排期发布本周内容',
  '导出数据周报'
]

/** 顶部运营战绩 */
export interface RunStat {
  label: string
  value: string
  unit?: string
}
export const runStats: RunStat[] = [
  { label: '运营天数', value: '218', unit: '天' },
  { label: '任务执行', value: '3,860' },
  { label: '成功率', value: '97.4', unit: '%' },
  { label: '累计变现', value: '28.6', unit: '万' }
]

/** 实时任务（带进度）*/
export interface LiveTask {
  label: string
  pct: number
  eta: string
}
export const liveTasks: LiveTask[] = [
  { label: '热点选题扫描', pct: 75, eta: '约 3 分钟' },
  { label: '短视频脚本生成', pct: 80, eta: '约 2 分钟' },
  { label: '视频剪辑与发布', pct: 60, eta: '约 5 分钟' },
  { label: '私信承接与跟进', pct: 90, eta: '约 1 分钟' }
]

/** 核心业务模块 */
export interface BizModule {
  name: string
  desc: string
  icon: string
  color: string
}
export const bizModules: BizModule[] = [
  { name: '选题灵感', desc: '全网热点雷达 · 爆款选题挖掘', icon: '💡', color: '#c96442' },
  { name: '短视频脚本', desc: 'AI 脚本生成 · 分镜一键成稿', icon: '🎬', color: '#6b8e4e' },
  { name: '私信承接', desc: '自动回复承接 · 高效转化', icon: '💬', color: '#4a7a8c' },
  { name: '数据复盘', desc: '全平台分析 · 定位增长点', icon: '📊', color: '#b58932' },
  { name: '变现分析', desc: '商单 / 带货 / 私域收入拆解', icon: '💰', color: '#8a6a8a' },
  { name: '数据源配置', desc: '多平台接入 · 统一数据资产', icon: '🔗', color: '#5a7a8a' },
  { name: '模型成本控制', desc: '实时监控优化 · 降低 AI 成本', icon: '🛡', color: '#7a8a5a' }
]

/** 模型成本监控 */
export interface ModelUsage {
  label: string
  pct: number
  color: string
}
export const modelCost = {
  today: 86.4,
  deltaPct: -12.4,
  budgetUsed: 67,
  models: [
    { label: '文案模型', pct: 42, color: '#c96442' },
    { label: '视觉 / 封面', pct: 28, color: '#6b8e4e' },
    { label: '数据分析', pct: 18, color: '#4a7a8c' },
    { label: '其他', pct: 12, color: '#8a8270' }
  ] as ModelUsage[]
}

/** 系统事件流 */
export interface SysEvent {
  time: string
  agent: string
  text: string
}
export const sysEvents: SysEvent[] = [
  { time: '14:42', agent: '数据 Agent', text: '完成「副业避坑」复盘，定位前 3 秒钩子问题' },
  { time: '14:41', agent: '选题 Agent', text: '扫描全网热点，新增 8 条选题入库' },
  { time: '14:41', agent: '文案 Agent', text: '生成 5 条短视频脚本初稿' },
  { time: '14:40', agent: '中枢 · @小鹿', text: '国货护肤商单已派给小鹿，报价已发出等回复' },
  { time: '14:38', agent: '中枢 AI', text: '私域 2 群话题打卡自动上线，拉活 +35%' }
]
