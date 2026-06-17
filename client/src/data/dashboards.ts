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
    title: '总览-创作驾驶舱',
    topic: '全平台数据 · 一屏看全局',
    brand: tenantBrand,
    unitsTitle: '各平台账号状态',
    kpis: [
      { label: '今日总播放', target: 86400, unit: '次', delta: '▲ +12.4% vs 昨日' },
      { label: '本月涨粉', target: 12480, unit: '人', delta: '▲ +18.6% 环比' },
      { label: '商单收入', target: 38600, unit: '元', delta: '▲ 本月新签 2 单' },
      { label: 'AI 今日处理', target: 1056, unit: '项', delta: '▲ 节省 6 小时' }
    ],
    units: [
      { name: '抖音', status: '粉丝 48.2w' },
      { name: '小红书', status: '粉丝 21.6w' },
      { name: '视频号', status: '粉丝 9.8w' },
      { name: '公众号', status: '粉丝 12.4w' },
      { name: 'B站', status: '粉丝 6.3w' },
      { name: '知乎', status: '更新滞后', warn: true },
      { name: '私域社群', status: '3 群 · 1480 人' },
      { name: '草稿箱', status: '待发 4 条' }
    ],
    prod: {
      title: '近 24h 播放趋势', live: true,
      build: lineChart(['00', '03', '06', '09', '12', '15', '18', '21', '24'], [
        { label: '抖音', data: [12, 18, 26, 42, 68, 96, 128, 156, 142] },
        { label: '小红书', data: [8, 10, 14, 22, 36, 48, 62, 74, 68], color: PALETTE[2] }
      ])
    },
    save: { title: '本月变现 (元)', build: barChart(['W1', 'W2', 'W3', 'W4'], [8600, 12400, 15800, 11200], PALETTE[1], '变现 (元)') },
    pie: { title: 'AI 任务分布', height: 180, build: doughnut(['标题', '脚本', '回复', '复盘', '其他'], [342, 267, 201, 128, 148]) }
  },
}

export const fallbackDashboardId = tenant.hqId

export function getDashboard(id: string): DashboardData {
  return dashboardMap[id] ?? dashboardMap[fallbackDashboardId]
}
