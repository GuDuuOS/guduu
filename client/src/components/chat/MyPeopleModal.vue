<template>
  <div v-if="visible" class="mp-overlay" @click.self="close">
    <div class="mp-modal" role="dialog" aria-modal="true">
      <div class="mp-head">
        <div class="mp-title-wrap">
          <span class="mp-title">我的协作人</span>
          <span class="mp-sub">给你常合作的人加上"擅长什么" · 主 AI 帮你拆任务/建专班时会按能力把活派给 TA</span>
        </div>
        <button class="mp-close" title="关闭" @click="close">×</button>
      </div>

      <div class="mp-body">
        <!-- 编辑/新增表单 -->
        <div v-if="editing" class="mp-edit">
          <input v-model.trim="form.user_id" class="mp-input" :disabled="busy"
            placeholder="用户名或 @用户名（如 wenan / @wenan:cosmac.cc）" />
          <div class="mp-row">
            <input v-model.trim="form.name" class="mp-input" placeholder="显示名（可空）" />
            <input v-model.trim="form.role" class="mp-input" placeholder="角色 / 岗位" />
          </div>
          <textarea v-model="form.expertise" class="mp-textarea" rows="3"
            placeholder="擅长什么（主 AI 据此匹配），如：小红书种草文案、爆款标题…" />
          <input v-model.trim="form.note" class="mp-input" placeholder="补充备注（可空）" />
          <label class="mp-chk"><input type="checkbox" v-model="form.enabled" /> 启用（参与 AI 派单）</label>
          <div class="mp-bar">
            <button class="mp-btn ghost" :disabled="busy" @click="editing = false">取消</button>
            <button class="mp-btn" :disabled="busy || !form.user_id.trim()" @click="save">{{ busy ? '保存中…' : '保存' }}</button>
          </div>
        </div>

        <div v-else class="mp-toolbar">
          <span class="mp-hint">{{ people.length }} 位协作人</span>
          <button class="mp-btn" @click="startAdd">＋ 添加协作人</button>
        </div>

        <ul v-if="people.length" class="mp-list">
          <li v-for="p in people" :key="p.user_id" class="mp-item" :class="{ off: !p.enabled }">
            <div class="mp-item-main">
              <div class="mp-item-top"><b>{{ p.name || p.user_id }}</b><span class="mp-role" v-if="p.role">{{ p.role }}</span></div>
              <div class="mp-item-uid">{{ p.user_id }}</div>
              <div class="mp-item-exp" v-if="p.expertise">{{ p.expertise }}</div>
            </div>
            <div class="mp-item-act">
              <button class="mp-mini" :disabled="busy" @click="startEdit(p)">编辑</button>
              <button class="mp-mini danger" :disabled="busy" @click="remove(p.user_id)">移除</button>
            </div>
          </li>
        </ul>
        <div v-else-if="!editing" class="mp-empty">还没有协作人。点「添加协作人」把你常合作的人加进来。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMyPeople } from '@/composables/useMyPeople'
const { visible, people, busy, editing, form, close, startAdd, startEdit, save, remove } = useMyPeople()
</script>

<style scoped>
.mp-overlay { position: fixed; inset: 0; z-index: 210; background: rgba(0,0,0,0.34); display: flex; align-items: center; justify-content: center; }
.mp-modal { width: min(560px, 94vw); height: min(660px, 90vh); display: flex; flex-direction: column; background: var(--bg-panel); border-radius: 16px; box-shadow: 0 28px 72px rgba(0,0,0,0.24); overflow: hidden; }
.mp-head { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.mp-title-wrap { display: flex; flex-direction: column; gap: 2px; }
.mp-title { font-family: var(--font-heading); font-weight: var(--fw-bold); font-size: var(--fs-400); color: var(--text); }
.mp-sub { font-size: var(--fs-75); color: var(--text-3); }
.mp-close { margin-left: auto; width: 30px; height: 30px; border: none; background: transparent; font-size: 22px; color: var(--text-3); cursor: pointer; border-radius: 6px; }
.mp-close:hover { background: var(--bg-hover); color: var(--text); }
.mp-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.mp-edit { display: flex; flex-direction: column; gap: 8px; }
.mp-row { display: flex; gap: 8px; }
.mp-input, .mp-textarea { width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid var(--border); border-radius: 9px; background: var(--bg-soft); color: var(--text); font-size: var(--fs-100); font-family: inherit; }
.mp-textarea { resize: vertical; line-height: 1.5; }
.mp-input:focus, .mp-textarea:focus { outline: none; border-color: var(--accent); }
.mp-chk { font-size: var(--fs-75); color: var(--text-2); display: flex; align-items: center; gap: 6px; }
.mp-bar { display: flex; justify-content: flex-end; gap: 8px; }
.mp-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.mp-hint { font-size: var(--fs-75); color: var(--text-3); }
.mp-btn { padding: 7px 16px; border: none; border-radius: 8px; background: var(--accent); color: #fff; cursor: pointer; font-size: var(--fs-75); font-weight: var(--fw-bold); }
.mp-btn.ghost { background: transparent; color: var(--text-2); border: 1px solid var(--border); }
.mp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.mp-item { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-soft); }
.mp-item.off { opacity: 0.55; }
.mp-item-main { flex: 1; min-width: 0; }
.mp-item-top { display: flex; align-items: center; gap: 8px; }
.mp-role { font-size: var(--fs-75); color: var(--accent); background: var(--bg-panel); border-radius: 999px; padding: 1px 8px; }
.mp-item-uid { font-size: var(--fs-75); color: var(--text-3); margin-top: 2px; }
.mp-item-exp { font-size: var(--fs-75); color: var(--text-2); margin-top: 4px; line-height: 1.4; }
.mp-item-act { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.mp-mini { border: 1px solid var(--border); background: transparent; color: var(--text-2); padding: 3px 10px; border-radius: 6px; cursor: pointer; font-size: var(--fs-75); }
.mp-mini.danger:hover { color: #c0392b; }
.mp-empty { padding: 30px 12px; text-align: center; color: var(--text-3); font-size: var(--fs-75); }
</style>
