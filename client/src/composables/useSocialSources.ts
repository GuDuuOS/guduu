import { reactive, ref, watch } from 'vue'
import { getSocialSources, setSocialSources } from '@/matrix/client'

/**
 * 社媒数据源（数据看板真实取数的配置）。
 *
 * 设计（与模块3 工作流连接器同构，见 client.ts SOCIAL_SOURCES_EVENT 注释）：
 *  · 一个工作区(Space)一份配置，存 Matrix state event `cosmac.social_sources`，多端同步、刷新不丢。
 *  · 定义里只放「凭据名」(credName)，真正的 API key/token/cookie 在**服务端 env**，前端永不触碰。
 *  · 取数模式两种：'api'(官方开放平台 API) / 'crawl'(AI Agent 走工作流爬公开主页)。
 *  · 运行态(lastSync/lastStatus/lastError)由后端采集器回写，前端只读展示。
 *
 * 本文件只管「配置的读写」。真实采集（调 API / 跑工作流 / 写 DB / 回看板）是后端 P2~P4。
 */

/** 取数模式 */
export type SocialMode = 'api' | 'crawl'

/** 单个社媒数据源 */
export interface SocialSource {
  platform: string        // 平台 key（见 SOCIAL_PLATFORMS）
  account: string         // 友好显示名 / 主页 URL（人看的标签；crawl 模式也用它作要抓的主页）
  mode: SocialMode        // 取数模式：官方 API / AI 爬取
  // 'api' 模式：各平台**非密**参数（频道ID/用户名/商业号ID…，因平台而异，见 SOCIAL_API_SPECS）。
  // 密钥(API key/token)不在这里——按平台固定的 env 名配在服务端（见 spec.envVars）。
  apiParams?: Record<string, string>
  workflow?: string       // 'crawl' 模式：抓取走哪个工作流连接器的 slug（在管理后台·工作流面板配 N8N(webhook)/Coze，URL+密钥进 env，这里只引用 slug）
  intervalH?: number      // 轮询间隔（小时），后端采集器按此定时
  enabled: boolean        // 是否启用采集
  // ↓ 运行态：后端回写，前端只读（P2 起才有值）
  lastSync?: number       // 最近同步时间戳(ms)
  lastStatus?: 'ok' | 'error' | 'never'
  lastError?: string
}

/** 支持的平台目录（前端展示用；后端适配器按 key 实现）。新增平台前后端各加一条。
 *  海外版以国际平台为主，排前面；国内平台保留在后。 */
export const SOCIAL_PLATFORMS: { key: string; label: string; icon: string }[] = [
  // —— 国际平台（海外主力）——
  { key: 'youtube', label: 'YouTube', icon: '▶️' },
  { key: 'x', label: 'X / Twitter', icon: '✖️' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'tiktok', label: 'TikTok', icon: '🎶' },
  { key: 'facebook', label: 'Facebook', icon: '👍' },
  { key: 'threads', label: 'Threads', icon: '🧵' },
  // —— 国内平台 ——
  { key: 'douyin', label: '抖音', icon: '🎵' },
  { key: 'bilibili', label: 'B站', icon: '📺' },
  { key: 'xiaohongshu', label: '小红书', icon: '📕' },
  { key: 'weibo', label: '微博', icon: '🔶' },
]
export function platformLabel(key: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.key === key)?.label || key
}
export function platformIcon(key: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.key === key)?.icon || '🌐'
}

/* ===== 各平台「官方 API」需求清单（关键：每个平台认证/参数都不同，不能一刀切）=====
 * 这是给「api 模式」用的准确规格：
 *  · supported   —— 该平台是否真有「公开粉丝/播放」可用的官方 API。false 的平台只能走爬取。
 *  · difficulty  —— 申请门槛/资质说明（让你判断值不值得走官方 API）。
 *  · envVars     —— 后端要在**服务端 env** 配的密钥（前端只展示该填哪个 env 名，读不到值、也不存值）。
 *  · params      —— 存进配置的**非密**定位参数（频道ID/用户名…），因平台而异。
 * 后端 P2 采集器按平台 + 这份规格实现各自的 adapter。新增/调整平台时前后端同步改这里。
 */
export interface ApiParamField { key: string; label: string; placeholder?: string }
export interface ApiEnvVar { name: string; label: string }
export interface ApiSpec {
  supported: boolean
  difficulty: string
  note?: string                 // 不支持时的说明 / 支持时的补充
  envVars: ApiEnvVar[]
  params: ApiParamField[]
  docUrl?: string
}

