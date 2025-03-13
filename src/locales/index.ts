/**
 * 语言包索引文件
 * 导出所有语言包和语言选项
 */
import zhCN from './zh-CN'
import enUS from './en-US'

/**
 * 语言选项接口
 */
export interface LanguageOption {
  label: string
  value: string
}

/**
 * 支持的语言选项
 */
export const languageOptions: LanguageOption[] = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

/**
 * 语言包映射
 */
export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
}

/**
 * 获取浏览器默认语言
 * @returns 浏览器默认语言代码
 */
export function getBrowserLanguage(): string {
  const browserLang = navigator.language
  // 检查是否支持该语言，如果不支持则返回默认语言
  return browserLang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

/**
 * 获取存储的语言设置
 * @returns 存储的语言设置或浏览器默认语言
 */
export function getStoredLanguage(): string {
  return localStorage.getItem('language') || getBrowserLanguage()
}

/**
 * 存储语言设置
 * @param lang - 语言代码
 */
export function storeLanguage(lang: string): void {
  localStorage.setItem('language', lang)
}

export default {
  messages,
  languageOptions,
  getBrowserLanguage,
  getStoredLanguage,
  storeLanguage
} 