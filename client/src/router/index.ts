import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import SafetyView from '@/views/SafetyView.vue'
import EnergyView from '@/views/EnergyView.vue'
import OfficeView from '@/views/OfficeView.vue'
import DuuChatView from '@/views/DuuChatView.vue'
import TodoView from '@/views/TodoView.vue'
import OpsChannelView from '@/views/OpsChannelView.vue'
import LiveView from '@/views/LiveView.vue'
import AdminView from '@/views/AdminView.vue'

// 工作台内部导航用的占位组件：
// LiveView 是根组件、整页由它渲染，不走 <router-view>。这些路由仅用于让
// 工作台内部地址（/s/... 等）成为「合法路由」，否则 router.push 会命中下面的
// catch-all 被重定向回 /。组件本身永不渲染，给个空 render 即可。
const Blank = { render: () => null }

const routes: RouteRecordRaw[] = [
  { path: '/admin',     name: 'admin',     component: AdminView },
  // —— 工作台内部视图（地址同步用；component 不会被渲染）——
  { path: '/me',                component: Blank }, // 个人主页覆盖层
  { path: '/s/:space',          component: Blank },
  { path: '/s/:space/board',    component: Blank },
  { path: '/s/:space/tasks',    component: Blank },
  { path: '/s/:space/c/:room',  component: Blank },
  { path: '/live',      name: 'live',      component: LiveView },
  { path: '/',          name: 'dashboard', component: DashboardView },
  { path: '/safety',    name: 'safety',    component: SafetyView },
  { path: '/energy',    name: 'energy',    component: EnergyView },
  { path: '/office',    name: 'office',    component: OfficeView },
  { path: '/duu',       name: 'duu',       component: DuuChatView },
  { path: '/todo',      name: 'todo',      component: TodoView },
  { path: '/ops/:id',   name: 'ops',       component: OpsChannelView },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
