/**
 * i18n 插件配置
 * 配置 Vue I18n 实例
 */
import { createI18n } from 'vue-i18n'
import { messages, getStoredLanguage } from '../locales'

/**
 * 创建 i18n 实例
 */
const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getStoredLanguage(), // 从本地存储或浏览器设置获取语言
  fallbackLocale: 'zh-CN', // 回退语言
  messages, // 语言包
  silentTranslationWarn: true, // 在生产环境中禁用翻译警告
  silentFallbackWarn: true, // 在生产环境中禁用回退警告
  missingWarn: false, // 禁用缺失翻译警告
  fallbackWarn: false // 禁用回退警告
})

export default i18n 