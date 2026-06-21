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
  /** 所属剧集 / 项目（任务看板按剧集 Tab 过滤用）：ep-night / ep-galaxy / mobai */
  show?: string
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
  /* ===== 安其影视工作室 · AI 影视/音乐制作任务 ===== */
  [tenant.hqId]: {
    summary: { total: 11, pending: 4, inProgress: 4, done: 3, overdue: 1 },
    groups: [
      {
        id: 'today', title: '今日截止', meta: '2 项',
        items: [
          { id: 'hq-1', title: '审核《银河谣》第 12 集成片并定档', source: 'ep-galaxy', sourceLabel: '《银河谣》制作专班', show: 'ep-galaxy', status: 'pending', priority: 'high', assignee: '林导', due: '今日 14:00', refNo: '#EP-12' },
          { id: 'hq-2', title: '确认墨白新 MV 发布排期', source: 'pub', sourceLabel: '发布-排期日历', show: 'mobai', status: 'pending', priority: 'mid', assignee: '苏运营', due: '今日 18:00', refNo: '#MV-03' }
        ]
      },
      {
        id: 'this-week', title: '本周制作', meta: '5 项',
        items: [
          { id: 'hq-3', title: '《银河谣》第 12 集分镜生成', source: 'ep-galaxy', sourceLabel: '《银河谣》制作专班', show: 'ep-galaxy', status: 'in_progress', priority: 'high', assignee: '分镜 Agent', due: '本周四', refNo: '#SB-12' },
          { id: 'hq-4', title: '《夜航星》主角配音 + 配乐', source: 'ep-night', sourceLabel: '《夜航星》制作专班', show: 'ep-night', status: 'in_progress', priority: 'high', assignee: '配音 Agent', due: '本周五', refNo: '#VO-07' },
          { id: 'hq-5', title: '《夜航星》主视觉海报终稿', source: 'ep-night', sourceLabel: '《夜航星》制作专班', show: 'ep-night', status: 'pending', priority: 'mid', assignee: '安总', due: '本周四', refNo: '#KV-07' },
          { id: 'hq-6', title: '墨白新单曲歌词终审', source: 'star-mobai', sourceLabel: '虚拟明星·墨白', show: 'mobai', status: 'pending', priority: 'high', assignee: '林导', due: '5/26 周二', refNo: '#SG-09' },
          { id: 'hq-7', title: '墨白后援会话题打卡活动运营', source: 'fans-mobai', sourceLabel: '墨白后援会', show: 'mobai', status: 'in_progress', priority: 'mid', assignee: '苏运营', due: '本周', refNo: '#OP-21' }
        ]
      },
      {
        id: 'long-term', title: '中长期跟进', meta: '4 项',
        items: [
          { id: 'hq-8', title: '与平台洽谈《银河谣》独播合作', source: 'biz', sourceLabel: '商单-品牌合作', show: 'ep-galaxy', status: 'in_progress', priority: 'mid', assignee: '周制片', due: '6/15' },
          { id: 'hq-9', title: '《银河谣》第 11 集已上线', source: 'ep-galaxy', sourceLabel: '《银河谣》制作专班', show: 'ep-galaxy', status: 'done', priority: 'low', assignee: '林导', due: '5/22', refNo: '#EP-11' },
          { id: 'hq-10', title: '虚拟明星墨白人设档更新', source: 'star-mobai', sourceLabel: '虚拟明星·墨白', show: 'mobai', status: 'done', priority: 'low', assignee: '编剧 Agent', due: '5/21' },
          { id: 'hq-11', title: '《夜航星》粉丝热评批量回复', source: 'fans', sourceLabel: '数据-涨粉复盘', show: 'ep-night', status: 'done', priority: 'low', assignee: '安其中枢 AI', due: '5/20', refNo: '#FR-18' }
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
    assignee: '安其',
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
    assignee: '安其',
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
    assignee: '安其',
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
    status: 'pending', priority, assignee: '安其', due
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
    status: 'pending', priority, assignee: '安其', due
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
