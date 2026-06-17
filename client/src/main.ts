import { createApp } from 'vue'
// 当前部署的是"真实可用版"LiveView（真登录/真频道/真消息/真 AI/富卡）。
// 演示稿完整 UI（App.vue + components + styles/tokens）保留在仓库，下一阶段逐块接真后切换回来。
import App from './views/LiveView.vue'
import './styles/index.css'

createApp(App).mount('#app')
