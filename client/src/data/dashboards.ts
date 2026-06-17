import type { ChartConfiguration } from 'chart.js'
import type { KpiCardData, UnitStatus } from './kpi'
import { tenant, brandOf, tenantBrand } from '@/config/tenant'

/* ============ 紧凑图表 builder ============ */

const PALETTE = ['#c96442', '#6b8e4e', '#4a7a8c', '#b58932', '#8a8270']

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function areaFill(ctx: CanvasRenderingContext2D, hex: string) {
  const g = ctx.createLinearGradient(0, 0, 0, 200)
  g.addColorStop(0, hexA(hex, 0.18))
  g.addColorStop(1, hexA(hex, 0))
  return g
}

const axisOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const, align: 'end' as const, labels: { boxWidth: 10, padding: 12, font: { size: 11 } } }
  },
  scales: {
    y: { grid: { color: 'rgba(0,0,0,0.04)' } },
    x: { grid: { display: false } }
  }
}

interface LineSeries { label: string; data: number[]; color?: string; fill?: boolean; dash?: number[] }

/** 多序列折线/面积图 */
function lineChart(labels: string[], series: LineSeries[]) {
  return (ctx: CanvasRenderingContext2D): ChartConfiguration => ({
    type: 'line',
    data: {
      labels,
      datasets: series.map((s, i) => {
        const color = s.color ?? PALETTE[i % PALETTE.length]
        const filled = s.fill !== false && !s.dash
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          backgroundColor: filled ? areaFill(ctx, color) : undefined,
          fill: filled,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          borderDash: s.dash
        }
      })
    },
    options: axisOpts
  })
}

/** 单序列柱状图 */
function barChart(labels: string[], data: number[], color = PALETTE[1], label = '') {
  return (): ChartConfiguration => ({
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 3, barThickness: 28 }] },
    options: { ...axisOpts, plugins: { legend: { display: false } } }
  })
}

/** 环形图 */
function doughnut(labels: string[], data: number[]) {
  return (): ChartConfiguration => ({
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: PALETTE.concat('#b94a4a').slice(0, data.length), borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 8, font: { size: 11 } } } },
      cutout: '62%'
    } as ChartConfiguration['options']
  })
}

/* ============ 数据模型 ============ */

export interface ChartSpec {
  title: string
  live?: boolean
  height?: number
  build: (ctx: CanvasRenderingContext2D) => ChartConfiguration
}

export interface DashboardData {
  /** 频道头标题 */
  title: string
  topic: string
  /** 画布大标题 */
  brand: string
  /** 状态网格标题 */
  unitsTitle: string
  kpis: KpiCardData[]
  units: UnitStatus[]
  prod: ChartSpec
  save: ChartSpec
  pie: ChartSpec
}

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const MONTH6 = ['1月', '2月', '3月', '4月', '5月', '6月']

export const dashboardMap: Record<string, DashboardData> = {
  /* ===== 筱雨工作室 ===== */
  [tenant.hqId]: {
    title: '总览-制作驾驶舱',
    topic: '全平台剧集 / 粉丝数据 · 一屏看全局',
    brand: tenantBrand,
    unitsTitle: '各剧集 / 虚拟明星 / 平台状态',
    kpis: [
      { label: '今日剧集总播放', target: 1280, unit: '万次', delta: '▲ +9.2% vs 昨日' },
      { label: '全网粉丝总数', target: 386, unit: '万', delta: '▲ +18.6% 环比' },
      { label: '本周粉丝回复', target: 3240, unit: '条', delta: '▲ AI 自动回 92%' },
      { label: 'AI 今日制作', target: 1056, unit: '项', delta: '▲ 节省 14 小时' }
    ],
    units: [
      { name: '《银河谣》', status: '播放 480w · 更新中' },
      { name: '《夜航星》', status: '播放 320w · 制作中' },
      { name: '虚拟明星·墨白', status: '粉丝 128w' },
      { name: '虚拟明星·星野', status: '粉丝 96w · 新单曲' },
      { name: '虚拟明星·凌霜', status: '粉丝 54w' },
      { name: '抖音', status: '粉丝 210w' },
      { name: 'B站', status: '更新滞后', warn: true },
      { name: 'YouTube', status: '订阅 38w' }
    ],
    prod: {
      title: '近 24h 剧集播放趋势', live: true,
      build: lineChart(['00', '03', '06', '09', '12', '15', '18', '21', '24'], [
        { label: '抖音', data: [18, 24, 30, 48, 78, 110, 142, 168, 150] },
        { label: 'B站', data: [10, 12, 16, 24, 40, 56, 72, 88, 80], color: PALETTE[2] },
        { label: 'YouTube', data: [6, 8, 10, 16, 26, 34, 44, 52, 48], color: PALETTE[3] }
      ])
    },
    save: { title: '本月各周新增粉丝 (万)', build: barChart(['W1', 'W2', 'W3', 'W4'], [12, 18, 26, 21], PALETTE[1], '新增粉丝 (万)') },
    pie: { title: 'AI 制作任务分布', height: 180, build: doughnut(['剧本', '分镜', '配音/配乐', '海报', '粉丝回复'], [286, 224, 168, 132, 246]) }
  },
}

export const fallbackDashboardId = tenant.hqId

export function getDashboard(id: string): DashboardData {
  return dashboardMap[id] ?? dashboardMap[fallbackDashboardId]
}
