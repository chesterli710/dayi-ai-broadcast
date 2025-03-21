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
              backgroundImage: getBackgroundImageUrl(layoutCopy.background),
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
                  <p class="option-note">仅保存当前日程中的当前布局，不影响其他日程</p>
                </div>
              </div>
              <div class="save-option" @click="saveSimilarLayouts">
                <div class="option-icon">
                  <i class="bi bi-files" style="font-size: 24px;"></i>
                </div>
                <div class="option-info">
                  <h4 class="option-title">{{ $t('layoutEditor.saveSimilar') }}</h4>
                  <p class="option-description">{{ $t('layoutEditor.saveSimilarDesc') }}</p>
                  <p class="option-note">将更新所有相同类型日程中使用相同模板的布局</p>
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
import type { Layout, LayoutElement, MediaLayoutElement, Schedule } from '../types/broadcast';
import { LayoutElementType } from '../types/broadcast';
import type { VideoDevice } from '../types/video';
import { VideoSourceType } from '../types/video';
import videoDeviceManager from '../utils/videoDeviceManager';
import { getCachedImage } from '../utils/imagePreloader';

const { t } = useI18n();

// Props
const props = defineProps<{
  visible: boolean;
  layout: Layout;
  scheduleType: string;
  scheduleId?: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', layout: Layout, saveAll: boolean): void;
}>();

// Stores
const planStore = usePlanStore();
const videoStore = useVideoStore();

// 获取当前分支
const currentBranch = computed(() => planStore.currentBranch);

// 获取当前日程
const selectedSchedule = computed(() => {
  if (!props.scheduleId || !currentBranch.value) return null;
  return currentBranch.value.schedules.find(s => s.id === props.scheduleId) || null;
});

// 布局副本（用于编辑）
const layoutCopy = ref<Layout>({ ...props.layout });

// 是否正在刷新媒体源
const isRefreshing = ref(false);

// 是否显示保存选项对话框
const showingSaveOptions = ref(false);

