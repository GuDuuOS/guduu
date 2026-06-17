<template>
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
import { chartFactories } from '@/data/charts'

const props = defineProps<{
  title?: string
  /** 内置图表 id（从 chartFactories 取）*/
  chartId?: string
  /** 直接传入的图表配置工厂；优先于 chartId */
  config?: (ctx: CanvasRenderingContext2D) => ChartConfiguration
  live?: boolean
  height?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
useChart(canvas, (ctx) =>
  props.config ? props.config(ctx) : chartFactories[props.chartId!](ctx)
)
</script>
