<template>
  <div v-if="visible" class="ca-overlay" @click.self="close">
    <div class="ca-modal" role="dialog" aria-modal="true">
      <div class="ca-head">
        <div class="ca-title-wrap">
          <span class="ca-title">资产 · 自定义配置</span>
          <span class="ca-sub">管理你自己的 Agent / Skill / Prompt / 工作流，随处复用</span>
        </div>
        <button class="ca-close" title="关闭" @click="close">×</button>
      </div>

      <div class="ca-cats">
        <button
          v-for="c in ASSET_CATS"
          :key="c.key"
          class="ca-cat"
          :class="{ active: active === c.key }"
          @click="active = c.key"
        >
          <span class="ca-dot" :style="{ background: c.color }" />
          {{ c.label }}
          <span class="ca-cat-n">{{ countOf(c.key) }}</span>
        </button>
      </div>

      <div ref="bodyEl" class="ca-body">
        <div class="ca-toolbar">
          <span class="ca-hint">{{ list.length }} 个自定义{{ meta.label }}</span>
          <button class="ca-add" @click="onAdd">＋ 新建{{ meta.label }}</button>
        </div>

        <div v-if="list.length" class="ca-list">
          <div
            v-for="a in list"
            :key="a.id"
            class="ca-card"
            :class="{ off: !a.enabled }"
            :data-asset="a.id"
          >
            <div class="ca-card-top">
              <span class="ca-badge" :style="{ background: meta.color }">{{ meta.label }}</span>
              <input
                v-model="a.name"
                class="ca-name-input"
                :placeholder="`${meta.label}名称`"
              />
              <button
                class="ca-switch"
                :class="{ on: a.enabled }"
                :title="a.enabled ? '已启用' : '已停用'"
                @click="toggle(a.id)"
              >
                <span class="ca-knob" />
              </button>
              <button class="ca-del" title="删除" @click="remove(a.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>

            <input v-model="a.desc" class="ca-desc-input" placeholder="一句话描述（列表里展示）" />

            <input
              v-if="meta.hasTag"
              v-model="a.tag"
              class="ca-tag-input"
              :placeholder="meta.tagPlaceholder"
            />

            <label class="ca-field-label">{{ meta.bodyLabel }}</label>
            <textarea
              v-model="a.body"
              class="ca-body-input"
              :placeholder="meta.bodyPlaceholder"
              rows="4"
            />
          </div>
        </div>

        <div v-else class="ca-empty">
          还没有自定义{{ meta.label }}，点上方「＋ 新建{{ meta.label }}」创建一个。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCustomAssets, type AssetCat } from '@/composables/useCustomAssets'

const { visible, close, ASSET_CATS, countOf, listOf, add, remove, toggle } = useCustomAssets()

const active = ref<AssetCat>('agent')
const bodyEl = ref<HTMLElement>()

const meta = computed(() => ASSET_CATS.find((c) => c.key === active.value) ?? ASSET_CATS[0])
const list = computed(() => listOf(active.value))

function onAdd() {
  const id = add(active.value)
  nextTick(() => {
    const input = bodyEl.value?.querySelector<HTMLInputElement>(`[data-asset="${id}"] .ca-name-input`)
    input?.focus()
    input?.scrollIntoView({ block: 'nearest' })
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.ca-overlay {
  position: fixed;
  inset: 0;
  z-index: 210;
  background: rgba(0, 0, 0, 0.34);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ca-fade 0.14s ease;
}
@keyframes ca-fade { from { opacity: 0 } to { opacity: 1 } }

.ca-modal {
  width: min(880px, 94vw);
  height: min(720px, 90vh);
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-radius: 16px;
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.24), 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: ca-pop 0.16s ease;
}
@keyframes ca-pop { from { opacity: 0; transform: translateY(10px) scale(0.985) } to { opacity: 1; transform: none } }

.ca-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.ca-title-wrap { display: flex; flex-direction: column; gap: 2px; }
.ca-title { font-family: var(--font-heading); font-weight: var(--fw-bold); font-size: var(--fs-400); color: var(--text); }
.ca-sub { font-size: var(--fs-75); color: var(--text-3); }
.ca-close {
  margin-left: auto;
  width: 30px; height: 30px;
  border: none; background: transparent;
  font-size: 22px; line-height: 1;
  color: var(--text-3); cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s ease, color 0.12s ease;
}
.ca-close:hover { background: var(--bg-hover); color: var(--text); }

.ca-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}
.ca-cat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font-size: var(--fs-75);
  color: var(--text-2);
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.ca-cat:hover { background: var(--bg-soft); }
.ca-cat.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.ca-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ca-cat.active .ca-dot { box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6); }
.ca-cat-n { font-family: var(--mono); font-size: 10px; opacity: 0.7; }

.ca-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px 22px; }

.ca-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ca-hint { font-size: var(--fs-75); color: var(--text-3); }
.ca-add {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
  font-size: var(--fs-75);
  font-weight: var(--fw-bold);
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: filter 0.12s ease;
}
.ca-add:hover { filter: brightness(1.05); }

.ca-list { display: flex; flex-direction: column; gap: 14px; }

.ca-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-panel);
  transition: border-color 0.12s ease, opacity 0.12s ease;
}
.ca-card:focus-within { border-color: var(--accent); }
.ca-card.off { opacity: 0.55; }

.ca-card-top { display: flex; align-items: center; gap: 10px; }
.ca-badge { font-size: 10px; color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: var(--fw-bold); flex-shrink: 0; }

.ca-name-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-heading);
  font-weight: var(--fw-bold);
  font-size: var(--fs-200);
  color: var(--text);
  padding: 2px 0;
}
.ca-name-input::placeholder { color: var(--text-dim); font-weight: var(--fw-regular); }

.ca-desc-input,
.ca-tag-input,
.ca-body-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-soft);
  outline: none;
  font-family: var(--sans);
  font-size: var(--fs-75);
  color: var(--text);
  padding: 7px 10px;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.ca-desc-input:focus,
.ca-tag-input:focus,
.ca-body-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.ca-tag-input { font-family: var(--mono); color: var(--accent); max-width: 240px; }
.ca-body-input { resize: vertical; line-height: 1.55; }
.ca-desc-input::placeholder,
.ca-tag-input::placeholder,
.ca-body-input::placeholder { color: var(--text-dim); }

.ca-field-label {
  font-size: var(--fs-50);
  color: var(--text-3);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 2px;
}

/* 启用开关 */
.ca-switch {
  flex-shrink: 0;
  width: 34px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: var(--bg-active);
  position: relative;
  cursor: pointer;
  transition: background 0.14s ease;
}
.ca-switch.on { background: var(--ok); }
.ca-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.14s ease;
}
.ca-switch.on .ca-knob { transform: translateX(16px); }

.ca-del {
  flex-shrink: 0;
  width: 28px; height: 28px;
  border: none;
  background: transparent;
  color: var(--text-3);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.ca-del:hover { background: var(--accent-soft); color: var(--danger); }

.ca-empty { text-align: center; color: var(--text-3); padding: 56px 0; font-size: var(--fs-100); }
</style>
