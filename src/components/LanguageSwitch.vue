<template>
  <div class="language-switch">
    <el-tooltip :content="$t('languageSwitch.tooltip')" placement="bottom">
      <el-button circle @click="toggleLanguage">
        <span class="language-icon">{{ currentLocale === 'zh-CN' ? 'EN' : '中' }}</span>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
/**
 * 语言切换组件
 * 用于在中文和英文之间切换
 */
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../stores/appStore';

const appStore = useAppStore();
const { locale, t } = useI18n();

// 当前语言
const currentLocale = computed(() => locale.value);

// 当前是否为暗黑模式
const isDarkMode = computed(() => appStore.isDarkMode);

/**
 * 切换语言
 */
function toggleLanguage() {
  const newLocale = currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  locale.value = newLocale;
  appStore.switchLanguage(newLocale);
}
</script>

<style scoped>
.language-switch {
  display: flex;
  align-items: center;
}

.language-switch .el-button {
  background-color: transparent;
  border-color: var(--el-border-color);
  color: var(--el-text-color-primary);
  font-weight: bold;
}

.language-switch .el-button:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color-hover);
}

.language-icon {
  font-size: 14px;
  font-weight: bold;
}

/* 暗黑模式下的样式 */
:root.dark .language-switch .el-button {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

:root.dark .language-switch .el-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}
</style> 