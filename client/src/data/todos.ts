import { reactive } from 'vue'
import { tenant } from '@/config/tenant'

export type TodoStatus = 'pending' | 'in_progress' | 'done'
export type TodoPriority = 'high' | 'mid' | 'low'

export interface TodoItem {
  id: string
  title: string
  /** 来源场景，跟左侧频道 id 对应，方便联跳 */
  source?: string
  sourceLabel?: string
  status: TodoStatus
  priority: TodoPriority
  assignee?: string
  due?: string
  /** 工单号 / 票据号 */
  refNo?: string
}

export interface TodoGroup {
  id: string
  title: string
  /** 分组下面的备注（例如"今日截止 5 项"）*/
  meta?: string
  items: TodoItem[]
}

export interface TodoSummary {
  total: number
  pending: number
  inProgress: number
  done: number
  overdue: number
}

export interface WorkspaceTodos {
  groups: TodoGroup[]
  summary: TodoSummary
}

export const todoMap: Record<string, WorkspaceTodos> = reactive({
  /* ===== 筱雨工作室 ===== */
  [tenant.hqId]: {
    summary: { total: 23, pending: 9, inProgress: 7, done: 7, overdue: 1 },
    groups: [
      {
        id: 'today', title: '今日截止', meta: '5 项',
        items: [
          { id: 'hq-1', title: '审核「副业避坑 2.0」成片并定档', source: 'process-handover', sourceLabel: '成片-审核交付', status: 'pending', priority: 'high', assignee: '筱雨', due: '今日 14:00', refNo: '#CP-0523' },
          { id: 'hq-2', title: '处理探店视频评论区舆情、置顶澄清', source: 'emergency', sourceLabel: '舆情-评论预警', status: 'in_progress', priority: 'high', assignee: '小鹿', due: '今日 12:00', refNo: '#OP-0523' },
          { id: 'hq-3', title: '确认周四公众号长文标题', source: 'grid-dispatch', sourceLabel: '发布-排期日历', status: 'pending', priority: 'mid', assignee: '筱雨', due: '今日 18:00' }
        ]
      },
      {
        id: 'this-week', title: '本周待办', meta: '12 项',
        items: [
          { id: 'hq-4', title: '优化「副业避坑」前 3 秒钩子并重发', source: 'wind-remote', sourceLabel: '数据-涨粉复盘', status: 'in_progress', priority: 'high', assignee: '文案 Agent', due: '本周五', refNo: '#RP-0521' },
          { id: 'hq-5', title: '拍摄「租房 vs 买房」（雨天备选已备）', source: 'plant-startup', sourceLabel: '拍摄-脚本分镜', status: 'in_progress', priority: 'mid', assignee: '老周', due: '本周四', refNo: '#SH-0524' },
          { id: 'hq-6', title: '国货护肤商单脚本初稿', source: 'shift-handover', sourceLabel: '商单-品牌合作', status: 'pending', priority: 'mid', assignee: '文案 Agent', due: '5/26 周二' },
          { id: 'hq-7', title: '私域 2 群上线 3 天话题打卡活动', source: 'utility-coord', sourceLabel: '私域-社群运营', status: 'done', priority: 'low', assignee: '小鹿', refNo: '#SQ-0523' }
        ]
      },
      {
        id: 'long-term', title: '中长期跟进', meta: '6 项',
        items: [
          { id: 'hq-8', title: '6 月内容选题规划评审', source: 'safety-briefing', sourceLabel: '选题-每周选题会', status: 'pending', priority: 'high', assignee: '筱雨 / 全员', due: '6/05' },
          { id: 'hq-9', title: '推进与 MCN 的签约谈判', status: 'in_progress', priority: 'mid', assignee: '小鹿', due: '6/15' },
          { id: 'hq-10', title: '搭建「爆款钩子库」', source: 'wind-remote', sourceLabel: '数据-涨粉复盘', status: 'done', priority: 'low', assignee: '筱雨', due: '5/22' }
        ]
      }
    ]
  },
})

export const fallbackTodoId = tenant.hqId

export function getTodos(id: string): WorkspaceTodos {
  return todoMap[id] ?? todoMap[fallbackTodoId]
}

/**
 * 主 AI 启动「爆款专班」后，把需要本人拍板的关键节点写进个人待办。
 * 返回新增的条数。
 */
export function addCampaignTodos(
  wsId: string,
  opts: { theme: string; platform: string; firstTime: string; topicTitle: string; channelId: string }
): number {
  const t = todoMap[wsId] ?? todoMap[fallbackTodoId]
  const srcLabel = `爆款专班 · ${opts.theme}`
  const mk = (n: number, title: string, priority: TodoPriority, due: string): TodoItem => ({
    id: `camp-${opts.channelId}-${n}`,
    title,
    source: opts.channelId,
    sourceLabel: srcLabel,
    status: 'pending',
    priority,
    assignee: '筱雨',
    due
  })
  const today = t.groups.find((g) => g.id === 'today')
  const week = t.groups.find((g) => g.id === 'this-week')
  let added = 0
  if (today) {
    today.items.unshift(mk(1, `确认选题与标题：${opts.topicTitle}`, 'high', '今日 18:00'))
    added++
  }
  if (week) {
    week.items.push(mk(2, `审脚本并 @老周 约拍（${opts.theme}）`, 'mid', '本周四'))
    week.items.push(mk(3, `审成片并定档（${opts.platform} ${opts.firstTime} 首发）`, 'high', '本周五'))
    added += 2
  }
  // 同步分组计数与汇总
  for (const g of t.groups) if (g.meta !== undefined) g.meta = `${g.items.length} 项`
  t.summary.total += added
  t.summary.pending += added
  return added
}

