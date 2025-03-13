<template>
  <div class="home-container">
    <el-row justify="center">
      <el-col :span="24">
        <h1>{{ t('nav.home') }}</h1>
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
          <div class="welcome-content">
            <p>欢迎使用 {{ t('app.name') }}！</p>
            <p>Welcome to {{ t('app.name') }}!</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="30" class="feature-list">
      <el-col :xs="24" :sm="12" :md="8" v-for="(feature, index) in features" :key="index">
        <el-card class="feature-item" shadow="hover">
          <div class="feature-icon">{{ feature.icon }}</div>
          <div class="feature-content">
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-divider content-position="center">导播管理</el-divider>
    
    <broadcast-list />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useAppStore } from '../stores/appStore'
import { Microphone } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import BroadcastList from '../components/BroadcastList.vue'

/**
 * 首页组件
 * 展示应用的主要功能和介绍
 */
export default defineComponent({
  name: 'HomeView',
  components: {
    ElIconMicrophone: Microphone,
    BroadcastList
  },
  setup() {
    const appStore = useAppStore()
    const { t } = useI18n()
    
    /**
     * 功能列表数据
     */
    const features = ref([
      {
        icon: '🎙️',
        title: '智能导播',
        description: '利用AI技术，实现智能化的导播控制和管理'
      },
      {
        icon: '🔊',
        title: '多场景应用',
        description: '适用于直播、会议、演讲等多种场景的导播需求'
      },
      {
        icon: '⚙️',
        title: '高度可定制',
        description: '支持调整画面布局、切换效果、音频参数等，满足不同需求'
      }
    ])

    return {
      appName: appStore.appName,
      features,
      t
    }
  }
})
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.feature-list {
  margin-top: 3rem;
  margin-bottom: 3rem;
}

.feature-item {
  height: 100%;
  transition: transform 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-content h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.feature-content p {
  color: var(--secondary-color);
  line-height: 1.6;
}

.action-row {
  margin-top: 3rem;
}

.start-button {
  width: 100%;
  height: 50px;
  font-size: 1.1rem;
}
</style> 