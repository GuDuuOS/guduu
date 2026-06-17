/**
 * 制作驾驶舱「AI 影视制作操作系统」区块数据
 * --------------------------------------------------------------
 * 落到「安其影视工作室」（AI 影视 / 音乐制作公司 · 虚拟 AI 明星）语境：
 * AI 指令中枢 / AI 制作 Agent 团队 / 实时制作任务 / 核心业务模块 / 模型成本监控 / 系统事件。
 * 全部为演示用 mock 数据。占位的公司/明星/剧集名可随时替换。
 */

/** AI Agent 团队成员（制作 Agent）*/
export interface TeamAgent {
  name: string
  role: string
  avatar: string
  online: boolean
}
/**
 * AI 制作 Agent：主 AI（安其中枢）可直接派单干"数字制作活"。
 * 中枢负责总控调度，把剧本 / 分镜 / 配音三类任务派给对应子 Agent。
 */
export const teamAgents: TeamAgent[] = [
  { name: '安其中枢 AI', role: '主控 · 派单调度', avatar: '安', online: true },
  { name: '编剧 Agent', role: '剧本 · 分集大纲', avatar: '编', online: true },
  { name: '分镜 Agent', role: '分镜 · 画面生成', avatar: '镜', online: true },
  { name: '配音 Agent', role: '配音 · 配乐编曲', avatar: '音', online: true }
]

/** 真人协作：主 AI 不能代干，只能 @ 提醒——导演 / 制片 / 运营 / 出品拍板。 */
export interface Collaborator {
  name: string
  role: string
  avatar: string
}
export const humanCollaborators: Collaborator[] = [
  { name: '安总', role: '出品人 · 拍板', avatar: '安' },
  { name: '林导', role: '导演 · 创意把控', avatar: '林' },
  { name: '周制片', role: '制片 · 排期统筹', avatar: '周' },
  { name: '苏运营', role: '粉丝运营 · 社群', avatar: '苏' }
]

/** 指令中枢「目标 → 落地」4 步流程 */
export interface FlowStep {
  n: number
  title: string
  desc: string
}
export const flowSteps: FlowStep[] = [
  { n: 1, title: '一句话下达创意', desc: '自然语言说出你想拍的内容' },
  { n: 2, title: '拆解制作任务卡', desc: 'AI 拆成剧本 / 分镜 / 配音任务' },
  { n: 3, title: 'Agent 协同制作', desc: '多 Agent 自动产出成片素材' },
  { n: 4, title: '成片 · 发布沉淀', desc: '剧集 / 单曲 / 粉丝互动持续沉淀' }
]

/** 指令中枢的快捷指令建议（影视/音乐制作语境）*/
export const commandSuggestions: string[] = [
  '给《银河谣》写下一集大纲',
  '生成墨白新单曲分镜',
  '回复本周粉丝热评',
  '排期下周剧集更新',
  '分析《夜航星》播放趋势',
  '生成角色海报一套',
  '让星野发一条粉丝动态',
  '导出粉丝数据周报',
  '剪一支正片预告'
]

/** 顶部运营战绩 */
export interface RunStat {
  label: string
  value: string
  unit?: string
}
export const runStats: RunStat[] = [
  { label: '运营天数', value: '218', unit: '天' },
  { label: '已产出集数', value: '386', unit: '集' },
  { label: '制作成功率', value: '97.4', unit: '%' },
  { label: '累计播放', value: '8.6', unit: '亿' }
]

/** 实时任务（带进度）—— 制作中的任务 */
export interface LiveTask {
  label: string
  pct: number
  eta: string
}
export const liveTasks: LiveTask[] = [
  { label: '《银河谣》第 12 集剧本', pct: 75, eta: '约 4 分钟' },
  { label: '墨白新 MV 分镜生成', pct: 80, eta: '约 3 分钟' },
  { label: '《夜航星》配音 · 配乐', pct: 60, eta: '约 6 分钟' },
  { label: '粉丝热评 AI 批量回复', pct: 90, eta: '约 1 分钟' }
]

/** 核心业务模块 */
export interface BizModule {
  name: string
  desc: string
  icon: string
  color: string
}
export const bizModules: BizModule[] = [
  { name: '剧本创作', desc: '分集大纲 · 对白一键成稿', icon: '📝', color: '#c96442' },
  { name: '分镜生成', desc: 'AI 分镜 · 画面 / 关键帧产出', icon: '🎬', color: '#6b8e4e' },
  { name: 'AI 配音配乐', desc: '虚拟声线配音 · 原创配乐', icon: '🎵', color: '#4a7a8c' },
  { name: '虚拟明星运营', desc: '人设维护 · 动态 / 直播', icon: '⭐', color: '#b58932' },
  { name: '粉丝互动', desc: '热评自动回复 · 后援会运营', icon: '💬', color: '#8a6a8a' },
  { name: '数据复盘', desc: '全平台播放 / 粉丝分析', icon: '📊', color: '#5a7a8a' },
  { name: '模型成本控制', desc: '实时监控优化 · 降低制作成本', icon: '🛡', color: '#7a8a5a' }
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
    { label: '编剧模型', pct: 36, color: '#c96442' },
    { label: '视觉 / 分镜', pct: 34, color: '#6b8e4e' },
    { label: '配音 / 音乐', pct: 18, color: '#4a7a8c' },
    { label: '数据分析', pct: 12, color: '#8a8270' }
  ] as ModelUsage[]
}

/** 系统事件流 */
export interface SysEvent {
  time: string
  agent: string
  text: string
}
export const sysEvents: SysEvent[] = [
  { time: '14:42', agent: '编剧 Agent', text: '完成《银河谣》第 12 集分集大纲，待林导审阅' },
  { time: '14:41', agent: '分镜 Agent', text: '生成墨白新 MV 分镜 24 帧，已入素材库' },
  { time: '14:41', agent: '配音 Agent', text: '《夜航星》主角配音初稿完成，配乐进行中' },
  { time: '14:40', agent: '中枢 · @苏运营', text: '墨白后援会话题打卡上线，拉活 +35%' },
  { time: '14:38', agent: '安其中枢 AI', text: '粉丝热评批量回复完成 1,240 条，正向占 96%' }
]
