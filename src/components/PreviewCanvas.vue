<template>
  <div class="preview-canvas">
    <div class="canvas-header">
      <h3>{{ $t('layoutEditor.preview') }}</h3>
      <div class="header-actions">
        <button class="switch-button" @click="switchToLive">
          {{ $t('layoutEditor.switchToLive') }}
        </button>
      </div>
    </div>
    <div class="canvas-container" ref="canvasContainer">
      <canvas ref="canvas" class="preview-canvas-element"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 预览画布组件
 * 显示当前布局的预览效果
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';
import { createCanvasRenderer, type CanvasRenderer } from '../utils/canvasRenderer';
// import { createWebGLCanvasRenderer, type WebGLCanvasRenderer } from '../utils/webglCanvasRenderer';
import { storeToRefs } from 'pinia';
import { useVideoStore } from '../stores/videoStore';
import { ElMessage } from 'element-plus';
import { getCacheStatus } from '../utils/imagePreloader';

const { t } = useI18n();
const planStore = usePlanStore();
const videoStore = useVideoStore();

// 从planStore中获取预览布局和日程
const { previewingLayout, previewingSchedule } = storeToRefs(planStore);

// 画布引用
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasContainer = ref<HTMLElement | null>(null);
const renderer = ref<CanvasRenderer | WebGLCanvasRenderer | null>(null);
const useWebGL = ref<boolean>(false); // 是否使用WebGL渲染

// 监听窗口大小变化的处理函数
let resizeObserver: ResizeObserver | null = null;

// 定义临时类型，等待WebGL渲染器实现
type WebGLCanvasRenderer = {
  resize: (width: number, height: number) => void;
  setLayout: (layout: any) => void;
  destroy: () => void;
};

// 临时函数，等待WebGL渲染器实现
function createWebGLCanvasRenderer(canvas: HTMLCanvasElement): WebGLCanvasRenderer {
  console.log('[PreviewCanvas.vue] WebGL渲染器尚未实现，使用Canvas 2D渲染器代替');
  return createCanvasRenderer(canvas);
}

/**
 * 初始化画布
 */
function initCanvas() {
  if (!canvas.value || !canvasContainer.value) return;
  
  const canvasElement = canvas.value;
  const container = canvasContainer.value;
  
  // 获取容器尺寸
  const containerRect = container.getBoundingClientRect();
  console.log('[PreviewCanvas.vue 预览画布] 容器尺寸:', containerRect);
  
  // 计算画布尺寸，保持16:9比例
  let width = containerRect.width;
  let height = containerRect.width * (9 / 16);
  
  // 如果计算的高度超过容器高度，则以容器高度为基准
  if (height > containerRect.height) {
    height = containerRect.height;
    width = height * (16 / 9);
  }
  
  console.log('[PreviewCanvas.vue 预览画布] 容器尺寸变化:', width, height);
  
  // 销毁旧的渲染器
  if (renderer.value) {
    renderer.value.destroy();
  }
  
  // 创建新的渲染器
  if (useWebGL.value) {
    console.log('[PreviewCanvas.vue 预览画布] 使用WebGL渲染器');
    renderer.value = createWebGLCanvasRenderer(canvasElement);
  } else {
    console.log('[PreviewCanvas.vue 预览画布] 使用Canvas 2D渲染器');
    renderer.value = createCanvasRenderer(canvasElement);
  }
  
  // 调整画布大小
  renderer.value.resize(width, height);
  
  // 设置当前布局
  if (previewingLayout.value) {
    renderer.value.setLayout(previewingLayout.value);
  }
  
  // 监听容器大小变化
  if (container) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log('[PreviewCanvas.vue 预览画布] 容器尺寸变化:', width, height);
        
        if (width > 0 && height > 0 && renderer.value) {
          renderer.value.resize(width, height);
        }
      }
    });
    
    resizeObserver.observe(container);
  }
}

/**
 * 切换到直播
 */
function switchToLive() {
  // 将预览的日程和布局设置为直播的日程和布局
  if (previewingSchedule.value && previewingLayout.value) {
    planStore.switchPreviewToLive();
    ElMessage.success(t('layoutEditor.switchedToLive'));
  } else {
    ElMessage.warning(t('layoutEditor.noPreviewToSwitch'));
  }
}

// 监听预览布局变化
watch(previewingLayout, (newLayout) => {
  if (renderer.value) {
    // 设置布局，如果布局为null则传递null
    renderer.value.setLayout(newLayout || null);
    
    // 如果布局变化且有背景图，打印日志以便调试
    if (newLayout && newLayout.background) {
      console.log('[PreviewCanvas.vue 预览画布] 布局背景图:', newLayout.background);
      
      // 检查图片是否已预加载
      const status = getCacheStatus();
      console.log('[PreviewCanvas.vue 预览画布] 图片缓存状态:', status);
    }
  }
});

// 组件挂载时初始化
onMounted(() => {
  // 使用setTimeout确保DOM完全渲染后再初始化画布
  setTimeout(() => {
    initCanvas();
    
    // 确保视频设备已初始化
    if (videoStore.activeDevices.length === 0) {
      videoStore.initVideoDevices();
    }
  }, 100);
});

// 组件卸载时清理资源
onUnmounted(() => {
  // 销毁渲染器
  if (renderer.value) {
    renderer.value.destroy();
    renderer.value = null;
  }
  
  // 移除大小监听
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped>
.preview-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.canvas-header {
  padding: 10px 15px;
  background-color: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.canvas-header h3 {
  margin: 0;
  font-size: var(--el-font-size-medium);
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.switch-button {
  padding: 4px 12px;
  background-color: var(--el-color-primary);
  color: #fff;
  border: none;
  border-radius: var(--el-border-radius-small);
  font-size: var(--el-font-size-small);
  cursor: pointer;
  transition: background-color 0.3s;
  line-height: 1.5;
}

.switch-button:hover {
  background-color: var(--el-color-primary-dark-2);
}

.canvas-container {
  flex: 1;
  position: relative;
  background-color: #000;
  width: 100%;
  height: 100%; /* 使用100%高度填充父容器 */
  overflow: hidden;
}

.preview-canvas-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important; /* 强制宽度100% */
  height: 100% !important; /* 强制高度100% */
  object-fit: contain;
}
</style> 