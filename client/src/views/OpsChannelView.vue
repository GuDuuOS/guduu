<template>
  <div class="channel-view">
    <ChannelHeader
      :title="effectiveMeta.title"
      :topic="effectiveMeta.topic"
      :stack="effectiveMeta.stack"
      :member-count="effectiveMeta.memberCount"
    />
    <MessageStream v-if="scenario" :days="scenario.days" />
    <div v-else class="ops-placeholder">
      <div class="ops-placeholder-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" />
          <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
        </svg>
      </div>
      <h3>{{ effectiveMeta.title }}</h3>
      <p>{{ effectiveMeta.topic }}</p>
      <p class="ops-placeholder-hint">这个频道还没有消息记录。发条消息开个头，或邀请同事加入吧。</p>
    </div>
    <Composer
      :channel-label="`# ${effectiveMeta.title}`"
      :placeholder="`发送到 #${effectiveMeta.title}`"
      enable-emoji
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ChannelHeader from '@/components/channel/ChannelHeader.vue'
import MessageStream from '@/components/channel/MessageStream.vue'
import Composer from '@/components/channel/Composer.vue'
import { opsScenarios } from '@/data/messages/ops'
import { workspaceDataMap } from '@/data/channels'
import { useActiveWorkspace } from '@/composables/useActiveWorkspace'
import { useLiveChannels } from '@/composables/useLiveChannels'

const route = useRoute()
const { activeId } = useActiveWorkspace()
const { live } = useLiveChannels()
const channelId = computed(() => String(route.params.id ?? ''))
/** 优先读运行时频道（主 AI 启动的专班），否则回落到静态剧本 */
const scenario  = computed(() => live[channelId.value] ?? opsScenarios[channelId.value])

/** 没有剧本时，从 workspaceDataMap 兜底凑出标题/topic */
const fallbackMeta = computed(() => {
  const ws = workspaceDataMap[activeId.value]
  const ch = ws?.channels.find((c) => c.id === channelId.value)
  return {
    title: ch?.label ?? channelId.value,
    topic: `${ws?.name ?? ''} · 频道占位`,
    memberCount: 8,
    stack: [
      { label: ws?.name?.[0] ?? '?', color: '#5a7a8a' }
    ]
  }
})

const effectiveMeta = computed(() => scenario.value?.meta ?? fallbackMeta.value)
</script>

<style scoped>
.channel-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ops-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  color: var(--text-3);
  gap: 8px;
}
.ops-placeholder-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.ops-placeholder h3 {
  font-family: var(--font-heading);
  font-size: var(--fs-300);
  font-weight: var(--fw-bold);
  color: var(--text);
  margin: 0;
}
.ops-placeholder p {
  font-size: var(--fs-100);
  max-width: 360px;
  margin: 0;
}
.ops-placeholder-hint {
  color: var(--text-dim);
  font-size: var(--fs-75);
  margin-top: 12px !important;
}
</style>
