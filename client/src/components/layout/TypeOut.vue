<template>
  <div class="typeout">{{ shown }}<span v-if="typing" class="typeout-cursor">▋</span></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

/**
 * Claude Code 式流式输出：把文字一个字一个字地"打"出来，带闪烁光标。
 * animate=false 时直接整段显示（用户消息、历史消息）。
 */
const props = withDefaults(defineProps<{
  text: string
  animate?: boolean
  /** 每字间隔（ms）*/
  speed?: number
}>(), { animate: true, speed: 14 })

const emit = defineEmits<{ (e: 'tick'): void; (e: 'done'): void }>()

const shown = ref(props.animate ? '' : props.text)
const typing = ref(false)
let timer: number | undefined

function clear() {
  if (timer !== undefined) { clearTimeout(timer); timer = undefined }
}

onMounted(() => {
  if (!props.animate) { emit('done'); return }
  typing.value = true
  let i = 0
  const full = props.text
  const step = () => {
    // 中文一次 1 字、英文一次 2 字，读起来更自然
    i += /[一-龥]/.test(full[i] ?? '') ? 1 : 2
    shown.value = full.slice(0, i)
    emit('tick')
    if (i < full.length) {
      timer = window.setTimeout(step, props.speed)
    } else {
      shown.value = full
      typing.value = false
      emit('done')
    }
  }
  timer = window.setTimeout(step, props.speed)
})

onBeforeUnmount(clear)
</script>

<style scoped>
.typeout { white-space: pre-wrap; }
.typeout-cursor {
  display: inline-block;
  margin-left: 1px;
  color: var(--accent);
  animation: typeout-blink 0.9s steps(1) infinite;
}
@keyframes typeout-blink { 50% { opacity: 0; } }
</style>
