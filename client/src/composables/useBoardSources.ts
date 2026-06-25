import { reactive, ref, watch } from 'vue'
import { getBoardSources, setBoardSources } from '@/matrix/client'

/**
 * 看板数据源（数据看板 / 任务看板）。
 * 目前数据源是"配置占位"：名称 + 类型 + 备注；真实取数以后接。
 * 按当前工作区(Space)持久化进 Matrix state event `cosmac.board_sources`，刷新不丢、多端同步。
 */
export interface BoardSource {
  name: string   // 数据源名称（如「抖音创作者后台」「本周拍摄计划频道」）
  type: string   // 类型（占位分类）
  note?: string  // 连接说明 / 备注（占位）
}
export type BoardKey = 'dashboard' | 'tasks'

/** 数据源类型选项（占位分类，真实接入后再细化）*/
export const BOARD_SOURCE_TYPES = ['频道聚合', '外部平台', 'API 接口', '手动录入']
/** 看板中文名 */
export const BOARD_LABELS: Record<BoardKey, string> = { dashboard: '数据看板', tasks: '任务看板' }

/* ===== 模块级单例状态（跨组件共享）===== */
const spaceId = ref('')                                       // 当前工作区 id（空=未选/未登录）
const sources = reactive<Record<BoardKey, BoardSource[]>>({ dashboard: [], tasks: [] })
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

// UI 状态
const editorOpen = ref(false)                                 // 数据源编辑弹窗是否打开（旧入口，保留）
const editorBoard = ref<BoardKey>('dashboard')                // 弹窗在编辑哪个看板
const popoverBoard = ref<BoardKey | null>(null)               // 哪个看板的"数据源展示"列表展开着（旧下拉，保留）
const panelOpen = ref(false)                                  // 右侧「数据源」面板是否打开
const panelBoard = ref<BoardKey>('dashboard')                 // 右侧面板在看哪个看板的数据源

let suppress = false                                          // 加载期抑制回写

/** 从当前 Space 的 state event 读数据源 */
function load() {
  const saved = spaceId.value ? getBoardSources(spaceId.value) : {}
  suppress = true
  sources.dashboard = Array.isArray(saved.dashboard) ? saved.dashboard : []
  sources.tasks = Array.isArray(saved.tasks) ? saved.tasks : []
  // 下一拍再放开，避免"加载即触发保存"的回声
  setTimeout(() => { suppress = false }, 0)
}

/** 防抖整体写回 Space 的 state event */
let timer: ReturnType<typeof setTimeout> | null = null
function persist() {
  if (!spaceId.value) return
  if (timer) clearTimeout(timer)
  saveState.value = 'saving'
  timer = setTimeout(async () => {
    try {
      await setBoardSources(spaceId.value, {
        dashboard: sources.dashboard.map((s) => ({ ...s })),
        tasks: sources.tasks.map((s) => ({ ...s })),
      })
      saveState.value = 'saved'
    } catch {
      saveState.value = 'error' // 多半是当前用户在该工作区没有改配置的权限
    }
  }, 600)
}

// 任意看板数据源增删改 → 防抖持久化
watch(sources, () => { if (!suppress && spaceId.value) persist() }, { deep: true })

export function useBoardSources() {
  return {
    sources,
    saveState,
    editorOpen,
    editorBoard,
    popoverBoard,
    panelOpen,
    panelBoard,
    /** 打开/切换右侧「数据源」面板（看某个看板的数据源）*/
    toggleSourcePanel(board: BoardKey) {
      if (panelOpen.value && panelBoard.value === board) {
        panelOpen.value = false
        return
      }
      load() // 打开前刷新一遍，防 Space 状态还没 sync
      panelBoard.value = board
      saveState.value = 'idle'
      panelOpen.value = true
    },
    closeSourcePanel() { panelOpen.value = false },
    /** 切换当前工作区（LiveView 在 activeSpace 变化时调用）*/
    setSpace(id?: string) {
      // 关键：切 space 前取消旧 space 还没落盘的防抖保存。persist 用执行时的 spaceId，
      // 若不取消，旧 space 的 sources 会被写进**新 space**（数据串台）。
      if (timer) { clearTimeout(timer); timer = null }
      saveState.value = 'idle'
      spaceId.value = id || ''
      load()
    },
    /** 打开某看板的数据源编辑弹窗 */
    openEditor(board: BoardKey) {
      load() // 重新拉一遍，防 activeSpace 变化时 Space 房间状态还没 sync 到
      editorBoard.value = board
      popoverBoard.value = null
      saveState.value = 'idle'
      editorOpen.value = true
    },
    closeEditor() { editorOpen.value = false },
    /** 展开/收起某看板的数据源展示列表 */
    togglePopover(board: BoardKey) {
      const opening = popoverBoard.value !== board
      if (opening) load() // 展开时刷新一遍
      popoverBoard.value = opening ? board : null
    },
    closePopover() { popoverBoard.value = null },
    /** 新增一个数据源 */
    addSource(board: BoardKey, s: BoardSource) {
      const name = s.name.trim()
      if (!name) return
      sources[board].push({ name, type: s.type, note: s.note?.trim() || undefined })
    },
    /** 移除一个数据源 */
    removeSource(board: BoardKey, i: number) { sources[board].splice(i, 1) },
  }
}
