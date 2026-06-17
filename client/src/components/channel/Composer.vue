<template>
  <div class="composer">
    <!-- Slash 命令面板 -->
    <div v-if="commands && commands.length" class="slash-pop" :class="{ show: showSlash }">
      <div class="sh">SLASH COMMANDS</div>
      <div
        v-for="(c, i) in commands"
        :key="c.cmd"
        class="si"
        :class="{ act: i === 0 }"
        @mousedown.prevent="pickCommand(c.cmd)"
      >
        <span class="cmd">{{ c.cmd }}</span>
        <span class="desc">{{ c.desc }}</span>
      </div>
    </div>

    <!-- AI 辅助面板 -->
    <div v-if="ai.state.panel !== 'closed'" class="ai-assist-pop" @keydown.esc="ai.close()">
      <div class="aa-head">
        <span class="aa-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5 13.9 11.4 12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.95 2.8L22.75 16.75l-2.8.95L19 20.5l-.95-2.8L15.25 16.75l2.8-.95L19 13z"/></svg>
          AI 辅助<template v-if="ai.state.action"> · {{ ai.state.action.label }}</template>
        </span>
        <button class="aa-close" title="关闭" @click="ai.close()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- 动作菜单 -->
      <div v-if="ai.state.panel === 'menu'" class="aa-actions">
        <button
          v-for="a in ai.assistActions"
          :key="a.id"
          class="aa-act"
          :disabled="a.needsText && !text.trim()"
          @click="ai.run(a, text)"
        >
          <span class="aa-act-label">{{ a.label }}</span>
          <span class="aa-act-hint">{{ a.hint }}</span>
        </button>
      </div>

      <!-- 思考态 -->
      <ul v-else-if="ai.state.panel === 'thinking'" class="aa-steps">
        <li
          v-for="(s, i) in ai.state.steps"
          :key="i"
          :class="{ done: s.done, in: !s.done && (i === 0 || ai.state.steps[i - 1].done) }"
        >
          {{ s.label }}
        </li>
      </ul>

      <!-- 结果预览 -->
      <div v-else class="aa-result">
        <pre class="aa-out">{{ ai.state.result }}</pre>
        <div class="aa-foot">
          <button class="aa-btn primary" @click="applyResult">应用</button>
          <button class="aa-btn" @click="insertResult">插入到末尾</button>
          <button class="aa-btn" @click="ai.regenerate()">重新生成</button>
          <button class="aa-btn ghost" @click="ai.close()">放弃</button>
        </div>
      </div>
    </div>

    <div class="composer-box">
      <textarea
        ref="taRef"
        v-model="text"
        :placeholder="placeholder ?? `发送到${channelLabel}`"
        @input="onInput"
        @blur="onBlur"
        @keydown.esc="ai.close()"
        @keydown.enter.exact.prevent="onSend"
      />
      <div class="composer-toolbar">
        <div class="tb-left">
          <button
            class="tb-btn tb-ai"
            :class="{ active: ai.state.panel !== 'closed' }"
            title="AI 辅助"
            @click="toggleAi"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5 13.9 11.4 12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.95 2.8L22.75 16.75l-2.8.95L19 20.5l-.95-2.8L15.25 16.75l2.8-.95L19 13z"/></svg>
            <span>AI</span>
          </button>
          <span class="tb-sep" />
          <button class="tb-btn" title="加粗" @click="onBold"><b style="font-family:var(--serif)">B</b></button>
          <button class="tb-btn" title="斜体" @click="onItalic"><i style="font-family:var(--serif)">I</i></button>
          <button class="tb-btn" title="删除线" @click="onStrike"><s>S</s></button>
          <button class="tb-btn tb-heading" title="标题" @click="onHeading">H</button>
          <span class="tb-sep" />
          <button class="tb-btn" title="链接" @click="onLink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button class="tb-btn" title="代码" @click="onCode">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button class="tb-btn" title="引用" @click="onQuote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7v6H4V9c0-1.1.9-2 2-2h1Zm10 0v6h-3V9c0-1.1.9-2 2-2h1Z"/></svg>
          </button>
          <button class="tb-btn" title="无序列表" @click="onUl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button class="tb-btn" title="有序列表" @click="onOl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </button>
          <button class="tb-btn" title="提醒" @click="onReminder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </button>
          <button class="tb-btn" title="语音" @click="onVoice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="6" height="11" x="9" y="2" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
            </svg>
          </button>
          <button class="tb-btn" title="@提及" @click="onMention">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
            </svg>
          </button>
        </div>
        <div class="tb-right">
          <button class="tb-btn" title="字号" @click="onFontSize">
            <span style="font-family:var(--serif);font-weight:600">Aa</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:2px"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button class="tb-btn" title="附件" @click="onAttach">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8L9.41 17.32a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <button class="tb-btn" title="表情" @click="onEmoji">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
          </button>
          <button class="send" :disabled="!text.trim()" title="发送 (Enter)" aria-label="发送" @click="onSend">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2 11 13"/>
              <path d="M22 2 15 22l-4-9-9-4Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { SlashCommand } from '@/data/messages/duu'
