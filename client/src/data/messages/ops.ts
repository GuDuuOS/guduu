import type { DayMessages } from '@/types/message'
import type { OpsChannelMeta } from '@/types/channel'

interface OpsScenario {
  meta: OpsChannelMeta
  days: DayMessages[]
}

const today = '今天 · 2026年5月23日'

/** ========== 1. 选题-灵感库 ========== */
const dcsCoord: OpsScenario = {
  meta: {
    title: '选题-灵感库',
    topic: '全网热点雷达 + 灵感速记 · 选题秒级沉淀',
    memberCount: 6,
    stack: [
      { label: '题', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true },
      { label: '鹿', color: '#5a7a8a' }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'dcs-0',
          sender: { type: 'bot', name: '选题 Agent', avatar: '题' },
          time: '08:10',
          html: '早安 ☕ 完成全网热点夜间扫描，<b>今日 8 条选题灵感已入库</b>，其中 3 条与你的「职场成长」赛道强相关。'
        },
        {
          id: 'dcs-1',
          sender: { type: 'bot', name: '选题 Agent', avatar: '题' },
          time: '08:11',
          html: '🔥 重点推一条：',
          rich: {
            variant: 'info',
            tag: 'TREND',
            title: '热点选题 · 职场反内耗',
            meta: '抖音热榜 #7 · 24h 内仍在上升',
            paragraph: '相关话题播放 <b>2.3 亿</b>，但你赛道内优质供给少，<b>蓝海窗口约 3 天</b>。',
            kv: [
              { k: '话题热度', v: '★★★★☆（上升中）' },
              { k: '赛道相关度', v: '92%' },
              { k: '竞争激烈度', v: '低（蓝海）' },
              { k: '建议形式', v: '60s 口播 + 真实案例' }
            ],
            actions: [
              { label: '生成脚本', primary: true },
              { label: '加入选题库' },
              { label: '忽略' }
            ]
          }
        },
        {
          id: 'dcs-2',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '08:18',
          html: '@选题Agent 这个不错。结合我上周那条「35 岁职场危机」的爆款，能再延展几个角度吗？'
        },
        {
          id: 'dcs-3',
          sender: { type: 'bot', name: '选题 Agent', avatar: '题' },
          time: '08:18',
          html: '已关联历史爆款（播放 186w），给你 3 个延展角度：<br/>① <b>反内耗的 3 个具体动作</b>（可落地，收藏率高）<br/>② <b>我裸辞后才懂的事</b>（强情绪，完播好）<br/>③ <b>同事都在卷，我偏要躺平</b>（争议向，评论互动高）'
        },
        {
          id: 'dcs-4',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '08:20',
          html: '我可以基于角度①先起一版 60s 口播脚本，含黄金 3 秒钩子。要现在生成吗？'
        },
        {
          id: 'dcs-5',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '08:23',
          html: '先存选题库，明早<b>选题会</b>一起定。@文案Agent 别急着写。'
        }
      ]
    }
  ]
}

