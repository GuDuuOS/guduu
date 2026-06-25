/**
 * v-for 稳定行 key 工具。
 *
 * 背景：很多可编辑列表（数据源/规则/知识库文档…）的元素没有天然 id，模板里图省事用数组下标
 * 当 `:key`。但下标作 key 在**删除中间行**时会让 Vue 复用错位的 DOM——含 v-model 的输入框/勾选
 * 会绑到相邻行（经典 Vue 陷阱）。
 *
 * 这里用一个 WeakMap：给每个**对象引用**发一个一次性自增 id 并记住它。Vue 对同一个底层对象返回
 * 同一个响应式代理，故同一行对象在多次渲染间引用稳定 → key 稳定；splice 掉中间行后，其余行的
 * 对象引用不变、key 也不变。不改动数据形状（不会被持久化），只服务渲染。
 */
const _ids = new WeakMap<object, number>()
let _seq = 0

/** 返回某行对象的稳定渲染 key。非对象（理论上不该出现在这些列表里）回退 0。 */
export function rowKey(o: unknown): number {
  if (o === null || typeof o !== 'object') return 0
  let id = _ids.get(o as object)
  if (id === undefined) {
    id = ++_seq
    _ids.set(o as object, id)
  }
  return id
}