// 预览尺寸（等比缩放）
const originalWidth = 1920;
const originalHeight = 1080;
const previewWidth = 720; // 预览区域宽度
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
  console.log('[LayoutEditorModal.vue 布局编辑器] 布局已变更:', {
    id: newLayout.id,
    template: newLayout.template,
    hasElements: !!(newLayout as any).elements,
    elementsCount: (newLayout as any).elements?.length || 0
  });
  
  // 创建布局的深拷贝
  layoutCopy.value = JSON.parse(JSON.stringify(newLayout));
  
  // 更新媒体元素
  mediaElements.value = getMediaElements();
  
  console.log('[LayoutEditorModal.vue 布局编辑器] 媒体元素已更新:', 
    mediaElements.value.map(e => ({
      id: e.id,
      sourceId: e.sourceId,
      sourceName: e.sourceName,
      sourceType: e.sourceType
    }))
  );
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
    
    // 初始化视频设备，但不重新创建已经活跃的设备流
    console.log('[LayoutEditorModal.vue 布局编辑器] 初始化视频设备，保留已活跃的流');
    // 获取当前活跃设备，用于后续比较
    const activeDevicesBeforeInit = [...videoStore.activeDevices];
    const activeDeviceIds = activeDevicesBeforeInit.map(d => d.id);
    
    // 初始化视频设备，但不影响已有的活跃设备
    await videoStore.initVideoDevices(false);
    
    // 获取当前布局的媒体元素
    const currentMediaElements = getMediaElements();
    console.log('[LayoutEditorModal.vue 布局编辑器] 当前布局媒体元素:', 
      currentMediaElements.map(e => ({
        id: e.id,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        sourceType: e.sourceType
      }))
    );
    
    // 过滤出需要激活的设备（排除已经活跃的设备）
    const elementsNeedActivation = currentMediaElements.filter(element => 
      element.sourceId && 
      element.sourceType && 
      !activeDeviceIds.includes(element.sourceId)
    );
    
    if (elementsNeedActivation.length > 0) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 需要激活 ${elementsNeedActivation.length} 个新设备`);
      
      // 收集需要激活的设备ID
      const deviceActivationPromises = [];
      
      for (const element of elementsNeedActivation) {
        if (element.sourceId && element.sourceType) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 准备激活媒体元素: ID=${element.id}, 源=${element.sourceId}, 类型=${element.sourceType}`);
          
          // 检查当前设备是否已激活
          const isActive = videoStore.activeDevices.some(d => d.id === element.sourceId);
          if (!isActive) {
            switch (element.sourceType) {
              case VideoSourceType.CAMERA:
                deviceActivationPromises.push(videoStore.activateDevice(element.sourceId, VideoSourceType.CAMERA));
                break;
              case VideoSourceType.WINDOW:
                deviceActivationPromises.push(videoStore.activateDevice(element.sourceId, VideoSourceType.WINDOW));
                break;
              case VideoSourceType.DISPLAY:
                deviceActivationPromises.push(videoStore.activateDevice(element.sourceId, VideoSourceType.DISPLAY));
                break;
            }
          }
        }
      }
      
      // 等待所有新设备激活完成
      if (deviceActivationPromises.length > 0) {
        console.log(`[LayoutEditorModal.vue 布局编辑器] 等待 ${deviceActivationPromises.length} 个设备激活`);
        await Promise.all(deviceActivationPromises);
        console.log('[LayoutEditorModal.vue 布局编辑器] 所有设备激活完成');
      }
    }
    
    // 等待DOM更新
    await nextTick();
    
    // 为布局中的媒体元素设置视频流
    console.log('[LayoutEditorModal.vue 布局编辑器] 为布局媒体元素设置视频流');
    for (const element of currentMediaElements) {
      if (element.sourceId && element.sourceType) {
        // 检查设备是否已经有活跃流
        const isAlreadyActive = videoStore.activeDevices.some(d => d.id === element.sourceId && d.stream);
        
        if (isAlreadyActive) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 设备已有活跃流，复用: ID=${element.sourceId}, 类型=${element.sourceType}`);
        } else {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 为媒体元素设置新流: ID=${element.id}, 源=${element.sourceId}, 类型=${element.sourceType}`);
        }
        
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
    
    // 为媒体源列表的摄像头设置视频流
    for (const device of videoStore.cameraDevices) {
      // 只为未激活的摄像头设置视频流
      if (!device.isActive) {
        await previewSource(device);
      }
    }
    
    // 确保所有视频元素都在播放
    await ensureAllVideosPlaying();
    
    // 确保媒体源列表中的预览元素也能播放
    await ensureSourcePreviewsPlaying();
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
    console.log(`[LayoutEditorModal.vue 布局编辑器] 检查 ${videoElements.length} 个视频元素的播放状态`);
    
    const playPromises = [];
    
    // 确保每个视频都在播放
    for (const video of videoElements) {
      // 跳过没有srcObject的视频元素
      if (!video.srcObject) {
        continue;
      }
      
      // 检查视频是否已加载元数据
      if (video.readyState < 1) {
        console.log('[LayoutEditorModal.vue 布局编辑器] 等待视频元素加载元数据');
        // 创建一个Promise来等待元数据加载
        const metadataPromise = new Promise<void>((resolve) => {
          const onMetadataLoaded = () => {
            video.removeEventListener('loadedmetadata', onMetadataLoaded);
            resolve();
          };
          
          // 设置超时，避免无限等待
          const timeout = setTimeout(() => {
            video.removeEventListener('loadedmetadata', onMetadataLoaded);
            console.warn('[LayoutEditorModal.vue 布局编辑器] 等待视频元数据加载超时');
            resolve();
          }, 2000);
          
          video.addEventListener('loadedmetadata', onMetadataLoaded, { once: true });
        });
        
        playPromises.push(metadataPromise);
      }
      
      // 检查视频是否暂停，需要播放
      if (video.paused) {
        console.log('[LayoutEditorModal.vue 布局编辑器] 尝试播放暂停的视频');
        try {
          // 确保视频是静音的，以避免自动播放问题
          video.muted = true;
          
          // 使用retry机制尝试播放
          const maxRetries = 3;
          let retryCount = 0;
          
          const attemptPlay = async (): Promise<void> => {
            try {
              await video.play();
              console.log('[LayoutEditorModal.vue 布局编辑器] 视频播放成功');
            } catch (error) {
              retryCount++;
              
              if (error instanceof DOMException && error.name === 'AbortError') {
                console.warn(`[LayoutEditorModal.vue 布局编辑器] 视频播放被中止，重试 (${retryCount}/${maxRetries})`);
                if (retryCount <= maxRetries) {
                  // 添加延迟，避免立即重试
                  await new Promise(resolve => setTimeout(resolve, 300));
                  return attemptPlay();
                }
              } else if (error instanceof DOMException && error.name === 'NotAllowedError') {
                // 确保视频是静音的
                video.muted = true;
                return attemptPlay();
              } else {
                console.warn('[LayoutEditorModal.vue 布局编辑器] 播放视频失败:', error);
              }
            }
          };
          
          const playPromise = attemptPlay();
          playPromises.push(playPromise);
        } catch (error) {
          console.warn('[LayoutEditorModal.vue 布局编辑器] 播放视频时出错:', error);
        }
      }
    }
    
    // 等待所有播放操作完成
    if (playPromises.length > 0) {
      await Promise.all(playPromises);
      console.log(`[LayoutEditorModal.vue 布局编辑器] 完成 ${playPromises.length} 个视频播放操作`);
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
    
    // 保留当前激活的设备流
    const result = await videoStore.refreshDevices(true);
    console.log('[LayoutEditorModal.vue 布局编辑器] 刷新媒体源结果:', result);
    
    // 获取当前布局的媒体元素
    const currentMediaElements = getMediaElements();
    console.log('[LayoutEditorModal.vue 布局编辑器] 当前布局媒体元素数量:', currentMediaElements.length);
    
    // 获取当前活跃设备ID列表
    const activeDeviceIds = videoStore.activeDevices.map(d => d.id);
    console.log('[LayoutEditorModal.vue 布局编辑器] 当前活跃设备:', activeDeviceIds);
    
    // 收集需要激活的设备（排除已经活跃的设备）
    const elementsNeedActivation = currentMediaElements.filter(element => 
      element.sourceId && 
      element.sourceType && 
      !activeDeviceIds.includes(element.sourceId)
    );
    
    if (elementsNeedActivation.length > 0) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 需要激活 ${elementsNeedActivation.length} 个新设备`);
      
      // 逐个激活需要的设备
      for (const element of elementsNeedActivation) {
        if (element.sourceId && element.sourceType) {
          // 检查设备是否存在
          let deviceExists = false;
          switch (element.sourceType) {
            case VideoSourceType.CAMERA:
              deviceExists = videoStore.cameraDevices.some(d => d.id === element.sourceId);
              break;
            case VideoSourceType.WINDOW:
              deviceExists = videoStore.windowDevices.some(d => d.id === element.sourceId);
              break;
            case VideoSourceType.DISPLAY:
              deviceExists = videoStore.displayDevices.some(d => d.id === element.sourceId);
              break;
          }
          
          if (deviceExists) {
            console.log(`[LayoutEditorModal.vue 布局编辑器] 激活媒体元素: ID=${element.id}, 源=${element.sourceId}, 类型=${element.sourceType}`);
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
          } else {
            console.warn(`[LayoutEditorModal.vue 布局编辑器] 设备 ${element.sourceId} 不存在，已从布局移除`);
            // 清除不存在的设备
            element.sourceId = '';
            element.sourceName = '';
            element.sourceType = undefined;
          }
        }
      }
    } else {
      console.log('[LayoutEditorModal.vue 布局编辑器] 所有必要设备已经处于活跃状态');
    }
    
    // 等待DOM更新
    await nextTick();
    
    // 为布局中的媒体元素设置视频流（已有流的元素将复用流）
    for (const element of currentMediaElements) {
      if (element.sourceId && element.sourceType) {
        // 检查设备是否已经有活跃流
        const isAlreadyActive = videoStore.activeDevices.some(d => d.id === element.sourceId && d.stream);
        
        if (isAlreadyActive) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 设备已有活跃流，复用: ID=${element.sourceId}, 类型=${element.sourceType}`);
        } else {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 为媒体元素设置新流: ID=${element.id}, 源=${element.sourceId}, 类型=${element.sourceType}`);
        }
      }
    }
    
    // 只为未激活的摄像头设置视频流（用于媒体源列表的预览）
    for (const device of videoStore.cameraDevices) {
      if (!device.isActive) {
        await previewSource(device);
      }
    }
    
    // 确保布局预览区域中的视频元素都在播放
    await ensureAllVideosPlaying();
    
    // 确保媒体源列表中的视频元素都在播放
    await ensureSourcePreviewsPlaying();
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 刷新媒体源失败:', error);
  } finally {
    isRefreshing.value = false;
  }
}

/**
 * 停止所有视频流
 * 仅停止布局编辑器内部使用的视频流，保留预览和直播画布中的媒体源
 */
function stopAllVideoStreams() {
  try {
    console.log('[LayoutEditorModal.vue 布局编辑器] 清理编辑器使用的视频流');
    
    // 获取当前布局的媒体元素
    const currentMediaElements = getMediaElements();
    
    // 对于每个媒体元素，安全地清除视频引用
    for (const element of currentMediaElements) {
      if (element.sourceId) {
        // 获取视频元素
        const videoElement = document.getElementById(`video-preview-${element.sourceId}`) as HTMLVideoElement | null;
        if (videoElement && videoElement.srcObject) {
          // 不停止流，只清除视频元素的引用
          videoElement.srcObject = null;
          console.log(`[LayoutEditorModal.vue 布局编辑器] 已清除视频元素引用: ID=${element.sourceId}`);
        }
      }
    }
    
    // 清理媒体源列表中的摄像头预览元素
    for (const device of videoStore.cameraDevices) {
      const videoElement = document.getElementById(`video-source-${device.id}`) as HTMLVideoElement | null;
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject = null;
        console.log(`[LayoutEditorModal.vue 布局编辑器] 已清除媒体源列表视频引用: ID=${device.id}`);
      }
    }
    
    // 注意：这里不调用videoStore.cleanup()，因为它会停止所有流
    // 包括可能正在预览或直播中使用的流
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 停止视频流时出错:', error);
  }
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
 * @param isPreview 是否是媒体源列表中的预览
 */
function setVideoElementStyle(videoElement: HTMLVideoElement, sourceType: string, isPreview = false) {
  if (!videoElement) {
    console.warn('[LayoutEditorModal.vue 布局编辑器] 无法设置视频元素样式：视频元素不存在');
    return;
  }
  
  // 基础样式设置
  videoElement.autoplay = true;
  videoElement.muted = true;
  videoElement.playsInline = true;
  
  // 设置样式以保持原始宽高比
  videoElement.style.objectFit = 'contain';
  videoElement.style.width = '100%';
  videoElement.style.height = '100%';
  videoElement.style.display = 'block'; // 确保显示
  
  // 根据媒体源类型设置特定样式
  if (sourceType === VideoSourceType.CAMERA) {
    // 摄像头预览特定样式
    videoElement.style.backgroundColor = '#000';
    
    // 如果是媒体源列表中的预览，进行特殊处理
    if (isPreview && videoElement.id.startsWith('video-source-')) {
      videoElement.style.borderRadius = '4px';
      videoElement.style.maxHeight = '80px';
      
      // 添加类以便CSS样式应用
      if (videoElement.parentElement) {
        videoElement.parentElement.classList.add('camera-capture');
      }
    }
  } else if (sourceType === VideoSourceType.WINDOW || sourceType === VideoSourceType.DISPLAY) {
    // 窗口和显示器捕获需要特殊处理
    videoElement.style.backgroundColor = '#000';
    videoElement.style.maxWidth = '100%';
    videoElement.style.maxHeight = '100%';
    
    // 如果是媒体源列表中的预览，限制高度
    if (isPreview && videoElement.id.startsWith('video-source-')) {
      videoElement.style.maxHeight = '80px';
      
      // 添加类以便CSS样式应用
      if (videoElement.parentElement) {
        videoElement.parentElement.classList.add(
          sourceType === VideoSourceType.WINDOW ? 'window-capture' : 'display-capture'
        );
      }
    }
  }
  
  // 确保视频元素可见
  videoElement.style.opacity = '1';
  videoElement.style.visibility = 'visible';
}

/**
 * 播放视频元素
 * @param videoElement 视频元素
 * @param deviceId 设备ID
 */
async function playVideoElement(videoElement: HTMLVideoElement, deviceId: string) {
  if (!videoElement) {
    console.warn(`[LayoutEditorModal.vue 布局编辑器] 视频元素不存在，无法播放设备 ${deviceId}`);
    return;
  }
  
  if (!videoElement.srcObject) {
    console.warn(`[LayoutEditorModal.vue 布局编辑器] 视频元素没有流，无法播放设备 ${deviceId}`);
    return;
  }
  
  // 添加静音以确保自动播放
  videoElement.muted = true;
  
  // 检查是否已经在播放
  if (!videoElement.paused) {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 视频元素 ${videoElement.id} 已经在播放中`);
    return;
  }
  
  try {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 尝试播放视频元素 ${videoElement.id}`);
    
    // 确保视频元素已加载元数据
    if (videoElement.readyState < 1) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 等待视频元素 ${videoElement.id} 加载元数据`);
      await new Promise<void>((resolve) => {
        const onMetadataLoaded = () => {
          videoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
          resolve();
        };
        
        // 设置超时，避免无限等待
        const timeout = setTimeout(() => {
          videoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
          console.warn(`[LayoutEditorModal.vue 布局编辑器] 等待视频元素 ${videoElement.id} 元数据加载超时`);
          resolve();
        }, 2000);
        
        videoElement.addEventListener('loadedmetadata', onMetadataLoaded, { once: true });
      });
    }
    
    // 使用retry机制播放视频
    const maxRetries = 3;
    let retryCount = 0;
    
    const attemptPlay = async (): Promise<void> => {
      try {
        await videoElement.play();
        console.log(`[LayoutEditorModal.vue 布局编辑器] 播放视频元素 ${videoElement.id} 成功`);
      } catch (error) {
        retryCount++;
        
        if (error instanceof DOMException) {
          if (error.name === 'AbortError') {
            console.warn(`[LayoutEditorModal.vue 布局编辑器] 视频元素 ${videoElement.id} 播放被中止，重试 (${retryCount}/${maxRetries})`);
            if (retryCount <= maxRetries) {
              // 添加延迟，避免立即重试
              await new Promise(resolve => setTimeout(resolve, 300));
              return attemptPlay();
            }
          } else if (error.name === 'NotAllowedError') {
            console.warn(`[LayoutEditorModal.vue 布局编辑器] 视频元素 ${videoElement.id} 播放未被允许，确保已静音`);
            // 确保视频是静音的
            videoElement.muted = true;
            return attemptPlay();
          }
        }
        
        console.error(`[LayoutEditorModal.vue 布局编辑器] 播放视频元素 ${videoElement.id} 失败:`, error);
      }
    };
    
    await attemptPlay();
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 播放视频元素 ${videoElement.id} 时发生异常:`, error);
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
  
  try {
    // 查找视频预览元素
    const videoElement = document.getElementById(`video-source-${source.id}`) as HTMLVideoElement | null;
    
    if (!videoElement) {
      console.warn(`[LayoutEditorModal.vue 布局编辑器] 未找到媒体源预览元素: ${source.id}`);
      return;
    }
    
    // 检查设备是否已激活
    const isActive = videoStore.activeDevices.some(d => d.id === source.id && d.stream);
    
    if (isActive) {
      // 设备已激活，直接使用其流
      const activeDevice = videoStore.activeDevices.find(d => d.id === source.id);
      if (activeDevice && activeDevice.stream) {
        console.log(`[LayoutEditorModal.vue 布局编辑器] 设备已激活，复用现有流: ${source.id}`);
        
        // 设置视频元素的流
        videoElement.srcObject = activeDevice.stream;
        videoElement.muted = true;
        
        // 设置视频元素样式
        setVideoElementStyle(videoElement, source.type, true);
        
        // 尝试播放视频
        await playVideoElement(videoElement, source.id);
      }
    } else if (source.type === VideoSourceType.CAMERA) {
      // 只为摄像头设备自动激活并设置视频流
      console.log(`[LayoutEditorModal.vue 布局编辑器] 激活摄像头并设置流: ${source.id}`);
      await activateDeviceAndSetStream(source.id, source.type, `video-source-${source.id}`);
    } else {
      // 对于其他类型的设备（窗口/显示器），点击后只显示缩略图，不激活流
      console.log(`[LayoutEditorModal.vue 布局编辑器] ${source.type}类型设备不自动激活流，等待用户拖放: ${source.id}`);
    }
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 预览媒体源失败 (ID: ${source.id}):`, error);
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
  try {
    // 检查设备是否已激活
    const isActive = videoStore.activeDevices.some(d => d.id === deviceId);
    
    if (!isActive) {
      // 如果设备未激活，先激活设备
      await activateDeviceAndSetStream(deviceId, VideoSourceType.WINDOW, `video-preview-${deviceId}`);
    } else {
      // 如果设备已激活，获取活跃设备的流并设置到预览视频元素
      const activeDevice = videoStore.activeDevices.find(d => d.id === deviceId);
      if (activeDevice && activeDevice.stream) {
        const videoElement = document.getElementById(`video-preview-${deviceId}`) as HTMLVideoElement | null;
        if (videoElement) {
          // 如果视频元素存在但没有视频流或已暂停，设置流并播放
          if (!videoElement.srcObject || videoElement.paused) {
            console.log(`[LayoutEditorModal.vue 布局编辑器] 为已激活的窗口捕获设置视频流: ${deviceId}`);
            
            try {
              // 尝试克隆活跃设备的流
              const streamClone = new MediaStream();
              
              // 逐个克隆轨道
              activeDevice.stream.getTracks().forEach(track => {
                try {
                  const cloneTrack = track.clone();
                  streamClone.addTrack(cloneTrack);
                } catch (cloneError) {
                  console.warn(`[LayoutEditorModal.vue 布局编辑器] 克隆轨道失败，使用原始轨道:`, cloneError);
                  streamClone.addTrack(track);
                }
              });
              
              // 设置视频元素源为克隆流
              videoElement.srcObject = streamClone;
              
              // 设置视频元素样式
              setVideoElementStyle(videoElement, VideoSourceType.WINDOW, false);
              
              // 尝试播放视频
              await playVideoElement(videoElement, deviceId);
            } catch (streamError) {
              console.error(`[LayoutEditorModal.vue 布局编辑器] 设置窗口捕获视频流失败: ${streamError}`);
              
              // 如果克隆失败，尝试直接使用原始流
              videoElement.srcObject = activeDevice.stream;
              await playVideoElement(videoElement, deviceId);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 激活窗口捕获失败 (ID: ${deviceId}):`, error);
  }
}

/**
 * 激活显示器捕获
 * @param deviceId 设备ID
 */
async function activateDisplay(deviceId: string) {
  try {
    // 检查设备是否已激活
    const isActive = videoStore.activeDevices.some(d => d.id === deviceId);
    
    if (!isActive) {
      // 如果设备未激活，先激活设备
      await activateDeviceAndSetStream(deviceId, VideoSourceType.DISPLAY, `video-preview-${deviceId}`);
    } else {
      // 如果设备已激活，获取活跃设备的流并设置到预览视频元素
      const activeDevice = videoStore.activeDevices.find(d => d.id === deviceId);
      if (activeDevice && activeDevice.stream) {
        const videoElement = document.getElementById(`video-preview-${deviceId}`) as HTMLVideoElement | null;
        if (videoElement) {
          // 如果视频元素存在但没有视频流或已暂停，设置流并播放
          if (!videoElement.srcObject || videoElement.paused) {
            console.log(`[LayoutEditorModal.vue 布局编辑器] 为已激活的显示器捕获设置视频流: ${deviceId}`);
            
            try {
              // 尝试克隆活跃设备的流
              const streamClone = new MediaStream();
              
              // 逐个克隆轨道
              activeDevice.stream.getTracks().forEach(track => {
                try {
                  const cloneTrack = track.clone();
                  streamClone.addTrack(cloneTrack);
                } catch (cloneError) {
                  console.warn(`[LayoutEditorModal.vue 布局编辑器] 克隆轨道失败，使用原始轨道:`, cloneError);
                  streamClone.addTrack(track);
                }
              });
              
              // 设置视频元素源为克隆流
              videoElement.srcObject = streamClone;
              
              // 设置视频元素样式
              setVideoElementStyle(videoElement, VideoSourceType.DISPLAY, false);
              
              // 尝试播放视频
              await playVideoElement(videoElement, deviceId);
            } catch (streamError) {
              console.error(`[LayoutEditorModal.vue 布局编辑器] 设置显示器捕获视频流失败: ${streamError}`);
              
              // 如果克隆失败，尝试直接使用原始流
              videoElement.srcObject = activeDevice.stream;
              await playVideoElement(videoElement, deviceId);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 激活显示器捕获失败 (ID: ${deviceId}):`, error);
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
  console.log('[LayoutEditorModal.vue 布局编辑器] 显示保存选项对话框');
  showingSaveOptions.value = true;
}

/**
 * 保存当前布局
 */
function saveCurrentLayout() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 保存当前布局 - 单独保存模式');
  console.log('[LayoutEditorModal.vue 布局编辑器] 当前布局信息:', {
    layoutId: layoutCopy.value.id,
    template: layoutCopy.value.template,
    scheduleId: props.scheduleId,
    scheduleType: props.scheduleType,
    hasElements: !!layoutCopy.value.elements,
    elementsCount: layoutCopy.value.elements?.length || 0
  });
  
  // 创建布局的深拷贝，确保引用变化
  const layoutToSave = JSON.parse(JSON.stringify(layoutCopy.value));
  
  // 确保媒体元素被正确保存
  const currentMediaElements = mediaElements.value;
  if (currentMediaElements.length > 0) {
    // 记录媒体元素信息
    console.log('[LayoutEditorModal.vue 布局编辑器] 保存的媒体元素:', 
      currentMediaElements.map(e => ({
        id: e.id,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        sourceType: e.sourceType
      }))
    );
    
    // 确保layoutToSave有elements属性
    if (!layoutToSave.elements) {
      layoutToSave.elements = [];
    }
    
    // 遍历所有媒体元素
    currentMediaElements.forEach(element => {
      // 在布局中查找对应的元素
      const existingElementIndex = layoutToSave.elements.findIndex((e: any) => e.id === element.id && e.type === 'media');
      
      if (existingElementIndex >= 0) {
        // 如果元素已存在，更新它
        const updatedElement = {
          ...layoutToSave.elements[existingElementIndex],
          sourceId: element.sourceId,
          sourceName: element.sourceName,
          sourceType: element.sourceType
        };
        
        // 如果有sourceId，查找对应的视频源以获取最新信息
        if (element.sourceId) {
          // 从所有视频源组中查找匹配的源
          for (const group of videoStore.videoSourceGroups) {
            const source = group.sources.find(s => s.id === element.sourceId);
            if (source) {
              updatedElement.sourceName = source.name;
              updatedElement.sourceType = source.type;
              break;
            }
          }
        }
        
        // 更新元素
        layoutToSave.elements[existingElementIndex] = updatedElement;
      } else {
        // 如果元素不存在，添加它
        const newElement = { ...element };
        
        // 如果有sourceId，查找对应的视频源以获取最新信息
        if (element.sourceId) {
          // 从所有视频源组中查找匹配的源
          for (const group of videoStore.videoSourceGroups) {
            const source = group.sources.find(s => s.id === element.sourceId);
            if (source) {
              newElement.sourceName = source.name;
              newElement.sourceType = source.type;
              break;
            }
          }
        }
        
        // 添加元素
        layoutToSave.elements.push(newElement);
      }
    });
    
    console.log('[LayoutEditorModal.vue 布局编辑器] 最终保存的布局元素:', 
      layoutToSave.elements.filter((e: any) => e.type === 'media').map((e: any) => ({
        id: e.id,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        sourceType: e.sourceType
      }))
    );
  }
  
  // 直接调用planStore的updateLayoutInSchedule方法更新布局
  if (props.scheduleId) {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 正在更新日程 ${props.scheduleId} 中的布局 ${layoutToSave.id}`);
    const success = planStore.updateLayoutInSchedule(props.scheduleId, layoutToSave);
    if (success) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 布局已更新: 日程ID=${props.scheduleId}, 布局ID=${layoutToSave.id}`);
      
      // 通知渲染器更新布局
      notifyRenderersLayoutChanged();
      
      // 关闭对话框
      showingSaveOptions.value = false;
      handleClose();
    } else {
      console.error(`[LayoutEditorModal.vue 布局编辑器] 布局更新失败: 日程ID=${props.scheduleId}, 布局ID=${layoutToSave.id}`);
    }
  } else {
    console.error('[LayoutEditorModal.vue 布局编辑器] 无法保存布局：未提供日程ID');
  }
}

/**
 * 保存相似布局
 */
function saveSimilarLayouts() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 保存所有相似布局 - 批量保存模式');
  console.log('[LayoutEditorModal.vue 布局编辑器] 当前布局信息:', {
    layoutId: layoutCopy.value.id,
    template: layoutCopy.value.template,
    scheduleId: props.scheduleId,
    scheduleType: props.scheduleType,
    hasElements: !!layoutCopy.value.elements,
    elementsCount: layoutCopy.value.elements?.length || 0
  });
  
  // 创建布局的深拷贝，确保引用变化
  const layoutToSave = JSON.parse(JSON.stringify(layoutCopy.value));
  
  // 确保媒体元素被正确保存
  const currentMediaElements = mediaElements.value;
  if (currentMediaElements.length > 0) {
    // 记录媒体元素信息
    console.log('[LayoutEditorModal.vue 布局编辑器] 保存的媒体元素:', 
      currentMediaElements.map(e => ({
        id: e.id,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        sourceType: e.sourceType
      }))
    );
    
    // 确保layoutToSave有elements属性
    if (!layoutToSave.elements) {
      layoutToSave.elements = [];
    }
    
    // 遍历所有媒体元素
    currentMediaElements.forEach(element => {
      // 在布局中查找对应的元素
      const existingElementIndex = layoutToSave.elements.findIndex((e: any) => e.id === element.id && e.type === 'media');
      
      if (existingElementIndex >= 0) {
        // 如果元素已存在，更新它
        const updatedElement = {
          ...layoutToSave.elements[existingElementIndex],
          sourceId: element.sourceId,
          sourceName: element.sourceName,
          sourceType: element.sourceType
        };
        
        // 如果有sourceId，查找对应的视频源以获取最新信息
        if (element.sourceId) {
          // 从所有视频源组中查找匹配的源
          for (const group of videoStore.videoSourceGroups) {
            const source = group.sources.find(s => s.id === element.sourceId);
            if (source) {
              updatedElement.sourceName = source.name;
              updatedElement.sourceType = source.type;
              break;
            }
          }
        }
        
        // 更新元素
        layoutToSave.elements[existingElementIndex] = updatedElement;
      } else {
        // 如果元素不存在，添加它
        const newElement = { ...element };
        
        // 如果有sourceId，查找对应的视频源以获取最新信息
        if (element.sourceId) {
          // 从所有视频源组中查找匹配的源
          for (const group of videoStore.videoSourceGroups) {
            const source = group.sources.find(s => s.id === element.sourceId);
            if (source) {
              newElement.sourceName = source.name;
              newElement.sourceType = source.type;
              break;
            }
          }
        }
        
        // 添加元素
        layoutToSave.elements.push(newElement);
      }
    });
    
    console.log('[LayoutEditorModal.vue 布局编辑器] 最终保存的布局元素:', 
      layoutToSave.elements.filter((e: any) => e.type === 'media').map((e: any) => ({
        id: e.id,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        sourceType: e.sourceType
      }))
    );
  }
  
  if (!props.scheduleId || !currentBranch.value) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 无法保存相似布局：未提供日程ID或未找到当前分支');
    return;
  }
  
  // 首先更新当前布局
  console.log(`[LayoutEditorModal.vue 布局编辑器] 正在更新当前日程 ${props.scheduleId} 中的布局 ${layoutToSave.id}`);
  const currentLayoutSuccess = planStore.updateLayoutInSchedule(props.scheduleId, layoutToSave);
  if (currentLayoutSuccess) {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 当前布局已更新: 日程ID=${props.scheduleId}, 布局ID=${layoutToSave.id}`);
  } else {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 当前布局更新失败: 日程ID=${props.scheduleId}, 布局ID=${layoutToSave.id}`);
    // 如果当前布局更新失败，不继续更新其他布局
    return;
  }
  
  // 获取当前日程类型
  const currentScheduleType = props.scheduleType;
  
  // 遍历所有日程，更新相同类型相同模板的布局
  console.log(`[LayoutEditorModal.vue 布局编辑器] 开始更新所有使用模板 ${layoutToSave.template} 的布局`);
  let updatedCount = 0;
  
  currentBranch.value.schedules.forEach(schedule => {
    // 跳过当前日程，因为已经更新过了
    if (schedule.id === props.scheduleId) {
      return;
    }
    
    // 只处理与当前选中的日程类型相同的日程
    if (schedule.type === currentScheduleType) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 处理相同类型日程: ${schedule.id}, 类型: ${schedule.type}`);
      
      // 遍历该日程的所有布局
      schedule.layouts.forEach(l => {
        // 只处理与当前选中的布局模板相同的布局
        if (l.template === layoutToSave.template) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 找到相似布局: 日程ID=${schedule.id}, 布局ID=${l.id}, 模板=${l.template}`);
          
          // 创建布局的深拷贝，避免引用问题
          const updatedLayout = JSON.parse(JSON.stringify(l));
          
          // 更新布局的背景、标签背景和文字颜色
          if (layoutToSave.background) updatedLayout.background = layoutToSave.background;
          if (layoutToSave.labelBackground) updatedLayout.labelBackground = layoutToSave.labelBackground;
          if (layoutToSave.textColor) updatedLayout.textColor = layoutToSave.textColor;
          
          // 更新布局的标签显示名称
          if (layoutToSave.surgeonLabelDisplayName) updatedLayout.surgeonLabelDisplayName = layoutToSave.surgeonLabelDisplayName;
          if (layoutToSave.surgeryLabelDisplayName) updatedLayout.surgeryLabelDisplayName = layoutToSave.surgeryLabelDisplayName;
          if (layoutToSave.guestLabelDisplayName) updatedLayout.guestLabelDisplayName = layoutToSave.guestLabelDisplayName;
          
          // 更新布局的描述
          if (layoutToSave.description) updatedLayout.description = layoutToSave.description;
          
          // 处理媒体元素
          if (currentMediaElements.length > 0 && layoutToSave.elements) {
            // 确保updatedLayout有elements属性
            if (!updatedLayout.elements) {
              updatedLayout.elements = [];
            }
            
            // 获取布局模板
            const template = planStore.layoutTemplates.find(t => t.template === layoutToSave.template);
            
            if (template && template.elements) {
              // 遍历模板中的所有媒体元素
              template.elements.forEach(templateElement => {
                if (templateElement.type === 'media') {
                  // 在编辑后的布局中查找对应的媒体元素
                  const editedElement = layoutToSave.elements.find((e: any) => 
                    e.id === templateElement.id && e.type === 'media'
                  );
                  
                  // 在目标布局中查找对应的媒体元素
                  let targetElementIndex = updatedLayout.elements.findIndex((e: any) => 
                    e.id === templateElement.id && e.type === 'media'
                  );
                  
                  // 如果目标布局中没有该元素，则创建一个
                  if (targetElementIndex === -1) {
                    updatedLayout.elements.push({ ...templateElement });
                    targetElementIndex = updatedLayout.elements.length - 1;
                  }
                  
                  // 如果编辑后的布局中有该元素，则更新目标布局中的元素
                  if (editedElement) {
                    // 只复制媒体源相关的属性
                    updatedLayout.elements[targetElementIndex].sourceId = editedElement.sourceId;
                    updatedLayout.elements[targetElementIndex].sourceName = editedElement.sourceName;
                    updatedLayout.elements[targetElementIndex].sourceType = editedElement.sourceType;
                  }
                }
              });
            }
          }
          
          // 使用planStore的updateLayoutInSchedule方法更新布局
          console.log(`[LayoutEditorModal.vue 布局编辑器] 正在更新日程 ${schedule.id} 中的布局 ${updatedLayout.id}`);
          const success = planStore.updateLayoutInSchedule(schedule.id, updatedLayout);
          if (success) {
            console.log(`[LayoutEditorModal.vue 布局编辑器] 已更新相似布局: 日程ID=${schedule.id}, 布局ID=${updatedLayout.id}`);
            updatedCount++;
          } else {
            console.error(`[LayoutEditorModal.vue 布局编辑器] 更新相似布局失败: 日程ID=${schedule.id}, 布局ID=${updatedLayout.id}`);
          }
        }
      });
    }
  });
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 批量保存完成，共更新了 ${updatedCount} 个相似布局`);
  
  // 通知渲染器更新布局
  notifyRenderersLayoutChanged();
  
  // 关闭对话框
  showingSaveOptions.value = false;
  handleClose();
}

/**
 * 通知渲染器布局已更改
 * 当布局被编辑后保存时，通知预览和直播画布更新
 */
function notifyRenderersLayoutChanged() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 布局已保存，正在检查更新路径');
  
  // 获取当前正在编辑的布局副本
  const editedLayout = JSON.parse(JSON.stringify(layoutCopy.value));
  
  // 获取当前预览和直播布局
  const currentPreviewLayout = planStore.previewingLayout;
  const currentLiveLayout = planStore.liveLayout;
  
  // 检查是否是正在预览的布局
  const isPreviewLayout = currentPreviewLayout && 
    currentPreviewLayout.id === editedLayout.id;
  
  // 检查是否是正在直播的布局
  const isLiveLayout = currentLiveLayout && 
    currentLiveLayout.id === editedLayout.id;
  
  // 为便于调试，记录当前状态
  console.log('[LayoutEditorModal.vue 布局编辑器] 布局更新路径分析:', {
    isPreviewLayout,
    isLiveLayout,
    previewLayoutId: currentPreviewLayout?.id,
    liveLayoutId: currentLiveLayout?.id,
    editedLayoutId: editedLayout.id,
    scheduleId: props.scheduleId
  });
  
  // 1. 如果是正在预览的布局，更新预览
  if (isPreviewLayout) {
    console.log('[LayoutEditorModal.vue 布局编辑器] 编辑的是当前预览布局，直接通知预览画布重绘');
    
    // 使用completeLayoutInfo方法补全布局信息
    const completedLayout = planStore.completeLayoutInfo(editedLayout);
    
    // 仅触发通知事件，预览布局实例保持不变
    planStore.notifyPreviewLayoutEdited();
  }
  
  // 2. 如果是正在直播的布局，更新直播
  if (isLiveLayout) {
    console.log('[LayoutEditorModal.vue 布局编辑器] 编辑的是当前直播布局，直接通知直播画布重绘');
    
    // 使用completeLayoutInfo方法补全布局信息
    const completedLayout = planStore.completeLayoutInfo(editedLayout);
    
    // 仅触发通知事件，直播布局实例保持不变
    planStore.notifyLiveLayoutEdited();
  }
  
  // 如果既不是预览也不是直播布局，则无需额外操作
  // 因为布局已通过updateLayoutInSchedule方法更新到日程中
  if (!isPreviewLayout && !isLiveLayout) {
    console.log('[LayoutEditorModal.vue 布局编辑器] 编辑的布局当前未在预览或直播中，无需额外通知');
  }
}

/**
 * 处理关闭
 */
function handleClose() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 关闭布局编辑器');
  
  // 停止布局编辑器内使用的视频流引用，不影响预览和直播
  stopAllVideoStreams();
  
  // 发送关闭事件
  emit('close');
}

/**
 * 获取媒体元素
 * @returns MediaLayoutElement[] 媒体元素列表
 */
function getMediaElements(): MediaLayoutElement[] {
  // 首先检查布局本身是否已有elements属性
  if (layoutCopy.value.elements) {
    // 过滤出媒体类型的元素
    const mediaElementsFromLayout = (layoutCopy.value.elements as LayoutElement[])
      .filter(element => element.type === LayoutElementType.MEDIA)
      .map(element => element as MediaLayoutElement);
    
    if (mediaElementsFromLayout.length > 0) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 从布局中获取到 ${mediaElementsFromLayout.length} 个媒体元素`);
      return mediaElementsFromLayout;
    }
  }
  
  // 如果布局中没有elements属性，则从模板中获取
  const template = planStore.layoutTemplates.find(t => t.template === layoutCopy.value.template);
  
  if (!template || !template.elements) {
    console.log('[LayoutEditorModal.vue 布局编辑器] 未找到布局模板或模板中没有元素');
    return [];
  }
  
  // 过滤出媒体类型的元素
  const mediaElementsFromTemplate = template.elements
    .filter(element => element.type === LayoutElementType.MEDIA)
    .map(element => element as MediaLayoutElement);
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 从模板中获取到 ${mediaElementsFromTemplate.length} 个媒体元素`);
  return mediaElementsFromTemplate;
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
      console.log(`[LayoutEditorModal.vue 布局编辑器] 清除媒体元素: ID=${element.id}, 源=${element.sourceId}, 类型=${element.sourceType || '未知'}`);
      
      try {
        // 针对不同类型设备的处理
        if (element.sourceType === VideoSourceType.CAMERA) {
          // 对于摄像头设备，不停止视频流，只清除视频元素的引用
          // 因为摄像头可能还在媒体源列表中被使用
          videoElement.srcObject = null;
          console.log(`[LayoutEditorModal.vue 布局编辑器] 已清除摄像头元素 ${element.id} 的视频引用，保留流`);
        } else if (element.sourceType === VideoSourceType.WINDOW || element.sourceType === VideoSourceType.DISPLAY) {
          // 对于窗口和显示器捕获，检查是否在预览或直播中使用
          // 如果在预览或直播中使用，则只清除视频元素的引用，不停止流
          const isUsedInPreviewOrLive = videoStore.activeDevices.some(d => 
            d.id === element.sourceId && 
            d.stream && 
            d.isActive
          );
          
          if (isUsedInPreviewOrLive) {
            // 如果在预览或直播中使用，只清除视频元素的引用
            console.log(`[LayoutEditorModal.vue 布局编辑器] 检测到设备 ${element.sourceId} 在预览或直播中使用，只清除视频引用`);
            videoElement.srcObject = null;
          } else {
            // 如果不在预览或直播中使用，可以安全停止流
            const mediaStream = videoElement.srcObject as MediaStream;
            if (mediaStream) {
              const trackCount = mediaStream.getTracks().length;
              mediaStream.getTracks().forEach(track => track.stop());
              console.log(`[LayoutEditorModal.vue 布局编辑器] 已停止 ${element.sourceType} 捕获的 ${trackCount} 个轨道`);
            }
            
            // 清除视频源
            videoElement.srcObject = null;
          }
        } else {
          // 其他未知类型的设备，为安全起见只清除引用
          videoElement.srcObject = null;
          console.log(`[LayoutEditorModal.vue 布局编辑器] 已清除未知类型设备 ${element.id} 的视频引用`);
        }
      } catch (error) {
        console.error(`[LayoutEditorModal.vue 布局编辑器] 清除媒体元素时出错:`, error);
        // 即使出错，也尝试清除视频引用
        videoElement.srcObject = null;
      }
    }
  }
  
  // 清除媒体元素的属性
  element.sourceId = '';
  element.sourceName = '';
  element.sourceType = undefined;
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 媒体元素 ${element.id} 已完全清除`);
}

