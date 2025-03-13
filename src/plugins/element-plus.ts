import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import type { App } from 'vue'

/**
 * Element Plus 配置类
 * 负责配置 Element Plus 的主题和国际化
 */
class ElementPlusConfig {
  /**
   * 安装 Element Plus 到 Vue 应用
   * @param app - Vue 应用实例
   */
  install(app: App): void {
    // 配置 Element Plus
    app.use(ElementPlus, {
      locale: zhCn, // 使用中文语言包
      size: 'default', // 默认组件大小
    })

    // 注册所有图标
    this.registerIcons(app)
  }

  /**
   * 注册 Element Plus 图标
   * @param app - Vue 应用实例
   */
  private registerIcons(app: App): void {
    // 全局注册所有图标
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(`ElIcon${key}`, component)
    }
  }
}

// 导出 Element Plus 配置实例
export default new ElementPlusConfig() 