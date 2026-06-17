<template>
  <div class="topbar">
    <!-- 左：brand 应用切换器（点开切换 Channels / 商城 / CLI / 控制台 / 集成）-->
    <TopAppSwitcher />

    <!-- 中：搜索 + 升级会员 -->
    <div class="top-mid">
      <div class="search" role="button" tabindex="0" style="cursor: pointer" @click="onSearch" @keydown.enter="onSearch">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>搜索</span>
      </div>
    </div>

    <!-- 右：升级会员 + @/书签/设置 + 头像 -->
    <div class="top-right">
      <button class="top-upgrade" title="升级会员" @click="onUpgrade">✦ 升级会员 ✦</button>
      <button class="ic-btn" title="提及" @click="onMentions">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
        </svg>
      </button>
      <button class="ic-btn" title="收藏" @click="onBookmarks">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
        </svg>
      </button>
      <button class="ic-btn" title="设置" @click="onSettings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <TopUserMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
import TopAppSwitcher from '@/components/layout/TopAppSwitcher.vue'
import TopUserMenu from '@/components/layout/TopUserMenu.vue'
import { useToast } from '@/composables/useToast'
import { useUserProfile } from '@/composables/useUserProfile'

const { success, toast } = useToast()
const { openSettings } = useUserProfile()

function onSearch() {
  toast('🔍 全局搜索', '输入关键词搜索频道 / 消息 / 文件（演示）')
}
function onUpgrade() {
  success('已进入会员升级', 'Pro 版解锁全部 Agent 与无限额度（演示）')
}
function onMentions() {
  toast('@ 提及', '这里会列出所有 @ 你的消息（演示）')
}
function onBookmarks() {
  toast('🔖 收藏夹', '你收藏的消息 / 文件会出现在这里（演示）')
}
function onSettings() {
  openSettings()
}
</script>