/**
 * 确保摄像头流在预览区域中显示
 * 这个函数专门处理摄像头设备，确保它们在布局预览区域中正确显示
 */
async function ensureCameraStreamsInPreview() {
  try {
    // 等待DOM更新
    await nextTick();
    
    // 获取当前布局的媒体元素
    const currentMediaElements = getMediaElements();
    
    // 遍历当前布局中的媒体元素，找出摄像头类型的元素
    for (const element of currentMediaElements) {
      // 只处理当前布局中实际有sourceId的元素
      if (element.sourceId && element.sourceType === VideoSourceType.CAMERA) {
        console.log(`[LayoutEditorModal.vue 布局编辑器] 确保摄像头流显示: 元素ID=${element.id}, 源ID=${element.sourceId}`);
        
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

/**
 * 获取背景图片URL，优先使用缓存的图片
 * @param backgroundUrl 背景图片URL
 * @returns 背景图片样式
 */
function getBackgroundImageUrl(backgroundUrl: string | undefined): string {
  if (!backgroundUrl) return 'none';
  
  // 尝试从缓存中获取图片
  const cachedImage = getCachedImage(backgroundUrl);
  if (cachedImage && cachedImage.complete && cachedImage.naturalWidth > 0) {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 使用缓存的背景图片: ${backgroundUrl}`);
    return `url(${backgroundUrl})`;
  }
  
  // 如果没有缓存或图片未加载完成，直接使用URL
  return `url(${backgroundUrl})`;
}

/**
 * 初始化摄像头预览元素
 * 此方法在组件挂载后调用，用于确保媒体源列表中的视频能正常播放
 */
async function ensureSourcePreviewsPlaying() {
  try {
    // 等待DOM更新
    await nextTick();
    
    console.log('[LayoutEditorModal.vue 布局编辑器] 确保摄像头预览元素播放');
    
    // 为活跃的摄像头设备设置视频流
    for (const device of videoStore.activeDevices) {
      if (device.type === VideoSourceType.CAMERA && device.stream) {
        const videoElement = document.getElementById(`video-source-${device.id}`) as HTMLVideoElement | null;
        
        if (videoElement) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 为已激活的摄像头设置预览流: ${device.id}`);
          
          // 设置视频元素的流
          videoElement.srcObject = device.stream;
          videoElement.muted = true;
          
          // 设置视频元素样式
          setVideoElementStyle(videoElement, device.type, true);
          
          // 尝试播放视频
          await playVideoElement(videoElement, device.id);
        }
      }
    }
    
    // 设置定时器，延迟 500ms 再次尝试播放未播放的视频
    setTimeout(async () => {
      const videoElements = document.querySelectorAll('video[id^="video-source-"]') as NodeListOf<HTMLVideoElement>;
      
      for (const videoElement of videoElements) {
        if (videoElement.paused && videoElement.srcObject) {
          console.log(`[LayoutEditorModal.vue 布局编辑器] 再次尝试播放视频元素: ${videoElement.id}`);
          await playVideoElement(videoElement, videoElement.id.replace('video-source-', ''));
        }
      }
    }, 500);
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 确保摄像头预览元素播放失败:', error);
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
  font-size: 14px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.5;
}

.option-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-color-danger, #f56c6c);
  line-height: 1.5;
  font-weight: 500;
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