/** ========== 2. 舆情-评论预警 ========== */
const emergency: OpsScenario = {
  meta: {
    title: '舆情-评论预警',
    topic: '负面情绪秒级捕捉 · 一键危机响应',
    memberCount: 5,
    stack: [
      { label: '数', bot: true },
      { label: '鹿', color: '#5a7a8a' },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'em-1',
          sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' },
          time: '10:42',
          html: '⚠ 昨天那条<b>探店视频</b>评论区有点炸，好多人说「恰饭不标注」「割粉丝韭菜」。'
        },
        {
          id: 'em-2',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '10:42',
          html: '已检测到 <code>#探店-巷子口小馆</code> 评论区负面情绪激增，<b>触发舆情预警</b>。',
          rich: {
            variant: 'alert',
            tag: 'CRITICAL',
            title: '评论区负面情绪激增 · 疑似信任危机',
            meta: '#OP-0523 · 近 1 小时 +218 条负面',
            paragraph: '已自动归类并比对历史相似案例。<b>建议 2 小时内公开回应</b>，避免扩散到其他平台。',
            kv: [
              { k: '负面占比', v: '37%（昨日 6%）' },
              { k: '高频关键词', v: '恰饭 / 不标注 / 割韭菜' },
              { k: '扩散平台', v: '抖音评论 → 小红书已有搬运' },
              { k: '相似案例', v: '3 例 · 处理得当未掉粉' }
            ],
            actions: [
              { label: '查看争议评论', primary: true },
              { label: '生成回应话术' },
              { label: '置顶澄清' }
            ]
          }
        },
        {
          id: 'em-3',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '10:43',
          html: '各平台争议评论分布如下，抖音为主战场：',
          chartCard: { chartId: 'chHelmet', title: '近 1 小时争议评论 · 按平台分布' }
        },
        {
          id: 'em-4',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '10:48',
          html: '是我疏忽，那条确实是商单没打标。@文案Agent 写一段诚恳的置顶说明：承认没标广告、说明这家店是我自己常去的、退一步把合作费捐了。'
        },
        {
          id: 'em-5',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '10:49',
          html: '草拟如下，语气真诚、不甩锅、给具体动作：',
          doc: {
            title: '置顶说明 · 关于探店视频未标广告',
            subtitle: '建议同步到抖音 / 小红书 / 评论区置顶',
            sections: [
              {
                title: '正文',
                body: '大家的批评我收到了，也认了 🙏 这条视频确实有商业合作，<b>但我忘了打「广告」标签，是我的错</b>。<br/>这家店是我自己常去吃的，推荐是真心的，但不标注就是不对。<br/>已补上标签，并把这次的合作费用全部捐给「免费午餐」，截图随后放评论区。以后但凡恰饭，一定第一时间标清楚。'
              }
            ],
            footer: '// drafted by 文案 Agent · 已通过广告法合规自检',
            actions: [
              { label: '一键置顶三平台', primary: true },
              { label: '再改改' }
            ]
          }
        },
        {
          id: 'em-6',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '10:53',
          html: '就用这版。@小鹿 置顶到三个平台，捐款截图我十分钟后发你。'
        },
        {
          id: 'em-7',
          sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' },
          time: '10:55',
          html: '收到，已置顶 ✅ 我盯着评论区，有新情况随时同步。'
        }
      ]
    }
  ]
}

/** ========== 3. 发布-排期日历 ========== */
const gridDispatch: OpsScenario = {
  meta: {
    title: '发布-排期日历',
    topic: '多平台错峰发布 · AI 卡黄金流量时段',
    memberCount: 5,
    stack: [
      { label: '数', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true },
      { label: '杰', color: '#7a8a5a' }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'gd-1',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '09:00',
          html: '本周发布排期已生成，已避开各平台限流时段、错峰投放，<b>预计触达较随手发提升 22%</b>。',
          doc: {
            title: '本周发布排期（5/23 — 5/29）',
            subtitle: '按各平台你的粉丝活跃曲线自动卡点',
            sections: [
              {
                title: '排期表',
                table: {
                  headers: ['日期', '平台', '内容', '最佳时段'],
                  rows: [
                    ['周二', '抖音', '反内耗的 3 个动作', { text: '19:30', color: '#6b8e4e' }],
                    ['周三', '小红书', '我裸辞后才懂的事', { text: '12:30', color: '#6b8e4e' }],
                    ['周四', '公众号', '长文：副业到底怎么开始', { text: '20:30', color: '#6b8e4e' }],
                    ['周六', '视频号', '一周 vlog 合集', { text: '21:00', color: '#b58932' }]
                  ]
                }
              }
            ],
            footer: '// generated by 数据 Agent · 可拖动调整',
            actions: [
              { label: '同步到日历', primary: true },
              { label: '调整时段' },
              { label: '一键定时发布' }
            ]
          }
        },
        {
          id: 'gd-2',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '09:12',
          html: '周四公众号那篇标题还没定。@文案Agent 给几个，要打开率高的。'
        },
        {
          id: 'gd-3',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '09:12',
          html: '3 个备选（括号内为基于历史数据的预估打开率）：<br/>① 副业别再瞎试了，先看这篇（<b>9.2%</b>）<br/>② 我靠副业月入过万，但我劝你先别辞职（<b>11.4%</b>）<br/>③ 普通人做副业的 5 个坑，我全踩过（<b>10.1%</b>）'
        },
        {
          id: 'gd-4',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '09:15',
          html: '用第 2 个。'
        },
        {
          id: 'gd-5',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '09:15',
          html: '已锁定标题，<b>周四 20:30 自动发布</b>，发布前 1 小时会再做一次合规自检并提醒你。'
        }
      ]
    }
  ]
}

