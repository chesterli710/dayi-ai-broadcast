<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('layoutEditor.title')"
    width="90%"
    :fullscreen="false"
    class="layout-editor-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @closed="handleClose"
  >
    <div class="layout-editor-container">
      <!-- 左侧布局预览区域 -->
      <div class="layout-preview-panel">
        <div class="layout-preview-header">
          <h3>{{ $t('layoutEditor.previewTitle') }}</h3>
          <div class="preview-actions">
            <span class="schedule-type">{{ scheduleTypeText }}</span>
          </div>
        </div>
        <div class="layout-preview-content">
          <div class="canvas-container" ref="canvasContainer">
            <div 
              class="canvas-wrapper"
              ref="canvasWrapper"
            >
              <div 
                class="layout-canvas" 
                ref="layoutCanvas"
                :style="canvasStyle"
              >
                <!-- 布局背景图 -->
                <div class="layout-background" :style="backgroundStyle"></div>
                
                <!-- 媒体元素占位符 -->
                <div 
                  v-for="element in mediaElements" 
                  :key="element.id"
                  class="media-element-placeholder"
                  :class="{ 'drag-over': element === dragOverElement }"
                  :style="getElementStyle(element)"
                  @dragover.prevent="handleDragOver($event, element)"
                  @dragleave="handleDragLeave($event, element)"
                  @drop="handleDrop($event, element)"
                >
                  <!-- 媒体内容显示 -->
                  <video 
                    v-if="element.sourceType === 'camera' && element.sourceId && getSourceStream(element.sourceId)"
                    :srcObject.prop="getSourceStream(element.sourceId)"
                    autoplay 
                    muted 
                    playsinline
                    class="element-video"
                  ></video>
                  <video 
                    v-else-if="(element.sourceType === 'window' || element.sourceType === 'screen') && element.sourceId && getSourceStream(element.sourceId)"
                    :srcObject.prop="getSourceStream(element.sourceId)"
                    autoplay 
                    muted 
                    playsinline
                    class="element-video"
                  ></video>
                  
                  <!-- 元素信息展示（无媒体源时显示） -->
                  <div class="element-info" v-if="!element.sourceId">
                    <span class="element-id">{{ element.id }}</span>
                    <span class="element-type">{{ element.type }}</span>
                  </div>
                  
                  <!-- 悬停时显示的删除按钮 -->
                  <div class="element-actions" v-if="element.sourceId">
                    <button class="delete-source-btn" @click="clearSource(element)">
                      <el-icon><Delete /></el-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧媒体源列表 -->
      <div class="media-sources-panel">
        <div class="media-sources-header">
          <h3>{{ $t('layoutEditor.mediaSources') }}</h3>
          <div class="media-sources-actions">
            <el-button size="small" type="primary" @click="refreshSources">
              <el-icon><Refresh /></el-icon>
              {{ $t('layoutEditor.refreshSources') }}
            </el-button>
          </div>
        </div>
        <div class="media-sources-content">
          <!-- 加载状态 -->
          <div v-if="mediaSourceStore.isLoading" class="loading-container">
            <el-icon class="loading-icon"><Loading /></el-icon>
            <p>{{ $t('layoutEditor.loadingSources') }}</p>
          </div>
          
          <!-- 媒体源分类展示 -->
          <template v-else>
            <!-- 设备捕获 -->
            <div class="source-category" v-if="mediaSourceStore.cameraSources.length > 0">
              <h4 class="category-title">{{ $t('layoutEditor.deviceCaptures') }}</h4>
              <div class="source-list">
                <div 
                  v-for="source in mediaSourceStore.cameraSources" 
                  :key="source.id"
                  class="source-card camera-source-card"
                  :class="{ 'source-active': source.isActive }"
                  draggable="true"
                  @dragstart="handleDragStart($event, source)"
                >
                  <div class="source-preview">
                    <video 
                      v-if="source.stream" 
                      :srcObject.prop="source.stream" 
                      autoplay 
                      muted 
                      playsinline
                      class="camera-preview"
                    ></video>
                    <div v-else class="camera-placeholder">
                      <el-icon><VideoCamera /></el-icon>
                    </div>
                  </div>
                  <div class="source-info">
                    <div class="source-name">{{ source.name }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 窗口捕获 -->
            <div class="source-category" v-if="mediaSourceStore.windowSources.length > 0">
              <h4 class="category-title">{{ $t('layoutEditor.windowCaptures') }}</h4>
              <div class="source-list">
                <div 
                  v-for="source in mediaSourceStore.windowSources" 
                  :key="source.id"
                  class="source-card window-source-card"
                  draggable="true"
                  @dragstart="handleDragStart($event, source)"
                >
                  <div class="source-preview">
                    <img 
                      v-if="source.thumbnail" 
                      :src="source.thumbnail" 
                      class="thumbnail-preview"
                      alt="Window thumbnail"
                    />
                    <div v-else class="window-placeholder">
                      <el-icon><Monitor /></el-icon>
                    </div>
                  </div>
                  <div class="source-info">
                    <div class="source-name">{{ source.name }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 桌面捕获 -->
            <div class="source-category" v-if="mediaSourceStore.screenSources.length > 0">
              <h4 class="category-title">{{ $t('layoutEditor.screenCaptures') }}</h4>
              <div class="source-list">
                <div 
                  v-for="source in mediaSourceStore.screenSources" 
                  :key="source.id"
                  class="source-card screen-source-card"
                  draggable="true"
                  @dragstart="handleDragStart($event, source)"
                >
                  <div class="source-preview">
                    <img 
                      v-if="source.thumbnail" 
                      :src="source.thumbnail" 
                      class="thumbnail-preview"
                      alt="Screen thumbnail"
                    />
                    <div v-else class="screen-placeholder">
                      <el-icon><Monitor /></el-icon>
                    </div>
                  </div>
                  <div class="source-info">
                    <div class="source-name">{{ source.name }}</div>
                    <div class="source-details">
                      {{ source.width }}x{{ source.height }}
                    </div>
                    <div class="source-status" v-if="source.type === 'screen' && (source as any).isPrimary">
                      <el-tag size="small" type="primary">
                        {{ $t('layoutEditor.primary') }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 没有媒体源时显示 -->
            <div v-if="!hasMediaSources" class="empty-media-sources">
              <p>{{ $t('layoutEditor.noMediaSources') }}</p>
              <el-button type="primary" @click="refreshSources">
                {{ $t('layoutEditor.refreshSources') }}
              </el-button>
            </div>
          </template>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveLayout">{{ $t('common.save') }}</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 保存布局选项对话框 -->
  <el-dialog
    v-model="saveDialogVisible"
    custom-class="save-options-dialog"
    width="520px"
    :append-to-body="true"
    :show-close="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    :modal="true"
    :destroy-on-close="true"
    :before-close="() => saveDialogVisible = false"
    :footer="null"
  >
    <div class="save-dialog-wrapper">
      <div class="save-dialog-header">
        <div class="save-dialog-title">
          <i class="bi bi-save2"></i>
          <span>{{ $t('layoutEditor.saveOptions') }}</span>
        </div>
      </div>
      
      <div class="save-dialog-content">
        <div class="save-option-wrapper">
          <div
            class="save-option-card save-single-card"
            @click="saveSingleLayout"
          >
            <div class="option-content">
              <div class="option-icon-wrapper">
                <div class="option-icon">
                  <i class="bi bi-file-earmark-check"></i>
                </div>
              </div>
              <div class="option-text">
                <div class="option-title">{{ $t('layoutEditor.saveSingle') }}</div>
                <div class="option-desc">
                  {{ $t('layoutEditor.saveSingleDesc') }}
                </div>
              </div>
            </div>
            <div class="option-action">
              <i class="bi bi-chevron-right"></i>
            </div>
          </div>
          
          <div
            class="save-option-card save-all-card"
            @click="saveAllSimilarLayouts"
          >
            <div class="option-content">
              <div class="option-icon-wrapper">
                <div class="option-icon">
                  <i class="bi bi-files"></i>
                </div>
              </div>
              <div class="option-text">
                <div class="option-title">{{ $t('layoutEditor.saveAll') }}</div>
                <div class="option-desc">
                  {{ $t('layoutEditor.saveAllDesc') }}
                </div>
              </div>
            </div>
            <div class="option-action">
              <i class="bi bi-chevron-right"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, h, createApp } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';
import { useMediaSourceStore } from '../stores/mediaSourceStore';
import mediaSourceManager from '../utils/mediaSourceManager';
import { getCachedImage } from '../utils/imagePreloader';
import type { Layout, MediaLayoutElement, ScheduleType, LayoutElement } from '../types/broadcast';
import type { MediaSource } from '../types/mediaSource';
import { Delete, Refresh, VideoCamera, Monitor, Loading } from '@element-plus/icons-vue';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { ElMessageBox, ElMessage, ElDialog, ElButton } from 'element-plus';
import ElementPlus from 'element-plus';

// 国际化
const { t } = useI18n();

// 计划存储
const planStore = usePlanStore();

// 媒体源存储
const mediaSourceStore = useMediaSourceStore();

// Props
interface Props {
  visible: boolean;
  layout: Layout;
  scheduleType: ScheduleType | string;
  scheduleId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  scheduleId: ''
});

// Emits
const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 对话框可见性状态
const dialogVisible = ref(props.visible);

// 布局预览相关引用
const canvasContainer = ref<HTMLElement | null>(null);
const canvasWrapper = ref<HTMLElement | null>(null);
const layoutCanvas = ref<HTMLElement | null>(null);

// 编辑中的布局
const editingLayout = ref<Layout>({ ...props.layout });

// 当前拖拽悬停的元素
const dragOverElement = ref<MediaLayoutElement | null>(null);

// 画布尺寸和缩放
const canvasWidth = 800; // 固定宽度为960
const canvasHeight = 450; // 按照16:9比例计算高度 (960 * 9 / 16 = 540)
const canvasScale = ref(1);

// 原始布局尺寸与当前预览尺寸的比例
const scaleRatio = computed(() => {
  // 原始布局尺寸为1920x1080，当前预览尺寸为canvasWidth x canvasHeight
  return canvasWidth / 1920; // 等于 960/1920 = 0.5
});

// 日程类型文本
const scheduleTypeText = computed(() => {
  switch (props.scheduleType) {
    case 'surgery':
      return t('scheduleManager.surgeryType');
    case 'lecture':
      return t('scheduleManager.lectureType');
    default:
      return t('scheduleManager.unknownType');
  }
});

// 判断是否有媒体源
const hasMediaSources = computed(() => {
  return (
    mediaSourceStore.cameraSources.length > 0 ||
    mediaSourceStore.windowSources.length > 0 ||
    mediaSourceStore.screenSources.length > 0
  );
});

/**
 * 获取媒体元素列表
 */
const mediaElements = computed(() => {
  if (!editingLayout.value.elements) return [];
  
  return editingLayout.value.elements.filter(
    (element): element is MediaLayoutElement => element.type === 'media'
  );
});

/**
 * 背景样式
 */
const backgroundStyle = computed(() => {
  const background = editingLayout.value.background || 
                     (planStore.currentPlan ? planStore.currentPlan.background : '');
  
  return {
    backgroundImage: background ? `url(${background})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };
});

/**
 * 画布样式
 */
const canvasStyle = computed(() => {
  return {
    width: `${canvasWidth}px`,
    height: `${canvasHeight}px`,
    transform: `scale(${canvasScale.value})`,
    transformOrigin: 'center center'
  };
});

/**
 * 获取元素样式
 * @param element 布局元素
 * @returns 样式对象
 */
function getElementStyle(element: MediaLayoutElement) {
  // 将原始坐标和尺寸（基于1920x1080）转换为本地坐标系（基于960x540）
  const ratio = scaleRatio.value;
  
  return {
    left: `${element.x * ratio}px`,
    top: `${element.y * ratio}px`,
    width: `${element.width * ratio}px`,
    height: `${element.height * ratio}px`,
    zIndex: element.zIndex || 1
  };
}

/**
 * 更新画布缩放
 * 根据容器大小自动调整缩放比例，保持布局的宽高比
 */
function updateCanvasScale() {
  if (!canvasContainer.value || !canvasWrapper.value) return;
  
  // 获取容器宽高
  const containerWidth = canvasContainer.value.clientWidth;
  const containerHeight = canvasContainer.value.clientHeight;
  
  // 计算缩放比例，保持宽高比
  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  
  // 取最小值，确保画布完整显示
  canvasScale.value = Math.min(scaleX, scaleY) * 0.95; // 乘以0.95留出一点边距
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 画布容器尺寸: ${containerWidth}x${containerHeight}, 画布缩放: ${canvasScale.value}`);
}

/**
 * 刷新媒体源列表
 * @returns 返回Promise，以便后续处理
 */
async function refreshSources() {
  try {
    // 初始化媒体源管理器（如果尚未初始化）
    mediaSourceManager.initialize();
    
    // 记住当前已激活的媒体源ID
    const activeCameraIds = mediaSourceStore.cameraSources
      .filter((camera: MediaSource) => camera.isActive)
      .map((camera: MediaSource) => camera.id);
    
    console.log(`[LayoutEditorModal.vue 布局编辑器] 刷新前已激活的摄像头: ${activeCameraIds.length}个`);
    
    // 刷新所有媒体源
    await mediaSourceManager.refreshAllSources();
    
    console.log('[LayoutEditorModal.vue 布局编辑器] 媒体源刷新完成');
    
    // 自动激活所有摄像头设备
    const cameras = mediaSourceStore.cameraSources;
    if (cameras.length > 0) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 自动激活 ${cameras.length} 个摄像头设备`);
      
      // 创建激活任务队列
      const activationPromises = cameras.map(async (camera: MediaSource) => {
        // 激活所有摄像头，保证UI显示为已激活状态
        if (!camera.isActive) {
          await activateSource(camera);
        }
      });
      
      // 并行执行所有激活任务，提高效率
      await Promise.all(activationPromises);
      
      // 检查是否所有摄像头都已成功激活
      const activatedCount = mediaSourceStore.cameraSources.filter((c: MediaSource) => c.isActive).length;
      console.log(`[LayoutEditorModal.vue 布局编辑器] 成功激活 ${activatedCount}/${cameras.length} 个摄像头`);
    }
    
    // 返回成功完成的Promise
    return Promise.resolve();
  } catch (error) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 刷新媒体源失败:', error);
    // 返回失败的Promise，以便调用者可以处理错误
    return Promise.reject(error);
  }
}

/**
 * 激活媒体源
 * @param source 要激活的媒体源
 */
async function activateSource(source: MediaSource) {
  if (source.isActive) {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 媒体源已激活: ${source.id}`);
    return;
  }
  
  try {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 正在激活媒体源: ${source.id}`);
    
    // 捕获媒体源
    const result = await mediaSourceManager.captureSource(source.id);
    
    if (result.success) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 媒体源激活成功: ${source.id}`);
    } else {
      console.error(`[LayoutEditorModal.vue 布局编辑器] 媒体源激活失败: ${source.id}, 错误: ${result.error}`);
    }
  } catch (error) {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 激活媒体源出错: ${source.id}`, error);
  }
}

/**
 * 保存布局
 */
function saveLayout() {
  if (!props.scheduleId) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 保存布局失败：未提供日程ID');
    dialogVisible.value = false;
    return;
  }
  
  console.log('[LayoutEditorModal.vue 布局编辑器] 准备保存布局:', editingLayout.value);
  
  // 显示保存选项对话框
  saveDialogVisible.value = true;
}

// 保存对话框可见性
const saveDialogVisible = ref(false);

/**
 * 保存单个布局
 */
function saveSingleLayout() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 仅保存当前布局');
  // 将编辑后的布局保存到日程中
  const updated = planStore.updateLayoutInSchedule(props.scheduleId, editingLayout.value);
  
  if (updated) {
    ElMessage.success(t('layoutEditor.saveSingleSuccess'));
    console.log('[LayoutEditorModal.vue 布局编辑器] 布局保存成功');
    
    // 检查是否需要刷新预览画布
    if (planStore.isPreviewingScheduleAndLayout(props.scheduleId, editingLayout.value.id)) {
      console.log('[LayoutEditorModal.vue 布局编辑器] 正在刷新预览画布...');
      planStore.notifyPreviewLayoutEdited(editingLayout.value);
    }
    
    // 检查是否需要刷新直播画布
    if (planStore.isLiveScheduleAndLayout(props.scheduleId, editingLayout.value.id)) {
      console.log('[LayoutEditorModal.vue 布局编辑器] 正在刷新直播画布...');
      planStore.notifyLiveLayoutEdited(editingLayout.value);
    }
  } else {
    ElMessage.error(t('layoutEditor.saveError'));
    console.error('[LayoutEditorModal.vue 布局编辑器] 布局保存失败');
  }
  
  // 关闭对话框
  saveDialogVisible.value = false;
  dialogVisible.value = false;
}

/**
 * 批量保存所有相似布局
 */
function saveAllSimilarLayouts() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 批量保存相似布局');
  
  // 调用planStore的批量更新方法
  const updatedCount = planStore.updateSimilarLayouts(
    props.scheduleId,
    editingLayout.value,
    props.scheduleType as string
  );
  
  // 同时更新当前布局
  const updated = planStore.updateLayoutInSchedule(props.scheduleId, editingLayout.value);
  
  if (updated) {
    ElMessage.success(t('layoutEditor.saveAllSuccess', { count: updatedCount + 1 }));
    console.log(`[LayoutEditorModal.vue 布局编辑器] 批量保存成功，共更新 ${updatedCount + 1} 个布局`);
    
    // 布局批量更新可能影响预览和直播画布
    // 不需要传布局参数，planStore会处理更新逻辑
    console.log('[LayoutEditorModal.vue 布局编辑器] 通知预览和直播画布刷新...');
    planStore.notifyPreviewLayoutEdited();
    planStore.notifyLiveLayoutEdited();
  } else {
    ElMessage.error(t('layoutEditor.saveError'));
    console.error('[LayoutEditorModal.vue 布局编辑器] 布局保存失败');
  }
  
  // 关闭对话框
  saveDialogVisible.value = false;
  dialogVisible.value = false;
}

/**
 * 处理对话框关闭
 */
function handleClose() {
  // 释放所有活动的媒体源
  mediaSourceStore.sources.forEach((source: MediaSource) => {
    if (source.isActive) {
      mediaSourceManager.releaseStream(source.id);
    }
  });
  
  emit('close');
}

/**
 * 监听对话框可见性变化
 */
watch(() => props.visible, (newValue) => {
  dialogVisible.value = newValue;
  
  if (newValue) {
    // 对话框显示时，更新编辑中的布局
    editingLayout.value = { ...props.layout };
    
    // 在下一个DOM更新周期更新画布缩放
    nextTick(() => {
      updateCanvasScale();
      
      // 初始化并刷新媒体源
      refreshSources().then(() => {
        // 刷新完成后，激活布局中已保存的窗口和桌面捕获源
        activateSavedMediaSources();
      });
    });
  }
});

/**
 * 监听对话框内部可见性变化
 */
watch(() => dialogVisible.value, (newValue) => {
  if (!newValue) {
    // 对话框关闭时释放资源
    handleClose();
  }
});

/**
 * 处理窗口大小变化
 */
function handleResize() {
  updateCanvasScale();
}

/**
 * 组件挂载后初始化
 */
onMounted(() => {
  // 更新画布缩放
  updateCanvasScale();
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  // 初始化编辑中的布局
  editingLayout.value = { ...props.layout };
  
  // 预加载背景图
  if (editingLayout.value.background) {
    const cachedImage = getCachedImage(editingLayout.value.background);
    if (!cachedImage) {
      // 如果缓存中没有，可以在这里处理加载逻辑
      console.log('[LayoutEditorModal.vue 布局编辑器] 背景图未在缓存中:', editingLayout.value.background);
    }
  }
  
 // 初始化媒体源管理器
  mediaSourceManager.initialize();
  
  // 如果对话框可见，刷新媒体源
  if (dialogVisible.value) {
    refreshSources().then(() => {
      // 刷新完成后，激活布局中已保存的窗口和桌面捕获源
      activateSavedMediaSources();
    });
  }
});

/**
 * 激活布局中已保存的窗口和桌面捕获源
 */
async function activateSavedMediaSources() {
  console.log('[LayoutEditorModal.vue 布局编辑器] 开始激活布局中已保存的媒体源');
  
  if (!editingLayout.value.elements) return;
  
  // 获取所有媒体元素
  const mediaElements = editingLayout.value.elements.filter(
    element => element.type === 'media'
  ) as MediaLayoutElement[];
  
  // 创建激活任务队列
  const activationPromises = mediaElements
    .filter(element => 
      // 筛选出窗口和桌面捕获类型的元素
      element.sourceId && 
      (element.sourceType === 'window' || element.sourceType === 'screen')
    )
    .map(async (element) => {
      // 查找对应的媒体源
      const source = mediaSourceStore.sources.find((s: MediaSource) => s.id === element.sourceId);
      if (source && !source.isActive) {
        console.log(`[LayoutEditorModal.vue 布局编辑器] 激活布局中已保存的媒体源: ${source.id}, 类型: ${source.type}`);
        await activateSource(source);
      }
    });
  
  // 并行执行所有激活任务
  if (activationPromises.length > 0) {
    console.log(`[LayoutEditorModal.vue 布局编辑器] 需要激活 ${activationPromises.length} 个媒体源`);
    await Promise.all(activationPromises);
    console.log('[LayoutEditorModal.vue 布局编辑器] 布局中已保存媒体源激活完成');
  }
}

/**
 * 组件卸载前清理
 */
onBeforeUnmount(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
  
  // 释放所有活动的媒体源
  mediaSourceStore.sources.forEach((source: MediaSource) => {
    if (source.isActive) {
      mediaSourceManager.releaseStream(source.id);
    }
  });
});

/**
 * 处理拖拽开始事件
 * @param event 拖拽事件
 * @param source 媒体源
 */
function handleDragStart(event: DragEvent, source: MediaSource) {
  // 仅对摄像头类型的媒体源进行激活，窗口和屏幕捕获无需提前激活
  if (source.type === 'camera' && !source.isActive) {
    activateSource(source);
  }
  
  // 存储被拖拽的媒体源信息
  if (event.dataTransfer) {
    event.dataTransfer.setData('sourceId', source.id);
    event.dataTransfer.setData('sourceType', source.type);
    event.dataTransfer.setData('sourceName', source.name);
    event.dataTransfer.effectAllowed = 'copy';
  }
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 开始拖拽媒体源: ${source.id}, 类型: ${source.type}`);
}

