import type { ChartConfiguration } from 'chart.js'

/** 创建上下渐变填充 */
function gradient(ctx: CanvasRenderingContext2D, c1: string, c2: string) {
  const g = ctx.createLinearGradient(0, 0, 0, 200)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  return g
}

export function chProdConfig(ctx: CanvasRenderingContext2D): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: ['00','03','06','09','12','15','18','21','24'],
      datasets: [
        {
          label: '抖音',
          data: [12,18,26,42,68,96,128,156,142],
          borderColor: '#c96442',
          backgroundColor: gradient(ctx, 'rgba(201,100,66,0.18)', 'rgba(201,100,66,0)'),
          fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0
        },
        {
          label: '小红书',
          data: [8,10,14,22,36,48,62,74,68],
          borderColor: '#4a7a8c',
          backgroundColor: gradient(ctx, 'rgba(74,122,140,0.15)', 'rgba(74,122,140,0)'),
          fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
      scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } }
    }
  }
}

export function chSaveConfig(): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: ['W1','W2','W3','W4'],
      datasets: [{ label: '变现 (元)', data: [8600,12400,15800,11200], backgroundColor: '#6b8e4e', borderRadius: 3, barThickness: 30 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } }
    }
  }
}

export function chPieConfig(): ChartConfiguration<'doughnut'> {
  return {
    type: 'doughnut',
    data: {
      labels: ['标题','脚本','回复','复盘','其他'],
      datasets: [{ data: [342,267,201,128,148], backgroundColor: ['#c96442','#6b8e4e','#4a7a8c','#b58932','#8a8270'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 8, font: { size: 11 } } } },
      cutout: '62%'
    }
  }
}

export function chTrendConfig(ctx: CanvasRenderingContext2D): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: ['周一','周二','周三','周四','周五','周六','周日'],
      datasets: [
        { label: '实际', data: [620,710,680,920,1180,1360,1520],
          borderColor: '#c96442',
          backgroundColor: gradient(ctx, 'rgba(201,100,66,0.15)', 'rgba(201,100,66,0)'),
          fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#c96442' },
        { label: 'AI 预测', data: [600,690,700,880,1120,1300,1450],
          borderColor: '#b58932', borderDash: [5,4], fill: false, tension: 0.4, borderWidth: 2, pointRadius: 0 },
        { label: '历史平均', data: [560,565,570,580,590,600,610],
          borderColor: 'rgba(0,0,0,0.2)', borderDash: [2,2], fill: false, tension: 0.4, borderWidth: 1.5, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
      scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } }
    }
  }
}

export function chP201Config(ctx: CanvasRenderingContext2D): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: ['1h','2h','3h','4h','6h','8h','12h','18h','24h'],
      datasets: [
        {
          label: '实时播放',
          data: [3200,4100,5300,6400,7600,8500,9200,9800,10400],
          borderColor: '#c96442',
          backgroundColor: gradient(ctx, 'rgba(201,100,66,0.18)', 'rgba(201,100,66,0)'),
          fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0
        },
        {
          label: '破万线',
          data: [10000,10000,10000,10000,10000,10000,10000,10000,10000],
          borderColor: '#b58932', borderDash: [5,4], fill: false, borderWidth: 1.5, pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
      scales: { y: { suggestedMin: 3000, suggestedMax: 11000, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } }
    }
  }
}

export function chUnitConfig(): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: ['抖音','小红书','视频号','公众号','B站','知乎','私域'],
      datasets: [
        { label: '实际', data: [142,68,54,38,22,12,16], backgroundColor: '#c96442', borderRadius: 3 },
        { label: '目标', data: [130,72,50,40,25,15,14], backgroundColor: '#d8cfb6', borderRadius: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
      scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } }
    }
  }
}

export function chHelmetConfig(): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: ['抖音','小红书','视频号','公众号','B站'],
      datasets: [{
        label: '争议评论数',
        data: [14,6,4,2,1],
        backgroundColor: ['#b94a4a','#c96442','#c96442','#b58932','#b58932'],
        borderRadius: 3
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: 'rgba(0,0,0,0.04)' } }, y: { grid: { display: false } } }
    }
  }
}

/** chartId -> 配置工厂 */
export const chartFactories: Record<
  string,
  // 不同图表类型有各自的特有 options（如 doughnut 的 cutout），统一用 any 兜底
  (ctx: CanvasRenderingContext2D) => ChartConfiguration<any>
> = {
  chProd:   (ctx) => chProdConfig(ctx),
  chSave:   () => chSaveConfig(),
  chPie:    () => chPieConfig(),
  chTrend:  (ctx) => chTrendConfig(ctx),
  chP201:   (ctx) => chP201Config(ctx),
  chUnit:   () => chUnitConfig(),
  chHelmet: () => chHelmetConfig()
}
