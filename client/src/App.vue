<template>
  <TopBar />
  <div class="layout" :class="{ focused }">
    <WorkspaceRail v-if="!focused" />
    <ChannelSidebar
      v-if="!focused"
      @add-channel="onAddChannel"
      @invite="onInvite"
    />
    <main class="main">
      <router-view />
    </main>
    <RightPanel v-if="rightPanelVisible && !focused" />
    <AiChatPanel v-if="aiPanelVisible" />
    <PluginRail v-if="!focused" />
  </div>
  <ChannelAdminModal />
  <CardActionModal />
  <DepartmentCreateModal />
  <SystemAiModal />
  <UserSettingsModal />
  <MarketplaceModal />
  <PluginStoreModal />
  <CustomAssetsModal />
  <CliConsole />
  <ProfileHome />
  <ToastHost />
</template>

<script setup lang="ts">
import TopBar from '@/components/layout/TopBar.vue'
import WorkspaceRail from '@/components/layout/WorkspaceRail.vue'
import ChannelSidebar from '@/components/layout/ChannelSidebar.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import PluginRail from '@/components/layout/PluginRail.vue'
import AiChatPanel from '@/components/layout/AiChatPanel.vue'
import ChannelAdminModal from '@/components/channel/ChannelAdminModal.vue'
import CardActionModal from '@/components/channel/CardActionModal.vue'
import DepartmentCreateModal from '@/components/layout/DepartmentCreateModal.vue'
import SystemAiModal from '@/components/layout/SystemAiModal.vue'
import UserSettingsModal from '@/components/layout/UserSettingsModal.vue'
import MarketplaceModal from '@/components/layout/MarketplaceModal.vue'
import PluginStoreModal from '@/components/layout/PluginStoreModal.vue'
import CustomAssetsModal from '@/components/layout/CustomAssetsModal.vue'
import CliConsole from '@/components/layout/CliConsole.vue'
import ProfileHome from '@/components/layout/ProfileHome.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
import { useRightPanel } from '@/composables/useRightPanel'
import { useAiPanel } from '@/composables/useAiPanel'
import { useFocusMode } from '@/composables/useFocusMode'
import { useToast } from '@/composables/useToast'

const { visible: rightPanelVisible } = useRightPanel()
const { visible: aiPanelVisible } = useAiPanel()
const { focused } = useFocusMode()
const { success } = useToast()

function onAddChannel() {
  success('新建频道', '在当前工作区创建新频道 / 邀请成员（演示）')
}
function onInvite() {
  success('邀请成员', '通过链接或 @ 邀请成员加入私信 / 频道（演示）')
}
</script>

<style>
/* 路由视图切换时的淡入（纯 CSS 动画，不依赖 Vue <transition> 生命周期）*/
.main > .channel-view {
  animation: view-fade-in 0.18s ease;
}
@keyframes view-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
