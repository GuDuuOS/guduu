import type { DayMessages } from '@/types/message'

const topicBot = {
  type: 'bot' as const,
  name: '选题 Agent',
  avatar: '题'
}

const duuBot = {
  type: 'bot' as const,
  name: 'CosMac Star',
  avatar: 'G'
}

export const safetyMessages: DayMessages[] = [
  {
    daySep: '今天 · 2026年5月23日',
    messages: [
      {
        id: 's1',
        sender: topicBot,
        time: '08:05',
        html: '早安 ☀️ 完成全网夜间扫描，<code>抖音 / 小红书 / 微博 / 知乎</code> 热榜已比对，<b>今日值得做的热点 6 条</b>已入选题库。'
      },
      {
        id: 's2',
        sender: topicBot,
        time: '08:08',
        html: '一条对标提醒：',
        rich: {
          variant: 'warn',
          tag: 'BENCHMARK',
          title: '对标账号出爆款 · 建议 48h 内跟进',
          meta: '@职场老张 · 昨晚发布',
          paragraph: '你的对标账号「@职场老张」昨晚发的 <b>「领导画饼，我该怎么接」</b> 播放已破 <b>320w</b>。该选题你的赛道契合度高，<b>蓝海窗口约 2 天</b>。',
          kv: [
            { k: '对标播放', v: '3,200,000' },
            { k: '互动率', v: '6.8%（高）' },
            { k: '你的契合度', v: '90%' },
            { k: '建议形式', v: '60s 口播 · 真实复盘' }
          ],
          actions: [
            { label: '看完整拆解', primary: true },
            { label: '生成同款选题' },
            { label: '忽略' }
          ]
        }
      },
      {
        id: 's3',
        sender: { type: 'human', name: '安其', avatar: '安', color: '#7a5a3a' },
        time: '08:20',
        html: '@选题Agent 把今天所有「和搞钱 / 副业相关」的热点选题调出来给我。'
      },
      {
        id: 's4',
        sender: topicBot,
        time: '08:21',
        html: '今日「搞钱 / 副业」相关热点 <b>4 条</b>，按爆款指数排序：<br/>① 普通人副业的 5 个坑（指数 <b>89</b>）<br/>② 我靠 AI 做副业月入过万（指数 <b>85</b>）<br/>③ 别再被「副业刚需」割韭菜了（指数 <b>78</b>）<br/>④ 下班后的 3 小时怎么用（指数 <b>71</b>）'
      },
      {
        id: 's5',
        sender: { type: 'human', name: '安其', avatar: '安', color: '#7a5a3a' },
        time: '08:24',
        html: '@CosMac Star 把本月已发内容按平台播放汇总成图给我看看。'
      },
      {
        id: 's6',
        sender: duuBot,
        time: '08:24',
        html: '好的安其，本月各平台播放表现如下：',
        chartCard: {
          chartId: 'chUnit',
          title: '本月各平台播放 · 实际 vs 目标'
        },
        trailingHtml: '需要我把表现最好的 3 条选题，生成下一批延展选题吗？'
      }
    ]
  }
]
