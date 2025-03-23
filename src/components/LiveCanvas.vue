<template>
  <div class="live-canvas-component">
    <!-- 标题栏 -->
    <div class="panel-header">
      <h3>{{ $t('liveCanvas.title', '直播') }}</h3>
      <div class="header-actions">
        <!-- 预留标题栏右侧操作区 -->
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="panel-content">
      <canvas ref="canvasRef" class="live-canvas-element"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 直播画布组件
 * 用于显示直播内容，包含标题栏和画布区域
 */
import { ref, onMounted, onUnmounted, watch } from 'vue';
import canvasRenderer from '../utils/canvasRenderer';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';

const { t } = useI18n();
const planStore = usePlanStore();

// canvas引用
const canvasRef = ref<HTMLCanvasElement | null>(null);

/**
 * 渲染画布
 */
const renderCanvas = () => {
  if (!canvasRef.value) return;
  
  // 检查当前是否有直播中的日程和布局
  if (planStore.liveSchedule && planStore.liveLayout) {
    // 使用canvasRenderer渲染直播画布
    canvasRenderer.renderLiveCanvas(
      canvasRef.value, 
      planStore.liveSchedule.id, 
      planStore.liveLayout.id
    );
  } else {
    // 如果没有直播中的日程和布局，显示空黑色背景
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
  }
};

/**
 * 初始化画布
 */
const initCanvas = () => {
  if (!canvasRef.value) return;
  
  // 设置画布固定尺寸为1920*1080，仅在初始化时设置一次
  canvasRef.value.width = 1920;
  canvasRef.value.height = 1080;
  
  // 渲染画布
  renderCanvas();
};

// 监听直播日程和布局变化
watch(
  () => [planStore.liveSchedule, planStore.liveLayout],
  () => {
    renderCanvas();
  }
);

// 监听直播布局编辑事件
watch(
  () => planStore.liveLayoutEditedEvent,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      console.log('[LiveCanvas.vue 直播画布] 检测到布局编辑事件，刷新画布...');
      
      // 检查是否有直播中的日程和布局
      if (planStore.liveSchedule && planStore.liveLayout) {
        // 使用canvasRenderer刷新直播画布
        canvasRenderer.refreshLiveCanvas();
      }
    }
  }
);

onMounted(() => {
  initCanvas();
});

onUnmounted(() => {
  // 停止渲染
  canvasRenderer.stopLiveRender();
});
</script>

<style scoped>
.live-canvas-component {
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.panel-header {
  padding: 8px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.panel-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.live-canvas-element {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain; /* 保持画布比例 */
}
</style> 