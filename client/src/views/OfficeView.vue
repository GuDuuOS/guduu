<template>
  <div class="channel-view">
    <ChannelHeader
      title="文案-脚本工坊"
      topic="标题 / 脚本 / 长文 / 复盘 · 接入你的爆款素材库 328 条"
      :stack="stack"
      :member-count="5"
    />
    <MessageStream :days="days" />
    <Composer channel-label="# 文案-脚本工坊" placeholder="@文案Agent 起草 / 修改 / 润色..." />
  </div>
</template>

<script setup lang="ts">
import ChannelHeader from '@/components/channel/ChannelHeader.vue'
import MessageStream from '@/components/channel/MessageStream.vue'
import Composer from '@/components/channel/Composer.vue'
import { officeMessages } from '@/data/messages/office'

const days = officeMessages

const stack = [
  { label: '文', bot: true },
  { label: '雨', color: '#7a5a3a' }
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
