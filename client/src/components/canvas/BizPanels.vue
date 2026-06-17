<template>
  <div class="bp">
    <!-- 核心业务模块 -->
    <div class="panel">
      <div class="pt">核心业务模块 <span class="bp-hint">· 点开即用</span></div>
      <div class="bp-mods">
        <div v-for="m in bizModules" :key="m.name" class="bp-mod">
          <span class="bp-mod-ic" :style="{ background: m.color }">{{ m.icon }}</span>
          <div class="bp-mod-tx">
            <div class="bp-mod-n">{{ m.name }}</div>
            <div class="bp-mod-d">{{ m.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bp-grid">
      <!-- 模型成本监控 -->
      <div class="panel">
        <div class="pt">模型成本监控 <span class="bp-hint">· 今日</span></div>
        <div class="bp-cost">
          <div class="bp-donut" :style="donutStyle">
            <div class="bp-donut-hole">
              <div class="bp-donut-v">¥ {{ modelCost.today }}</div>
              <div class="bp-donut-l">今日消耗</div>
            </div>
          </div>
          <div class="bp-cost-side">
            <div class="bp-cost-delta">较昨日 <b>{{ modelCost.deltaPct }}%</b></div>
            <div v-for="m in modelCost.models" :key="m.label" class="bp-legend">
              <span class="bp-legend-dot" :style="{ background: m.color }" />
              <span class="bp-legend-l">{{ m.label }}</span>
              <span class="bp-legend-p">{{ m.pct }}%</span>
            </div>
            <div class="bp-budget">
              <div class="bp-budget-head"><span>预算使用率</span><span>{{ modelCost.budgetUsed }}%</span></div>
              <div class="bp-budget-bar"><div class="bp-budget-fill" :style="{ width: modelCost.budgetUsed + '%' }" /></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统事件 -->
      <div class="panel">
        <div class="pt">系统事件 <span class="bp-hint">· 实时</span></div>
        <div class="bp-events">
          <div v-for="(e, i) in sysEvents" :key="i" class="bp-event">
            <span class="bp-event-time">{{ e.time }}</span>
            <span class="bp-event-tail">
              <span class="bp-event-agent">{{ e.agent }}</span>
              <span class="bp-event-text">{{ e.text }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { bizModules, modelCost, sysEvents } from '@/data/command'

/** 由各模型占比拼出环形图的 conic-gradient */
const donutStyle = computed(() => {
  let acc = 0
  const stops = modelCost.models.map((m) => {
    const start = acc
    acc += m.pct
    return `${m.color} ${start}% ${acc}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})
</script>

<style scoped>
.bp { display: flex; flex-direction: column; gap: 14px; margin-top: 14px; }
.panel { border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: var(--bg-panel); }
.pt { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); margin-bottom: 12px; }
.bp-hint { font-size: var(--fs-75); color: var(--text-3); font-weight: var(--fw-regular); }

/* 业务模块 */
.bp-mods { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.bp-mod {
  display: flex; align-items: center; gap: 11px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 11px 12px;
  background: var(--bg-soft);
  cursor: pointer;
  transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
}
.bp-mod:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); transform: translateY(-1px); }
.bp-mod-ic {
  width: 34px; height: 34px; flex-shrink: 0;
  border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 17px;
}
.bp-mod-n { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); }
.bp-mod-d { font-size: var(--fs-75); color: var(--text-3); margin-top: 1px; }

/* 成本 + 事件 2 列 */
.bp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* 模型成本环图 */
.bp-cost { display: flex; align-items: center; gap: 20px; }
.bp-donut {
  width: 120px; height: 120px; flex-shrink: 0;
  border-radius: 50%;
  position: relative;
}
.bp-donut-hole {
  position: absolute; inset: 22px;
  background: var(--bg-panel);
  border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.bp-donut-v { font-family: var(--font-heading); font-size: var(--fs-200); font-weight: var(--fw-bold); color: var(--text); }
.bp-donut-l { font-size: 10px; color: var(--text-3); }
.bp-cost-side { flex: 1; min-width: 0; }
.bp-cost-delta { font-size: var(--fs-75); color: var(--ok); margin-bottom: 8px; }
.bp-legend { display: flex; align-items: center; gap: 7px; font-size: var(--fs-75); margin-bottom: 4px; }
.bp-legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.bp-legend-l { color: var(--text-2); flex: 1; }
.bp-legend-p { font-family: var(--font-mono); color: var(--text-3); }
.bp-budget { margin-top: 10px; }
.bp-budget-head { display: flex; justify-content: space-between; font-size: var(--fs-75); color: var(--text-3); margin-bottom: 4px; }
.bp-budget-bar { height: 6px; border-radius: 6px; background: var(--bg-code); overflow: hidden; }
.bp-budget-fill { height: 100%; border-radius: 6px; background: var(--accent); }

/* 系统事件 */
.bp-events { display: flex; flex-direction: column; }
.bp-event { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: var(--fs-75); }
.bp-event:last-child { border-bottom: none; }
.bp-event-time { font-family: var(--font-mono); color: var(--text-3); flex-shrink: 0; }
.bp-event-tail { min-width: 0; }
.bp-event-agent { font-weight: var(--fw-bold); color: var(--accent); margin-right: 6px; }
.bp-event-text { color: var(--text-2); }

@media (max-width: 1100px) {
  .bp-grid { grid-template-columns: 1fr; }
}
</style>
