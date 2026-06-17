<template>
  <div class="cc">
    <!-- AI 指令中枢 -->
    <div class="cc-hero">
      <div class="cc-hero-head">
        <span class="cc-badge">⚡ AI 指令中枢</span>
        <span class="cc-live"><span class="dot" /> 全链路自动运作</span>
      </div>
      <h2 class="cc-title">一句话，<span class="hl">开始变现</span></h2>
      <p class="cc-sub">从一个想法，到选题、脚本、剪辑、发布、变现 —— 全链路由 AI 自动跑通。</p>

      <div class="cc-input">
        <input
          v-model="text"
          class="cc-field"
          placeholder="输入你的目标，例如：帮我策划一条职场爆款并排好发布…"
          @keyup.enter="run()"
        />
        <button class="cc-send" :disabled="!text.trim()" @click="run()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></svg>
          下达目标
        </button>
      </div>
      <div class="cc-chips">
        <button v-for="s in commandSuggestions" :key="s" class="cc-chip" @click="run(s)">{{ s }}</button>
      </div>

      <!-- 4 步流程 -->
      <div class="cc-flow">
        <template v-for="(f, i) in flowSteps" :key="f.n">
          <div class="cc-step">
            <span class="cc-step-n">{{ f.n }}</span>
            <div class="cc-step-tx">
              <div class="cc-step-t">{{ f.title }}</div>
              <div class="cc-step-d">{{ f.desc }}</div>
            </div>
          </div>
          <span v-if="i < flowSteps.length - 1" class="cc-arrow">›</span>
        </template>
      </div>
    </div>

    <!-- AI Agent 团队 + 运营战绩 -->
    <div class="cc-row">
      <div class="panel cc-team">
        <div class="pt">AI Agent 团队 <span class="cc-hint">· 中枢派单 · 4 AI + 4 真人协作</span></div>
        <div class="cc-team-grid">
          <div v-for="a in teamAgents" :key="a.name" class="cc-agent">
            <span class="cc-agent-ava">{{ a.avatar }}<span v-if="a.online" class="cc-agent-dot" /></span>
            <div class="cc-agent-tx">
              <div class="cc-agent-n">{{ a.name }}</div>
              <div class="cc-agent-r">{{ a.role }}</div>
            </div>
            <span class="cc-agent-on">online</span>
          </div>
        </div>
        <div class="cc-team-sub">真人协作 · 主 AI @ 提醒</div>
        <div class="cc-human-grid">
          <div v-for="h in humanCollaborators" :key="h.name" class="cc-human">
            <span class="cc-human-ava">{{ h.avatar }}</span>
            <div class="cc-agent-tx">
              <div class="cc-agent-n">{{ h.name }}</div>
              <div class="cc-agent-r">{{ h.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel cc-stats">
        <div class="pt">运营战绩</div>
        <div class="cc-stats-grid">
          <div v-for="s in runStats" :key="s.label" class="cc-stat">
            <div class="cc-stat-v">{{ s.value }}<span v-if="s.unit" class="cc-stat-u">{{ s.unit }}</span></div>
            <div class="cc-stat-l">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 实时任务 -->
    <div class="panel cc-tasks">
      <div class="pt">实时任务 <span class="cc-hint">· AI 正在执行</span></div>
      <div class="cc-tasks-grid">
        <div v-for="t in liveTasks" :key="t.label" class="cc-task">
          <div class="cc-task-head">
            <span class="cc-task-l">{{ t.label }}</span>
            <span class="cc-task-pct">{{ t.pct }}%</span>
          </div>
          <div class="cc-bar"><div class="cc-bar-fill" :style="{ width: t.pct + '%' }" /></div>
          <div class="cc-task-eta">预计完成 {{ t.eta }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { teamAgents, humanCollaborators, flowSteps, commandSuggestions, runStats, liveTasks } from '@/data/command'
import { useAiAgent } from '@/composables/useAiAgent'
import { useAiPanel } from '@/composables/useAiPanel'

const text = ref('')
const { runCommand } = useAiAgent()
const { show } = useAiPanel()

function run(preset?: string) {
  const t = (preset ?? text.value).trim()
  if (!t) return
  show()
  runCommand(t)
  text.value = ''
}
</script>

<style scoped>
.cc { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }

/* ===== 指令中枢 hero ===== */
.cc-hero {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px 24px;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(201, 100, 66, 0.10), transparent 55%),
    var(--bg-panel);
  position: relative;
  overflow: hidden;
}
.cc-hero-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cc-badge {
  font-family: var(--font-mono);
  font-size: var(--fs-75);
  font-weight: var(--fw-bold);
  color: var(--accent);
  background: rgba(201, 100, 66, 0.10);
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 0.5px;
}
.cc-live { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-75); color: var(--text-3); }
.cc-live .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px rgba(107, 142, 78, 0.18); }

