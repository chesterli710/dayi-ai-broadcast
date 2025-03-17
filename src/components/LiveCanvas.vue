<template>
  <div class="live-canvas">
    <div class="canvas-header">
      <h3>{{ $t('layoutEditor.live') }}</h3>
      <div class="stream-status">
        <span class="status-indicator" :class="{ 'active': isStreaming }"></span>
        <span>{{ isStreaming ? $t('layoutEditor.streaming') : $t('layoutEditor.notStarted') }}</span>
      </div>
    </div>
    <div class="canvas-container" ref="canvasContainer">
      <canvas ref="canvas" class="live-canvas-element"></canvas>
      <div class="live-status" v-if="isStreaming">
        {{ $t('liveCanvas.liveStatus') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 直播画布组件
 * 显示当前直播的实际输出效果
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';
import { createLiveCanvasRenderer, type CanvasRenderer } from '../utils/canvasRenderer';
// import { createWebGLCanvasRenderer, type WebGLCanvasRenderer } from '../utils/webglCanvasRenderer';
import { storeToRefs } from 'pinia';
import { useVideoStore } from '../stores/videoStore';
import { getCacheStatus } from '../utils/imagePreloader';

const { t } = useI18n();
const planStore = usePlanStore();
const videoStore = useVideoStore();

// 从planStore中获取直播状态
const { liveLayout, liveSchedule, isStreaming, liveLayoutEditedEvent } = storeToRefs(planStore);

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
  onLayoutEdited?: () => void; // 添加可选的onLayoutEdited方法
};

// 临时函数，等待WebGL渲染器实现
function createWebGLCanvasRenderer(canvas: HTMLCanvasElement): WebGLCanvasRenderer {
  console.log('[LiveCanvas.vue] WebGL渲染器尚未实现，使用Canvas 2D渲染器代替');
  return createLiveCanvasRenderer(canvas);
}

/**
 * 初始化画布
 */
function initCanvas() {
  if (!canvas.value || !canvasContainer.value) {
    console.error('[LiveCanvas.vue 直播画布] 无法初始化画布：canvas或container为null');
    return;
  }
  
  const canvasElement = canvas.value;
  const container = canvasContainer.value;
  
  // 获取容器尺寸
  const containerRect = container.getBoundingClientRect();
  console.log('[LiveCanvas.vue 直播画布] 容器尺寸:', {
    width: containerRect.width,
    height: containerRect.height
  });
  
  // 计算画布尺寸，保持16:9比例
  let width = containerRect.width;
  let height = containerRect.width * (9 / 16);
  
  // 如果计算的高度超过容器高度，则以容器高度为基准
  if (height > containerRect.height) {
    height = containerRect.height;
    width = height * (16 / 9);
  }
  
  // 确保尺寸为整数
  width = Math.floor(width);
  height = Math.floor(height);
  
  console.log('[LiveCanvas.vue 直播画布] 计算的画布尺寸:', {
    width,
    height,
    ratio: (width / height).toFixed(2)
  });
  
  // 销毁旧的渲染器
  if (renderer.value) {
    console.log('[LiveCanvas.vue 直播画布] 销毁旧渲染器');
    renderer.value.destroy();
    renderer.value = null;
  }
  
  try {
    // 创建新的渲染器
    if (useWebGL.value) {
      console.log('[LiveCanvas.vue 直播画布] 使用WebGL渲染器');
      renderer.value = createWebGLCanvasRenderer(canvasElement);
    } else {
      console.log('[LiveCanvas.vue 直播画布] 使用Canvas 2D渲染器');
      renderer.value = createLiveCanvasRenderer(canvasElement);
    }
    
    // 确保渲染器已创建
    if (!renderer.value) {
      console.error('[LiveCanvas.vue 直播画布] 渲染器创建失败');
      return;
    }
    
    // 调整画布大小
    console.log('[LiveCanvas.vue 直播画布] 设置画布尺寸:', width, height);
    renderer.value.resize(width, height);
    
    // 设置当前布局
    if (liveLayout.value) {
      console.log('[LiveCanvas.vue 直播画布] 设置初始布局:', {
        id: liveLayout.value.id,
        template: liveLayout.value.template
      });
      renderer.value.setLayout(liveLayout.value);
    } else {
      console.log('[LiveCanvas.vue 直播画布] 没有初始布局可设置');
    }
    
    // 监听容器大小变化
    if (container) {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          
          // 只有当尺寸变化超过一定阈值时才调整画布
          if (width > 0 && height > 0 && renderer.value) {
            console.log('[LiveCanvas.vue 直播画布] 容器尺寸变化:', {
              width: Math.floor(width),
              height: Math.floor(height)
            });
            
            // 计算新的画布尺寸，保持16:9比例
            let newWidth = width;
            let newHeight = width * (9 / 16);
            
            if (newHeight > height) {
              newHeight = height;
              newWidth = height * (16 / 9);
            }
            
            // 确保尺寸为整数
            newWidth = Math.floor(newWidth);
            newHeight = Math.floor(newHeight);
            
            renderer.value.resize(newWidth, newHeight);
          }
        }
      });
      
      resizeObserver.observe(container);
      console.log('[LiveCanvas.vue 直播画布] 已设置容器大小监听');
    }
  } catch (error) {
    console.error('[LiveCanvas.vue 直播画布] 初始化画布时出错:', error);
  }
}

/**
 * 切换渲染器类型
 */
function toggleRenderer() {
  useWebGL.value = !useWebGL.value;
  initCanvas();
}

