<template>
  <div class="layout-editor-modal" v-if="visible">
    <div class="modal-overlay" @click="handleClose"></div>
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">{{ $t('layoutEditor.title') }}</h2>
        <button class="close-button" @click="handleClose">
          <span class="close-icon">×</span>
        </button>
      </div>
      
      <div class="modal-content">
        <!-- 左侧布局预览区 -->
        <div class="layout-preview-container">
          <div 
            class="layout-preview" 
            :style="{ 
              backgroundImage: layoutCopy.background ? `url(${layoutCopy.background})` : 'none',
              width: `${previewWidth}px`,
              height: `${previewHeight}px`
            }"
          >
            <!-- 渲染媒体元素占位符 -->
            <div 
              v-for="element in mediaElements" 
              :key="element.id"
              class="media-element-placeholder"
              :class="{ 'has-source': element.sourceId }"
              :style="getElementStyle(element)"
              @dragover.prevent
              @drop="handleDrop($event, element)"
              @mouseenter="hoveredElement = element.id || null"
              @mouseleave="hoveredElement = null"
            >
              <!-- 删除按钮 - 仅在有媒体源且鼠标悬停时显示 -->
              <div 
                v-if="element.sourceId && hoveredElement === element.id" 
                class="delete-source-button"
                @click.stop="clearMediaElement(element)"
                :title="$t('layoutEditor.deleteSource')"
              >
                <i class="bi bi-trash" style="font-size: 18px; color: #ffffff;"></i>
              </div>
              
              <!-- 如果有媒体源，显示预览 -->
              <template v-if="element.sourceId">
                <!-- 视频预览（摄像头/窗口/显示器） -->
                <video 
                  v-if="getSourceType(element.sourceId) === 'camera' || 
                        getSourceType(element.sourceId) === 'window' || 
                        getSourceType(element.sourceId) === 'display'"
                  :id="`video-preview-${element.sourceId}`"
                  autoplay
                  muted
                  playsinline
                  class="media-preview"
                ></video>
                
                <!-- 备用：如果视频流不可用，显示缩略图 -->
                <img 
                  v-else
                  :src="getSourceThumbnail(element.sourceId)"
                  class="media-preview"
                  alt="媒体预览"
                />
              </template>
              
              <!-- 如果没有媒体源，显示提示 -->
              <div v-else class="placeholder-hint">
                <div class="placeholder-icon">+</div>
                <div class="placeholder-text">{{ $t('layoutEditor.dragHint') }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧媒体源列表 -->
        <div class="media-sources-container">
          <div class="sources-header">
            <h3>{{ $t('layoutEditor.mediaSources') }}</h3>
            <button class="refresh-button" @click="refreshSources" :disabled="isRefreshing">
              <span v-if="isRefreshing">{{ $t('layoutEditor.refreshing') }}</span>
              <span v-else>{{ $t('layoutEditor.refresh') }}</span>
            </button>
          </div>
          
          <!-- 媒体源分组 -->
          <div class="sources-groups">
            <div 
              v-for="group in videoStore.videoSourceGroups" 
              :key="group.type"
              class="source-group"
            >
              <h4 class="group-title">{{ group.title }}</h4>
              
              <div class="source-list">
                <div 
                  v-for="source in group.sources" 
                  :key="source.id"
                  class="source-item"
                  draggable="true"
                  @dragstart="handleDragStart($event, source)"
                  @click="previewSource(source)"
                >
                  <!-- 摄像头视频预览 -->
                  <div 
                    v-if="source.stream && source.type === 'camera'"
                    class="source-preview-container"
                  >
                    <video 
                      :id="`video-source-${source.id}`"
                      autoplay
                      muted
                      playsinline
                      class="source-preview"
                    ></video>
                  </div>
                  
                  <!-- 窗口和显示器始终使用缩略图 -->
                  <div 
                    v-else-if="(source.type === 'window' || source.type === 'display') && source.thumbnail && source.thumbnail.length > 22"
                    class="source-preview-container"
                    :class="{ 'window-capture': source.type === 'window', 'display-capture': source.type === 'display' }"
                  >
                    <img 
                      :src="source.thumbnail"
                      class="source-preview"
                      alt="媒体预览"
                      @error="handleImageError($event, source)"
                    />
                  </div>
                  
                  <!-- 其他设备的缩略图预览 -->
                  <div 
                    v-else-if="source.thumbnail && source.thumbnail.length > 22"
                    class="source-preview-container"
                  >
                    <img 
                      :src="source.thumbnail"
                      class="source-preview"
                      alt="媒体预览"
                      @error="handleImageError($event, source)"
                    />
                  </div>
                  
                  <!-- 默认占位图 -->
                  <div v-else class="source-placeholder">
                    <span class="placeholder-icon">{{ getSourceIcon(source.type) }}</span>
                    <span class="placeholder-text">{{ source.name }}</span>
                  </div>
                  
                  <div class="source-name">{{ source.name }}</div>
                </div>
                
                <!-- 空状态 -->
                <div v-if="group.sources.length === 0" class="empty-sources">
                  <p>{{ $t('layoutEditor.noAvailableSources', { type: group.title }) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" @click="handleClose">{{ $t('common.cancel') }}</button>
        <button class="save-button" @click="showSaveOptions">{{ $t('common.save') }}</button>
      </div>
      
      <!-- 保存选项对话框 -->
      <div class="save-options-dialog" v-if="showingSaveOptions">
        <div class="dialog-overlay" @click="showingSaveOptions = false"></div>
        <div class="dialog-container">
          <div class="dialog-header">
            <h3 class="dialog-title">{{ $t('layoutEditor.saveOptions') }}</h3>
            <button class="dialog-close-button" @click="showingSaveOptions = false">
              <i class="bi bi-x" style="font-size: 20px;"></i>
            </button>
          </div>
          <div class="dialog-content">
            <div class="save-options">
              <div class="save-option" @click="saveCurrentLayout">
                <div class="option-icon">
                  <i class="bi bi-file-earmark-check" style="font-size: 24px;"></i>
                </div>
                <div class="option-info">
                  <h4 class="option-title">{{ $t('layoutEditor.saveCurrentOnly') }}</h4>
                  <p class="option-description">{{ $t('layoutEditor.saveCurrentDesc') }}</p>
                </div>
              </div>
              <div class="save-option" @click="saveSimilarLayouts">
                <div class="option-icon">
                  <i class="bi bi-files" style="font-size: 24px;"></i>
                </div>
                <div class="option-info">
                  <h4 class="option-title">{{ $t('layoutEditor.saveSimilar') }}</h4>
                  <p class="option-description">{{ $t('layoutEditor.saveSimilarDesc') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { usePlanStore } from '../stores/planStore';
import { useVideoStore } from '../stores/videoStore';
import { useI18n } from 'vue-i18n';
import type { Layout, LayoutElement, MediaLayoutElement } from '../types/broadcast';
import { LayoutElementType } from '../types/broadcast';
import type { VideoDevice } from '../types/video';
import { VideoSourceType } from '../types/video';
import videoDeviceManager from '../utils/videoDeviceManager';

const { t } = useI18n();

// Props
const props = defineProps<{
  visible: boolean;
  layout: Layout;
  scheduleType: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', layout: Layout, saveAll: boolean): void;
}>();

// Stores
const planStore = usePlanStore();
const videoStore = useVideoStore();

// 布局副本（用于编辑）
const layoutCopy = ref<Layout>({ ...props.layout });

// 是否正在刷新媒体源
const isRefreshing = ref(false);

// 是否显示保存选项对话框
const showingSaveOptions = ref(false);

// 预览尺寸（等比缩放）
const originalWidth = 1920;
const originalHeight = 1080;
const previewWidth = 900; // 预览区域宽度
const previewHeight = computed(() => {
  return (previewWidth * originalHeight) / originalWidth;
});

// 计算媒体类型的元素
const mediaElements = ref<MediaLayoutElement[]>([]);

// 添加定时器引用
const refreshTimer = ref<number | null>(null);

// 鼠标悬停元素
const hoveredElement = ref<number | null>(null);

// 监听布局变化
watch(() => props.layout, (newLayout) => {
  layoutCopy.value = { ...newLayout };
  // 更新媒体元素
  mediaElements.value = getMediaElements();
}, { immediate: true });

// 监听可见性变化
watch(() => props.visible, async (isVisible) => {
  try {
    if (isVisible) {
      // 当Modal显示时，初始化视频设备
      await initializeVideoSources();
    } else {
      // 当Modal隐藏时，停止所有视频流和定时器
      stopAllVideoStreams();
      
      if (refreshTimer.value !== null) {
        clearInterval(refreshTimer.value);
        refreshTimer.value = null;
      }
    }
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 监听可见性变化处理失败:', error);
  }
});

/**
 * 组件挂载时初始化
 */
onMounted(async () => {
  try {
    // 确保视频设备管理器初始化
    if (typeof videoDeviceManager.initialize === 'function') {
      await videoDeviceManager.initialize();
    }
    
    // 创建布局副本
    layoutCopy.value = JSON.parse(JSON.stringify(props.layout));
    
    // 如果模态框是可见的，立即初始化视频源
    if (props.visible) {
      console.log('[LayoutEditorModal.vue 布局编辑器] 模态框可见，初始化视频源');
      await initializeVideoSources();
    }
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 组件挂载初始化失败:', error);
  }
});

/**
 * 组件卸载前清理资源
 */
onBeforeUnmount(() => {
  stopAllVideoStreams();
  
  // 清理定时器
  if (refreshTimer.value !== null) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
});

/**
 * 初始化视频源
 */
async function initializeVideoSources() {
  isRefreshing.value = true;
  
  try {
    // 确保视频设备管理器初始化
    if (typeof videoDeviceManager.initialize === 'function') {
      await videoDeviceManager.initialize();
    }
    
    // 初始化视频设备
    await videoStore.initVideoDevices();
    
    // 自动激活所有摄像头设备并设置视频流
    for (const device of videoStore.cameraDevices) {
      // 调用previewSource函数激活设备并设置视频流
      await previewSource(device);
    }
    
    // 激活已有的媒体源（仅在布局预览区域）
    for (const element of mediaElements.value) {
      if (element.sourceId && element.sourceType) {
        switch (element.sourceType) {
          case VideoSourceType.CAMERA:
            await activateCamera(element.sourceId);
            break;
          case VideoSourceType.WINDOW:
            await activateWindow(element.sourceId);
            break;
          case VideoSourceType.DISPLAY:
            await activateDisplay(element.sourceId);
            break;
        }
      }
    }
    
    // 确保所有视频元素都在播放
    await ensureAllVideosPlaying();
    
    // 为摄像头设备添加额外的处理，确保它们在布局预览区域中显示
    await ensureCameraStreamsInPreview();
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 初始化视频源失败:', error);
  } finally {
    isRefreshing.value = false;
  }
}

/**
 * 确保所有视频元素都在播放
 */
async function ensureAllVideosPlaying() {
  try {
    // 等待DOM更新
    await nextTick();
    
    // 获取所有视频元素
    const videoElements = document.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;
    
    // 确保每个视频都在播放
    for (const video of videoElements) {
      if (video.paused && video.srcObject) {
        try {
          await video.play().catch(error => {
            console.warn('[LayoutEditorModal.vue 布局编辑器] 播放视频失败:', error);
          });
        } catch (error) {
          console.warn('[LayoutEditorModal.vue 布局编辑器] 播放视频时出错:', error);
        }
      }
    }
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 确保视频播放失败:', error);
  }
}

/**
 * 刷新媒体源
 */
async function refreshSources() {
  isRefreshing.value = true;
  
  try {
    console.log('[LayoutEditorModal.vue 布局编辑器] 开始刷新媒体源');
    const result = await videoStore.refreshDevices();
    console.log('[LayoutEditorModal.vue 布局编辑器] 刷新媒体源结果:', result);
    
    // 自动激活所有摄像头设备
    for (const device of videoStore.cameraDevices) {
      await previewSource(device);
    }
    
    // 确保布局预览区域中的视频元素都在播放
    await ensureAllVideosPlaying();
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 刷新媒体源失败:', error);
  } finally {
    isRefreshing.value = false;
  }
}

/**
 * 停止所有视频流
 */
function stopAllVideoStreams() {
  // 清理视频存储中的资源
  videoStore.cleanup();
}

/**
 * 获取元素样式
 * @param element 布局元素
 * @returns 样式对象
 */
function getElementStyle(element: LayoutElement) {
  // 计算缩放比例
  const scaleX = previewWidth / originalWidth;
  const scaleY = previewHeight.value / originalHeight;
  
  // 转换坐标和尺寸
  const x = element.x * scaleX;
  const y = element.y * scaleY;
  const width = element.width * scaleX;
  const height = element.height * scaleY;
  
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    zIndex: element.zIndex || 0
  };
}

/**
 * 获取媒体源类型图标
 * @param type 媒体源类型
 * @returns 图标字符
 */
function getSourceIcon(type: string) {
  switch (type) {
    case VideoSourceType.CAMERA:
      return '📹';
    case VideoSourceType.WINDOW:
      return '🖼️';
    case VideoSourceType.DISPLAY:
      return '🖥️';
    default:
      return '📁';
  }
}

/**
 * 设置视频元素样式
 * @param videoElement 视频元素
 * @param sourceType 媒体源类型
 * @param isPreview 是否为预览元素
 */
function setVideoElementStyle(videoElement: HTMLVideoElement, sourceType: string, isPreview = false) {
  // 基础样式设置
  videoElement.autoplay = true;
  videoElement.muted = true;
  videoElement.playsInline = true;
  
  // 设置样式以保持原始宽高比
  videoElement.style.objectFit = 'contain';
  videoElement.style.width = '100%';
  videoElement.style.height = '100%';
  
  // 窗口和显示器捕获需要特殊处理
  if (sourceType === VideoSourceType.WINDOW || sourceType === VideoSourceType.DISPLAY) {
    videoElement.style.backgroundColor = '#000';
    videoElement.style.maxWidth = '100%';
    videoElement.style.maxHeight = '100%';
    
    // 如果是媒体源列表中的预览，限制高度
    if (isPreview && videoElement.id.startsWith('video-source-')) {
      videoElement.style.maxHeight = '80px';
      videoElement.parentElement?.classList.add(sourceType === VideoSourceType.WINDOW ? 'window-capture' : 'display-capture');
    }
  }
}

/**
 * 播放视频元素
 * @param videoElement 视频元素
 * @param deviceId 设备ID
 */
async function playVideoElement(videoElement: HTMLVideoElement, deviceId: string) {
  if (videoElement && videoElement.paused) {
    try {
      await videoElement.play();
      console.log(`[LayoutEditorModal.vue 布局编辑器] 播放视频元素 ${videoElement.id} 成功`);
    } catch (error) {
      console.error(`[LayoutEditorModal.vue 布局编辑器] 播放视频元素 ${videoElement.id} 失败:`, error);
    }
  }
}

/**
 * 激活设备并设置视频流
 * @param deviceId 设备ID
 * @param sourceType 媒体源类型
 * @param elementId 视频元素ID
 */
async function activateDeviceAndSetStream(deviceId: string, sourceType: VideoSourceType, elementId: string) {
  try {
    // 激活设备
    const success = await videoStore.activateDevice(deviceId, sourceType);
    
    if (!success) {
      console.warn(`[LayoutEditorModal.vue 布局编辑器] 激活设备 ${deviceId} 失败`);
      return false;
    }
    
    // 获取更新后的设备
    let updatedDevice: VideoDevice | undefined;
    
    switch (sourceType) {
      case VideoSourceType.CAMERA:
        updatedDevice = videoStore.cameraDevices.find(d => d.id === deviceId);
        break;
      case VideoSourceType.WINDOW:
        updatedDevice = videoStore.windowDevices.find(d => d.id === deviceId);
        break;
      case VideoSourceType.DISPLAY:
        updatedDevice = videoStore.displayDevices.find(d => d.id === deviceId);
        break;
    }
    
    // 等待DOM更新
    await nextTick();
    
    // 获取视频元素并设置流
    const videoElement = document.getElementById(elementId) as HTMLVideoElement | null;
    
    if (videoElement && updatedDevice && updatedDevice.stream) {
      // 如果视频元素已有流，先清除
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
      
      // 设置新流
      videoElement.srcObject = updatedDevice.stream;
      
      // 设置视频元素样式
      const isPreview = elementId.startsWith('video-source-');
      setVideoElementStyle(videoElement, sourceType, isPreview);
      
      // 播放视频
      await playVideoElement(videoElement, deviceId);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 激活设备并设置视频流失败 (ID: ${deviceId}):`, error);
    return false;
  }
}

/**
 * 预览媒体源
 * @param source 媒体源
 */
async function previewSource(source: VideoDevice) {
  console.log(`[LayoutEditorModal.vue 布局编辑器] 预览媒体源: ${source.name} (ID: ${source.id}, 类型: ${source.type})`);
  
  // 只为摄像头设备设置视频流，窗口和显示器设备不设置视频流
  if (source.type === VideoSourceType.CAMERA) {
    await activateDeviceAndSetStream(source.id, source.type, `video-source-${source.id}`);
  }
}

/**
 * 激活摄像头
 * @param deviceId 设备ID
 */
async function activateCamera(deviceId: string) {
  try {
    // 检查设备是否已激活
    const isActive = videoStore.activeDevices.some(d => d.id === deviceId);
    
    if (!isActive) {
      // 如果设备未激活，激活设备并设置视频流
      await activateDeviceAndSetStream(deviceId, VideoSourceType.CAMERA, `video-preview-${deviceId}`);
    } else {
      // 如果设备已激活，确保视频元素有正确的流
      const activeDevice = videoStore.activeDevices.find(d => d.id === deviceId);
      if (activeDevice && activeDevice.stream) {
        const videoElement = document.getElementById(`video-preview-${deviceId}`) as HTMLVideoElement | null;
        if (videoElement) {
          // 如果视频元素存在但没有视频流或已暂停，设置流并播放
          if (!videoElement.srcObject || videoElement.paused) {
            videoElement.srcObject = activeDevice.stream;
            await playVideoElement(videoElement, deviceId);
            console.log(`[LayoutEditorModal.vue 布局编辑器] 为已激活的摄像头设置视频流: ${deviceId}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 激活摄像头失败 (ID: ${deviceId}):`, error);
  }
}

/**
 * 激活窗口捕获
 * @param deviceId 设备ID
 */
async function activateWindow(deviceId: string) {
  // 检查设备是否已激活
  const isActive = videoStore.activeDevices.some(d => d.id === deviceId);
  
  if (!isActive) {
    await activateDeviceAndSetStream(deviceId, VideoSourceType.WINDOW, `video-preview-${deviceId}`);
  }
}

/**
 * 激活显示器捕获
 * @param deviceId 设备ID
 */
async function activateDisplay(deviceId: string) {
  // 检查设备是否已激活
  const isActive = videoStore.activeDevices.some(d => d.id === deviceId);
  
  if (!isActive) {
    await activateDeviceAndSetStream(deviceId, VideoSourceType.DISPLAY, `video-preview-${deviceId}`);
  }
}

/**
 * 获取媒体源类型
 * @param sourceId 媒体源ID
 * @returns 媒体源类型
 */
function getSourceType(sourceId: string): string {
  // 检查摄像头
  const camera = videoStore.cameraDevices.find(d => d.id === sourceId);
  if (camera) return 'camera';
  
  // 检查窗口
  const window = videoStore.windowDevices.find(d => d.id === sourceId);
  if (window) return 'window';
  
  // 检查显示器
  const display = videoStore.displayDevices.find(d => d.id === sourceId);
  if (display) return 'display';
  
  return 'unknown';
}

/**
 * 获取媒体源缩略图
 * @param sourceId 媒体源ID
 * @returns 缩略图URL
 */
function getSourceThumbnail(sourceId: string): string {
  // 检查窗口
  const window = videoStore.windowDevices.find(d => d.id === sourceId);
  if (window && window.thumbnail && window.thumbnail.length > 22) return window.thumbnail;
  
  // 检查显示器
  const display = videoStore.displayDevices.find(d => d.id === sourceId);
  if (display && display.thumbnail && display.thumbnail.length > 22) return display.thumbnail;
  
  // 返回默认图片
  return '/assets/placeholder-media.svg';
}

/**
 * 显示保存选项
 */
function showSaveOptions() {
  showingSaveOptions.value = true;
}

/**
 * 保存当前布局
 */
function saveCurrentLayout() {
  emit('save', layoutCopy.value, false);
  showingSaveOptions.value = false;
  handleClose();
}

/**
 * 保存相似布局
 */
function saveSimilarLayouts() {
  emit('save', layoutCopy.value, true);
  showingSaveOptions.value = false;
  handleClose();
}

/**
 * 处理关闭
 */
function handleClose() {
  // 停止所有视频流
  stopAllVideoStreams();
  
  // 发送关闭事件
  emit('close');
}

/**
 * 获取媒体元素
 * @returns MediaLayoutElement[] 媒体元素列表
 */
function getMediaElements(): MediaLayoutElement[] {
  // 获取布局模板
  const template = planStore.layoutTemplates.find(t => t.template === layoutCopy.value.template);
  
  if (!template || !template.elements) {
    return [];
  }
  
  // 过滤出媒体类型的元素
  return template.elements
    .filter(element => element.type === LayoutElementType.MEDIA)
    .map(element => element as MediaLayoutElement);
}

/**
 * 处理拖放事件
 * @param event 拖放事件
 * @param element 布局元素
 */
async function handleDrop(event: DragEvent, element: MediaLayoutElement) {
  event.preventDefault();
  
  // 获取拖放的媒体源数据
  const sourceData = event.dataTransfer?.getData('application/json');
  if (!sourceData) return;
  
  try {
    // 解析媒体源数据
    const source = JSON.parse(sourceData) as VideoDevice;
    
    // 检查该视频源是否已经被其他元素使用
    const existingElement = mediaElements.value.find(el => 
      el !== element && el.sourceId === source.id
    );
    
    // 如果已被使用，从原元素中清除
    if (existingElement) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 视频源 ${source.name} 已从其他元素中移除`);
      await clearMediaElement(existingElement);
    }
    
    // 更新布局元素
    element.sourceId = source.id;
    element.sourceName = source.name;
    element.sourceType = source.type;
    
    // 对于摄像头设备，检查是否已经激活
    if (source.type === VideoSourceType.CAMERA) {
      const isActive = videoStore.activeDevices.some(d => d.id === source.id && d.stream);
      
      // 如果摄像头已经激活且有流，直接使用现有流
      if (isActive) {
        const device = videoStore.activeDevices.find(d => d.id === source.id);
        if (device && device.stream) {
          // 获取视频元素
          const videoElement = document.getElementById(`video-preview-${source.id}`) as HTMLVideoElement | null;
          if (videoElement) {
            videoElement.srcObject = device.stream;
            await playVideoElement(videoElement, source.id);
            console.log(`[LayoutEditorModal.vue 布局编辑器] 使用现有摄像头流: ${source.name}`);
            return;
          }
        }
      }
    }
    
    // 激活设备并设置视频流
    await activateDeviceAndSetStream(source.id, source.type, `video-preview-${source.id}`);
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 处理拖放事件失败:', error);
  }
}

/**
 * 处理拖动开始事件
 * @param event 拖动事件
 * @param source 媒体源
 */
function handleDragStart(event: DragEvent, source: VideoDevice) {
  // 设置拖动数据
  event.dataTransfer?.setData('application/json', JSON.stringify(source));
}

/**
 * 处理图像加载错误
 * @param event 图像加载错误事件
 * @param source 媒体源
 */
function handleImageError(event: Event, source: VideoDevice) {
  console.warn(`[LayoutEditorModal.vue 布局编辑器] 加载缩略图失败: ${source.name} (ID: ${source.id})`);
}

/**
 * 清除媒体元素
 * @param element 媒体元素
 */
async function clearMediaElement(element: MediaLayoutElement) {
  // 如果有sourceId，先停止相关视频流
  if (element.sourceId) {
    // 获取视频元素
    const videoElement = document.getElementById(`video-preview-${element.sourceId}`) as HTMLVideoElement | null;
    
    // 如果视频元素存在且有视频流，停止视频流
    if (videoElement && videoElement.srcObject) {
      // 对于摄像头设备，不停止视频流，只清除视频元素的引用
      if (element.sourceType === VideoSourceType.CAMERA) {
        // 只清除视频元素的引用，不停止流
        videoElement.srcObject = null;
        console.log(`[LayoutEditorModal.vue 布局编辑器] 已清除摄像头元素 ${element.id} 的视频引用，保留流`);
      } else {
        // 对于非摄像头设备，停止所有轨道
        const mediaStream = videoElement.srcObject as MediaStream;
        mediaStream.getTracks().forEach(track => track.stop());
        
        // 清除视频源
        videoElement.srcObject = null;
        
        console.log(`[LayoutEditorModal.vue 布局编辑器] 已停止媒体元素 ${element.id} 的视频流`);
      }
    }
    
    // 如果是窗口或显示器，从videoStore中停止流
    if (element.sourceType === VideoSourceType.WINDOW || element.sourceType === VideoSourceType.DISPLAY) {
      videoStore.deactivateDevice(element.sourceId);
    }
  }
  
  // 清除元素属性
  element.sourceId = undefined;
  element.sourceName = undefined;
  element.sourceType = undefined;
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 已清除媒体元素 ${element.id}`);
}

/**
 * 确保摄像头流在预览区域中显示
 * 这个函数专门处理摄像头设备，确保它们在布局预览区域中正确显示
 */
async function ensureCameraStreamsInPreview() {
  try {
    // 等待DOM更新
    await nextTick();
    
    // 遍历所有媒体元素，找出摄像头类型的元素
    for (const element of mediaElements.value) {
      if (element.sourceId && element.sourceType === VideoSourceType.CAMERA) {
        // 获取对应的视频元素
        const videoElement = document.getElementById(`video-preview-${element.sourceId}`) as HTMLVideoElement | null;
        
        // 如果视频元素存在但没有视频流
        if (videoElement && (!videoElement.srcObject || videoElement.paused)) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 尝试恢复摄像头流: ${element.sourceId}`);
          
          // 查找活跃设备中是否有对应的摄像头
          const activeDevice = videoStore.activeDevices.find(d => d.id === element.sourceId);
          
          if (activeDevice && activeDevice.stream) {
            // 如果设备已激活且有流，直接使用现有流
            videoElement.srcObject = activeDevice.stream;
            await playVideoElement(videoElement, element.sourceId);
            console.log(`[LayoutEditorModal.vue 布局编辑器] 使用现有摄像头流: ${element.sourceId}`);
          } else {
            // 如果设备未激活或没有流，重新激活
            await activateDeviceAndSetStream(element.sourceId, VideoSourceType.CAMERA, `video-preview-${element.sourceId}`);
            console.log(`[LayoutEditorModal.vue 布局编辑器] 重新激活摄像头: ${element.sourceId}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 确保摄像头流在预览区域显示失败:', error);
  }
}
</script>

<style scoped>
.layout-editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--el-mask-color, rgba(0, 0, 0, 0.5));
}

.modal-container {
  position: relative;
  width: 90%;
  height: 90%;
  background-color: var(--el-bg-color, #fff);
  border-radius: var(--el-border-radius-base, 8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light, #eee);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--el-text-color-secondary, #666);
}

.close-button:hover {
  color: var(--el-text-color-primary, #333);
}

.modal-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.layout-preview-container {
  flex: 1;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-fill-color-light, #f5f5f5);
  overflow: auto;
}

.layout-preview {
  position: relative;
  background-color: var(--el-fill-color-darker, #000);
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.media-element-placeholder {
  position: absolute;
  border: 2px dashed var(--el-border-color, #aaa);
  background-color: var(--el-mask-color-extra-light, rgba(0, 0, 0, 0.2));
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.media-element-placeholder.has-source {
  background-color: var(--el-fill-color-darker, #000);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: none;
}

.media-element-placeholder.has-source .media-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--el-fill-color-darker, #000);
}

.placeholder-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--el-text-color-primary, #fff);
  text-align: center;
}

.placeholder-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.placeholder-text {
  font-size: 12px;
}

/* 视频预览样式 */
video.media-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--el-fill-color-darker, #000);
  display: block; /* 确保视频元素正确显示 */
}

.media-sources-container {
  width: 320px;
  border-left: 1px solid var(--el-border-color-light, #eee);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sources-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light, #eee);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sources-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary, #303133);
}

.refresh-button {
  padding: 4px 8px;
  background-color: var(--el-fill-color-light, #f0f0f0);
  border: 1px solid var(--el-border-color, #ddd);
  border-radius: var(--el-border-radius-small, 4px);
  cursor: pointer;
  color: var(--el-text-color-primary, #303133);
}

.refresh-button:hover {
  background-color: var(--el-fill-color, #e0e0e0);
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sources-groups {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.source-group {
  margin-bottom: 16px;
}

.group-title {
  margin: 16px 0 8px;
  font-size: 14px;
  color: var(--el-text-color-secondary, #666);
}

.source-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.source-item {
  border: 1px solid var(--el-border-color, #ddd);
  border-radius: var(--el-border-radius-small, 4px);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color, #fff);
}

.source-item:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.source-preview {
  width: 100%;
  height: 80px;
  object-fit: cover;
  background-color: var(--el-fill-color-darker, #000);
  display: block; /* 确保视频元素正确显示 */
}

/* 修改视频元素样式，确保窗口和显示器捕获的视频保持原位置 */
video.source-preview {
  width: 100%;
  height: 80px;
  object-fit: contain; /* 使用contain而不是cover，保持原始比例 */
  max-height: 80px;
  max-width: 100%;
}

.source-preview-container {
  position: relative;
  width: 100%;
  height: 80px;
  overflow: hidden;
  border-radius: var(--el-border-radius-small, 4px);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-fill-color-darker, #000);
}

.source-preview-container.window-capture video,
.source-preview-container.display-capture video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 80px;
}

.source-preview-container.window-capture img,
.source-preview-container.display-capture img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.source-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--el-color-primary-dark-2, #2c3e50);
  height: 80px;
  width: 100%;
  padding: 8px;
  color: var(--el-color-white, #fff);
  border-radius: var(--el-border-radius-small, 4px);
}

.placeholder-text {
  font-size: 12px;
  color: var(--el-color-white, #fff);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  max-width: 100%;
}

.source-name {
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: var(--el-fill-color-light, #f9f9f9);
  border-top: 1px solid var(--el-border-color-light, #e0e0e0);
  color: var(--el-text-color-primary, #333);
  font-weight: 500;
  text-align: center;
}

.empty-sources {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-secondary, #999);
  background-color: var(--el-fill-color-light, #f9f9f9);
  border-radius: var(--el-border-radius-small, 4px);
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-light, #eee);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-button {
  padding: 8px 16px;
  background-color: var(--el-fill-color-light, #f0f0f0);
  border: 1px solid var(--el-border-color, #ddd);
  border-radius: var(--el-border-radius-small, 4px);
  cursor: pointer;
  color: var(--el-text-color-primary, #303133);
}

.save-button {
  padding: 8px 16px;
  background-color: var(--el-color-primary, #1976d2);
  color: var(--el-color-white, #fff);
  border: none;
  border-radius: var(--el-border-radius-small, 4px);
  cursor: pointer;
}

.save-button:hover {
  background-color: var(--el-color-primary-dark-2, #1565c0);
}

.save-options-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--el-mask-color, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(2px);
}

.dialog-container {
  position: relative;
  width: 450px;
  background-color: var(--el-bg-color, #fff);
  border-radius: var(--el-border-radius-base, 12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: dialog-fade-in 0.25s ease-out;
  transform-origin: center;
}

@keyframes dialog-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-light, #ebeef5);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.dialog-close-button {
  background: none;
  border: none;
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: all 0.2s;
}

.dialog-close-button:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
}

.dialog-content {
  padding: 24px;
}

.save-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.save-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.save-option:hover {
  background-color: var(--el-fill-color, #f0f2f5);
  border-color: var(--el-color-primary-light-5, #a0cfff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.save-option:active {
  transform: translateY(0);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  margin-right: 16px;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
}

.save-option:first-child .option-icon {
  background-color: var(--el-color-success-light-9, #f0f9eb);
  color: var(--el-color-success, #67c23a);
}

.save-option:last-child .option-icon {
  background-color: var(--el-color-warning-light-9, #fdf6ec);
  color: var(--el-color-warning, #e6a23c);
}

.option-info {
  flex: 1;
}

.option-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.option-description {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.5;
}

/* 删除不再需要的样式 */
.save-current-button,
.save-similar-button,
.dialog-footer {
  display: none;
}

.delete-source-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 28px;
  height: 28px;
  background-color: var(--el-color-danger, rgba(220, 53, 69, 0.8));
  border-radius: var(--el-border-radius-small, 4px);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delete-source-button:hover {
  background-color: var(--el-color-danger-dark-2, rgba(220, 53, 69, 1));
  transform: scale(1.1);
}
</style> 