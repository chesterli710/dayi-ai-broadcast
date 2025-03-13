<template>
  <div class="about-container">
    <el-row justify="center">
      <el-col :span="24">
        <h1>{{ t('nav.about') }}</h1>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" justify="center">
      <el-col :xs="24" :md="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>{{ t('app.name') }}</span>
            </div>
          </template>
          <div class="about-content">
            <p>{{ t('app.name') }} {{ t('app.version') }}: {{ appVersion }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useAppStore } from '../stores/appStore'
import { useI18n } from 'vue-i18n'

/**
 * 关于页面
 * 显示应用的相关信息
 */
export default defineComponent({
  name: 'AboutView',
  setup() {
    const appStore = useAppStore()
    const { t } = useI18n()
    
    return {
      appVersion: appStore.appVersion,
      t
    }
  }
})
</script>

<style scoped>
.about-container {
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
  justify-content: space-between;
}

.about-content {
  padding: 1rem;
  text-align: center;
  font-size: 1.2rem;
  line-height: 1.8;
}
</style> 