/** ========== 4. 拍摄-脚本分镜 ========== */
const plantStartup: OpsScenario = {
  meta: {
    title: '拍摄-脚本分镜',
    topic: '脚本 → 分镜 → 拍摄清单 · 开拍前对齐',
    memberCount: 4,
    stack: [
      { label: '文', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '周', color: '#a07050' }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'ps-1',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '15:02',
          html: '明天拍「租房 vs 买房」那条，@文案Agent 出个分镜脚本，控制在 75 秒内。'
        },
        {
          id: 'ps-2',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '15:03',
          html: '已生成 6 镜头分镜脚本，<b>预计时长 73s</b>，钩子放在第 1 镜：',
          doc: {
            title: '分镜脚本 · 租房 vs 买房',
            subtitle: '6 镜 · 约 73s · 口播 + 实拍',
            sections: [
              {
                title: '分镜表',
                table: {
                  headers: ['镜号', '画面', '口播要点', '时长'],
                  rows: [
                    ['1', '正脸怼镜头', '"30 岁前别急着买房，听我说完"', '0-5s'],
                    ['2', '租房实拍空镜', '租房的 3 个隐性成本', '5-25s'],
                    ['3', '白板手写算账', '买房的机会成本算给你看', '25-48s'],
                    ['4', '街景边走边说', '什么情况下才该买', '48-63s'],
                    ['5', '正脸总结', '一句话结论 + 反问', '63-70s'],
                    ['6', '片尾引导', '"评论区聊聊你怎么选"', '70-73s']
                  ]
                }
              }
            ],
            footer: '// 分镜可单独导出为拍摄清单',
            actions: [
              { label: '导出拍摄清单', primary: true },
              { label: '改时长' },
              { label: '换个钩子' }
            ]
          }
        },
        {
          id: 'ps-3',
          sender: { type: 'human', name: '老周', avatar: '周', color: '#a07050' },
          time: '15:20',
          html: '第 4 镜室外那段，明天预报有雨，要不要准备个备选?'
        },
        {
          id: 'ps-4',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '15:21',
          html: '已加雨天备选：第 4 镜改为<b>室内白板继续讲解</b>，口播微调一句衔接，拍摄清单已同步更新。'
        },
        {
          id: 'ps-5',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '15:24',
          html: '道具和场地清单也列一下。'
        },
        {
          id: 'ps-6',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '15:24',
          html: '📋 <b>拍摄清单</b><br/>· 道具：白板 + 马克笔、计算器、租房合同（道具）<br/>· 场地：工作室（主场）/ 楼下街道（第 4 镜）<br/>· 服装：浅色基础款（避免和白板撞色）<br/>· 设备：A7M4 + 领夹麦，备机手机拍竖屏花絮'
        }
      ]
    }
  ]
}

