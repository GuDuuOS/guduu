import { reactive, ref } from 'vue'
import { currentUser } from '@/data/channels'

/** 我的权限（可开关）*/
export interface UserPermission { label: string; desc?: string; enabled: boolean }
/** 可被他人 / AI 调用的我的数据 */
export interface ShareableDatum { label: string; value: string; shared: boolean }

const handle = '@xiaoyu'

/** 个人设置弹窗 */
export type UserSettingsTab = 'profile' | 'perms' | 'share'
const settingsVisible = ref(false)
const settingsTab = ref<UserSettingsTab>('profile')
const status = ref<'在线' | '忙碌' | '离开' | '隐身'>('在线')

const permissions = reactive<UserPermission[]>([
  { label: '审核成片 / 商单报价', desc: '对外内容终审', enabled: true },
  { label: '一键定时发布',        desc: '多平台排期发布', enabled: true },
  { label: '全平台数据查看',      desc: '播放 / 涨粉 / 变现汇总', enabled: true },
  { label: '授权 AI 代我起草与复盘', desc: '标题、脚本、周报初稿', enabled: true },
  { label: 'AI 对外动作需我确认',  desc: '发布 / 报价人工把关', enabled: true }
])

const shareableData = reactive<ShareableDatum[]>([
  { label: '我的待办与审核状态', value: '6 项待办', shared: true },
  { label: '我的账号实时 KPI', value: '播放 / 涨粉', shared: true },
  { label: '我的日程 / 在线状态', value: '在线', shared: false },
  { label: '我的选题偏好记录', value: '近 30 天', shared: false }
])

export function useUserProfile() {
  return {
    user: currentUser,
    handle,
    status,
    permissions,
    shareableData,
    settingsVisible,
    settingsTab,
    openSettings: (tab: UserSettingsTab = 'profile') => { settingsTab.value = tab; settingsVisible.value = true },
    closeSettings: () => { settingsVisible.value = false }
  }
}
