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
import { createPreviewCanvasRenderer, type CanvasRenderer } from '../utils/canvasRenderer';
// import { createWebGLCanvasRenderer, type WebGLCanvasRenderer } from '../utils/webglCanvasRenderer';
import { storeToRefs } from 'pinia';
import { useVideoStore } from '../stores/videoStore';
import { ElMessage } from 'element-plus';
import { getCacheStatus } from '../utils/imagePreloader';

const { t } = useI18n();
const planStore = usePlanStore();
const videoStore = useVideoStore();

// 从planStore中获取预览布局和日程
const { previewingLayout, previewingSchedule, previewLayoutEditedEvent } = storeToRefs(planStore);

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
  console.log('[PreviewCanvas.vue] WebGL渲染器尚未实现，使用Canvas 2D渲染器代替');
  return createPreviewCanvasRenderer(canvas);
}

/**
 * 初始化画布
 */
function initCanvas() {
  if (!canvas.value || !canvasContainer.value) {
    console.error('[PreviewCanvas.vue 预览画布] 无法初始化画布：canvas或container为null');
    return;
  }
  
  const canvasElement = canvas.value;
  const container = canvasContainer.value;
  
  // 获取容器尺寸
  const containerRect = container.getBoundingClientRect();
  console.log('[PreviewCanvas.vue 预览画布] 容器尺寸:', {
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
  
  console.log('[PreviewCanvas.vue 预览画布] 计算的画布尺寸:', {
    width,
    height,
    ratio: (width / height).toFixed(2)
  });
  
  // 设置画布元素的样式
  canvasElement.style.width = '100%';
  canvasElement.style.height = '100%';
  canvasElement.style.objectFit = 'contain';
  
  // 销毁旧的渲染器
  if (renderer.value) {
    console.log('[PreviewCanvas.vue 预览画布] 销毁旧渲染器');
    renderer.value.destroy();
    renderer.value = null;
  }
  
  try {
    // 创建新的渲染器
    if (useWebGL.value) {
      console.log('[PreviewCanvas.vue 预览画布] 使用WebGL渲染器');
      renderer.value = createWebGLCanvasRenderer(canvasElement);
    } else {
      console.log('[PreviewCanvas.vue 预览画布] 使用Canvas 2D渲染器');
      renderer.value = createPreviewCanvasRenderer(canvasElement);
    }
    
    // 确保渲染器已创建
    if (!renderer.value) {
      console.error('[PreviewCanvas.vue 预览画布] 渲染器创建失败');
      return;
    }
    
    // 调整画布大小
    console.log('[PreviewCanvas.vue 预览画布] 设置画布尺寸:', width, height);
    renderer.value.resize(width, height);
    
    // 设置当前布局
    if (previewingLayout.value) {
      console.log('[PreviewCanvas.vue 预览画布] 设置初始布局:', {
        id: previewingLayout.value.id,
        template: previewingLayout.value.template
      });
      renderer.value.setLayout(previewingLayout.value);
    } else {
      console.log('[PreviewCanvas.vue 预览画布] 没有初始布局可设置');
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
            console.log('[PreviewCanvas.vue 预览画布] 容器尺寸变化:', {
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
            
            // 更新画布样式
            canvasElement.style.width = '100%';
            canvasElement.style.height = '100%';
            
            // 调整渲染器尺寸
            renderer.value.resize(newWidth, newHeight);
          }
        }
      });
      
      resizeObserver.observe(container);
      console.log('[PreviewCanvas.vue 预览画布] 已设置容器大小监听');
    }
  } catch (error) {
    console.error('[PreviewCanvas.vue 预览画布] 初始化画布时出错:', error);
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
watch(previewingLayout, (newLayout, oldLayout) => {
  if (renderer.value) {
    // 检查布局是否真的变化了（包括内容变化）
    const isLayoutChanged = !oldLayout || 
      !newLayout || 
      oldLayout.id !== newLayout.id || 
      oldLayout.template !== newLayout.template ||
      JSON.stringify(oldLayout) !== JSON.stringify(newLayout);
    
    if (isLayoutChanged) {
      console.log('[PreviewCanvas.vue 预览画布] 布局发生变化，重新设置布局', {
        oldLayoutId: oldLayout?.id,
        newLayoutId: newLayout?.id,
        hasElements: !!(newLayout as any)?.elements,
        elementsCount: (newLayout as any)?.elements?.length || 0
      });
      
      // 设置布局，如果布局为null则传递null
      renderer.value.setLayout(newLayout || null);
      
      // 如果布局变化且有背景图，打印日志以便调试
      if (newLayout && newLayout.background) {
        console.log('[PreviewCanvas.vue 预览画布] 布局背景图:', newLayout.background);
        
        // 检查图片是否已预加载
        const status = getCacheStatus();
        console.log('[PreviewCanvas.vue 预览画布] 图片缓存状态:', status);
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
              console.log('[PreviewCanvas.vue 预览画布] 媒体元素源信息变化:', {
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
          console.log('[PreviewCanvas.vue 预览画布] 媒体元素源信息变化，更新布局元素');
          
          // 如果渲染器支持updateLayoutElements方法，直接更新元素
          if (typeof (renderer.value as any).updateLayoutElements === 'function') {
            console.log('[PreviewCanvas.vue 预览画布] 使用updateLayoutElements方法更新布局元素');
            (renderer.value as any).updateLayoutElements(newLayout.elements);
          } else {
            // 如果渲染器没有updateLayoutElements方法，则重新设置布局
            console.log('[PreviewCanvas.vue 预览画布] 重新设置布局');
            renderer.value.setLayout(newLayout);
          }
        } else {
          console.log('[PreviewCanvas.vue 预览画布] 布局引用变化但内容相同，不重新设置布局');
        }
      }
    }
  }
}, { deep: true });

// 监听预览布局编辑事件
watch(previewLayoutEditedEvent, (newValue) => {
  if (newValue && renderer.value && previewingLayout.value) {
    console.log('[PreviewCanvas.vue 预览画布] 检测到布局编辑事件，更新渲染器', {
      layoutId: previewingLayout.value.id,
      hasElements: !!(previewingLayout.value as any).elements,
      elementsCount: (previewingLayout.value as any).elements?.length || 0
    });
    
    // 检查布局是否有元素数据
    const layoutWithElements = previewingLayout.value as any;
    if (layoutWithElements.elements && layoutWithElements.elements.length > 0) {
      // 如果渲染器支持updateLayoutElements方法，直接更新元素
      if (typeof (renderer.value as any).updateLayoutElements === 'function') {
        console.log('[PreviewCanvas.vue 预览画布] 使用updateLayoutElements方法更新布局元素');
        (renderer.value as any).updateLayoutElements(layoutWithElements.elements);
      } else if (typeof (renderer.value as any).onLayoutEdited === 'function') {
        // 调用渲染器的onLayoutEdited方法通知布局已编辑
        console.log('[PreviewCanvas.vue 预览画布] 使用onLayoutEdited方法通知布局已编辑');
        (renderer.value as any).onLayoutEdited();
      } else {
        // 如果渲染器没有上述方法，则重新设置布局
        console.log('[PreviewCanvas.vue 预览画布] 重新设置布局');
        renderer.value.setLayout(previewingLayout.value);
      }
    } else {
      console.warn('[PreviewCanvas.vue 预览画布] 布局没有元素数据，无法更新');
      // 重新设置布局，确保渲染器使用最新的布局数据
      renderer.value.setLayout(previewingLayout.value);
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

/* 移除重复的样式，使用全局样式 */
/* .canvas-header {
  padding: 10px 15px;
  height:45px;
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
} */

.header-actions {
  display: flex;
  gap: 10px;
}

.switch-button {
  padding: 0px 12px;
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
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-canvas-element {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
}
</style> 