/** ========== 5. 数据-涨粉复盘 ========== */
const windRemote: OpsScenario = {
  meta: {
    title: '数据-涨粉复盘',
    topic: 'AI 远程诊断单条内容 · 定位涨粉 / 掉粉原因',
    memberCount: 4,
    stack: [
      { label: '数', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'wr-1',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '11:05',
          html: '完成昨日发布的「副业避坑」复盘。<b>近 7 日涨粉持续高于历史均线</b>，但这条本身完播偏低，已定位原因。'
        },
        {
          id: 'wr-2',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '11:06',
          chartCard: { chartId: 'chTrend', title: '近 7 日涨粉：实际 vs AI 预测 vs 历史平均' }
        },
        {
          id: 'wr-3',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '11:07',
          html: '单条诊断：',
          rich: {
            variant: 'warn',
            tag: 'DIAGNOSIS',
            title: '「副业避坑」· 完播率偏低',
            meta: '播放 4.2w · 低于你的均值',
            paragraph: '流失曲线显示 <b>前 3 秒流失 41%</b>（均值 22%）。钩子太平是主因，后半段其实留存不错。',
            kv: [
              { k: '播放量', v: '42,300' },
              { k: '完播率', v: '18%（均值 31%）' },
              { k: '点赞率', v: '4.1%（健康）' },
              { k: '净涨粉', v: '+286' }
            ],
            actions: [
              { label: '看流失曲线', primary: true },
              { label: '优化钩子' },
              { label: '找对标拆解' }
            ]
          }
        },
        {
          id: 'wr-4',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '11:14',
          html: '前 3 秒确实平。@文案Agent 给两个更抓人的开头，同样的内容。'
        },
        {
          id: 'wr-5',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '11:15',
          html: '两个钩子改写：<br/>① "我做副业亏了 2 万，这 3 个坑你别踩"（损失厌恶）<br/>② "别信那些教你做副业的，先看这条"（制造对立）'
        },
        {
          id: 'wr-6',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '11:16',
          html: '已把这两个钩子记录到<b>「钩子库」</b>，下条同类选题会自动推荐沿用，并标注 A/B 测试。'
        }
      ]
    }
  ]
}

/** ========== 6. 商单-品牌合作 ========== */
const shiftHandover: OpsScenario = {
  meta: {
    title: '商单-品牌合作',
    topic: '商单线索 → 报价 → 排期 · 全流程留痕',
    memberCount: 5,
    stack: [
      { label: '鹿', color: '#5a7a8a' },
      { label: 'G', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'sh-1',
          sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' },
          time: '14:02',
          html: '新商单线索：某国货护肤品牌，想要 <b>1 条抖音 + 1 篇小红书</b>，让我们先报价。'
        },
        {
          id: 'sh-2',
          sender: { type: 'bot', name: 'GuDuu', avatar: 'G' },
          time: '14:03',
          html: '已调出你的刊例与近 3 个月真实数据，结合该品牌行业给出建议报价：',
          doc: {
            title: '商单报价单 · 国货护肤品牌',
            subtitle: '基于近 90 天均播与互动数据 · 仅供内部参考',
            sections: [
              {
                title: '报价明细',
                table: {
                  headers: ['形式', '粉丝量', '近 30 天均播', '建议报价'],
                  rows: [
                    ['抖音 60s 口播', '48.2w', '8.6w', { text: '¥ 12,000', color: '#6b8e4e' }],
                    ['小红书图文', '21.6w', '3.2w', { text: '¥ 6,000', color: '#6b8e4e' }],
                    ['打包价', '—', '—', { text: '¥ 16,000', color: '#c96442' }]
                  ]
                }
              }
            ],
            footer: '// generated by GuDuu · 含 1 次免费修改',
            actions: [
              { label: '生成正式报价单', primary: true },
              { label: '发给品牌方' },
              { label: '调整价格' }
            ]
          }
        },
        {
          id: 'sh-3',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '14:10',
          html: '抖音那条别写「全网最低价」这种承诺，容易翻车。'
        },
        {
          id: 'sh-4',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '14:10',
          html: '已从合作话术里移除「全网最低 / 第一 / 最」等绝对化用语，<b>规避广告法风险</b>。'
        },
        {
          id: 'sh-5',
          sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' },
          time: '14:38',
          html: '报价发过去了，对方接受打包价 16k，要排到下周。'
        },
        {
          id: 'sh-6',
          sender: { type: 'bot', name: 'GuDuu', avatar: 'G' },
          time: '14:38',
          html: '已在<b>「发布-排期日历」占位 6/2</b>，创建商单待办（含合同、脚本、初稿审核节点），并把合同流转到「合作-合同报价」。'
        }
      ]
    }
  ]
}

