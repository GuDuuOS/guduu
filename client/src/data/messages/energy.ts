import type { DayMessages } from '@/types/message'

const dataBot = {
  type: 'bot' as const,
  name: '数据 Agent',
  avatar: '数'
}

export const energyMessages: DayMessages[] = [
  {
    daySep: '今天 · 2026年5月23日',
    messages: [
      {
        id: 'e1',
        sender: dataBot,
        time: '08:30',
        html: '早安。完成全平台数据夜间分析，<b>今日 5 条增长建议</b>已生成。预计采纳后本周播放 <b>+18%</b>。'
      },
      {
        id: 'e2',
        sender: dataBot,
        time: '08:31',
        rich: {
          variant: 'ok',
          tag: 'SUGGESTION',
          title: '抖音 · 发布时段优化',
          meta: '预计单条播放 +24%',
          paragraph: '近 30 天数据显示，你的粉丝活跃高峰在 <code>19:00–21:00</code>，但你常在 <code>12:00</code> 发布，错过黄金流量。',
          kv: [
            { k: '当前发布', v: '约 12:00（流量平峰）' },
            { k: '建议发布', v: '19:30（流量高峰）' },
            { k: '预估提升', v: '单条播放 +24% · 涨粉 +15%' },
            { k: '置信度', v: '91%' }
          ],
          actions: [
            { label: '同步到排期', primary: true },
            { label: '查看依据' },
            { label: '忽略' }
          ]
        }
      },
      {
        id: 'e3',
        sender: dataBot,
        time: '09:05',
        html: '已生成 7 日涨粉趋势图，<b>本周实际持续高于 AI 预测线</b>，增长健康：',
        chartCard: {
          chartId: 'chTrend',
          title: '近 7 日涨粉：实际 vs AI 预测 vs 历史平均'
        }
      },
      {
        id: 'e4',
        sender: dataBot,
        time: '09:06',
        chartCard: {
          chartId: 'chUnit',
          title: '本月各平台播放 · 实际 vs 目标'
        }
      }
    ]
  }
]
