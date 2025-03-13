<template>
  <div class="language-switch">
    <el-dropdown @command="handleLanguageChange">
      <span class="language-dropdown-link">
        {{ currentLanguageLabel }}
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="lang in languageOptions"
            :key="lang.value"
            :command="lang.value"
            :class="{ 'is-active': currentLanguage === lang.value }"
          >
            {{ lang.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useAppStore } from '../stores/appStore'
import { languageOptions } from '../locales'
import { ArrowDown } from '@element-plus/icons-vue'

/**
 * 语言切换组件
 * 用于切换应用的语言
 */
export default defineComponent({
  name: 'LanguageSwitch',
  components: {
    ArrowDown
  },
  setup() {
    const appStore = useAppStore()
    
    // 当前语言
    const currentLanguage = computed(() => appStore.currentLanguage)
    
    // 当前语言标签
    const currentLanguageLabel = computed(() => {
      const lang = languageOptions.find(lang => lang.value === currentLanguage.value)
      return lang ? lang.label : languageOptions[0].label
    })
    
    // 处理语言变更
    const handleLanguageChange = (command: string) => {
      if (command === 'zh-CN' || command === 'en-US') {
        appStore.switchLanguage(command)
      }
    }
    
    return {
      currentLanguage,
      currentLanguageLabel,
      languageOptions,
      handleLanguageChange
    }
  }
})
</script>

<style scoped>
.language-switch {
  display: inline-flex;
  align-items: center;
}

.language-dropdown-link {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-color);
  font-size: 14px;
}

.is-active {
  color: var(--el-color-primary);
  font-weight: bold;
}
</style> 