/** ========== 7. 合作-合同报价 ========== */
const workPermit: OpsScenario = {
  meta: {
    title: '合作-合同报价',
    topic: '合同条款 AI 审核 · 回款与版权红线预警',
    memberCount: 4,
    stack: [
      { label: 'G', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '鹿', color: '#5a7a8a' }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'wp-1',
          sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' },
          time: '16:05',
          html: '品牌方合同发来了，@GuDuu 帮我看下有没有坑。'
        },
        {
          id: 'wp-2',
          sender: { type: 'bot', name: 'GuDuu', avatar: 'G' },
          time: '16:06',
          html: '已逐条审阅，<b>识别 3 处需要关注的条款</b>：',
          rich: {
            variant: 'warn',
            tag: 'CONTRACT',
            title: '合同风险 · 3 处需关注',
            meta: '#HT-0523 · 中高风险',
            paragraph: '其余条款标准，无明显陷阱。建议就以下 3 点回函协商：',
            kv: [
              { k: '独家期', v: '要求同类目 6 个月独家 · 偏长' },
              { k: '回款账期', v: '验收后 90 天 · 建议压到 30 天' },
              { k: '二次传播', v: '品牌方可无限期二次剪辑投流 · 需限定' },
              { k: '违约金', v: '对等，合理' }
            ],
            actions: [
              { label: '查看逐条批注', primary: true },
              { label: '拟修改意见' },
              { label: '直接通过' }
            ]
          }
        },
        {
          id: 'wp-3',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '16:18',
          html: '90 天账期太长，改成 30 天；独家期砍掉或压到 1 个月；二次传播限定半年内、且不能改我的口播原意。'
        },
        {
          id: 'wp-4',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '16:19',
          html: '已生成<b>修改意见函</b>（含每条的理由话术，语气专业不强硬），可直接回复对方：',
          doc: {
            title: '合同修改意见函',
            subtitle: '致：品牌方商务 · 关于合作合同 3 处条款',
            sections: [
              { title: '一、回款账期', body: '原「验收后 90 天」建议调整为 <b>30 天</b>，便于双方资金安排。' },
              { title: '二、独家期', body: '建议取消同类目独家，或缩短至 <b>1 个月</b>；独家将影响我方其他合作排期。' },
              { title: '三、二次传播授权', body: '同意二次剪辑投流，但建议<b>限定半年内</b>，且不得篡改口播核心观点。' }
            ],
            footer: '// drafted by 文案 Agent',
            actions: [
              { label: '导出 .docx', primary: true },
              { label: '发送给对方' }
            ]
          }
        },
        {
          id: 'wp-5',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '16:25',
          html: '发吧。'
        },
        {
          id: 'wp-6',
          sender: { type: 'bot', name: 'GuDuu', avatar: 'G' },
          time: '16:25',
          html: '已发送修改意见，并设置<b>回款到期提醒</b>（按交付后 30 天，到期前 3 天通知你）。'
        }
      ]
    }
  ]
}