export const SOCIAL_API_SPECS: Record<string, ApiSpec> = {
  youtube: {
    supported: true,
    difficulty: '低 · 免费申请 Google Cloud API Key 即可读公开频道统计',
    envVars: [{ name: 'COSMAC_SOCIAL_YOUTUBE_API_KEY', label: 'YouTube Data API v3 Key' }],
    params: [{ key: 'channelId', label: '频道 ID 或 @handle', placeholder: 'UCxxxx 或 @anqistudio' }],
    docUrl: 'https://developers.google.com/youtube/v3/docs/channels/list',
  },
  x: {
    supported: true,
    difficulty: '中 · 需 X API 付费套餐（Basic 起，约 $100/月），App-Only Bearer Token',
    envVars: [{ name: 'COSMAC_SOCIAL_X_BEARER_TOKEN', label: 'X API v2 Bearer Token' }],
    params: [{ key: 'username', label: '用户名（不含 @）', placeholder: 'anqistudio' }],
    docUrl: 'https://developer.x.com/en/docs/x-api',
  },
  instagram: {
    supported: true,
    difficulty: '高 · 仅商业/创作者号；需 Meta App + 绑定 FB 主页 + Graph API 长期令牌',
    note: '个人号没有 API，请用爬取',
    envVars: [{ name: 'COSMAC_SOCIAL_INSTAGRAM_ACCESS_TOKEN', label: 'Instagram Graph API 长期访问令牌' }],
    params: [{ key: 'igUserId', label: 'IG 商业号 User ID', placeholder: '17841400000000000' }],
    docUrl: 'https://developers.facebook.com/docs/instagram-api',
  },
  facebook: {
    supported: true,
    difficulty: '中 · 需 Meta App + 主页（Page）访问令牌',
    envVars: [{ name: 'COSMAC_SOCIAL_FACEBOOK_PAGE_TOKEN', label: 'Facebook 主页访问令牌' }],
    params: [{ key: 'pageId', label: '主页 ID', placeholder: '主页数字 ID 或用户名' }],
    docUrl: 'https://developers.facebook.com/docs/graph-api',
  },
  threads: {
    supported: true,
    difficulty: '中 · Threads API（Meta），需访问令牌 + 用户 ID',
    envVars: [{ name: 'COSMAC_SOCIAL_THREADS_ACCESS_TOKEN', label: 'Threads API 访问令牌' }],
    params: [{ key: 'threadsUserId', label: 'Threads 用户 ID', placeholder: 'Threads user id' }],
    docUrl: 'https://developers.facebook.com/docs/threads',
  },
  tiktok: {
    supported: false,
    difficulty: '—',
    note: 'TikTok 公开粉丝/播放无稳定官方接口（Research API 需审批、限地区）。请用爬取。',
    envVars: [],
    params: [],
  },
  douyin: {
    supported: false,
    difficulty: '—',
    note: '抖音开放平台需企业资质，公开粉丝数接口受限。请用爬取。',
    envVars: [],
    params: [],
  },
  bilibili: {
    supported: false,
    difficulty: '—',
    note: 'B站无面向公开统计的官方开放 API（社区接口非官方、不稳定）。建议用爬取。',
    envVars: [],
    params: [],
  },
  weibo: {
    supported: false,
    difficulty: '—',
    note: '微博开放平台限制多、不提供他人公开统计。请用爬取。',
    envVars: [],
    params: [],
  },
  xiaohongshu: {
    supported: false,
    difficulty: '—',
    note: '小红书无开放 API。请用爬取。',
    envVars: [],
    params: [],
  },
}
/** 取某平台的 API 规格；未知平台给一个「不支持」兜底。 */
export function apiSpecOf(platform: string): ApiSpec {
  return SOCIAL_API_SPECS[platform] || { supported: false, difficulty: '—', note: '该平台暂无官方 API 规格，请用爬取。', envVars: [], params: [] }
}

/* ===== 模块级单例状态（跨组件共享）===== */
const spaceId = ref('')
const sources = ref<SocialSource[]>([])
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const modalOpen = ref(false)
let suppress = false // 加载期抑制回写（避免"加载即保存"的回声）

/** 从当前 Space 的 state event 读配置 */
function load() {
  const saved = spaceId.value ? getSocialSources(spaceId.value) : {}
  suppress = true
  sources.value = Array.isArray(saved.sources) ? saved.sources : []
  setTimeout(() => { suppress = false }, 0)
}

/** 防抖整体写回 Space 的 state event */
let timer: ReturnType<typeof setTimeout> | null = null
function persist() {
  if (!spaceId.value) return
  if (timer) clearTimeout(timer)
  saveState.value = 'saving'
  timer = setTimeout(async () => {
    try {
      await setSocialSources(spaceId.value, { sources: sources.value.map((s) => ({ ...s })) })
      saveState.value = 'saved'
    } catch {
      saveState.value = 'error' // 多半是当前用户在该工作区没改配置的权限
    }
  }, 600)
}

watch(sources, () => { if (!suppress && spaceId.value) persist() }, { deep: true })

export function useSocialSources() {
  return {
    sources,
    saveState,
    modalOpen,
    /** 切换当前工作区（LiveView 在 activeSpace 变化时调用）*/
    setSpace(id?: string) {
      spaceId.value = id || ''
      load()
    },
    /** 打开配置弹窗（打开前刷新一遍，防 Space 状态还没 sync）*/
    openModal() {
      load()
      saveState.value = 'idle'
      modalOpen.value = true
    },
    closeModal() { modalOpen.value = false },
    /** 新增一个数据源（带默认值）*/
    addSource(s: Partial<SocialSource>) {
      sources.value.push({
        platform: s.platform || SOCIAL_PLATFORMS[0].key,
        account: (s.account || '').trim(),
        mode: s.mode || 'api',
        apiParams: s.apiParams && Object.keys(s.apiParams).length ? { ...s.apiParams } : undefined,
        workflow: s.workflow?.trim() || undefined,
        intervalH: s.intervalH ?? 6,
        enabled: s.enabled ?? true,
        lastStatus: 'never',
      })
    },
    /** 移除一个数据源 */
    removeSource(i: number) { sources.value.splice(i, 1) },
  }
}