import { useComposerAi } from '@/composables/useComposerAi'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  channelLabel: string
  placeholder?: string
  enableEmoji?: boolean
  commands?: SlashCommand[]
}>()

const text = ref('')
const showSlash = ref(false)
const taRef = ref<HTMLTextAreaElement>()
const ai = useComposerAi()
const { success, toast } = useToast()

/** 在选区前后包裹 before/after；无选区时插入占位文字并选中 */
function wrap(before: string, after: string, placeholder: string): void {
  const ta = taRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const value = text.value
  const selected = value.slice(start, end)
  const inner = selected || placeholder
  text.value = value.slice(0, start) + before + inner + after + value.slice(end)
  const innerStart = start + before.length
  const innerEnd = innerStart + inner.length
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(innerStart, innerEnd)
  })
}

/** 在当前行行首插入 prefix（如 "## "、"> "、"- "、"1. "） */
function prefixLine(prefix: string): void {
  const ta = taRef.value
  if (!ta) return
  const start = ta.selectionStart
  const value = text.value
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  text.value = value.slice(0, lineStart) + prefix + value.slice(lineStart)
  const caret = start + prefix.length
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(caret, caret)
  })
}

/** 在光标处插入一段文本（如 "@"），保持焦点 */
function insertText(s: string): void {
  const ta = taRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const value = text.value
  text.value = value.slice(0, start) + s + value.slice(end)
  const caret = start + s.length
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(caret, caret)
  })
}

function onBold(): void {
  wrap('**', '**', '加粗文字')
}
function onItalic(): void {
  wrap('*', '*', '斜体文字')
}
function onStrike(): void {
  wrap('~~', '~~', '删除线文字')
}
function onHeading(): void {
  prefixLine('## ')
}
function onLink(): void {
  wrap('[', '](url)', '链接文字')
}
function onCode(): void {
  const ta = taRef.value
  if (!ta) return
  // 选区跨行 → 代码块；否则行内代码
  const selected = text.value.slice(ta.selectionStart, ta.selectionEnd)
  if (selected.includes('\n')) wrap('```\n', '\n```', '代码块')
  else wrap('`', '`', '代码')
}
function onQuote(): void {
  prefixLine('> ')
}
function onUl(): void {
  prefixLine('- ')
}
function onOl(): void {
  prefixLine('1. ')
}
function onMention(): void {
  insertText('@')
  toast('@ 提及', '可 @ 成员或 @ 某个 Agent（演示）')
}
function onFontSize(): void {
  toast('字号')
}
function onAttach(): void {
  toast('📎 选择附件', '支持图片 / 视频 / 文档（演示）')
}
function onEmoji(): void {
  toast('😊 表情')
}
function onVoice(): void {
  toast('🎤 语音输入（演示）')
}
function onReminder(): void {
  toast('⏰ 设置提醒')
}

function onSend(): void {
  if (showSlash.value) return
  if (!text.value.trim()) return
  const preview = text.value.slice(0, 24) + (text.value.length > 24 ? '…' : '')
  success('已发送', preview)
  text.value = ''
  ai.close()
  nextTick(() => taRef.value?.focus())
}

function onInput() {
  if (text.value.startsWith('/')) ai.close()
  if (!props.commands || !props.commands.length) return
  showSlash.value = text.value.startsWith('/')
}

function onBlur() {
  setTimeout(() => (showSlash.value = false), 200)
}

function pickCommand(cmd: string) {
  text.value = cmd + ' '
  showSlash.value = false
}

function toggleAi() {
  if (ai.state.panel === 'closed') {
    showSlash.value = false
    ai.openMenu()
  } else {
    ai.close()
  }
}

function focusTextarea() {
  nextTick(() => taRef.value?.focus())
}

function applyResult() {
  text.value = ai.state.result
  ai.close()
  focusTextarea()
}

function insertResult() {
  const base = text.value.trimEnd()
  text.value = base ? `${base}\n${ai.state.result}` : ai.state.result
  ai.close()
  focusTextarea()
}
</script>
