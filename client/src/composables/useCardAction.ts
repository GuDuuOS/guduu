import { ref } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import type { KV, RichVariant } from '@/types/message'

/** 卡片按钮点击后弹出的内容类型 */
export type CardActionKind = 'trend' | 'doc' | 'confirm'

export interface CardActionDocSection {
  title: string
  body?: string
  table?: { headers: string[]; rows: string[][] }
}

export interface CardActionStep {
  text: string
  /** 是否已完成（打勾），未完成显示为进行中 */
  done?: boolean
}

export interface CardActionPayload {
  kind: CardActionKind
  /** 顶部小标签 */
  tag: string
  title: string
  subtitle?: string
  variant?: RichVariant
  /** trend：复用 charts.ts 中的图表工厂 id */
  chartId?: string
  /** trend：直接传入的图表配置工厂（优先于 chartId，用于仪表盘动态数据）*/
  chartConfig?: (ctx: CanvasRenderingContext2D) => ChartConfiguration
  chartNote?: string
  /** doc：文档分节 */
  sections?: CardActionDocSection[]
  footer?: string
  /** confirm：结果标题 + 执行步骤 */
  resultTitle?: string
  steps?: CardActionStep[]
}

/** 触发按钮所在卡片的上下文，用于生成贴合卡片的弹层内容 */
export interface CardActionCtx {
  tag: string
  title: string
  meta?: string
  variant: RichVariant
  kv?: KV[]
}

const visible = ref(false)
const payload = ref<CardActionPayload | null>(null)

function open(p: CardActionPayload) {
  payload.value = p
  visible.value = true
}
function close() {
  visible.value = false
}

const has = (label: string, ...keys: string[]) => keys.some((k) => label.includes(k))

/** 把卡片 KV 整理成详情表 */
function kvTable(ctx: CardActionCtx): CardActionDocSection | null {
  if (!ctx.kv || !ctx.kv.length) return null
  return {
    title: '卡片详情',
    table: {
      headers: ['项', '值'],
      rows: ctx.kv.map((kv) => [kv.k, kv.v])
    }
  }
}

/** 趋势分析：单条内容的实时播放走专用图，其余走通用趋势 */
function buildTrend(label: string, ctx: CardActionCtx): CardActionPayload {
  const isPlayback = has(ctx.title + ctx.tag + label, '播放', '完播', '流失', '实时')
  return {
    kind: 'trend',
    tag: '趋势分析',
    title: ctx.title + ' · 实时趋势',
    subtitle: ctx.meta,
    variant: ctx.variant,
    chartId: isPlayback ? 'chP201' : 'chTrend',
    chartNote: isPlayback
      ? '发布后实时播放持续爬升，已接近「破万」里程碑。'
      : '实际值与 AI 预测、历史平均对比。'
  }
}

/** 文档/详情类：查看 SOP / 票据 / 预案 / 课件 / 档案 / 历史 / 故障史 等 */
function buildDoc(label: string, ctx: CardActionCtx): CardActionPayload {
  const base: CardActionPayload = {
    kind: 'doc',
    tag: '详情',
    title: ctx.title,
    subtitle: ctx.meta,
    variant: ctx.variant,
    sections: [],
    footer: '// 演示视图 · 数据来自 CosMac OS 关联系统'
  }
  const sections: CardActionDocSection[] = []
  const kvt = kvTable(ctx)
  if (kvt) sections.push(kvt)

  if (has(label, 'SOP', '清单', '流程')) {
    base.tag = '检查清单'
    base.title = ctx.title + ' · 发布前检查'
    sections.push({
      title: '检查项',
      table: {
        headers: ['步', '内容', '确认'],
        rows: [
          ['1', '标题钩子是否抓人（A/B 备选）', '筱雨'],
          ['2', '封面是否高点击、文字够大', '筱雨'],
          ['3', '违禁词 / 广告法合规自检', '文案 Agent'],
          ['4', 'BGM 与素材版权确认', '阿杰'],
          ['5', '发布时段是否卡流量高峰', '数据 Agent']
        ]
      }
    })
  } else if (has(label, '预案', '应对')) {
    base.tag = '舆情应对'
    sections.push({
      title: '分级应对',
      table: {
        headers: ['等级', '触发条件', '应对动作'],
        rows: [
          ['黄', '个别差评 / 抬杠', '正常回复 + 引导'],
          ['橙', '负面占比超 20%', '置顶澄清 + 统一话术'],
          ['红', '大规模质疑 / 冲上热搜', '公开声明 + 暂停投流 + 复盘']
        ]
      }
    })
    sections.push({ title: '处置要点', body: '先共情后解释、不甩锅、给具体动作；保留聊天与数据记录用于复盘。' })
  } else if (has(label, '课件', '方法')) {
    base.tag = '方法卡'
    sections.push({
      title: '选题与爆款方法',
      body: '1. 对标账号拆解（选题 / 节奏 / 钩子）<br/>2. 黄金 3 秒钩子公式<br/>3. 选题爆款指数打分<br/>4. 发布后 48h 数据复盘'
    })
  } else if (has(label, '档案', '品牌')) {
    base.tag = '品牌方档案'
    sections.push({
      title: '合作概况',
      table: {
        headers: ['项', '值'],
        rows: [
          ['信用评价', '优质'],
          ['合作次数', '3 次'],
          ['累计金额', '约 ¥ 4.2 万'],
          ['结算周期', '30 天 · 历史无拖欠']
        ]
      }
    })
  } else if (has(label, '故障', '历史', '记录')) {
    base.tag = '历史记录'
    sections.push({
      title: '近期记录',
      table: {
        headers: ['日期', '事项', '结果'],
        rows: [
          ['2026-05-23', ctx.title, '处理中 / 见本卡片'],
          ['2026-04-18', '同类选题数据', '已沉淀到素材库'],
          ['2026-03-02', '相关账号复盘', '已归档']
        ]
      }
    })
  } else if (has(label, '合同', '批注')) {
    base.tag = '合同批注'
    sections.push({
      title: '合同要素',
      body: '商单合作合同，含内容形式、报价、账期、独家与二次传播授权、违约金。AI 逐条批注与修改意见已存档备查。'
    })
  } else {
    sections.push({
      title: '关联记录',
      body: '该卡片的完整明细、操作留痕与关联文件均已在系统中归档，可在此查阅。'
    })
  }

  base.sections = sections
  return base
}