/** ========== 8. 私域-社群运营 ========== */
const utilityCoord: OpsScenario = {
  meta: {
    title: '私域-社群运营',
    topic: '公私域联动 · 把公域流量沉淀成粉丝资产',
    memberCount: 6,
    stack: [
      { label: '数', bot: true },
      { label: '鹿', color: '#5a7a8a' },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'uc-1',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '09:30',
          html: '本周私域新增 <b>326 人</b>，主要来自抖音主页挂载与评论区引导，<b>公域→私域转化率 4.2%</b>（行业 2~3%）。',
          rich: {
            variant: 'ok',
            tag: 'GROWTH',
            title: '私域资产稳健增长',
            meta: '3 群 · 累计 1,480 人',
            kv: [
              { k: '本周新增', v: '+326 人' },
              { k: '主要来源', v: '抖音主页（61%）' },
              { k: '7 日活跃', v: '58%' },
              { k: '付费咨询转化', v: '11 单 · ¥ 3,300' }
            ]
          }
        },
        {
          id: 'uc-2',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '09:31',
          chartCard: { chartId: 'chTrend', title: '近 7 日社群活跃：实际 vs 预测 vs 历史' }
        },
        {
          id: 'uc-3',
          sender: { type: 'human', name: '小鹿', avatar: '鹿', color: '#5a7a8a' },
          time: '09:40',
          html: '2 群最近有点沉，要不要做个活动拉一下?'
        },
        {
          id: 'uc-4',
          sender: { type: 'bot', name: '数据 Agent', avatar: '数' },
          time: '09:41',
          html: '建议「<b>话题打卡 + 抽 1 次免费 1v1 咨询</b>」，按 2 群画像，预计 3 天拉活 <b>+35%</b>，成本几乎为零。'
        },
        {
          id: 'uc-5',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '09:45',
          html: '可以，@文案Agent 写个群公告，再配 3 天打卡话题。'
        },
        {
          id: 'uc-6',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '09:46',
          html: '✅ 已拟好：<br/>· 群公告（含活动规则 + 截止时间）<br/>· Day1「你今年最想戒掉的工作习惯」<br/>· Day2「分享一个你的搞钱小技巧」<br/>· Day3「晒晒你的副业第一桶金」<br/>要不要顺手生成 3 张话题海报？'
        }
      ]
    }
  ]
}

/** ========== 9. 选题-每周选题会 ========== */
const safetyBriefing: OpsScenario = {
  meta: {
    title: '选题-每周选题会',
    topic: '每周一次 · AI 汇总选题池 + 定本周排期',
    memberCount: 6,
    stack: [
      { label: '题', bot: true },
      { label: '雨', color: '#7a5a3a' },
      { label: '文', bot: true },
      { label: '杰', color: '#7a8a5a' }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'sb-1',
          sender: { type: 'bot', name: '选题 Agent', avatar: '题' },
          time: '09:00',
          html: '📋 <b>本周选题会开始</b>。选题池共 23 条，已按「预估爆款指数」排序，Top 5 如下：',
          doc: {
            title: '本周选题池 · Top 5',
            subtitle: '爆款指数 = 热度 × 赛道相关 × 你的历史表现',
            sections: [
              {
                title: '候选选题',
                table: {
                  headers: ['选题', '形式', '平台', '爆款指数'],
                  rows: [
                    ['反内耗的 3 个动作', '口播', '抖音', { text: '92', color: '#6b8e4e' }],
                    ['我裸辞后才懂的事', '口播', '小红书', { text: '88', color: '#6b8e4e' }],
                    ['副业到底怎么开始', '长文', '公众号', { text: '81', color: '#b58932' }],
                    ['同事都在卷我偏躺平', '口播', '抖音', { text: '79', color: '#b58932' }],
                    ['一周搞钱 vlog', 'vlog', '视频号', { text: '64', color: '#8a8270' }]
                  ]
                }
              }
            ],
            footer: '// 勾选进入本周排期',
            actions: [
              { label: '采纳 Top 2', primary: true },
              { label: '查看完整选题池' }
            ]
          }
        },
        {
          id: 'sb-2',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '09:08',
          html: 'Top1 和 Top3 这周做。Top2 留着下周，最近裸辞话题有点多了。'
        },
        {
          id: 'sb-3',
          sender: { type: 'bot', name: '选题 Agent', avatar: '题' },
          time: '09:08',
          html: '已确认 2 条进入本周排期：<b>「反内耗 3 个动作」（抖音）</b>、<b>「副业怎么开始」（公众号长文）</b>。'
        },
        {
          id: 'sb-4',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '09:10',
          html: '这两条我今天先出脚本/长文初稿，明早发群里审。'
        },
        {
          id: 'sb-5',
          sender: { type: 'human', name: '阿杰', avatar: '杰', color: '#7a8a5a' },
          time: '09:12',
          html: '拍摄素材发我后，抖音那条我按<b>周四交付初剪</b>，周六前给终版。'
        },
        {
          id: 'sb-6',
          sender: { type: 'bot', name: '选题 Agent', avatar: '题' },
          time: '09:13',
          html: '已生成本周内容日历并同步到<b>「发布-排期日历」</b>，相关待办已分派给文案 / 剪辑。下周一同一时间再开。'
        }
      ]
    }
  ]
}

