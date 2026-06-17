<template>
  <div class="cctv">
    <div class="grid" />
    <div class="scan" />
    <div class="ts">{{ data.timestamp }}</div>
    <div class="cam">{{ data.camera }}</div>

    <!-- 罐区 + 工人 + 阀门示意 SVG（与原 Demo 一致） -->
    <svg width="100%" height="100%" viewBox="0 0 400 200" style="position: absolute; inset: 0">
      <ellipse cx="80" cy="160" rx="50" ry="8" fill="#3a342a" stroke="#5c5648" />
      <rect x="30" y="60" width="100" height="100" fill="#3a342a" stroke="#5c5648" />
      <ellipse cx="80" cy="60" rx="50" ry="8" fill="#4a4232" stroke="#5c5648" />
      <text x="60" y="115" fill="#8a8270" font-size="10" font-family="monospace">T-07</text>
      <!-- 人 -->
      <circle cx="240" cy="100" r="8" fill="#c98c66" />
      <rect x="232" y="108" width="16" height="34" fill="#5a7a8a" />
      <rect x="232" y="142" width="6" height="22" fill="#2c2a24" />
      <rect x="242" y="142" width="6" height="22" fill="#2c2a24" />
      <!-- 阀门 -->
      <circle cx="340" cy="130" r="12" fill="none" stroke="#5c5648" stroke-width="2" />
      <line x1="328" y1="130" x2="352" y2="130" stroke="#5c5648" stroke-width="2" />
      <line x1="340" y1="118" x2="340" y2="142" stroke="#5c5648" stroke-width="2" />
    </svg>

    <div
      v-for="(b, i) in data.boxes ?? []"
      :key="i"
      class="box"
      :data-l="b.label"
      :style="{ left: b.left, top: b.top, width: b.width, height: b.height }"
    />
  </div>
</template>

<script setup lang="ts">
import type { CCTVFrameData } from '@/types/message'

defineProps<{ data: CCTVFrameData }>()
</script>
