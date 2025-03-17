<template>
  <div class="main-view">
    <!-- 标题栏 -->
    <TitleBar class="title-bar" />
    
    <div class="main-view-container">
      <!-- 预览和直播画布区域 -->
      <div class="canvas-area">
        <div class="canvas-row">
          <PreviewCanvas class="preview-canvas" />
          <LiveCanvas class="live-canvas" />
        </div>
        
        <!-- 控制面板区域 -->
        <div class="control-panel">
          <!-- 直播控制面板 -->
          <LiveControlPanel class="live-control-panel" />
          
          <!-- 日程管理组件 -->
          <ScheduleManager class="schedule-manager" />
          
          <!-- 音频面板 -->
          <AudioPanel class="audio-panel" />
        </div>
      </div>
    </div>
    
    <!-- 状态栏 -->
    <StatusBar class="status-bar" />
  </div>
</template>

<script setup lang="ts">
/**
 * 主界面视图
 * 包含标题栏、预览和直播画布、控制面板等组件
 */
import { onMounted, ref } from 'vue';
import { usePlanStore } from '../stores/planStore';
import { useRouter } from 'vue-router';
import TitleBar from '../components/TitleBar.vue';
import PreviewCanvas from '../components/PreviewCanvas.vue';
import LiveCanvas from '../components/LiveCanvas.vue';
import ScheduleManager from '../components/ScheduleManager.vue';
import LiveControlPanel from '../components/LiveControlPanel.vue';
import AudioPanel from '../components/AudioPanel.vue';
import StatusBar from '../components/StatusBar.vue';
import layoutApi from '../api/layout';
import { preloadPlanImages, getCacheStatus } from '../utils/imagePreloader';
import { ElMessage } from 'element-plus';

const planStore = usePlanStore();
const router = useRouter();

// 图片预加载状态
const isPreloading = ref(false);
const preloadProgress = ref(0);

/**
 * 预加载计划中的所有图片资源
 */
async function preloadAllImages() {
  if (!planStore.currentPlan) {
    console.warn('[MainView.vue 主界面] 当前没有选中计划，无法预加载图片');
    return;
  }
  
  try {
    isPreloading.value = true;
    console.log('[MainView.vue 主界面] 开始预加载计划图片资源');
    
    // 预加载计划中的所有图片
    await preloadPlanImages(planStore.currentPlan);
    
    // 获取缓存状态
    const status = getCacheStatus();
    console.log('[MainView.vue 主界面] 图片预加载完成', status);
    
    // 显示预加载成功消息
    ElMessage.success(`图片资源预加载完成，共加载 ${status.cached} 张图片`);
  } catch (error) {
    console.error('[MainView.vue 主界面] 图片预加载失败:', error);
    ElMessage.warning('部分图片资源预加载失败，可能会影响显示效果');
  } finally {
    isPreloading.value = false;
    preloadProgress.value = 100;
  }
}

// 组件挂载时加载布局模板并预加载图片
onMounted(async () => {
  // 如果没有布局模板或需要更新，则从API获取
  if (planStore.needsLayoutTemplateUpdate) {
    try {
      const templates = await layoutApi.getLayoutTemplates();
      planStore.setLayoutTemplates(templates);
    } catch (error) {
      console.error('获取布局模板失败:', error);
      
      // 尝试从本地存储加载
      const loaded = planStore.loadLayoutTemplatesFromLocalStorage();
      if (!loaded) {
        console.error('无法加载布局模板，将跳转到计划选择页面');
        router.push('/plan-selection');
        return;
      }
    }
  }
  
  // 预加载所有图片资源
  if (planStore.currentPlan) {
    preloadAllImages();
  }
});
</script>

<style scoped>
.main-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 0;
}

.title-bar {
  flex-shrink: 0;
}

.main-view-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 10px;
  box-sizing: border-box;
  width: 100%;
  height: calc(100% - 50px - 30px); /* 减去标题栏和状态栏的高度 */
}

.canvas-area {
  width: 100%;
  height: 100%; /* 确保填充父容器高度 */
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow: hidden;
}

.canvas-row {
  display: flex;
  gap: 10px;
  min-height: 394px; /* 设置最小高度为394px */
  height: 45%; /* 设置为容器高度的45% */
}

.preview-canvas,
.live-canvas {
  flex: 1;
  min-width: 0; /* 防止flex子项溢出 */
  height: 100%; /* 确保高度填满父容器 */
}

.control-panel {
  flex: 1;
  display: flex;
  gap: 10px;
  overflow: auto;
  height: calc(55% - 10px); /* 设置为容器高度的55%减去间距 */
}

.live-control-panel {
  flex: 3; /* 控制面板区域比例为3 */
  min-width: 0; /* 防止flex子项溢出 */
}

.schedule-manager {
  flex: 4; /* 日程管理组件比例为4 */
  min-width: 0; /* 防止flex子项溢出 */
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}

.audio-panel {
  flex: 3; /* 音频面板比例为3 */
  min-width: 0; /* 防止flex子项溢出 */
}

.status-bar {
  flex-shrink: 0;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .canvas-row {
    flex-direction: column;
    height: auto;
    min-height: 788px; /* 两个画布的最小高度总和 */
  }
  
  .preview-canvas,
  .live-canvas {
    height: 450px; /* 固定高度 */
    min-height: 394px;
  }
  
  .control-panel {
    flex-direction: column;
    height: auto;
    min-height: 600px; /* 控制面板最小高度 */
  }
  
  .live-control-panel,
  .schedule-manager,
  .audio-panel {
    flex: none;
    height: 300px;
    min-height: 200px;
  }
}
</style> 