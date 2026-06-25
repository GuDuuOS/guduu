import { reactive, ref, watch } from 'vue'
import { tenant } from '@/config/tenant'

/* ===== 自定义资产数据模型 ===== */
export type AssetCat = 'agent' | 'skill' | 'prompt' | 'workflow'

export interface CustomAsset {
  id: string
  cat: AssetCat
  name: string
  desc: string
  /** 主体内容：Agent 人设 / Skill 说明 / Prompt 正文 / 工作流步骤 */
  body: string
  /** 触发指令，如 /title（仅 agent / skill 用）*/
  tag?: string
  enabled: boolean
}

export interface AssetCatMeta {
  key: AssetCat
  label: string
  color: string
  /** 主体内容输入框的标题与占位 */
  bodyLabel: string
  bodyPlaceholder: string
  hasTag: boolean
  tagPlaceholder?: string
}

export const ASSET_CATS: AssetCatMeta[] = [
  {
    key: 'agent',
    label: 'AI Agent',
    color: '#c96442',
    bodyLabel: '人设 / System Prompt',
    bodyPlaceholder: `描述这个 Agent 的身份、风格与职责，例如：你是${tenant.name}的选题助手，擅长结合平台热点给出可拍的选题角度…`,
    hasTag: true,
    tagPlaceholder: '触发指令，如 /topic'
  },
  {
    key: 'skill',
    label: 'Skill',
    color: '#6b8e4e',
    bodyLabel: '技能说明',
    bodyPlaceholder: '这个技能做什么、输入输出是什么，例如：把一段选题扩写成含黄金 3 秒钩子的分镜脚本…',
    hasTag: true,
    tagPlaceholder: '触发指令，如 /script'
  },
  {
    key: 'prompt',
    label: 'Prompt',
    color: '#4a7a8c',
    bodyLabel: 'Prompt 正文',
    bodyPlaceholder: '可复用的提示词正文，支持用 {变量} 占位，例如：请以小红书种草风格，为「{产品}」写 3 条标题…',
    hasTag: false
  },
  {
    key: 'workflow',
    label: '工作流',
    color: '#b58932',
    bodyLabel: '步骤（每行一步）',
    bodyPlaceholder: `1. 抓取负面评论\n2. 分级并生成澄清话术\n3. 通知${tenant.shortName}确认后置顶`,
    hasTag: false
  }
]

export const assetCatMeta = (cat: AssetCat) =>
  ASSET_CATS.find((c) => c.key === cat) ?? ASSET_CATS[0]

/* ===== 持久化 ===== */
const STORE_KEY = 'guduu.customAssets.v1'

const SEED: CustomAsset[] = [
  {
    id: 'seed-agent-1',
    cat: 'agent',
    name: '选题灵感 Agent',
    desc: '结合近 7 天平台热点给可拍的选题角度',
    body: `你是${tenant.name}的选题助手。结合抖音 / 小红书近期热点，针对给定主题给出 3 个可拍的选题角度，每个附一句钩子。`,
    tag: '/topic',
    enabled: true
  },
  {
    id: 'seed-skill-1',
    cat: 'skill',
    name: '黄金3秒脚本',
    desc: '把选题扩写成含开场钩子的分镜脚本',
    body: '输入一个选题，输出：开场黄金 3 秒钩子 + 正文要点 + 分镜提示，口播语气。',
    tag: '/script',
    enabled: true
  },
  {
    id: 'seed-prompt-1',
    cat: 'prompt',
    name: '小红书种草标题',
    desc: '种草风格标题模板',
    body: '请以小红书种草风格，为「{产品}」写 5 条标题，多用数字与情绪词，每条不超过 20 字。',
    enabled: true
  }
]

function load(): CustomAsset[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return SEED.map((a) => ({ ...a }))
    const parsed = JSON.parse(raw) as CustomAsset[]
    if (!Array.isArray(parsed)) return SEED.map((a) => ({ ...a }))
    return parsed
  } catch {
    return SEED.map((a) => ({ ...a }))
  }
}

const assets = reactive<CustomAsset[]>(load())
const visible = ref(false)

watch(
  assets,
  (list) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list))
    } catch {
      /* 存储不可用时静默降级 */
    }
  },
  { deep: true }
)

let seq = 0
const newId = (cat: AssetCat) => `${cat}-${Date.now()}-${++seq}`

/**
 * 清掉本机存的自定义资产（自定义 Agent/技能）。登出时调用——这些是**用户专属**数据，
 * 存的是不带账号区分的固定 key，共享浏览器上不清会泄露给下一个登录的人。
 * 配合登出整页 reload 一起用（reload 顺带清掉内存态）。
 */
export function clearCustomAssetsStorage(): void {
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    /* 存储不可用时忽略 */
  }
}

export function useCustomAssets() {
  return {
    assets,
    visible,
    ASSET_CATS,
    open: () => { visible.value = true },
    close: () => { visible.value = false },

    countOf: (cat: AssetCat) => assets.filter((a) => a.cat === cat).length,
    listOf: (cat: AssetCat) => assets.filter((a) => a.cat === cat),

    /** 新建一个空白资产并返回其 id，便于 UI 聚焦到新卡片 */
    add(cat: AssetCat): string {
      const id = newId(cat)
      assets.push({ id, cat, name: '', desc: '', body: '', tag: '', enabled: true })
      return id
    },

    remove(id: string) {
      const i = assets.findIndex((a) => a.id === id)
      if (i >= 0) assets.splice(i, 1)
    },

    toggle(id: string) {
      const a = assets.find((x) => x.id === id)
      if (a) a.enabled = !a.enabled
    }
  }
}
