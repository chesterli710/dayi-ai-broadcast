<template>
  <div class="theme-settings-container">
    <el-row justify="center">
      <el-col :span="24">
        <h1>{{ t('theme.settings') }}</h1>
      </el-col>
    </el-row>
    
    <el-row :gutter="20">
      <el-col :xs="24" :md="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>{{ t('theme.config') }}</span>
              <el-tooltip :content="t('theme.description')">
                <el-icon><el-icon-question-filled /></el-icon>
              </el-tooltip>
            </div>
          </template>
          <theme-config />
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>{{ t('theme.info') }}</span>
            </div>
          </template>
          <div class="theme-info">
            <p>{{ t('theme.description') }}</p>
            <el-divider />
            <h3>{{ t('theme.mode') }}</h3>
            <p><strong>{{ t('theme.default') }}：</strong> {{ t('theme.modeDescription.default') }}</p>
            <p><strong>{{ t('theme.dark') }}：</strong> {{ t('theme.modeDescription.dark') }}</p>
            <p><strong>{{ t('theme.custom') }}：</strong> {{ t('theme.modeDescription.custom') }}</p>
            <el-divider />
            <h3>{{ t('theme.colorDescription.primary') }}</h3>
            <p><strong>{{ t('theme.primaryColor') }}：</strong> {{ t('theme.colorDescription.primary') }}</p>
            <p><strong>{{ t('theme.successColor') }}：</strong> {{ t('theme.colorDescription.success') }}</p>
            <p><strong>{{ t('theme.warningColor') }}：</strong> {{ t('theme.colorDescription.warning') }}</p>
            <p><strong>{{ t('theme.dangerColor') }}：</strong> {{ t('theme.colorDescription.danger') }}</p>
            <p><strong>{{ t('theme.infoColor') }}：</strong> {{ t('theme.colorDescription.info') }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import ThemeConfig from '../components/ThemeConfig.vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

/**
 * 主题设置页面
 * 用于展示主题配置组件
 */
export default defineComponent({
  name: 'ThemeSettingsView',
  components: {
    ThemeConfig,
    ElIconQuestionFilled: QuestionFilled
  },
  setup() {
    const { t } = useI18n()
    
    return {
      t
    }
  }
})
</script>

<style scoped>
.theme-settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: var(--primary-color);
  text-align: center;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-info {
  color: var(--text-color);
}

.theme-info h3 {
  margin: 1rem 0 0.5rem;
  color: var(--primary-color);
}

.theme-info p {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}
</style> 