<template>
  <div class="rich" :class="data.variant">
    <div class="r-head">
      <span class="tag">{{ data.tag }}</span>
      <span class="t">{{ data.title }}</span>
      <span v-if="data.meta" class="r-meta">{{ data.meta }}</span>
    </div>

    <p v-if="data.paragraph" v-html="data.paragraph" />

    <div v-if="data.kv && data.kv.length" class="kv">
      <template v-for="(kv, i) in data.kv" :key="i">
        <div class="k">{{ kv.k }}</div>
        <div class="v">{{ kv.v }}</div>
      </template>
    </div>

    <CCTVFrame v-if="data.cctv" :data="data.cctv" />

    <div v-if="data.actions && data.actions.length" class="actions">
      <button
        v-for="(a, i) in data.actions"
        :key="i"
        class="btn"
        :class="{ primary: a.primary }"
        @click="onAction(a.label)"
      >
        {{ a.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RichCardData } from '@/types/message'
import CCTVFrame from './CCTVFrame.vue'
import { useCardAction } from '@/composables/useCardAction'

const props = defineProps<{ data: RichCardData }>()
const { open, resolveAction } = useCardAction()

function onAction(label: string) {
  open(
    resolveAction(label, {
      tag: props.data.tag,
      title: props.data.title,
      meta: props.data.meta,
      variant: props.data.variant,
      kv: props.data.kv
    })
  )
}
</script>
