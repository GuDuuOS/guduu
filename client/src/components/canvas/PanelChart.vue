<template>
  <!-- 数据看板里的单张图表面板：标题 +（可选 LIVE 角标）+ canvas 画布 -->
  <div class="panel">
    <div class="pt">
      <slot name="title">{{ title }}</slot>
      <span v-if="live" class="live">LIVE</span>
    </div>
    <div :style="`height:${height ?? 220}px;position:relative`">
      <canvas ref="canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import { useChart } from '@/composables/useChart'

const props = defineProps<{
  title?: string
  /** 图表配置工厂：接收 2D 上下文、返回 chart.js 配置（来自 dashboards.ts 的 ChartSpec.build）*/
  config: (ctx: CanvasRenderingContext2D) => ChartConfiguration
  live?: boolean
  height?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
useChart(canvas, (ctx) => props.config(ctx))
</script>