/** 导出 / 下载 / 打印 / 生成 类：返回文件已生成的结果 */
function buildExport(label: string, ctx: CardActionCtx): CardActionPayload {
  const verb = has(label, '下载') ? '下载' : has(label, '打印') ? '打印' : '导出'
  const file = `${ctx.title}.pdf`
  return {
    kind: 'confirm',
    tag: '文件已生成',
    title: label,
    subtitle: ctx.title,
    variant: 'ok',
    resultTitle: `已${verb} · ${file}`,
    steps: [
      { text: '已汇总卡片关联数据', done: true },
      { text: '已生成 PDF 并加盖电子签章', done: true },
      { text: `文件已${verb}至本地 / 推送至接收方`, done: true }
    ]
  }
}

/** 推送 / 签批 / 调度 / 升级 等执行类操作 */
function buildConfirm(label: string, ctx: CardActionCtx): CardActionPayload {
  let resultTitle = '操作已执行'
  let steps: CardActionStep[] = [
    { text: '已记录操作并写入日志', done: true },
    { text: '已通知相关人员', done: true }
  ]

  if (has(label, '推送')) {
    const target = label.replace('推送', '').trim() || '相关人员'
    resultTitle = `已推送给 ${target}`
    steps = [
      { text: '已生成通知卡片', done: true },
      { text: `已 @${target} 并发送提醒`, done: true },
      { text: '等待对方确认回执', done: false }
    ]
  } else if (has(label, '忽略', '挂')) {
    resultTitle = '已忽略该条'
    steps = [
      { text: '该提醒已收起', done: true },
      { text: '稍后仍可在选题库 / 消息里找到', done: false },
      { text: '已记入操作日志', done: true }
    ]
  } else if (has(label, '置顶', '澄清', '回应')) {
    resultTitle = '已置顶 / 发布回应'
    steps = [
      { text: '回应话术已生成', done: true },
      { text: '已置顶到对应平台评论区', done: true },
      { text: '持续监控负面情绪变化', done: false }
    ]
  } else if (has(label, '签批', '签字', '确认', '通过', '采纳')) {
    resultTitle = '已确认通过'
    steps = [
      { text: '已记录并归档', done: true },
      { text: '已写入对应排期 / 流程', done: true },
      { text: '已通知相关成员', done: true }
    ]
  } else if (has(label, '打回', '重剪', '驳回')) {
    resultTitle = '已打回 · 待修改'
    steps = [
      { text: '修改意见已附在卡片', done: true },
      { text: '已通知负责人重做', done: true }
    ]
  } else if (has(label, '报价', '发给', '发送')) {
    resultTitle = '已发送'
    steps = [
      { text: '已生成正式文件', done: true },
      { text: '已发送给对方', done: true },
      { text: '等待对方回复', done: false }
    ]
  } else if (has(label, '定时', '发布')) {
    resultTitle = '已加入定时发布'
    steps = [
      { text: '已锁定发布时段', done: true },
      { text: '发布前 1 小时再做合规自检', done: false }
    ]
  } else if (has(label, '同步', '日历', '排期')) {
    resultTitle = '已同步到发布排期'
    steps = [
      { text: '已写入发布排期日历', done: true },
      { text: '已设置定时提醒', done: true }
    ]
  } else if (has(label, '加入', '库', '复盘', '清单')) {
    resultTitle = '已加入 / 沉淀'
    steps = [
      { text: '已写入对应素材库 / 清单', done: true },
      { text: '已通知相关成员跟进', done: true }
    ]
  }

  return {
    kind: 'confirm',
    tag: '已执行',
    title: label,
    subtitle: ctx.title,
    variant: 'ok',
    resultTitle,
    steps
  }
}

/** 把按钮文案 + 卡片上下文解析成弹层内容 */
export function resolveAction(label: string, ctx: CardActionCtx): CardActionPayload {
  if (has(label, '趋势', '流失曲线')) return buildTrend(label, ctx)
  if (has(label, '导出', '下载', '打印')) return buildExport(label, ctx)
  if (has(label, '查看', '展开', '看') && has(label, 'SOP', '清单', '流程', '拆解', '档案', '品牌', '预案', '应对', '方法', '课件', '历史', '记录', '故障', '合同', '批注', '依据', '报告', '明细'))
    return buildDoc(label, ctx)
  return buildConfirm(label, ctx)
}

export function useCardAction() {
  return { visible, payload, open, close, resolveAction }
}
