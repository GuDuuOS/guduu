<template>
  <!-- 状态网格：各剧集 / 虚拟明星 / 平台的一句话状态卡片 -->
  <div class="unit-grid">
    <div
      v-for="u in units"
      :key="u.name"
      class="unit"
      :class="{ warn: u.warn }"
      @click="emit('select', u)"
    >
      <div class="un">{{ u.name }}</div>
      <div class="us">{{ u.status }}</div>
      <div class="ul" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UnitStatus } from '@/data/kpi'

defineProps<{ units: UnitStatus[] }>()
const emit = defineEmits<{ (e: 'select', unit: UnitStatus): void }>()
</script>