// 监听直播布局变化
watch(liveLayout, (newLayout, oldLayout) => {
  if (renderer.value) {
    // 检查布局是否真的变化了（包括内容变化）
    const isLayoutChanged = !oldLayout || 
      !newLayout || 
      oldLayout.id !== newLayout.id || 
      oldLayout.template !== newLayout.template ||
      JSON.stringify(oldLayout) !== JSON.stringify(newLayout);
    
    if (isLayoutChanged) {
      console.log('[LiveCanvas.vue 直播画布] 布局发生变化，重新设置布局', {
        oldLayoutId: oldLayout?.id,
        newLayoutId: newLayout?.id,
        hasElements: !!(newLayout as any)?.elements,
        elementsCount: (newLayout as any)?.elements?.length || 0
      });
      
      // 设置布局，如果布局为null则传递null
      renderer.value.setLayout(newLayout || null);
      
      // 如果布局变化且有背景图，打印日志以便调试
      if (newLayout && newLayout.background) {
        console.log('[LiveCanvas.vue 直播画布] 布局背景图:', newLayout.background);
        
        // 检查图片是否已预加载
        const status = getCacheStatus();
        console.log('[LiveCanvas.vue 直播画布] 图片缓存状态:', status);
      }
    } else {
      // 即使布局引用没有变化，也检查元素的sourceId/sourceName/sourceType是否变化
      if (newLayout && oldLayout && newLayout.elements && oldLayout.elements) {
        let mediaElementsChanged = false;
        
        // 检查媒体元素的sourceId/sourceName/sourceType是否变化
        for (let i = 0; i < newLayout.elements.length; i++) {
          const newElement = newLayout.elements[i];
          const oldElement = oldLayout.elements[i];
          
          if (newElement.type === 'media' && oldElement.type === 'media') {
            const newMedia = newElement as any;
            const oldMedia = oldElement as any;
            
            if (
              newMedia.sourceId !== oldMedia.sourceId ||
              newMedia.sourceName !== oldMedia.sourceName ||
              newMedia.sourceType !== oldMedia.sourceType
            ) {
              mediaElementsChanged = true;
              console.log('[LiveCanvas.vue 直播画布] 媒体元素源信息变化:', {
                elementId: newMedia.id,
                oldSourceId: oldMedia.sourceId,
                newSourceId: newMedia.sourceId,
                oldSourceName: oldMedia.sourceName,
                newSourceName: newMedia.sourceName
              });
              break;
            }
          }
        }
        
        if (mediaElementsChanged) {
          console.log('[LiveCanvas.vue 直播画布] 媒体元素源信息变化，更新布局元素');
          
          // 如果渲染器支持updateLayoutElements方法，直接更新元素
          if (typeof (renderer.value as any).updateLayoutElements === 'function') {
            console.log('[LiveCanvas.vue 直播画布] 使用updateLayoutElements方法更新布局元素');
            (renderer.value as any).updateLayoutElements(newLayout.elements);
          } else {
            // 如果渲染器没有updateLayoutElements方法，则重新设置布局
            console.log('[LiveCanvas.vue 直播画布] 重新设置布局');
            renderer.value.setLayout(newLayout);
          }
        } else {
          console.log('[LiveCanvas.vue 直播画布] 布局引用变化但内容相同，不重新设置布局');
        }
      }
    }
  }
}, { deep: true });

// 监听直播布局编辑事件
watch(liveLayoutEditedEvent, (newValue) => {
  if (newValue && renderer.value && liveLayout.value) {
    console.log('[LiveCanvas.vue 直播画布] 检测到布局编辑事件，更新渲染器', {
      layoutId: liveLayout.value.id,
      hasElements: !!(liveLayout.value as any).elements,
      elementsCount: (liveLayout.value as any).elements?.length || 0
    });
    
    // 检查布局是否有元素数据
    const layoutWithElements = liveLayout.value as any;
    if (layoutWithElements.elements && layoutWithElements.elements.length > 0) {
      // 如果渲染器支持updateLayoutElements方法，直接更新元素
      if (typeof (renderer.value as any).updateLayoutElements === 'function') {
        console.log('[LiveCanvas.vue 直播画布] 使用updateLayoutElements方法更新布局元素');
        (renderer.value as any).updateLayoutElements(layoutWithElements.elements);
      } else if (typeof (renderer.value as any).onLayoutEdited === 'function') {
        // 调用渲染器的onLayoutEdited方法通知布局已编辑
        console.log('[LiveCanvas.vue 直播画布] 使用onLayoutEdited方法通知布局已编辑');
        (renderer.value as any).onLayoutEdited();
      } else {
        // 如果渲染器没有上述方法，则重新设置布局
        console.log('[LiveCanvas.vue 直播画布] 重新设置布局');
        renderer.value.setLayout(liveLayout.value);
      }
    } else {
      console.warn('[LiveCanvas.vue 直播画布] 布局没有元素数据，无法更新');
      // 重新设置布局，确保渲染器使用最新的布局数据
      renderer.value.setLayout(liveLayout.value);
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
  
  // 移除ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
.live-canvas {
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

.stream-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-regular);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--el-text-color-disabled);
}

.status-indicator.active {
  background-color: var(--el-color-danger);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.canvas-container {
  flex: 1;
  position: relative;
  background-color: #000;
  width: 100%;
  height: 100%; /* 使用100%高度填充父容器 */
  overflow: hidden;
}

.live-canvas-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important; /* 强制宽度100% */
  height: 100% !important; /* 强制高度100% */
  object-fit: contain;
}
</style> 