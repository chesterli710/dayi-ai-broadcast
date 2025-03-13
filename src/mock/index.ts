/**
 * Mock 数据服务
 * 用于模拟 API 请求响应
 */
import Mock from 'mockjs'
import { setupUserMock } from './user'
import { setupBroadcastMock } from './broadcast'

/**
 * 设置全局延迟
 * 模拟网络请求延迟
 */
Mock.setup({
  timeout: '200-600'
})

/**
 * 初始化 Mock 服务
 */
export function setupMock() {
  // 判断是否启用 Mock
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  
  if (!useMock) {
    console.log('Mock 服务已禁用')
    return
  }
  
  console.log('Mock 服务已启用')
  
  // 设置各模块的 Mock 数据
  setupUserMock()
  setupBroadcastMock()
} 