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
import { onMounted } from 'vue';
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

const planStore = usePlanStore();
const router = useRouter();

/**
 * 加载布局模板
 * 从服务器或本地存储加载布局模板数据
 */
async function loadLayoutTemplates() {
  try {
    // 从API获取布局模板数据
    const templates = await layoutApi.loadAllLayoutTemplates();
    
    // 检查模板数据结构
    if (Array.isArray(templates)) {
      // 更新planStore中的布局模板
      planStore.setLayoutTemplates(templates);
    } else {
      console.error('[MainView.vue 主界面] API返回的布局模板数据格式不正确');
    }
  } catch (error) {
    console.error('[MainView.vue 主界面] 加载布局模板失败:', error);
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
}

.canvas-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow: hidden;
}

.canvas-row {
  display: flex;
  gap: 10px;
  height: 40%;
  min-height: 300px;
}

.preview-canvas,
.live-canvas {
  flex: 1;
  min-width: 0; /* 防止flex子项溢出 */
}

.control-panel {
  flex: 1;
  display: flex;
  gap: 10px;
  overflow: auto;
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
  }
  
  .preview-canvas,
  .live-canvas {
    height: 300px;
  }
  
  .control-panel {
    flex-direction: column;
  }
  
  .live-control-panel,
  .schedule-manager,
  .audio-panel {
    flex: none;
    height: 300px;
  }
}
</style> 