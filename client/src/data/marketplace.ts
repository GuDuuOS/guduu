export type MarketCat = 'agent' | 'skill' | 'prompt' | 'workflow' | 'knowledge' | 'mcp'

export interface MarketItem {
  id: string
  name: string
  cat: MarketCat
  author: string
  desc: string
  installs: string
  /** 价格（元）；0 表示免费 */
  price: number
  tag?: string
  installed?: boolean
}

/** 分类元信息：标签 + 主题色 */
export const CAT_META: Record<MarketCat, { label: string; color: string }> = {
  agent:     { label: 'AI Agent',   color: '#c96442' },
  skill:     { label: 'Skill',      color: '#6b8e4e' },
  prompt:    { label: 'Prompt',     color: '#4a7a8c' },
  workflow:  { label: '工作流',     color: '#b58932' },
  knowledge: { label: '知识库',     color: '#8a6a8a' },
  mcp:       { label: 'MCP 连接器', color: '#5a7a8a' }
}

export const marketItems: MarketItem[] = [
  /* AI Agent */
  { id: 'a1', name: '爆款标题 Agent', cat: 'agent', author: 'GuDuu 官方', desc: '结合平台热点与历史爆款，一次给 10 个标题', installs: '3.2k', price: 99, installed: true },
  { id: 'a2', name: '数据复盘 Agent', cat: 'agent', author: 'GuDuu 官方', desc: '全平台播放/涨粉/完播比对，定位增长点', installs: '2.1k', price: 69 },
  { id: 'a3', name: '评论区回复 Agent', cat: 'agent', author: '社区', desc: '批量生成高赞回复，自动标记争议评论', installs: '1.4k', price: 0 },
  { id: 'a4', name: '发布排期 Agent', cat: 'agent', author: 'GuDuu 官方', desc: '按流量高峰多平台错峰排期', installs: '980', price: 69 },
  { id: 'a5', name: '商单报价 Agent', cat: 'agent', author: 'GuDuu 官方', desc: '按刊例与数据自动出报价与合同', installs: '760', price: 49 },

  /* Skill */
  { id: 's1', name: '短视频脚本起草', cat: 'skill', author: 'GuDuu 官方', desc: '选题 → 钩子 → 正文 → 分镜，一键成稿', installs: '1.8k', price: 0, tag: '/script', installed: true },
  { id: 's2', name: '封面文案识别', cat: 'skill', author: 'GuDuu 官方', desc: '识别高点击封面与标题套路', installs: '1.1k', price: 19.9, tag: '/cover' },
  { id: 's3', name: '完播率诊断', cat: 'skill', author: '社区', desc: '定位前 3 秒流失，给钩子优化', installs: '920', price: 19.9, tag: '/data' },
  { id: 's4', name: '素材库问答检索', cat: 'skill', author: 'GuDuu 官方', desc: '自然语言检索爆款与脚本', installs: '2.4k', price: 0, tag: '/kb', installed: true },
  { id: 's5', name: '对标账号拆解', cat: 'skill', author: '社区', desc: '抓取并拆解对标账号选题与节奏', installs: '640', price: 9.9, tag: '/benchmark' },

  /* Prompt */
  { id: 'p1', name: '短视频脚本模板', cat: 'prompt', author: 'GuDuu 官方', desc: '标准化钩子 / 正文 / 引导结构', installs: '1.5k', price: 0 },
  { id: 'p2', name: '爆款选题五问', cat: 'prompt', author: '社区', desc: '逐层追问打磨选题角度', installs: '870', price: 0 },
  { id: 'p3', name: '小红书文案公式', cat: 'prompt', author: '社区', desc: '种草 / 干货 / 情绪三类模板', installs: '540', price: 9.9 },
  { id: 'p4', name: '商单脚本框架', cat: 'prompt', author: 'GuDuu 官方', desc: '软植入不翻车的结构化提纲', installs: '430', price: 9.9 },

  /* 工作流 */
  { id: 'w1', name: '舆情分级联动', cat: 'workflow', author: 'GuDuu 官方', desc: '负面评论 → 话术 → 一键置顶澄清', installs: '760', price: 49 },
  { id: 'w2', name: '成片自动质检', cat: 'workflow', author: 'GuDuu 官方', desc: '错别字 / 版权 / 违禁词发布前拦截', installs: '520', price: 29 },
  { id: 'w3', name: '内容日历编排', cat: 'workflow', author: '社区', desc: '选题 / 拍摄 / 剪辑 / 发布自动排期', installs: '410', price: 49 },

  /* 知识库 */
  { id: 'k1', name: '爆款选题方法库', cat: 'knowledge', author: 'GuDuu 官方', desc: '328 条 · 实时同步', installs: '2.0k', price: 0, installed: true },
  { id: 'k2', name: '平台规则与避雷库', cat: 'knowledge', author: '社区', desc: '各平台社区规范 / 广告法', installs: '1.3k', price: 0 },
  { id: 'k3', name: '对标账号库', cat: 'knowledge', author: '社区', desc: '86 个账号 · 持续拆解', installs: '990', price: 0 },

  /* MCP 连接器 */
  { id: 'm1', name: '抖音数据连接器', cat: 'mcp', author: 'GuDuu 官方', desc: '接入创作者后台数据', installs: '1.1k', price: 0, installed: true },
  { id: 'm2', name: '小红书蒲公英连接器', cat: 'mcp', author: 'GuDuu 官方', desc: '笔记与商单数据', installs: '880', price: 0 },
  { id: 'm3', name: '公众号连接器', cat: 'mcp', author: 'GuDuu 官方', desc: '阅读 / 涨粉 / 留言', installs: '670', price: 0 },
  { id: 'm4', name: '热榜数据 API', cat: 'mcp', author: '第三方', desc: '全网热点 / 选题输入', installs: '350', price: 19.9 }
]
