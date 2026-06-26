import { ref, computed, type Ref } from 'vue'

/**
 * 通用列表搜索 + 筛选：给数据源 ref + "取可搜索文本"函数，返回 query ref 和过滤后的列表。
 * 可选第三参 `extraFilter`（一个返回"判定函数"的 ref/computed），用于在搜索之外再叠加筛选
 * （如 启用/停用、类型、会员等级…）。后台各列表页复用，避免每页重写过滤。
 */
export function useListSearch<T>(
  source: Ref<T[]>,
  textOf: (item: T) => string,
  extraFilter?: Ref<(item: T) => boolean>,
) {
  const query = ref('')
  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    const extra = extraFilter?.value
    return source.value.filter((it) => {
      if (q && !textOf(it).toLowerCase().includes(q)) return false
      if (extra && !extra(it)) return false
      return true
    })
  })
  return { query, filtered }
}

/** 便捷：启用/停用筛选状态 + 判定函数（多数后台列表项都有 enabled 字段）。 */
export function useEnabledFilter<T extends { enabled?: boolean }>() {
  const mode = ref<'all' | 'on' | 'off'>('all')
  const predicate = computed(() => (it: T) =>
    mode.value === 'all' ? true : mode.value === 'on' ? !!it.enabled : !it.enabled,
  )
  return { mode, predicate }
}
