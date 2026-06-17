import { createApp } from 'vue'
// 正式客户端的根组件 = 真实驾驶舱（连 Synapse 的 LiveView）。
// 原来的 App.vue 是 mock 设计稿，保留在仓库里作参考，不再作为入口。
import App from './views/LiveView.vue'
import './styles/index.css'

createApp(App).mount('#app')
