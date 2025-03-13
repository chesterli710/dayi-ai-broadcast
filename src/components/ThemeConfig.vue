<template>
  <div class="theme-config">
    <el-divider content-position="center">{{ t('theme.config') }}</el-divider>
    
    <el-form label-position="top" size="default">
      <el-form-item :label="t('theme.mode')">
        <el-radio-group v-model="selectedTheme" @change="handleThemeChange">
          <el-radio-button label="default">{{ t('theme.default') }}</el-radio-button>
          <el-radio-button label="dark">{{ t('theme.dark') }}</el-radio-button>
          <el-radio-button label="custom">{{ t('theme.custom') }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      
      <template v-if="selectedTheme === 'custom'">
        <el-form-item :label="t('theme.primaryColor')">
          <el-color-picker
            v-model="themeColors.primary"
            show-alpha
            @change="updateCustomTheme"
          />
          <span class="color-value">{{ themeColors.primary }}</span>
        </el-form-item>
        
        <el-form-item :label="t('theme.successColor')">
          <el-color-picker
            v-model="themeColors.success"
            show-alpha
            @change="updateCustomTheme"
          />
          <span class="color-value">{{ themeColors.success }}</span>
        </el-form-item>
        
        <el-form-item :label="t('theme.warningColor')">
          <el-color-picker
            v-model="themeColors.warning"
            show-alpha
            @change="updateCustomTheme"
          />
          <span class="color-value">{{ themeColors.warning }}</span>
        </el-form-item>
        
        <el-form-item :label="t('theme.dangerColor')">
          <el-color-picker
            v-model="themeColors.danger"
            show-alpha
            @change="updateCustomTheme"
          />
          <span class="color-value">{{ themeColors.danger }}</span>
        </el-form-item>
        
        <el-form-item :label="t('theme.infoColor')">
          <el-color-picker
            v-model="themeColors.info"
            show-alpha
            @change="updateCustomTheme"
          />
          <span class="color-value">{{ themeColors.info }}</span>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="resetCustomTheme">{{ t('theme.resetDefault') }}</el-button>
        </el-form-item>
      </template>
    </el-form>
    
    <el-divider content-position="center">{{ t('theme.preview') }}</el-divider>
    
    <div class="theme-preview">
      <div class="preview-row">
        <el-button>{{ t('button.default') }}</el-button>
        <el-button type="primary">{{ t('button.primary') }}</el-button>
        <el-button type="success">{{ t('button.success') }}</el-button>
        <el-button type="warning">{{ t('button.warning') }}</el-button>
        <el-button type="danger">{{ t('button.danger') }}</el-button>
        <el-button type="info">{{ t('button.info') }}</el-button>
      </div>
      
      <div class="preview-row">
        <el-tag>{{ t('tag.default') }}</el-tag>
        <el-tag type="primary">{{ t('tag.primary') }}</el-tag>
        <el-tag type="success">{{ t('tag.success') }}</el-tag>
        <el-tag type="warning">{{ t('tag.warning') }}</el-tag>
        <el-tag type="danger">{{ t('tag.danger') }}</el-tag>
        <el-tag type="info">{{ t('tag.info') }}</el-tag>
      </div>
      
      <div class="preview-row">
        <el-progress :percentage="80" />
        <el-progress :percentage="80" status="success" />
        <el-progress :percentage="80" status="warning" />
        <el-progress :percentage="80" status="exception" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'
import { useAppStore } from '../stores/appStore'
import type { ThemeType, ThemeConfig } from '../utils/themeManager'
import { useI18n } from 'vue-i18n'

/**
 * 主题配置组件
 * 用于自定义主题
 */
export default defineComponent({
  name: 'ThemeConfig',
  setup() {
    const appStore = useAppStore()
    const { t } = useI18n()
    
    // 当前选中的主题
    const selectedTheme = ref<ThemeType>(appStore.currentTheme)
    
    // 主题颜色
    const themeColors = ref<ThemeConfig>({
      primary: appStore.customTheme.primary,
      success: appStore.customTheme.success,
      warning: appStore.customTheme.warning,
      danger: appStore.customTheme.danger,
      info: appStore.customTheme.info
    })
    
    // 处理主题变更
    const handleThemeChange = (theme: ThemeType) => {
      appStore.switchTheme(theme)
    }
    
    // 更新自定义主题
    const updateCustomTheme = () => {
      appStore.setCustomTheme(themeColors.value)
    }
    
    // 重置自定义主题
    const resetCustomTheme = () => {
      themeColors.value = {
        primary: '#409eff',
        success: '#67c23a',
        warning: '#e6a23c',
        danger: '#f56c6c',
        info: '#909399'
      }
      updateCustomTheme()
    }
    
    // 监听应用主题变化
    watch(() => appStore.currentTheme, (newTheme) => {
      selectedTheme.value = newTheme
    })
    
    // 监听应用自定义主题变化
    watch(() => appStore.customTheme, (newTheme) => {
      themeColors.value = { ...newTheme }
    })
    
    return {
      selectedTheme,
      themeColors,
      handleThemeChange,
      updateCustomTheme,
      resetCustomTheme,
      t
    }
  }
})
</script>

<style scoped>
.theme-config {
  padding: 1rem;
}

.color-value {
  margin-left: 1rem;
  font-family: monospace;
}

.theme-preview {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color);
}

.preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.preview-row:last-child {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .preview-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style> 