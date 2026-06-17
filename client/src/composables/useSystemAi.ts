import { reactive, ref } from 'vue'
import type { ChannelInfoItem } from '@/data/channels'
import { tenant } from '@/config/tenant'
import {
  MODEL_OPTIONS,
  type Confidential,
  type AccessLevel,
  type DataScope,
  type ChannelPersona,
  type ChannelModel,
  type ChannelMemory
} from '@/composables/useChannelAdmin'

export { MODEL_OPTIONS }
export type { Confidential, AccessLevel }

/** 筱雨中枢 AI 设置弹窗的可见状态 */
const visible = ref(false)

/**
 * 主 AI（CosMac Star 总控）的全局配置——区别于按频道的隔离配置。
 * 总控 AI 统筹各「子智能体」、对接全平台数据、拥有更高额度与全局记忆。
 */
const state = reactive({
  persona: {
    aiName: '筱雨中枢 AI',
    tone: '统筹 · 稳健 · 可追溯',
    prompt: `你是${tenant.aiOwner}的${tenant.productName}总控 AI，统筹调度选题 / 文案 / 数据等子智能体、汇聚全平台数据；对外输出须严谨、标注依据，发布与商单等对外动作必须经筱雨确认后执行。`
  } as ChannelPersona,

  skills: [
    { label: '全平台日报', tag: '/brief', desc: '汇聚各 Agent 结果，生成一屏概览' },
    { label: '数据复盘报告', tag: '/report', desc: '播放 / 涨粉 / 完播 / 变现 一体化分析' },
    { label: '本周发布排期', tag: '/plan', desc: '按流量高峰自动错峰排期' },
    { label: '全局素材检索', tag: '/kb', desc: '爆款 / 脚本 / 对标的统一问答' },
    { label: '舆情联动预警', tag: '/alert', desc: '多平台负面评论聚合并提醒' }
  ] as ChannelInfoItem[],

  knowledge: [
    { label: '我的爆款素材库', desc: '标题 / 脚本 / 封面 · 328 条' },
    { label: '对标账号库', desc: '86 个账号 · 实时拆解' },
    { label: '历史全平台数据', desc: '近 12 个月 · 多平台' },
    { label: '平台规则与避雷库', desc: '社区规范 / 广告法 · 实时更新' }
  ] as ChannelInfoItem[],

  /** 总控 AI 派单的子智能体（3 个 AI bot；拍摄 / 商单 / 发布等由真人协作）*/
  subAgents: [
    { label: '选题 Agent', desc: '热点雷达 / 选题灵感 · 在线' },
    { label: '文案 Agent', desc: '标题 / 脚本 / 文案 · 在线' },
    { label: '数据 Agent', desc: '全平台复盘 / 排期 · 在线' }
  ] as ChannelInfoItem[],

  /** 全平台数据接入（总控可达更多平台，商单/私域仍受密级约束）*/
  dataSources: [
    { label: '抖音创作者后台', level: '内部', access: '读写' },
    { label: '小红书蒲公英', level: '内部', access: '只读' },
    { label: '视频号助手', level: '内部', access: '读写' },
    { label: '公众号后台', level: '内部', access: '读写' },
    { label: 'B站创作中心', level: '内部', access: '只读' },
    { label: '商单合同库', level: '机密', access: '只读' },
    { label: '私域用户数据', level: '机密', access: '只读' }
  ] as DataScope[],

  model: { model: 'CosMac Star-Pro', tokenBudget: 5000, rateLimit: 600 } as ChannelModel,

  memory: { longTerm: true, scope: '全平台', retentionDays: 365, audit: true } as ChannelMemory
})

export function useSystemAi() {
  return {
    visible,
    state,
    open: () => { visible.value = true },
    close: () => { visible.value = false },

    addItem(kind: 'skills' | 'knowledge' | 'subAgents', label: string, desc: string, tag?: string) {
      const l = label.trim()
      if (!l) return
      const item: ChannelInfoItem = { label: l }
      if (desc.trim()) item.desc = desc.trim()
      if (tag && tag.trim()) item.tag = tag.trim()
      state[kind].push(item)
    },
    removeItem(kind: 'skills' | 'knowledge' | 'subAgents', i: number) { state[kind].splice(i, 1) },

    addSource(label: string, level: Confidential, access: AccessLevel) {
      const l = label.trim()
      if (!l) return
      state.dataSources.push({ label: l, level, access })
    },
    removeSource(i: number) { state.dataSources.splice(i, 1) }
  }
}
