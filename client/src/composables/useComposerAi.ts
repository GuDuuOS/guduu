import { reactive } from 'vue'

/* ===== AI 辅助动作 ===== */
export interface AssistAction {
  id: string
  label: string
  hint: string
  /** 是否需要已有文字才能执行（润色类需要，生成类不需要） */
  needsText: boolean
}

export const assistActions: AssistAction[] = [
  { id: 'polish',   label: '润色',     hint: '更通顺、更有网感',        needsText: true },
  { id: 'expand',   label: '扩写',     hint: '补充细节、把内容写丰满',  needsText: true },
  { id: 'shorten',  label: '精简',     hint: '一句话说清重点',          needsText: true },
  { id: 'lively',   label: '更活泼',   hint: '加表情、口语化',          needsText: true },
  { id: 'pro',      label: '更专业',   hint: '正式、书面表达',          needsText: true },
  { id: 'continue', label: '续写',     hint: '顺着语气接着往下写',      needsText: true },
  { id: 'title',    label: '爆款标题', hint: '生成 3 个备选标题',       needsText: false },
  { id: 'reply',    label: '评论回复', hint: '生成高赞评论区回复',      needsText: false }
]

export type AssistPanel = 'closed' | 'menu' | 'thinking' | 'result'

interface ThinkStep { label: string; done: boolean }

const STEP_MS = 420

const STEPS: Record<string, string[]> = {
  polish:   ['解析原文', '调整语序与措辞', '生成润色稿'],
  expand:   ['提取要点', '补充细节与背景', '生成扩写稿'],
  shorten:  ['抓核心信息', '去冗余', '生成精简版'],
  lively:   ['判断语气', '加入网感与表情', '生成活泼版'],
  pro:      ['判断场景', '改为书面表达', '生成专业版'],
  continue: ['理解上文', '顺势构思下文', '生成续写'],
  title:    ['分析内容方向', '结合平台热点', '生成备选标题'],
  reply:    ['判断评论意图', '匹配人设语气', '生成回复']
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const clean = (t: string) => t.replace(/\s+/g, ' ').trim()

/* ===== mock 文本转换：纯演示，无真实 LLM ===== */
function transform(actionId: string, raw: string): string {
  const t = clean(raw)
  switch (actionId) {
    case 'polish':
      return `${t}\n\n${pick(['说真的，', '不夸张，', '亲测，'])}这一条值得你看完——${pick([
        '看完记得点赞收藏，别划走👀',
        '评论区告诉我你的想法👇',
        '关注我，下一条更猛🔥'
      ])}`
    case 'expand':
      return `${t}\n\n展开说说：${pick([
        '很多人卡在第一步，其实关键是先把目标人群想清楚。',
        '我把踩过的坑整理成了三个要点，照着做基本不会翻车。',
        '背后的逻辑其实很简单，但 90% 的人都做反了。'
      ])}${pick([
        '我用最近一条数据来举例，完播率直接翻倍。',
        '这套方法我跑了一个月，涨粉曲线肉眼可见地往上走。',
        '同样的内容换个开头，播放量差了不止一个量级。'
      ])}`
    case 'shorten':
      return clean(t.split(/[。！？\n]/)[0] || t).slice(0, 30) + '。'
    case 'lively':
      return `${t.replace(/。/g, '～')}✨ ${pick(['冲就完了！', '姐妹们冲鸭🚀', '真的会爱住😭', '不试试亏大了！'])}`
    case 'pro':
      return clean(t.replace(/[～！]+/g, '。').replace(/[🔥✨🚀👀👇😭]/gu, ''))
        + `\n\n综上，建议据此推进后续执行，并在复盘时同步关键数据。`
    case 'continue':
      return `${t}${pick([
        '接下来我会从选题、脚本到发布，拆成可复制的步骤一步步讲。',
        '下一段我们聊聊怎么把这个思路落到具体的拍摄里。',
        '后面还有更关键的一点，很多人恰恰忽略了它。'
      ])}`
    case 'title': {
      const seed = t || '今天这条'
      const base = clean(seed).slice(0, 12)
      return [
        `1. 99% 的人都不知道：${base}背后的 3 个真相`,
        `2. 我把「${base}」试了 30 天，结果有点上头`,
        `3. 别再踩坑了！关于${base}，看这一条就够`
      ].join('\n')
    }
    case 'reply':
      return [
        `1. 谢谢宝子支持！这条确实是熬夜肝出来的，更多干货蹲一下下一条～`,
        `2. 哈哈被你发现了，重点其实在第 2 点，回去可以重看一遍👀`,
        `3. 已记下你的建议！下期就安排，记得回来验收🔥`
      ].join('\n')
    default:
      return t
  }
}

/**
 * 输入框 AI 辅助。按实例创建状态（每个 Composer 独立），
 * 复用 useAiAgent 的「思考分步」演示模式。
 */
export function useComposerAi() {
  const state = reactive({
    panel: 'closed' as AssistPanel,
    action: null as AssistAction | null,
    steps: [] as ThinkStep[],
    result: '',
    source: ''
  })

  let timer: ReturnType<typeof setTimeout> | null = null

  function reset() {
    if (timer) { clearTimeout(timer); timer = null }
    state.panel = 'closed'
    state.action = null
    state.steps = []
    state.result = ''
    state.source = ''
  }

  function openMenu() {
    if (timer) { clearTimeout(timer); timer = null }
    state.panel = 'menu'
  }

  function run(action: AssistAction, sourceText: string) {
    if (action.needsText && !clean(sourceText)) return
    state.action = action
    state.source = sourceText
    state.result = ''
    state.panel = 'thinking'
    state.steps = (STEPS[action.id] ?? ['思考中']).map((s) => ({ label: s, done: false }))

    let i = 0
    const tick = () => {
      if (i < state.steps.length) {
        state.steps[i].done = true
        i++
        timer = setTimeout(tick, STEP_MS)
      } else {
        state.result = transform(action.id, sourceText)
        state.panel = 'result'
        timer = null
      }
    }
    timer = setTimeout(tick, STEP_MS)
  }

  function regenerate() {
    if (state.action) run(state.action, state.source)
  }

  return {
    state,
    assistActions,
    openMenu,
    run,
    regenerate,
    close: reset
  }
}
