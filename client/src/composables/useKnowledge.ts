import { ref } from 'vue'
import { kbListMine, kbAddMine, kbDeleteMine } from '@/matrix/client'
import { useToast } from '@/composables/useToast'

/**
 * 个人知识库管理（模块2增强⑤a：知识库上传 UI）。
 *
 * 之前知识库只能靠聊天命令「知识 添加/删除」维护；这里给个界面让用户在 UI 里
 * 贴标题+正文入库、列出、删除。作用域=个人库(scope=user)，bot 在该用户任何房间
 * 检索 RAG 时都会带上。后端：/cosmac/kb/{list,add,delete}（见 appservice_bot）。
 *
 * 模块级单例：`docs` 是个人库文档的**唯一来源**——AI 侧栏「项目文件」面板与本管理弹窗
 * 共用它，增删后两处同步刷新，不各存一份。
 */

export interface KbDoc { id: number; title: string; source: string }

/* ===== 模块级单例 ===== */
const visible = ref(false)
const docs = ref<KbDoc[]>([])
const loading = ref(false)
const busy = ref(false)         // 添加/删除进行中（防重复提交）
const title = ref('')
const content = ref('')

export function useKnowledge() {
  const { success, warn } = useToast()

  /** 拉取个人库列表（AI 侧栏进入放大态、打开弹窗时都调）。失败静默返回空。 */
  async function load() {
    loading.value = true
    try {
      docs.value = await kbListMine()
    } finally {
      loading.value = false
    }
  }

  function open() {
    title.value = ''
    content.value = ''
    visible.value = true
    load()
  }
  function close() { visible.value = false }

  /** 添加一篇：标题可空、正文必填；成功后清空输入并刷新列表。 */
  async function add() {
    if (busy.value) return
    const t = title.value.trim()
    const c = content.value.trim()
    if (!c) { warn('正文不能为空'); return }
    busy.value = true
    try {
      const chunks = await kbAddMine(t, c)
      title.value = ''
      content.value = ''
      await load()
      success(`已入库（切成 ${chunks} 段）`)
    } catch (e: any) {
      warn(e?.message || '入库失败')
    } finally {
      busy.value = false
    }
  }

  /** 删除一篇（按 id）；成功后刷新列表。 */
  async function remove(id: number) {
    if (busy.value) return
    busy.value = true
    try {
      await kbDeleteMine(id)
      await load()
      success('已删除')
    } catch (e: any) {
      warn(e?.message || '删除失败')
    } finally {
      busy.value = false
    }
  }

  return { visible, docs, loading, busy, title, content, open, close, load, add, remove }
}
