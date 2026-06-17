import { ref } from 'vue'
import { tenant } from '@/config/tenant'

/** 当前激活的工作区（部门）id */
const activeId = ref<string>(tenant.hqId)

export function useActiveWorkspace() {
  return {
    activeId,
    setActive: (id: string) => { activeId.value = id }
  }
}
