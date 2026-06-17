<template>
  <Teleport to="body">
    <div class="toast-host">
      <TransitionGroup name="toast">
        <div
          v-for="t in items"
          :key="t.id"
          class="toast"
          :class="t.kind"
          @click="dismiss(t.id)"
        >
          <span class="toast-ic">
            <!-- success -->
            <svg v-if="t.kind === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <!-- warn -->
            <svg v-else-if="t.kind === 'warn'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <!-- info -->
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <div class="toast-tx">
            <div class="toast-t">{{ t.text }}</div>
            <div v-if="t.desc" class="toast-d">{{ t.desc }}</div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { items, dismiss } = useToast()
</script>

<style scoped>
.toast-host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 230px;
  max-width: 360px;
  padding: 11px 14px;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  cursor: pointer;
}
.toast-ic {
  flex-shrink: 0;
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.toast.success .toast-ic { color: #fff; background: var(--ok, #6b8e4e); }
.toast.warn .toast-ic { color: #fff; background: var(--danger, #c0563f); }
.toast.info .toast-ic { color: #fff; background: var(--accent, #c96442); }
.toast-tx { min-width: 0; }
.toast-t { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); line-height: 1.35; }
.toast-d { font-size: var(--fs-75); color: var(--text-3); margin-top: 2px; line-height: 1.4; }

.toast-enter-active, .toast-leave-active { transition: all 0.26s cubic-bezier(0.22, 1, 0.36, 1); }
.toast-enter-from { opacity: 0; transform: translateX(20px) scale(0.96); }
.toast-leave-to { opacity: 0; transform: translateX(20px) scale(0.96); }
.toast-leave-active { position: absolute; }
</style>
