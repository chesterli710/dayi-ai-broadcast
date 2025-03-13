<script lang="ts">
import { defineComponent, computed, onMounted, ref } from 'vue'
import { useAppStore } from './stores/appStore'
import { useRouter, useRoute } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import { House, InfoFilled, Moon, Sunny, Brush } from '@element-plus/icons-vue'
import LanguageSwitch from './components/LanguageSwitch.vue'
import { useI18n } from 'vue-i18n'

/**
 * 应用根组件
 * 提供应用的基本布局和全局导航
 */
export default defineComponent({
  name: 'App',
  components: {
    ElConfigProvider,
    ElIconHouse: House,
    ElIconInfoFilled: InfoFilled,
    ElIconBrush: Brush,
    Moon,
    Sunny,
    LanguageSwitch
  },
  setup() {
    // 获取应用状态
    const appStore = useAppStore()
    const router = useRouter()
    const route = useRoute()
    const { t } = useI18n()
    
    // 当前活动路由
    const activeRoute = computed(() => route.path)
    
    // 计算当前年份
    const currentYear = computed(() => new Date().getFullYear())
    
    // 导航到指定路由
    const navigateTo = (path: string) => {
      router.push(path)
    }
    
    // 组件挂载时初始化应用状态
    onMounted(() => {
      appStore.initAppState()
    })
    
    return {
      appName: computed(() => t('app.name')),
      appVersion: appStore.appVersion,
      isDarkMode: computed(() => appStore.isDarkMode),
      toggleDarkMode: appStore.toggleDarkMode,
      currentYear,
      activeRoute,
      navigateTo,
      t
    }
  }
})
</script>

<template>
  <div class="app-container" :class="{ 'dark-mode': isDarkMode }">
    <el-container>
      <el-header class="app-header">
        <div class="logo">{{ appName }}</div>
        <el-menu
          mode="horizontal"
          :ellipsis="false"
          :default-active="activeRoute"
          class="main-nav"
        >
          <el-menu-item index="/" @click="navigateTo('/')">
            <el-icon><el-icon-house /></el-icon>
            <span>{{ t('nav.home') }}</span>
          </el-menu-item>
          <el-menu-item index="/theme" @click="navigateTo('/theme')">
            <el-icon><el-icon-brush /></el-icon>
            <span>{{ t('nav.theme') }}</span>
          </el-menu-item>
          <el-menu-item index="/about" @click="navigateTo('/about')">
            <el-icon><el-icon-info-filled /></el-icon>
            <span>{{ t('nav.about') }}</span>
          </el-menu-item>
        </el-menu>
        <div class="header-actions">
          <language-switch class="language-switch" />
          <el-button
            circle
            :icon="isDarkMode ? 'Sunny' : 'Moon'"
            @click="toggleDarkMode"
            class="theme-toggle"
          />
        </div>
      </el-header>
      
      <el-main class="app-content">
        <router-view />
      </el-main>
      
      <el-footer class="app-footer">
        <p>&copy; {{ currentYear }} {{ appName }} {{ t('app.version') }} {{ appVersion }}</p>
      </el-footer>
    </el-container>
  </div>
</template>

<style>
/* 全局样式 */
@import '../src/styles/theme.scss';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  background-color: var(--el-bg-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.el-container {
  min-height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background-color: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color-light);
  height: 60px;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--el-color-primary);
}

.main-nav {
  border-bottom: none !important;
  background-color: transparent !important;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.language-switch {
  margin-right: 0.5rem;
}

.theme-toggle {
  margin-left: 0.5rem;
}

.app-content {
  flex: 1;
  padding: 2rem;
  background-color: var(--el-bg-color-page);
}

.app-footer {
  padding: 1rem 2rem;
  text-align: center;
  background-color: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-secondary);
  height: 60px;
}
</style>
