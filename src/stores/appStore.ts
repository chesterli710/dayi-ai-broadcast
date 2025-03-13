import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import themeManager from '../utils/themeManager'
import type { ThemeType, ThemeConfig } from '../utils/themeManager'
import { storeLanguage, getStoredLanguage } from '../locales'
import i18n from '../plugins/i18n'

/**
 * 应用状态存储
 * 管理应用的全局状态
 */
export const useAppStore = defineStore('app', () => {
  /**
   * 应用名称
   */
  const appName = ref('大医AI导播系统')
  
  /**
   * 应用版本
   */
  const appVersion = ref('0.1.0')
  
  /**
   * 应用是否处于暗黑模式
   */
  const isDarkMode = ref(false)
  
  /**
   * 当前主题
   */
  const currentTheme = ref<ThemeType>('default')
  
  /**
   * 自定义主题配置
   */
  const customTheme = ref<ThemeConfig>(themeManager.getCustomTheme())
  
  /**
   * 当前语言
   */
  const currentLanguage = ref(getStoredLanguage())
  
  /**
   * 切换暗黑模式
   */
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    // 保存到本地存储
    localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false')
    // 应用暗黑模式
    applyDarkMode()
  }
  
  /**
   * 应用暗黑模式
   */
  function applyDarkMode() {
    // 为 html 元素添加或移除 dark 类
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
      // 为 Element Plus 添加暗黑模式类
      document.documentElement.classList.add('dark')
      // 切换到暗黑主题
      switchTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      // 为 Element Plus 移除暗黑模式类
      document.documentElement.classList.remove('dark')
      // 切换到默认主题或自定义主题
      switchTheme(currentTheme.value === 'dark' ? 'default' : currentTheme.value)
    }
  }
  
  /**
   * 切换主题
   * @param theme - 主题类型
   */
  function switchTheme(theme: ThemeType) {
    currentTheme.value = theme
    themeManager.switchTheme(theme)
  }
  
  /**
   * 设置自定义主题
   * @param config - 主题配置
   */
  function setCustomTheme(config: Partial<ThemeConfig>) {
    customTheme.value = { ...customTheme.value, ...config }
    themeManager.setCustomTheme(config)
  }
  
  /**
   * 切换语言
   * @param lang - 语言代码
   */
  function switchLanguage(lang: 'zh-CN' | 'en-US') {
    currentLanguage.value = lang
    storeLanguage(lang)
    
    // 直接使用导入的 i18n 实例设置语言
    i18n.global.locale.value = lang
  }
  
  /**
   * 初始化应用状态
   */
  function initAppState() {
    // 从本地存储加载暗黑模式设置
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode) {
      isDarkMode.value = savedDarkMode === 'true'
    }
    
    // 初始化主题
    themeManager.init()
    currentTheme.value = themeManager.getCurrentTheme()
    customTheme.value = themeManager.getCustomTheme()
    
    // 应用暗黑模式
    applyDarkMode()
  }
  
  // 监听暗黑模式变化
  watch(isDarkMode, () => {
    applyDarkMode()
  })
  
  // 监听主题变化
  watch(currentTheme, () => {
    if (currentTheme.value === 'dark') {
      isDarkMode.value = true
    }
  })
  
  // 计算属性：是否为自定义主题
  const isCustomTheme = computed(() => currentTheme.value === 'custom')
  
  return {
    appName,
    appVersion,
    isDarkMode,
    currentTheme,
    customTheme,
    currentLanguage,
    isCustomTheme,
    toggleDarkMode,
    switchTheme,
    setCustomTheme,
    switchLanguage,
    initAppState
  }
}) 