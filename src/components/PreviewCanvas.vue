<template>
  <div class="preview-canvas-component">
    <!-- 标题栏 -->
    <div class="panel-header">
      <h3>{{ $t('previewCanvas.title', '预览') }}</h3>
      <div class="header-actions">
        <el-button 
          type="primary" 
          size="small" 
          class="switch-button"
          @click="handleSwitch"
          :disabled="!canSwitch"
        >
          <el-icon><Refresh /></el-icon>
          <span>{{ $t('previewCanvas.switch', '切换') }}</span>
        </el-button>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="panel-content">
      <canvas ref="canvasRef" class="preview-canvas-element"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 预览画布组件
 * 用于显示预览内容，包含标题栏和画布区域
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import canvasRenderer from '../utils/canvasRenderer';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';

const { t } = useI18n();
const planStore = usePlanStore();

// canvas引用
const canvasRef = ref<HTMLCanvasElement | null>(null);

/**
 * 计算是否可以切换到直播
 */
const canSwitch = computed(() => {
  return !!planStore.previewingSchedule && !!planStore.previewingLayout;
});

/**
 * 处理切换按钮点击事件
 */
const handleSwitch = () => {
  console.log('[PreviewCanvas.vue 预览画布] 切换按钮被点击');
  
  // 确保有预览中的日程和布局
  if (!planStore.previewingSchedule || !planStore.previewingLayout) {
    return;
  }

  // 情况1: 当直播日程布局为空时，直接复制预览日程布局的值
  if (!planStore.liveSchedule || !planStore.liveLayout) {
    planStore.setLiveScheduleAndLayout(
      planStore.previewingSchedule,
      planStore.previewingLayout
    );
    console.log('[PreviewCanvas.vue 预览画布] 将预览内容设置为直播内容');
  } 
  // 情况2: 当直播日程布局不为空时，交换预览和直播的日程布局值
  else {
    // 暂存直播中的日程和布局
    const tempSchedule = planStore.liveSchedule;
    const tempLayout = planStore.liveLayout;
    
    // 将预览中的日程和布局设置为直播
    planStore.setLiveScheduleAndLayout(
      planStore.previewingSchedule,
      planStore.previewingLayout
    );
    
    // 将之前直播中的日程和布局设置为预览
    planStore.setPreviewingScheduleAndLayout(
      tempSchedule,
      tempLayout
    );
    
    console.log('[PreviewCanvas.vue 预览画布] 交换预览和直播内容');
  }
  
  // 注意：不需要在这里直接清理资源
  // canvasRenderer会在渲染首帧后自动清理不再使用的媒体源
};

/**
 * 渲染画布
 */
const renderCanvas = () => {
  if (!canvasRef.value) return;
  
  // 检查当前是否有正在预览的日程和布局
  if (planStore.previewingSchedule && planStore.previewingLayout) {
    // 使用canvasRenderer渲染预览画布
    canvasRenderer.renderPreviewCanvas(
      canvasRef.value, 
      planStore.previewingSchedule.id, 
      planStore.previewingLayout.id
    );
  } else {
    // 如果没有预览中的日程和布局，显示空黑色背景
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

// 监听预览日程和布局变化
watch(
  () => [planStore.previewingSchedule, planStore.previewingLayout],
  () => {
    renderCanvas();
  }
);

onMounted(() => {
  initCanvas();
});

onUnmounted(() => {
  // 停止渲染
  canvasRenderer.stopPreviewRender();
});
</script>

<style scoped>
.preview-canvas-component {
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

.switch-button {
  display: flex;
  align-items: center;
  gap: 5px;
}

.panel-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-canvas-element {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain; /* 保持画布比例 */
}
</style> 