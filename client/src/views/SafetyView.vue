<template>
  <div class="channel-view">
    <ChannelHeader
      title="选题-热点雷达"
      topic="全网热榜实时扫描 · 对标拆解 · 选题秒级入库"
      :stack="stack"
      :member-count="6"
    />
    <MessageStream :days="days" />
    <Composer
      channel-label="# 选题-热点雷达"
      placeholder="发消息到 #选题-热点雷达，或输入 / 调用 AI 命令..."
      enable-emoji
    />
  </div>
</template>

<script setup lang="ts">
import ChannelHeader from '@/components/channel/ChannelHeader.vue'
import MessageStream from '@/components/channel/MessageStream.vue'
import Composer from '@/components/channel/Composer.vue'
import { safetyMessages } from '@/data/messages/safety'

const days = safetyMessages

const stack = [
  { label: '题', bot: true },
  { label: '雨', color: '#7a5a3a' },
  { label: '鹿', color: '#5a7a8a' }
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
