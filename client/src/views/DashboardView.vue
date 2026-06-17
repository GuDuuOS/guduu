<template>
  <div class="channel-view">
    <ChannelHeader
      :title="dash.title"
      :topic="dash.topic"
      :stack="headerStack"
      :member-count="24"
    />

    <div class="canvas">
      <div class="ctitle">{{ dash.brand }}</div>
      <div class="csub">// REAL-TIME OPERATIONAL CANVAS · 由 CosMac Star 自动维护</div>

      <CommandCenter />

      <div class="kpis">
        <KpiCard
          v-for="(k, i) in dash.kpis"
          :key="activeId + k.label"
          :data="k"
          :delay="200 + i * 80"
          class="clickable"
          @click="detail.openKpi(k, dash)"
        />
      </div>

      <div class="grid-2">
        <PanelChart class="clickable" :key="activeId + 'prod'" :title="dash.prod.title" :config="dash.prod.build" :live="dash.prod.live" @click="detail.openChart(dash.prod, dash)" />
        <PanelChart class="clickable" :key="activeId + 'save'" :title="dash.save.title" :config="dash.save.build" @click="detail.openChart(dash.save, dash)" />
      </div>

      <div class="grid-3">
        <div class="panel" style="grid-column: span 2">
          <div class="pt">{{ dash.unitsTitle }} <span class="md-hint">· 点击查看明细</span></div>
          <UnitGrid :units="dash.units" @select="detail.openUnit($event, dash)" />
        </div>
        <PanelChart class="clickable" :key="activeId + 'pie'" :title="dash.pie.title" :config="dash.pie.build" :height="dash.pie.height ?? 180" @click="detail.openChart(dash.pie, dash)" />
      </div>

      <BizPanels />

      <!-- 成员可调取数据：由「频道管理 · 人员」勾选 -->
      <div v-if="memberData.length" class="panel md-panel">
        <div class="pt">成员可调取数据 <span class="md-hint">· 点击数据项查看明细 · 在「频道管理 · 人员」中勾选</span></div>
        <div class="md-grid">
          <div v-for="m in memberData" :key="m.name" class="md-card">
            <div class="md-head">
              <span class="md-ava" :class="{ bot: m.bot }" :style="m.color ? `background:${m.color}` : undefined">{{ m.avatar }}</span>
              <span class="md-name">{{ m.name }}</span>
              <span class="md-role">{{ m.role }}</span>
            </div>
            <div class="md-items">
              <div
                v-for="d in m.picked"
                :key="d.label"
                class="md-item clickable"
                :title="`查看「${d.label}」明细`"
                @click="detail.openMemberDatum(d, m, dash)"
              >
                <span class="md-v">{{ d.value }}</span>
                <span class="md-l">{{ d.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import ChannelHeader from '@/components/channel/ChannelHeader.vue'
import KpiCard from '@/components/canvas/KpiCard.vue'
import UnitGrid from '@/components/canvas/UnitGrid.vue'
import PanelChart from '@/components/canvas/PanelChart.vue'
import CommandCenter from '@/components/canvas/CommandCenter.vue'
import BizPanels from '@/components/canvas/BizPanels.vue'
import { getDashboard } from '@/data/dashboards'
import { useActiveWorkspace } from '@/composables/useActiveWorkspace'
import { useChannelAdmin } from '@/composables/useChannelAdmin'
import { useDashboardDetail } from '@/composables/useDashboardDetail'

const { activeId } = useActiveWorkspace()
const dash = computed(() => getDashboard(activeId.value))
const detail = useDashboardDetail()

/** 本群（即本驾驶舱）的成员可调取数据，随群独立 */
const { state: adminState, setCurrent } = useChannelAdmin()
watch(() => dash.value.title, (t) => setCurrent(t), { immediate: true })
const memberData = computed(() =>
  adminState.members
    .map((m) => ({ ...m, picked: m.data.filter((d) => d.selected) }))
    .filter((m) => m.picked.length > 0)
)

const headerStack = [
  { label: 'G', bot: true },
  { label: '题', bot: true },
  { label: '数', bot: true },
  { label: '雨', color: '#7a5a3a' },
  { label: '鹿', color: '#5a7a8a' }
]
</script>

<style scoped>
.channel-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 成员关注数据 */
.md-panel { margin-top: 14px; }
.md-hint { font-size: var(--fs-75); color: var(--text-3); font-weight: var(--fw-regular); }
.md-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.md-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--bg-panel);
}
.md-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.md-ava {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600;
  flex-shrink: 0;
}
.md-ava.bot { background: var(--text); }
.md-name { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); }
.md-role {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
}
.md-items { display: flex; flex-wrap: wrap; gap: 10px; }
.md-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 72px;
}
.md-item.clickable {
  cursor: pointer;
  padding: 6px 8px;
  margin: -6px -8px;
  border-radius: 8px;
  transition: background 0.12s ease, box-shadow 0.12s ease;
}
.md-item.clickable:hover {
  background: var(--bg-soft);
  box-shadow: inset 0 0 0 1px var(--border);
}
.md-v {
  font-family: var(--font-heading);
  font-size: var(--fs-300);
  line-height: 1.1;
  font-weight: var(--fw-bold);
  color: var(--text);
}
.md-l { font-size: var(--fs-75); color: var(--text-3); }
</style>
