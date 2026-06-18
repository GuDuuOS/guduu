<template>
  <div v-if="editorOpen" class="cam-overlay" @click.self="closeEditor">
    <div class="cam-modal" role="dialog" aria-modal="true" style="height:auto;max-height:calc(100vh - 120px)">
      <div class="cam-head">
        <span class="cam-title">数据源编辑</span>
        <span class="cam-sub">{{ boardLabel }} · 数据源配置</span>
        <button class="cam-close" title="关闭" @click="closeEditor">×</button>
      </div>

      <div class="cam-body">
        <!-- 已配置的数据源 -->
        <div v-for="(s, i) in list" :key="'bs' + i" class="cam-row">
          <div class="cam-row-main">
            <div class="cam-row-label">{{ s.name }}<span class="cam-tag">{{ s.type }}</span></div>
            <div v-if="s.note" class="cam-row-desc">{{ s.note }}</div>
          </div>
          <button class="cam-del" title="移除" @click="removeSource(editorBoard, i)">×</button>
        </div>
        <p v-if="!list.length" class="cam-row-desc" style="padding:8px 2px">还没有数据源 —— 在下方添加，会自动保存到本工作区。</p>

        <!-- 添加表单 -->
        <div class="cam-add">
          <input v-model="nName" class="cam-input" placeholder="数据源名称（如 抖音创作者后台）" @keyup.enter="doAdd" />
          <select v-model="nType" class="cam-select cam-select-sm">
            <option v-for="t in BOARD_SOURCE_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
          <input v-model="nNote" class="cam-input" placeholder="连接说明 / 备注（可选）" @keyup.enter="doAdd" />
          <button class="cam-add-btn" :disabled="!nName.trim()" @click="doAdd">＋ 添加</button>
        </div>
        <div class="cam-help" :style="saveHintStyle">{{ saveHint }}</div>
        <div class="cam-help">数据源目前是配置占位（名称 / 类型 / 备注），按本工作区保存、多端同步。真实取数据以后接。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
// 复用「频道管理」弹窗那套 .cam-* 样式（main.ts 不加载整包 index.css，组件自带）
import '@/styles/admin-modal.css'
import {
  useBoardSources,
  BOARD_SOURCE_TYPES,
  BOARD_LABELS,
} from '@/composables/useBoardSources'

const {
  sources, saveState, editorOpen, editorBoard, closeEditor, addSource, removeSource,
} = useBoardSources()

const list = computed(() => sources[editorBoard.value])
const boardLabel = computed(() => BOARD_LABELS[editorBoard.value])

const nName = ref('')
const nType = ref(BOARD_SOURCE_TYPES[0])
const nNote = ref('')
function doAdd() {
  if (!nName.value.trim()) return
  addSource(editorBoard.value, { name: nName.value, type: nType.value, note: nNote.value })
  nName.value = ''
  nNote.value = ''
}

const saveHint = computed(() => ({
  idle: '编辑后自动保存到本工作区 · 多端同步',
  saving: '保存中…',
  saved: '✓ 已保存到本工作区 · 多端同步',
  error: '保存失败：你可能没有本工作区修改配置的权限',
}[saveState.value]))
const saveHintStyle = computed(() => (saveState.value === 'error' ? 'color:#b94a4a' : ''))

function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && editorOpen.value) closeEditor() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
