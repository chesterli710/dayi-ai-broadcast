/**
 * Mock数据入口文件
 * 用于初始化所有Mock数据
 */
import { setupPlanMock } from './plan'
import { setupLayoutMock } from './layout'
import { setupUserMock } from './user'
import { setupSvgIconsMock } from './svg'

/**
 * 初始化所有Mock数据
 */
export function setupMock() {
  // 检查环境变量是否启用Mock
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  
  if (!useMock) {
    console.log('[Mock] Mock数据已禁用')
    return
  }
  
  // 设置用户相关的Mock数据
  setupUserMock()
  
  // 设置计划相关的Mock数据
  setupPlanMock()
  
  // 设置布局模板相关的Mock数据
  setupLayoutMock()
  
  // 设置SVG图标相关的Mock数据
  setupSvgIconsMock()
  
  console.log('[Mock] Mock数据初始化完成')
} 