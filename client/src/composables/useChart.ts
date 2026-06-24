import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import {
  Chart,
  LineController, BarController, DoughnutController,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler,
  type ChartConfiguration
} from 'chart.js'

// chart.js 需要按需注册用到的 controller/scale/element，注册一次即可（用模块级标志位去重）
let registered = false
function ensureRegistered() {
  if (registered) return
  Chart.register(
    LineController, BarController, DoughnutController,
    CategoryScale, LinearScale,
    PointElement, LineElement, BarElement, ArcElement,
    Tooltip, Legend, Filler
  )
  // 默认配色/字体，贴合 CosMac 画布风格
  Chart.defaults.color = '#4b5563'
  Chart.defaults.font.family = '-apple-system,"PingFang SC",sans-serif'
  Chart.defaults.borderColor = 'rgba(0,0,0,0.06)'
  registered = true
}

/**
 * 在 canvas ref 上挂一个 Chart 实例，组件卸载时自动 destroy（防内存泄漏/重复绘制）。
 * @param canvasRef 指向 <canvas> 的模板 ref
 * @param buildConfig 接收 2D 上下文、返回 chart.js 配置的工厂（用上下文是为了画渐变填充）
 */
export function useChart(
  canvasRef: Ref<HTMLCanvasElement | null>,
  buildConfig: (ctx: CanvasRenderingContext2D) => ChartConfiguration
) {
  let chart: Chart | null = null

  onMounted(() => {
    ensureRegistered()
    const el = canvasRef.value
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    chart = new Chart(ctx, buildConfig(ctx))
  })

  onBeforeUnmount(() => {
    chart?.destroy()
    chart = null
  })
}
