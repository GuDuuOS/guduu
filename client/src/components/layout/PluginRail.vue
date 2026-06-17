<template>
  <div class="plugin-rail">
    <div class="pr-list">
      <div
        v-for="p in plugins"
        :key="p.id"
        class="pr-icon"
        :class="{ active: activeId === p.id, 'has-image': !!p.image, 'has-color': !p.image && !!p.color }"
        :style="!p.image && p.color ? { background: p.color, color: '#fff' } : undefined"
        :title="p.title"
        @click="toggle(p.id)"
      >
        <img v-if="p.image" :src="p.image" :alt="p.title" class="pr-img" />
        <span v-else>{{ p.label }}</span>
      </div>

      <!-- 新增插件：紧跟在机器人下方 → 打开插件商城 -->
      <div class="pr-icon plus" title="添加插件" @click="openPluginStore">+</div>
    </div>

    <div class="pr-divider" />

    <div class="pr-icon assets" title="资产 · 自定义配置" @click="openAssets">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
    <div class="pr-icon gear" title="插件商城" @click="openPluginStore">⚙</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlugins } from '@/composables/usePlugins'
import { useAiPanel } from '@/composables/useAiPanel'
import { usePluginStore } from '@/composables/usePluginStore'
import { useCustomAssets } from '@/composables/useCustomAssets'

const { plugins } = usePlugins()
const { visible: aiVisible, toggle: toggleAi, show: showAi } = useAiPanel()
const { open: openPluginStore } = usePluginStore()
const { open: openAssets } = useCustomAssets()

/** 当前激活的插件 id：AI 打开时为 'ai'，否则为 null */
const activeId = computed(() => (aiVisible.value ? 'ai' : null))

function toggle(id: string) {
  // 内置 AI：切换助手面板；其它已获取的插件：打开助手面板（代表使用该插件）
  if (id === 'ai') toggleAi()
  else showAi()
}
</script>
