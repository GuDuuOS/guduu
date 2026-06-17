import { reactive } from 'vue'
import type { DayMessages, MessageData } from '@/types/message'
import type { OpsChannelMeta } from '@/types/channel'

/**
 * 运行时频道 store
 * --------------------------------------------------------------
 * 由主 AI「一键启动全链路」动态创建的协作频道（如「爆款专班」）放这里。
 * 与静态的 opsScenarios 区分：这里的消息可以在运行时一条条 push / drip，
 * 让频道在用户眼前「实时运转」（各 Agent 与真人陆续发言）。
 * OpsChannelView 优先读本 store，没有再回落到 opsScenarios。
 */
export interface LiveScenario {
  meta: OpsChannelMeta
  days: DayMessages[]
}

const live = reactive<Record<string, LiveScenario>>({})

export function useLiveChannels() {
  return {
    live,

    /** 是否存在运行时频道 */
    has: (id: string) => !!live[id],

    /** 新建一个空的运行时频道（带一条今日分隔）*/
    create(id: string, meta: OpsChannelMeta) {
      live[id] = { meta, days: [{ daySep: '今天 · 实时运转中', messages: [] }] }
    },

    /** 追加一条消息 */
    push(id: string, msg: MessageData) {
      const s = live[id]
      if (s) s.days[0].messages.push(msg)
    },

    /**
     * 按节奏依次投递多条消息，模拟群里真实运转。
     * @param startDelay 第一条延迟（ms）
     * @param gap 相邻两条间隔（ms）
     */
    drip(id: string, msgs: MessageData[], startDelay = 700, gap = 1100) {
      msgs.forEach((m, i) => {
        setTimeout(() => {
          const s = live[id]
          if (s) s.days[0].messages.push(m)
        }, startDelay + gap * i)
      })
    }
  }
}
