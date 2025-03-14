/**
 * 自定义指令
 * 提供全局可用的Vue指令
 */
import type { App } from 'vue'

/**
 * 注册自定义指令
 * @param app Vue应用实例
 */
export default function setupDirectives(app: App) {
  /**
   * v-allow-select 指令
   * 允许在元素内选择文本，覆盖全局禁用文本选择的设置
   */
  app.directive('allow-select', {
    mounted(el) {
      el.classList.add('allow-select')
      el.style.userSelect = 'text'
      el.style.webkitUserSelect = 'text'
      el.style.mozUserSelect = 'text'
      el.style.msUserSelect = 'text'
      el.style.cursor = 'text'
    },
    unmounted(el) {
      el.classList.remove('allow-select')
    }
  })

  /**
   * v-disable-select 指令
   * 禁止在元素内选择文本，用于特定需要禁用的输入框等
   */
  app.directive('disable-select', {
    mounted(el) {
      el.style.userSelect = 'none'
      el.style.webkitUserSelect = 'none'
      el.style.mozUserSelect = 'none'
      el.style.msUserSelect = 'none'
      el.style.cursor = 'default'
    }
  })
} 