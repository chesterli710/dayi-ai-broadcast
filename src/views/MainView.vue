<template>
  <div class="main-view">
    <div class="main-view-container">
      <!-- 日程管理组件 -->
      <ScheduleManager class="schedule-manager" />
      
      <!-- 其他主界面组件将在这里添加 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { usePlanStore } from '../stores/planStore';
import ScheduleManager from '../components/ScheduleManager.vue';
import layoutApi from '../api/layout';
import { useRouter } from 'vue-router';

const planStore = usePlanStore();
const router = useRouter();

/**
 * 加载布局模板
 * 从服务器或本地存储加载布局模板数据
 */
async function loadLayoutTemplates() {
  try {
    // 从API获取布局模板数据
    const templates = await layoutApi.getLayoutTemplates();
    
    // 检查模板数据结构
    if (Array.isArray(templates)) {
      // 更新planStore中的布局模板
      planStore.setLayoutTemplates(templates);
    } else {
      console.error('API返回的布局模板数据格式不正确');
    }
  } catch (error) {
    console.error('加载布局模板失败:', error);
  }
}

onMounted(async () => {
  // 确保已经选择了计划分支
  if (!planStore.currentBranch) {
    // 重定向到计划选择页面
    router.push('/plan-selection');
    return;
  }
  
  // 加载布局模板
  await loadLayoutTemplates();
});
</script>

<style scoped>
.main-view {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.main-view-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.schedule-manager {
  width: 25%;
  height: 400px;
  overflow: auto;
  border-right: 1px solid #e0e0e0;
}
</style> 