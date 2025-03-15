<template>
  <div class="theme-switch">
    <el-tooltip :content="isDarkMode ? $t('themeSwitch.toLightMode') : $t('themeSwitch.toDarkMode')" placement="bottom">
      <el-button circle @click="toggleTheme">
        <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
/**
 * 主题切换组件
 * 用于在亮色和暗色主题之间切换
 */
import { ref, computed, watch } from 'vue';
import { useAppStore } from '../stores/appStore';
import { useI18n } from 'vue-i18n';

const appStore = useAppStore();
const { t } = useI18n();

// 是否为暗色模式
const isDarkMode = computed(() => appStore.currentTheme === 'dark');

/**
 * 切换主题
 */
function toggleTheme() {
  const newTheme = isDarkMode.value ? 'default' : 'dark';
  appStore.switchTheme(newTheme);
}
</script>

<style scoped>
.theme-switch {
  display: flex;
  align-items: center;
}

:deep(.el-button) {
  color: var(--el-text-color-primary);
  background-color: var(--el-bg-color-overlay);
  border-color: var(--el-border-color);
}

:deep(.el-button:hover) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
</style> 