/**
 * 主 AI 启动「商单专班」后，把需要本人拍板的关键节点写进个人待办。
 */
export function addDealTodos(
  wsId: string,
  opts: { brand: string; packagePrice: string; channelId: string }
): number {
  const t = todoMap[wsId] ?? todoMap[fallbackTodoId]
  const srcLabel = `商单专班 · ${opts.brand}`
  const mk = (n: number, title: string, priority: TodoPriority, due: string): TodoItem => ({
    id: `deal-${opts.channelId}-${n}`,
    title,
    source: opts.channelId,
    sourceLabel: srcLabel,
    status: 'pending',
    priority,
    assignee: '筱雨',
    due
  })
  const today = t.groups.find((g) => g.id === 'today')
  const week = t.groups.find((g) => g.id === 'this-week')
  let added = 0
  if (today) {
    today.items.unshift(mk(1, `确认 ${opts.brand} 报价单与底价（${opts.packagePrice}）`, 'high', '今日 18:00'))
    added++
  }
  if (week) {
    week.items.push(mk(2, `审 ${opts.brand} 合同条款（账期 / 独家 / 二次传播）`, 'high', '本周三'))
    week.items.push(mk(3, `${opts.brand} 商单拍摄排期 + 回款跟进`, 'mid', '本周五'))
    added += 2
  }
  for (const g of t.groups) if (g.meta !== undefined) g.meta = `${g.items.length} 项`
  t.summary.total += added
  t.summary.pending += added
  return added
}

/**
 * 主 AI 启动「舆情应对」后，把需要本人拍板的关键节点写进个人待办。
 */
export function addCrisisTodos(
  wsId: string,
  opts: { event: string; tone: string; aftercare: string; channelId: string }
): number {
  const t = todoMap[wsId] ?? todoMap[fallbackTodoId]
  const srcLabel = `舆情应对 · ${opts.event}`
  const mk = (n: number, title: string, priority: TodoPriority, due: string): TodoItem => ({
    id: `crisis-${opts.channelId}-${n}`,
    title,
    source: opts.channelId,
    sourceLabel: srcLabel,
    status: 'pending',
    priority,
    assignee: '筱雨',
    due
  })
  const today = t.groups.find((g) => g.id === 'today')
  const week = t.groups.find((g) => g.id === 'this-week')
  let added = 0
  if (today) {
    today.items.unshift(mk(2, `盯 ${opts.event} 评论区舆情回落`, 'high', '今日 16:00'))
    today.items.unshift(mk(1, `审定置顶说明文案（基调：${opts.tone}）`, 'high', '今日 12:00'))
    added += 2
  }
  if (week) {
    week.items.push(mk(3, `${opts.event} 复盘整改（善后：${opts.aftercare}）`, 'mid', '本周三'))
    added++
  }
  for (const g of t.groups) if (g.meta !== undefined) g.meta = `${g.items.length} 项`
  t.summary.total += added
  t.summary.pending += added
  return added
}

/** 主 AI 启动「复盘专班」后，把需要本人拍板的关键节点写进个人待办。 */
export function addReviewTodos(
  wsId: string,
  opts: { subject: string; problem: string; fix: string; channelId: string }
): number {
  const t = todoMap[wsId] ?? todoMap[fallbackTodoId]
  const srcLabel = `复盘专班 · ${opts.subject}`
  const mk = (n: number, title: string, priority: TodoPriority, due: string): TodoItem => ({
    id: `review-${opts.channelId}-${n}`, title, source: opts.channelId, sourceLabel: srcLabel,
    status: 'pending', priority, assignee: '筱雨', due
  })
  const today = t.groups.find((g) => g.id === 'today')
  const week = t.groups.find((g) => g.id === 'this-week')
  let added = 0
  if (today) { today.items.unshift(mk(1, `定 ${opts.subject} 的新钩子方向（问题：${opts.problem}）`, 'high', '今日 18:00')); added++ }
  if (week) {
    week.items.push(mk(2, `审 ${opts.subject} 优化版（${opts.fix}）`, 'mid', '本周四'))
    week.items.push(mk(3, `${opts.subject} 重发后看 A/B 结果`, 'mid', '本周五'))
    added += 2
  }
  for (const g of t.groups) if (g.meta !== undefined) g.meta = `${g.items.length} 项`
  t.summary.total += added
  t.summary.pending += added
  return added
}

/** 主 AI 启动「私域增长」后，把需要本人拍板的关键节点写进个人待办。 */
export function addGrowthTodos(
  wsId: string,
  opts: { goal: string; base: string; hook: string; channelId: string }
): number {
  const t = todoMap[wsId] ?? todoMap[fallbackTodoId]
  const srcLabel = `私域增长 · ${opts.goal}`
  const mk = (n: number, title: string, priority: TodoPriority, due: string): TodoItem => ({
    id: `growth-${opts.channelId}-${n}`, title, source: opts.channelId, sourceLabel: srcLabel,
    status: 'pending', priority, assignee: '筱雨', due
  })
  const today = t.groups.find((g) => g.id === 'today')
  const week = t.groups.find((g) => g.id === 'this-week')
  let added = 0
  if (today) { today.items.unshift(mk(1, `确认私域活动机制与福利（钩子：${opts.hook}）`, 'high', '今日 18:00')); added++ }
  if (week) {
    week.items.push(mk(2, `${opts.base} 群公告上线 + 开打卡`, 'mid', '本周二'))
    week.items.push(mk(3, `${opts.goal} 活动结束看拉活与转化`, 'mid', '本周五'))
    added += 2
  }
  for (const g of t.groups) if (g.meta !== undefined) g.meta = `${g.items.length} 项`
  t.summary.total += added
  t.summary.pending += added
  return added
}
