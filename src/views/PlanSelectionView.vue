<template>
  <div class="plan-selection-container">
    <header class="header">
      <h1>{{ t('app.name') }}</h1>
      <div class="user-info">
        <span>{{ userInfo.name }}</span>
        <el-button link @click="handleLogout">{{ t('planSelection.logout') }}</el-button>
      </div>
    </header>

    <main class="main-content">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="error" class="error-container">
        <el-alert
          :title="error"
          type="error"
          show-icon
          :closable="false"
        />
        <el-button type="primary" @click="fetchChannels" class="retry-button">
          {{ t('planSelection.retry') }}
        </el-button>
      </div>
      
      <div v-else-if="channels.length === 0" class="empty-container">
        <el-empty :description="t('planSelection.noChannels')" />
      </div>
      
      <div v-else class="channels-container">
        <div v-for="channel in channels" :key="channel.id" class="channel-card">
          <h2 class="channel-title">{{ channel.name }}</h2>
          
          <div v-if="channel.plans.length === 0" class="empty-plans">
            <el-empty :description="t('planSelection.noPlans')" :image-size="100" />
          </div>
          
          <div v-else class="plans-grid">
            <div v-for="plan in channel.plans" :key="plan.id" class="plan-card">
              <div class="plan-header">
                <img 
                  v-if="plan.cover" 
                  :src="plan.cover" 
                  class="plan-cover" 
                  alt="计划封面" 
                  @error="handleImageError($event, plan, 'cover')"
                  @load="handleImageLoad($event, plan, 'cover')"
                  crossorigin="anonymous"
                  :class="{ 'loading': !imageLoaded[plan.id] }"
                />
                <div v-else class="plan-cover plan-cover-placeholder">
                  <i class="el-icon-picture-outline"></i>
                </div>
                <h3 class="plan-title">{{ plan.name }}</h3>
                <div class="plan-time">
                  <i class="el-icon-time"></i>
                  <span>{{ formatDateTime(plan.plannedStartDateTime) }}</span>
                </div>
              </div>
              
              <div class="branches-list">
                <div v-if="!plan.branches || plan.branches.length === 0" class="empty-branches">
                  <el-empty :description="t('planSelection.noBranches')" :image-size="60" />
                </div>
                <div v-else class="branch-items">
                  <div 
                    v-for="branch in plan.branches" 
                    :key="branch.id" 
                    class="branch-item"
                    @click="selectBranch(plan, branch)"
                  >
                    <div class="branch-info">
                      <span class="branch-name">{{ branch.name }}</span>
                      <el-tag size="small" type="success">{{ getSchedulesCount(branch) }}</el-tag>
                    </div>
                    <el-button type="primary" size="small" icon="el-icon-right">
                      {{ t('planSelection.enterButton') }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import planApi from '../api/plan'
import type { Channel, Plan, Branch } from '../types/broadcast'

export default defineComponent({
  name: 'PlanSelectionView',
  
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    const channels = ref<Channel[]>([])
    const loading = ref(true)
    const error = ref('')
    const imageLoaded = ref<Record<string, boolean>>({})
    const userInfo = ref({
      id: '',
      name: '用户',
      phone: ''
    })
    
    // 获取频道列表
    const fetchChannels = async () => {
      loading.value = true
      error.value = ''
      
      try {
        // 获取用户信息（实际项目中应该从store或API获取）
        userInfo.value = JSON.parse(localStorage.getItem('userInfo') || '{"name": "用户"}')
        
        // 使用整合后的接口一次性获取所有数据
        const response = await planApi.getAllData()
        // 确保我们获取的是 data 字段中的数据
        channels.value = response.data || []
      } catch (err) {
        console.error('获取数据失败:', err)
        error.value = t('planSelection.errorLoadingChannels')
      } finally {
        loading.value = false
      }
    }
    
    // 选择分支
    const selectBranch = (plan: Plan, branch: Branch) => {
      // 存储选中的计划和分支信息
      localStorage.setItem('selectedPlan', JSON.stringify(plan))
      localStorage.setItem('selectedBranch', JSON.stringify(branch))
      
      // 跳转到主界面
      router.push('/')
    }
    
    // 退出登录
    const handleLogout = () => {
      ElMessageBox.confirm(t('planSelection.logoutConfirm'), t('common.confirm'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }).then(() => {
        // 清除登录信息
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        
        // 跳转到登录页
        router.push('/login')
        
        ElMessage({
          type: 'success',
          message: t('planSelection.logoutSuccess')
        })
      }).catch(() => {
        // 取消退出
      })
    }
    
    // 格式化日期时间
    const formatDateTime = (dateTime: Date | string) => {
      if (!dateTime) return t('common.unknown')
      
      const date = new Date(dateTime)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    // 处理图片加载错误
    const handleImageError = (event: Event, plan: Plan, type: 'cover' | 'background') => {
      // 设置默认图片
      if (type === 'cover') {
        ;(event.target as HTMLImageElement).src = 'https://via.placeholder.com/300x160?text=医学直播'
      } else {
        ;(event.target as HTMLImageElement).src = 'https://via.placeholder.com/300x160?text=背景图'
      }
    }
    
    // 处理图片加载成功
    const handleImageLoad = (event: Event, plan: Plan, type: 'cover' | 'background') => {
      if (type === 'cover') {
        imageLoaded.value[plan.id] = true
      }
    }
    
    // 获取分支下的日程数量
    const getSchedulesCount = (branch: Branch) => {
      if (!branch.schedules) return t('planSelection.scheduleCount', { count: 0 })
      return t('planSelection.scheduleCount', { count: branch.schedules.length })
    }
    
    onMounted(() => {
      fetchChannels()
    })
    
    return {
      channels,
      loading,
      error,
      userInfo,
      imageLoaded,
      fetchChannels,
      selectBranch,
      handleLogout,
      formatDateTime,
      getSchedulesCount,
      handleImageError,
      handleImageLoad,
      t
    }
  }
})
</script>

<style scoped>
.plan-selection-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background-color: var(--el-bg-color-page);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: var(--el-color-primary);
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 20px;
  color: #fff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.user-info span {
  font-size: 14px;
}

.user-info .el-button {
  color: #fff;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.retry-button {
  margin-top: 16px;
}

.channels-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.channel-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.channel-title {
  margin: 0;
  padding: 16px 24px;
  font-size: 18px;
  color: var(--el-color-primary);
  border-bottom: 1px solid var(--el-border-color-light);
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding: 24px;
}

.plan-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plan-header {
  position: relative;
  padding: 16px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-text-color-primary);
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

.plan-cover {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.plan-cover.loading {
  animation: pulse 1.5s infinite;
  background-color: var(--el-color-info-light-8);
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.plan-cover:hover {
  transform: scale(1.02);
}

.plan-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
  font-size: 32px;
  height: 160px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.plan-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
}

.plan-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.branches-list {
  padding: 8px 16px;
}

.empty-branches {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.branch-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.branch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fff;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.branch-item:hover {
  background-color: #ecf5ff;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.empty-plans {
  display: flex;
  justify-content: center;
  padding: 24px;
}
</style> 