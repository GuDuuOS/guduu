<template>
  <div class="choice-card">
    <p class="choice-q">{{ card.question }}</p>
    <div class="choice-opts">
      <button
        v-for="(o, i) in opts" :key="i"
        class="choice-opt"
        :class="{ chip: card.multi, on: card.multi && sel.includes(o.value) }"
        :disabled="done"
        @click="card.multi ? toggle(o.value) : pick(o.value)"
      >{{ o.label }}</button>
    </div>
    <div v-if="card.multi && !done" class="choice-foot">
      <button class="choice-confirm" :disabled="!sel.length" @click="confirm">确定（{{ sel.length }}）</button>
    </div>
    <p v-if="done" class="choice-done">已选择 ✓</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 选择卡（主 AI 调 ask_user_choice 发来的 cosmac.card{kind:'choice'}）：渲染成可点选项，
// 点选后 emit('pick', 文本)，由父组件作为用户消息发回房间、对话继续。单选点即发；多选选完点确定。
const props = defineProps<{ card: any }>()
const emit = defineEmits<{ (e: 'pick', text: string): void }>()

const sel = ref<string[]>([])
const done = ref(false)
const opts = computed(() =>
  Array.isArray(props.card?.options) ? props.card.options : [],
)

function toggle(v: string) {
  const i = sel.value.indexOf(v)
  if (i < 0) sel.value.push(v)
  else sel.value.splice(i, 1)
}
function pick(v: string) {
  if (done.value) return
  done.value = true
  emit('pick', v)
}
function confirm() {
  if (done.value || !sel.value.length) return
  done.value = true
  emit('pick', sel.value.join('、'))
}
</script>

<style scoped>
.choice-card { border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; background: var(--bg-soft); max-width: 420px; }
.choice-q { margin: 0 0 10px; font-size: var(--fs-100); color: var(--text); font-weight: var(--fw-bold); line-height: 1.45; }
.choice-opts { display: flex; flex-wrap: wrap; gap: 8px; }
.choice-opt {
  border: 1px solid var(--border); background: var(--bg-panel); color: var(--text);
  padding: 7px 14px; border-radius: 9px; cursor: pointer; font-size: var(--fs-75);
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.choice-opt:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.choice-opt.chip { border-radius: 999px; }
.choice-opt.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.choice-opt:disabled { opacity: 0.55; cursor: default; }
.choice-foot { margin-top: 10px; }
.choice-confirm {
  border: none; background: var(--accent); color: #fff; padding: 7px 16px;
  border-radius: 8px; cursor: pointer; font-size: var(--fs-75); font-weight: var(--fw-bold);
}
.choice-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.choice-done { margin: 10px 0 0; font-size: var(--fs-75); color: var(--text-3); }
</style>
