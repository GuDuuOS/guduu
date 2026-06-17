<template>
  <div class="channel-view">
    <ChannelHeader
      title="数据-增长复盘"
      topic="AI 数据诊断 · 增长建议 · 本月涨粉 +12,480"
      :stack="stack"
      :member-count="4"
    />
    <MessageStream :days="days" />
    <Composer channel-label="# 数据-增长复盘" placeholder="@数据Agent 帮我..." />
  </div>
</template>

<script setup lang="ts">
import ChannelHeader from '@/components/channel/ChannelHeader.vue'
import MessageStream from '@/components/channel/MessageStream.vue'
import Composer from '@/components/channel/Composer.vue'
import { energyMessages } from '@/data/messages/energy'

const days = energyMessages

const stack = [
  { label: '数', bot: true },
  { label: '雨', color: '#7a5a3a' },
  { label: '文', bot: true }
]
</script>

<style scoped>
.channel-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
