/**
 * Store模块索引文件
 * 统一导出所有状态管理模块
 */
import { createPinia } from 'pinia'
import { usePlanStore } from './planStore'
import { useVideoStore } from './videoStore'
import { useAudioStore } from './audioStore'
import { useUserStore } from './userStore'
import { useAppStore } from './appStore'

// 创建Pinia实例
const pinia = createPinia()

// 导出Pinia实例
export default pinia

// 导出所有store模块
export {
  usePlanStore,
  useVideoStore,
  useAudioStore,
  useUserStore,
  useAppStore
} 