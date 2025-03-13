import { createPinia } from 'pinia'
import { useAppStore } from './appStore'
import { useUserStore } from './userStore'

/**
 * 创建Pinia实例
 * 用于全局状态管理
 */
const pinia = createPinia()

// 导出所有状态存储
export { useAppStore, useUserStore }

export default pinia 