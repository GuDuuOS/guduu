import { ref, reactive } from 'vue'
import { myPeopleList, myPeopleAdd, myPeopleDelete, normalizeUserId, type MyPerson } from '@/matrix/client'
import { useToast } from '@/composables/useToast'

/**
 * 「我的协作人」能力名册（模块3.5：普通用户在前台维护）。
 *
 * 与 admin 的全局名册（控制室 cosmac.people）互补：普通用户够不到控制室，故这份存 cosmac DB、
 * 按本人隔离（后端 owner=本人）。主 AI 给本人拆任务/建专班时，把全局名册 + 这份合并、据此派单。
 * 模块级单例。
 */

const visible = ref(false)
const people = ref<MyPerson[]>([])
const loading = ref(false)
const busy = ref(false)
const editing = ref(false)
const form = reactive<MyPerson>({ user_id: '', name: '', role: '', expertise: '', note: '', enabled: true })

export function useMyPeople() {
  const { success, warn } = useToast()

  async function load() {
    loading.value = true
    try { people.value = await myPeopleList() } finally { loading.value = false }
  }

  function open() { visible.value = true; load() }
  function close() { visible.value = false; editing.value = false }

  function startAdd() {
    Object.assign(form, { user_id: '', name: '', role: '', expertise: '', note: '', enabled: true })
    editing.value = true
  }
  function startEdit(p: MyPerson) {
    Object.assign(form, { ...p })
    editing.value = true
  }

  async function save() {
    if (busy.value) return
    const uid = normalizeUserId(form.user_id)   // 容错：@bob / bob 都补成 @bob:本服务器
    if (!uid.includes(':')) { warn('请填写用户名（如 bob 或 @bob:cosmac.cc）'); return }
    busy.value = true
    try {
      await myPeopleAdd({
        person_id: uid, name: form.name.trim(), role: form.role.trim(),
        expertise: form.expertise.trim(), note: form.note.trim(), enabled: form.enabled,
      })
      editing.value = false
      await load()
      success('已保存协作人')
    } catch (e: any) {
      warn(e?.message || '保存失败')
    } finally { busy.value = false }
  }

  async function remove(personId: string) {
    if (busy.value) return
    if (!confirm('从你的协作人名册移除 TA？')) return
    busy.value = true
    try { await myPeopleDelete(personId); await load(); success('已移除') }
    catch (e: any) { warn(e?.message || '删除失败') }
    finally { busy.value = false }
  }

  return { visible, people, loading, busy, editing, form, open, close, load, startAdd, startEdit, save, remove }
}