.cc-title { font-family: var(--font-heading); font-size: 30px; line-height: 1.15; font-weight: var(--fw-bold); color: var(--text); margin: 0 0 6px; letter-spacing: 1px; }
.cc-title .hl { color: var(--accent); }
.cc-sub { font-size: var(--fs-100); color: var(--text-3); margin: 0 0 16px; }

.cc-input { display: flex; gap: 10px; margin-bottom: 10px; }
.cc-field {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  font-size: var(--fs-100);
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.cc-field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(201, 100, 66, 0.12); }
.cc-send {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; border-radius: 10px;
  padding: 0 18px;
  background: var(--accent); color: #fff;
  font-size: var(--fs-100); font-weight: var(--fw-bold);
  cursor: pointer; white-space: nowrap;
  transition: filter 0.12s ease, opacity 0.12s ease;
}
.cc-send:hover { filter: brightness(1.06); }
.cc-send:disabled { opacity: 0.45; cursor: not-allowed; }

.cc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.cc-chip {
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 5px 13px;
  background: var(--bg-soft);
  color: var(--text-2);
  font-size: var(--fs-75);
  cursor: pointer;
  transition: all 0.12s ease;
}
.cc-chip:hover { border-color: var(--accent); color: var(--accent); background: rgba(201, 100, 66, 0.06); }

/* 4 步流程 */
.cc-flow {
  display: flex; align-items: center; gap: 6px;
  border-top: 1px dashed var(--border);
  padding-top: 16px;
  flex-wrap: wrap;
}
.cc-step { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 150px; }
.cc-step-n {
  width: 24px; height: 24px; flex-shrink: 0;
  border-radius: 50%;
  background: var(--text); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 12px; font-weight: var(--fw-bold);
}
.cc-step-t { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); line-height: 1.3; }
.cc-step-d { font-size: var(--fs-75); color: var(--text-3); }
.cc-arrow { color: var(--text-dim); font-size: 20px; flex-shrink: 0; }

/* ===== 通用 panel ===== */
.panel { border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: var(--bg-panel); }
.pt { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); margin-bottom: 12px; }
.cc-hint { font-size: var(--fs-75); color: var(--text-3); font-weight: var(--fw-regular); }

/* ===== team + stats row ===== */
.cc-row { display: grid; grid-template-columns: 1.7fr 1fr; gap: 14px; }
.cc-team-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.cc-agent {
  display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--bg-soft);
}
.cc-agent-ava {
  position: relative;
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 8px;
  background: var(--text); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: var(--fw-bold);
}
.cc-agent-dot {
  position: absolute; right: -2px; bottom: -2px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--ok); border: 1.5px solid var(--bg-panel);
}
.cc-agent-tx { flex: 1; min-width: 0; }
.cc-agent-n { font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--text); }
.cc-agent-r { font-size: var(--fs-75); color: var(--text-3); }
.cc-agent-on { font-family: var(--font-mono); font-size: 10px; color: var(--ok); }

.cc-team-sub {
  font-size: var(--fs-75); color: var(--text-3); font-weight: var(--fw-bold);
  margin: 12px 0 8px; padding-top: 10px; border-top: 1px dashed var(--border);
}
.cc-human-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.cc-human {
  display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--border-soft); border-radius: 10px;
  padding: 8px 10px; background: var(--bg-soft);
}
.cc-human-ava {
  width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%;
  background: var(--bg-panel); border: 1px solid var(--border);
  color: var(--text-2); display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: var(--fw-bold);
}

.cc-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.cc-stat { border: 1px solid var(--border-soft); border-radius: 10px; padding: 10px 12px; background: var(--bg-soft); }
.cc-stat-v { font-family: var(--font-heading); font-size: var(--fs-500); line-height: 1.1; font-weight: var(--fw-bold); color: var(--text); }
.cc-stat-u { font-size: var(--fs-100); color: var(--text-3); margin-left: 2px; font-family: var(--font-body); }
.cc-stat-l { font-size: var(--fs-75); color: var(--text-3); margin-top: 2px; }

/* ===== live tasks ===== */
.cc-tasks-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.cc-task { border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px; background: var(--bg-soft); }
.cc-task-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.cc-task-l { font-size: var(--fs-75); font-weight: var(--fw-bold); color: var(--text); }
.cc-task-pct { font-family: var(--font-mono); font-size: var(--fs-75); color: var(--accent); }
.cc-bar { height: 6px; border-radius: 6px; background: var(--bg-code); overflow: hidden; }
.cc-bar-fill { height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--accent), #e0915f); transition: width 0.4s ease; }
.cc-task-eta { font-size: 10px; color: var(--text-3); margin-top: 6px; }

@media (max-width: 1100px) {
  .cc-row { grid-template-columns: 1fr; }
  .cc-tasks-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
