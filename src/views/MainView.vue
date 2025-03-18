<template>
  <div class="main-view">
    <!-- 标题栏 -->
    <TitleBar class="title-bar" />
    
    <div class="main-view-container">
      <!-- 预览和直播画布区域 -->
      <div class="canvas-area">
        <div class="canvas-row" ref="canvasRowRef">
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
import { onMounted, ref, onBeforeUnmount, nextTick } from 'vue';
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

// 引用canvas行元素
const canvasRowRef = ref<HTMLElement | null>(null);

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

/**
 * 调整画布行高度，使画布区域始终保持16:9的比例
 */
function adjustCanvasHeight() {
  if (!canvasRowRef.value) return;
  
  const canvasRow = canvasRowRef.value;
  const container = canvasRow.parentElement;
  if (!container) return;
  
  // 考虑到画布行中有两个画布，每个都有间隔，计算单个画布的宽度
  const containerWidth = container.clientWidth;
  const gapWidth = 10; // 两个画布之间的间隔
  const singleCanvasWidth = (containerWidth - gapWidth) / 2;
  
  // 标题栏高度
  const titleBarHeight = 45;
  
  // 根据16:9比例计算画布区域高度
  const canvasAreaHeight = Math.round((singleCanvasWidth / 16) * 9);
  
  // 最终行高度 = 画布区域高度 + 标题栏高度
  const rowHeight = canvasAreaHeight + titleBarHeight;
  
  console.log(`[MainView.vue 主界面] 调整画布行高度: 容器宽度=${containerWidth}px, 单画布宽度=${singleCanvasWidth}px, 画布区域高度=${canvasAreaHeight}px, 行高=${rowHeight}px`);
  
  // 设置画布行高度
  canvasRow.style.height = `${rowHeight}px`;
  
  // 设置控制面板高度 = 容器高度 - 画布行高度 - 间隔
  const controlPanel = document.querySelector('.control-panel') as HTMLElement;
  if (controlPanel) {
    const totalHeight = container.clientHeight;
    const controlPanelHeight = totalHeight - rowHeight - gapWidth;
    controlPanel.style.height = `${Math.max(controlPanelHeight, 200)}px`; // 确保最小高度为200px
  }
}

// 创建一个调整大小观察器
let resizeObserver: ResizeObserver | null = null;

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
  
  // 等待DOM更新后再进行初始调整
  nextTick(() => {
    adjustCanvasHeight();
    
    // 创建ResizeObserver监听容器大小变化
    if (window.ResizeObserver && canvasRowRef.value) {
      resizeObserver = new ResizeObserver(() => {
        adjustCanvasHeight();
      });
      
      // 监听画布行的父元素
      const parent = canvasRowRef.value.parentElement;
      if (parent) {
        resizeObserver.observe(parent);
      }
      
      // 监听窗口大小变化
      window.addEventListener('resize', adjustCanvasHeight);
    }
  });
});

// 组件卸载前清理资源
onBeforeUnmount(() => {
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', adjustCanvasHeight);
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
  /* 高度将通过JavaScript动态计算设置 */
  min-height: 250px; /* 设置一个最小高度，防止布局问题 */
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
  /* 高度将通过JavaScript动态计算设置 */
  min-height: 200px; /* 设置一个最小高度，防止布局问题 */
}

.live-control-panel {
  flex: 3; /* 控制面板区域比例为3 */
  min-width: 0; /* 防止flex子项溢出 */
}

.schedule-manager {
  flex: 3.5; /* 日程管理组件比例为3.5 */
  min-width: 0; /* 防止flex子项溢出 */
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}

.audio-panel {
  flex: 3.5; /* 音频面板比例为3.5 */
  min-width: 0; /* 防止flex子项溢出 */
}

.status-bar {
  flex-shrink: 0;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .canvas-row {
    flex-direction: column;
    height: auto !important; /* 覆盖JavaScript设置的高度 */
  }
  
  .preview-canvas,
  .live-canvas {
    height: auto; /* 高度将通过JavaScript动态计算设置 */
    aspect-ratio: 16/9; /* 使用CSS的aspect-ratio属性保持16:9比例 */
    min-height: 200px;
    margin-bottom: 10px;
  }
  
  .control-panel {
    flex-direction: column;
    height: auto !important; /* 覆盖JavaScript设置的高度 */
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