/**
 * 获取媒体源的视频流
 * @param sourceId 媒体源ID
 * @returns 媒体源的视频流或undefined
 */
function getSourceStream(sourceId: string): MediaStream | undefined {
  const source = mediaSourceStore.sources.find((s: MediaSource) => s.id === sourceId);
  return source?.stream;
}

/**
 * 处理拖放事件
 * @param event 拖放事件
 * @param element 布局元素
 */
function handleDrop(event: DragEvent, element: MediaLayoutElement) {
  if (!event.dataTransfer) return;
  
  // 清除拖拽悬停效果
  dragOverElement.value = null;
  
  const sourceId = event.dataTransfer.getData('sourceId');
  const sourceType = event.dataTransfer.getData('sourceType');
  const sourceName = event.dataTransfer.getData('sourceName');
  
  if (!sourceId || !sourceType) {
    console.error('[LayoutEditorModal.vue 布局编辑器] 拖放的数据不完整');
    return;
  }
  
  console.log(`[LayoutEditorModal.vue 布局编辑器] 拖放媒体源到元素 ${element.id}:`, {
    sourceId,
    sourceType,
    sourceName
  });
  
  // 更新布局元素的媒体源信息
  element.sourceId = sourceId;
  element.sourceType = sourceType;
  element.sourceName = sourceName;
  
  // 确保媒体源已激活
  const source = mediaSourceStore.sources.find((s: MediaSource) => s.id === sourceId);
  if (source) {
    // 所有类型的媒体源在此处都需要激活才能显示
    if (!source.isActive) {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 拖放后激活媒体源: ${sourceId}, 类型: ${sourceType}`);
      activateSource(source);
    } else {
      console.log(`[LayoutEditorModal.vue 布局编辑器] 拖放的媒体源已激活: ${sourceId}, 类型: ${sourceType}`);
      // 已激活，记录其流信息
      console.log(`[LayoutEditorModal.vue 布局编辑器] 媒体源流状态:`, {
        hasStream: !!source.stream,
        streamActive: source.stream?.active,
        streamId: source.stream?.id
      });
    }
  } else {
    console.error(`[LayoutEditorModal.vue 布局编辑器] 未找到媒体源: ${sourceId}, 类型: ${sourceType}`);
  }
}

/**
 * 清除布局元素中的媒体源
 * @param element 布局元素
 */
function clearSource(element: MediaLayoutElement) {
  console.log(`[LayoutEditorModal.vue 布局编辑器] 清除元素 ${element.id} 的媒体源`);
  
  // 清除媒体源相关属性
  element.sourceId = undefined;
  element.sourceType = undefined;
  element.sourceName = undefined;
}

/**
 * 处理拖拽悬停效果
 * @param event 拖拽事件
 * @param element 布局元素
 */
function handleDragOver(event: DragEvent, element: MediaLayoutElement) {
  // 设置当前拖拽悬停的元素
  dragOverElement.value = element;
  
  // 允许放置
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

/**
 * 处理拖拽离开效果
 * @param event 拖拽事件
 * @param element 布局元素
 */
function handleDragLeave(event: DragEvent, element: MediaLayoutElement) {
  // 清除拖拽悬停效果
  if (dragOverElement.value === element) {
    dragOverElement.value = null;
  }
}
</script>

<style scoped>
.layout-editor-dialog :deep(.el-dialog__body) {
  padding: 0;
  overflow: hidden;
}

.layout-editor-container {
  display: flex;
  width: 100%;
  height: 70vh;
  min-height: 500px;
  background-color: var(--el-fill-color-darker);
}

.layout-preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color);
  overflow: hidden;
}

.layout-preview-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layout-preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.preview-actions {
  display: flex;
  align-items: center;
}

.schedule-type {
  padding: 2px 8px;
  font-size: 12px;
  background-color: var(--el-color-primary);
  color: white;
  border-radius: 4px;
}

.layout-preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: var(--el-fill-color-darker);
}

.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-canvas {
  position: relative;
  width: 960px;
  height: 540px;
  background-color: black;
  transform-origin: center;
  overflow: hidden;
}

.layout-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.media-element-placeholder {
  position: absolute;
  border: 2px dashed rgba(255, 255, 255, 0.7);
  background-color: rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  overflow: hidden;
  box-sizing: border-box;
  transition: border-color 0.2s, background-color 0.2s;
}

.media-element-placeholder:hover {
  border-color: var(--el-color-primary);
  background-color: rgba(0, 0, 0, 0.5);
}

.media-element-placeholder.drag-over {
  border-color: var(--el-color-success);
  border-style: solid;
  background-color: rgba(0, 100, 0, 0.3);
}

.element-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4px;
  width: 100%;
  height: 100%;
  font-size: 12px;
}

.element-id {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.element-type {
  opacity: 0.8;
  margin-bottom: 2px;
}

.element-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
  box-sizing: border-box;
}

.element-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-element-placeholder:hover .element-actions {
  opacity: 1;
}

.delete-source-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.delete-source-btn:hover {
  background-color: rgba(255, 0, 0, 0.7);
}

/* 媒体源面板样式 */
.media-sources-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.media-sources-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.media-sources-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.media-sources-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

/* 媒体源列表样式 */
.source-category {
  margin-bottom: 20px;
}

.category-title {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.source-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.source-card {
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.source-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.source-active {
  border-color: var(--el-color-success);
  box-shadow: 0 0 0 1px var(--el-color-success);
}

.source-preview {
  height: 100px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-darker);
  overflow: hidden;
}

.camera-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
}

.thumbnail-preview {
  max-width: 100%;
  max-height: 100%;
}

.camera-placeholder,
.window-placeholder,
.screen-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--el-text-color-secondary);
}

.camera-placeholder :deep(i),
.window-placeholder :deep(i),
.screen-placeholder :deep(i) {
  font-size: 32px;
}

.source-info {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.source-name {
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-details {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

.source-status {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--el-text-color-secondary);
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 10px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-media-sources {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--el-text-color-secondary);
  text-align: center;
  gap: 15px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 20px;
}

/* 保存选项对话框样式 */
.save-dialog-wrapper {
  --primary-color: #409eff;
  --success-color: #67c23a;
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --border-color: #ebeef5;
  --background-hover: #f5f7fa;
}

.save-options-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.save-options-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 0;
}

.save-options-dialog :deep(.el-dialog__headerbtn) {
  top: 20px;
  right: 20px;
  z-index: 10;
}

.save-options-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.save-dialog-header {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  padding: 24px;
  text-align: left;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.save-dialog-header::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
  animation: lightSweep 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes lightSweep {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.save-dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.save-dialog-title i {
  font-size: 22px;
  margin-right: 12px;
  color: var(--primary-color);
  opacity: 0.8;
}

.save-dialog-content {
  padding: 20px;
}

.save-option-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.save-option-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
  background-color: white;
  position: relative;
  overflow: hidden;
  animation: cardEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.save-option-card:nth-child(2) {
  animation-delay: 0.1s;
}

.save-option-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background-color: var(--primary-color);
  opacity: 0;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.save-single-card::after,
.save-all-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%);
  opacity: 0;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  pointer-events: none;
}

.save-option-card:hover::after {
  opacity: 1;
}

.save-option-card:hover::before {
  opacity: 1;
}

.save-single-card::before {
  background-color: var(--success-color);
}

.save-all-card::before {
  background-color: var(--primary-color);
}

.save-single-card:hover {
  border-color: var(--success-color);
}

.save-all-card:hover {
  border-color: var(--primary-color);
}

.save-option-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.save-option-card:active {
  transform: translateY(0);
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.save-options-dialog :deep(.el-dialog__body),
.save-options-dialog :deep(.el-dialog__header) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.option-content {
  display: flex;
  align-items: center;
}

.option-icon-wrapper {
  margin-right: 16px;
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.save-single-card .option-icon {
  background-color: rgba(103, 194, 58, 0.1);
  color: var(--success-color);
}

.save-all-card .option-icon {
  background-color: rgba(64, 158, 255, 0.1);
  color: var(--primary-color);
}

.save-option-card:hover .option-icon {
  transform: scale(1.05);
}

.save-single-card:hover .option-icon {
  background-color: rgba(103, 194, 58, 0.15);
}

.save-all-card:hover .option-icon {
  background-color: rgba(64, 158, 255, 0.15);
}

.option-icon i {
  font-size: 22px;
}

.option-text {
  display: flex;
  flex-direction: column;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
  transition: color 0.25s ease;
}

.save-single-card:hover .option-title {
  color: var(--success-color);
}

.save-all-card:hover .option-title {
  color: var(--primary-color);
}

.option-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 300px;
}

.option-action {
  color: var(--text-secondary);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: all 0.25s ease;
  transform: translateX(0);
  opacity: 0.4;
}

.save-option-card:hover .option-action {
  transform: translateX(5px);
  opacity: 1;
}

.save-single-card:hover .option-action {
  color: var(--success-color);
}

.save-all-card:hover .option-action {
  color: var(--primary-color);
}
</style> 