/** ========== 10. 成片-审核交付 ========== */
const processHandover: OpsScenario = {
  meta: {
    title: '成片-审核交付',
    topic: '初剪 → 审核 → 终交付 · 卡点不积压',
    memberCount: 5,
    stack: [
      { label: '杰', color: '#7a8a5a' },
      { label: '雨', color: '#7a5a3a' },
      { label: 'G', bot: true },
      { label: '文', bot: true }
    ]
  },
  days: [
    {
      daySep: today,
      messages: [
        {
          id: 'ph-1',
          sender: { type: 'human', name: '阿杰', avatar: '杰', color: '#7a8a5a' },
          time: '17:20',
          html: '「副业避坑 2.0」初剪好了，时长 68s，节奏比上版紧。@筱雨 审一下。'
        },
        {
          id: 'ph-2',
          sender: { type: 'bot', name: 'GuDuu', avatar: 'G' },
          time: '17:21',
          html: '已自动质检完成：',
          rich: {
            variant: 'info',
            tag: 'QC',
            title: '成片质检 · 2 处建议',
            meta: '通过率 90% · 可发布前修正',
            kv: [
              { k: '时长', v: '68s（适合抖音）' },
              { k: '字幕', v: '0:32 处错别字 1 处 ⚠' },
              { k: 'BGM 版权', v: '已授权 ✅' },
              { k: '违禁词', v: '未检出 ✅' }
            ],
            actions: [
              { label: '查看问题时间点', primary: true },
              { label: '通过' },
              { label: '打回重剪' }
            ]
          }
        },
        {
          id: 'ph-3',
          sender: { type: 'human', name: '筱雨', avatar: '雨', color: '#7a5a3a' },
          time: '17:30',
          html: '0:32 那个错别字改一下，封面换第 2 版（那个表情更抓人）。其他 OK。'
        },
        {
          id: 'ph-4',
          sender: { type: 'human', name: '阿杰', avatar: '杰', color: '#7a8a5a' },
          time: '17:41',
          html: '已改字幕，封面换成第 2 版了，重新导出给你。'
        },
        {
          id: 'ph-5',
          sender: { type: 'bot', name: '文案 Agent', avatar: '文' },
          time: '17:43',
          html: '标题 / 简介 / 话题标签已生成，<b>发布前合规自检通过</b>，商业合作标签已按要求挂上。'
        },
        {
          id: 'ph-6',
          sender: { type: 'bot', name: 'GuDuu', avatar: 'G' },
          time: '17:44',
          html: '成片已归档到<b>素材库</b>，状态置为「待发布」，可在「发布-排期日历」选时段定时发布。本条已记入本周交付看板 ✅'
        }
      ]
    }
  ]
}

export const opsScenarios: Record<string, OpsScenario> = {
  'dcs-coord':        dcsCoord,
  'emergency':        emergency,
  'grid-dispatch':    gridDispatch,
  'plant-startup':    plantStartup,
  'wind-remote':      windRemote,
  'shift-handover':   shiftHandover,
  'work-permit':      workPermit,
  'utility-coord':    utilityCoord,
  'safety-briefing':  safetyBriefing,
  'process-handover': processHandover
}
