import { reactive } from 'vue'

/**
 * 全局轻量反馈（toast）
 * --------------------------------------------------------------
 * 给「纯展示型 / 模拟型」交互一个统一的反馈出口：任何按钮点下去都能
 * 弹出一条「已执行」气泡，让 Demo 里所有可点元素都"有反应"。
 * 通过 <ToastHost /> 渲染（挂在 App.vue 根部）。
 */
export type ToastKind = 'info' | 'success' | 'warn'

export interface ToastItem {
  id: number
  text: string
  kind: ToastKind
  /** 可选副标题（次要说明）*/
  desc?: string
}

const items = reactive<ToastItem[]>([])
let seq = 0

/** 默认展示时长（ms）*/
const DURATION = 2600

function push(text: string, kind: ToastKind, desc?: string) {
  const id = ++seq
  items.push({ id, text, kind, desc })
  setTimeout(() => dismiss(id), DURATION)
  return id
}

function dismiss(id: number) {
  const i = items.findIndex((t) => t.id === id)
  if (i !== -1) items.splice(i, 1)
}

export function useToast() {
  return {
    items,
    /** 通用提示 */
    toast: (text: string, desc?: string) => push(text, 'info', desc),
    /** 成功反馈（绿色对勾）—— 多数"模拟操作"用这个 */
    success: (text: string, desc?: string) => push(text, 'success', desc),
    /** 警示反馈 */
    warn: (text: string, desc?: string) => push(text, 'warn', desc),
    dismiss
  }
}
