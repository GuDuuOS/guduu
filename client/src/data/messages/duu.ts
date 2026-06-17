import type { DayMessages } from '@/types/message'

export const duuMessages: DayMessages[] = [
  {
    daySep: '今天 · 2026年5月23日',
    messages: [
      {
        id: 'd1',
        sender: { type: 'bot', name: 'CosMac Star', avatar: 'G' },
        time: '09:00',
        html: '早安，筱雨 👋<br/>试试输入 <code>/</code> 调出命令，或者直接问我任何关于账号 / 内容 / 商单的事。'
      }
    ]
  }
]

export interface SlashCommand {
  cmd: string
  desc: string
}

export const slashCommands: SlashCommand[] = [
  { cmd: '/title',  desc: '一键生成爆款标题（结合平台热点）' },
  { cmd: '/script', desc: '起草短视频脚本 · 含黄金 3 秒钩子与分镜' },
  { cmd: '/report', desc: '全平台数据复盘 · 播放 / 涨粉 / 变现' },
  { cmd: '/reply',  desc: '批量生成评论区高赞回复' },
  { cmd: '/trend',  desc: '查今日热点选题与对标拆解' }
]
