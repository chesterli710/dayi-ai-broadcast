<template>
  <div class="schedule-manager">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
    <div :class="{ 'content-loading': isLoading }" class="schedule-container">
      <div class="panel-header">
        <h3>{{ $t('scheduleManager.title') }}</h3>
        <div class="header-actions">
          <button class="edit-schedule-button" @click="openScheduleEditor(null)">
            <i class="bi bi-pencil-square"></i>
            {{ $t('scheduleManager.editSchedule') }}
          </button>
        </div>
      </div>
      <div class="panel-content">
        <div class="schedule-list" v-if="!isLoading && currentBranch && currentBranch.schedules.length > 0">
          <div 
            v-for="schedule in currentBranch.schedules" 
            :key="schedule.id" 
            class="schedule-card"
          >
            <!-- 上区块：信息区块 -->
            <div class="schedule-info">
              <div class="schedule-header">
                <div class="schedule-type-tag" :class="schedule.type">
                  {{ scheduleTypeText(schedule.type) }}
                </div>
                <div class="schedule-time">
                  {{ formatDateTime(schedule.plannedStartDateTime) }}
                  <span v-if="schedule.plannedDuration">
                    ({{ schedule.plannedDuration }}{{ $t('scheduleManager.minutes') }})
                  </span>
                </div>
              </div>
              <div class="schedule-title">
                {{ getScheduleTitle(schedule) }}
              </div>
            </div>
            
            <!-- 下区块：布局列表区块 -->
            <div class="layout-list">
              <div 
                v-for="(layout, index) in schedule.layouts" 
                :key="layout.id" 
                class="layout-item"
                :class="{ 
                  'layout-item-odd': index % 2 === 0, 
                  'layout-item-even': index % 2 === 1,
                  'layout-item-previewing': isPreviewing(schedule.id, layout.id)
                }"
                @click="previewLayout(schedule, layout)"
              >
                <div class="layout-thumbnail">
                  <img 
                    :src="getLayoutThumbnail(layout)" 
                    :alt="layout.description || $t('scheduleManager.unnamedLayout')" 
                    class="thumbnail-img"
                    @error="handleThumbnailError"
                  />
                  <div class="layout-actions">
                    <button class="edit-button" @click.stop="openLayoutEditor(schedule, layout)">
                      {{ $t('common.edit') }}
                    </button>
                  </div>
                </div>
                <div class="layout-info">
                  <div class="layout-description">{{ layout.description || $t('scheduleManager.unnamedLayout') }}</div>
                  <div class="layout-template-name">
                    <span v-if="getLayoutTemplateName(layout.template) !== layout.template">
                      {{ getLayoutTemplateName(layout.template) }}
                    </span>
                    <span v-else class="template-id">{{ layout.template }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="empty-state" v-else-if="isLoading">
          <p>{{ $t('common.loading') }}</p>
        </div>
        <div class="empty-state" v-else>
          <p>{{ $t('scheduleManager.noSchedules') }}</p>
        </div>
      </div>
    </div>
    
    <!-- 布局编辑器Modal -->
    <LayoutEditorModal
      v-if="showLayoutEditor"
      :visible="showLayoutEditor"
      :layout="selectedLayout"
      :scheduleType="selectedScheduleType"
      :scheduleId="selectedSchedule?.id"
      @close="closeLayoutEditor"
    />
    
    <!-- 日程编辑器Modal -->
    <ScheduleEditorModal
      v-if="showScheduleEditor"
      :visible="showScheduleEditor"
      :schedule="editingSchedule"
      @close="closeScheduleEditor"
      @save="saveSchedule"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePlanStore } from '../stores/planStore';
import { ScheduleType, type Schedule, type Layout } from '../types/broadcast';
import { useI18n } from 'vue-i18n';
import LayoutEditorModal from './LayoutEditorModal.vue';
import ScheduleEditorModal from './ScheduleEditorModal.vue';
import { getLayoutThumbnail as getImagePreloaderThumbnail, preloadPlanImages, getCacheStatus } from '../utils/imagePreloader';
import layoutApi from '../api/layout';
import { ElMessage } from 'element-plus';

const planStore = usePlanStore();
const { locale, t } = useI18n();

// 获取当前分支
const currentBranch = computed(() => planStore.currentBranch);

// 引入一个reactive对象来存储已加载的缩略图缓存
const thumbnailCache = ref<Map<string, string>>(new Map());

// 布局编辑器状态
const showLayoutEditor = ref(false);
const selectedLayout = ref<Layout>({
  id: 0,
  template: '',
});
const selectedSchedule = ref<Schedule | null>(null);
const selectedScheduleType = ref('');

// 日程编辑器状态
const showScheduleEditor = ref(false);
const editingSchedule = ref<Schedule | null>(null);

// 布局模板加载状态
const layoutTemplateLoading = ref(false);

// 图片预加载状态
const isPreloading = ref(false);
const preloadProgress = ref(0);

// 组件总体加载状态
const isLoading = ref(true);

/**
 * 加载布局模板
 * 按照流程图所示加载和更新布局模板
 */
async function loadLayoutTemplates() {
  if (layoutTemplateLoading.value) {
    console.log('[ScheduleManager.vue 日程管理] 布局模板正在加载中，忽略重复调用');
    return;
  }
  
  layoutTemplateLoading.value = true;
  console.log('[ScheduleManager.vue 日程管理] 开始加载布局模板');
  
  try {
    // 检查本地布局模板是否为空
    if (planStore.layoutTemplates.length === 0) {
      console.log('[ScheduleManager.vue 日程管理] 本地布局模板为空，直接请求服务器布局模板');
      await loadTemplatesFromServer();
      return;
    }
    
    // 本地已有布局模板，请求服务器最后更新时间
    const lastUpdatedResponse = await layoutApi.getLayoutTemplatesLastUpdated();
    const serverLastUpdated = new Date(lastUpdatedResponse.data.lastUpdated);
    
    if (!planStore.layoutTemplatesLastUpdated || 
        planStore.layoutTemplatesLastUpdated < serverLastUpdated) {
      console.log('[ScheduleManager.vue 日程管理] 本地布局模板较旧，请求服务器布局模板更新');
      await loadTemplatesFromServer();
    } else {
      console.log('[ScheduleManager.vue 日程管理] 本地布局模板是最新的，直接使用');
      // 使用现有布局模板初始化日程布局
      if (currentBranch.value) {
        planStore.initializeScheduleLayouts(currentBranch.value);
      }
    }
  } catch (error) {
    console.error('[ScheduleManager.vue 日程管理] 加载布局模板失败:', error);
    
    // 尝试从本地存储加载
    const loaded = planStore.loadLayoutTemplatesFromLocalStorage();
    if (!loaded) {
      ElMessage.error('无法加载布局模板，可能会影响布局显示');
    }
  } finally {
    layoutTemplateLoading.value = false;
    // 标记布局信息补全完成
    console.log('[ScheduleManager.vue 日程管理] 布局模板加载完成');
  }
}

/**
 * 从服务器加载布局模板
 */
async function loadTemplatesFromServer() {
  try {
    // 使用 loadAllLayoutTemplates 方法获取模板并处理缩略图
    const templates = await layoutApi.loadAllLayoutTemplates();
    planStore.setLayoutTemplates(templates);
    
    // 使用新的布局模板初始化日程布局
    if (currentBranch.value) {
      planStore.initializeScheduleLayouts(currentBranch.value);
    }
  } catch (error) {
    console.error('[ScheduleManager.vue 日程管理] 从服务器加载布局模板失败:', error);
    throw error;
  }
}

/**
 * 获取日程类型文本
 * @param type 日程类型
 * @returns 日程类型的中文文本
 */
function scheduleTypeText(type: ScheduleType): string {
  switch (type) {
    case ScheduleType.SURGERY:
      return t('scheduleManager.surgeryType');
    case ScheduleType.LECTURE:
      return t('scheduleManager.lectureType');
    default:
      return t('scheduleManager.unknownType');
  }
}

/**
 * 格式化日期时间
 * @param date 日期时间
 * @returns 格式化后的日期时间字符串
 */
function formatDateTime(date?: Date): string {
  if (!date) return t('scheduleManager.unsetTime');
  
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * 获取日程标题
 * @param schedule 日程对象
 * @returns 日程标题
 */
function getScheduleTitle(schedule: Schedule): string {
  if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo) {
    // 手术演示：术式 - 术者1 称谓 / 术者2 称谓 / ...
    const surgeryInfo = schedule.surgeryInfo;
    const procedure = surgeryInfo.procedure;
    
    // 获取所有术者信息
    let surgeonsInfo = '';
    if (surgeryInfo.surgeons && surgeryInfo.surgeons.length > 0) {
      surgeonsInfo = surgeryInfo.surgeons.map(surgeon => {
        return `${surgeon.name}${surgeon.title ? ` ${surgeon.title}` : ''}`;
      }).join(' / ');
    }
    
    return surgeonsInfo ? `${procedure} - ${surgeonsInfo}` : procedure;
  } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
    // 讲课：讲题 - 讲者1 称谓 / 讲者2 称谓 / ...
    const lectureInfo = schedule.lectureInfo;
    const topic = lectureInfo.topic;
    
    // 获取所有讲者信息
    let speakersInfo = '';
    if (lectureInfo.speakers && lectureInfo.speakers.length > 0) {
      speakersInfo = lectureInfo.speakers.map(speaker => {
        return `${speaker.name}${speaker.title ? ` ${speaker.title}` : ''}`;
      }).join(' / ');
    }
    
    return speakersInfo ? `${topic} - ${speakersInfo}` : topic;
  }
  
  return t('scheduleManager.unnamedSchedule');
}

/**
 * 获取布局缩略图
 * @param layout 布局配置
 * @returns 布局缩略图URL
 */
function getLayoutThumbnail(layout: Layout): string {
  // 如果布局模板正在加载中，直接返回占位图
  if (layoutTemplateLoading.value || isLoading.value) {
    return '/assets/placeholder-layout.svg';
  }
  
  // 如果已经有缓存，直接返回
  if (thumbnailCache.value.has(layout.template)) {
    return thumbnailCache.value.get(layout.template)!;
  }
  
  // 查找模板
  const template = planStore.layoutTemplates.find(t => t.template === layout.template);
  
  if (!template) {
    // 静默处理，不再输出警告日志
    // console.warn(`[ScheduleManager.vue 日程管理] 未找到布局模板缩略图: ${layout.template}`);
    return '/assets/placeholder-layout.svg';
  }
  
  // 使用默认缩略图，并异步加载
  const defaultThumbnail = template.thumbnail || '/assets/placeholder-layout.svg';
  
  // 异步加载缩略图，启用错误抑制
  getImagePreloaderThumbnail(layout.template, template, true)
    .then((thumbnailUrl) => {
      // 加载完成后更新缓存
      thumbnailCache.value.set(layout.template, thumbnailUrl);
    })
    .catch(() => {
      // 静默失败，不打印错误日志
      thumbnailCache.value.set(layout.template, '/assets/placeholder-layout.svg');
    });
  
  return defaultThumbnail;
}

/**
 * 获取布局模板名称
 * @param templateId 布局模板ID
 * @returns 布局模板名称
 */
function getLayoutTemplateName(templateId: string): string {
  // 查找对应的布局模板
  const template = planStore.layoutTemplates.find(t => t.template === templateId);
  
  // 如果找到模板并且有名称，则根据当前语言返回对应名称
  if (template && template.name && typeof template.name === 'object') {
    // 获取当前语言
    const currentLocale = locale.value as 'zh-CN' | 'en-US';
    
    // 如果当前语言有对应的名称，则返回该名称
    if (template.name[currentLocale]) {
      return template.name[currentLocale];
    }
    
    // 如果当前语言没有对应的名称，则尝试返回中文名称
    if (template.name['zh-CN']) {
      return template.name['zh-CN'];
    }
    
    // 如果中文名称也没有，则尝试返回英文名称
    if (template.name['en-US']) {
      return template.name['en-US'];
    }
  }
  
  // 否则返回模板ID
  return templateId;
}

/**
 * 处理图片加载错误
 * @param event 事件对象
 */
function handleThumbnailError(event: Event): void {
  // 将图片源替换为占位图
  const imgElement = event.target as HTMLImageElement;
  imgElement.src = '/assets/placeholder-layout.svg';
}

/**
 * 打开布局编辑器
 * @param schedule 日程对象
 * @param layout 布局对象
 */
function openLayoutEditor(schedule: Schedule, layout: Layout): void {
  selectedSchedule.value = schedule;
  selectedLayout.value = layout;
  selectedScheduleType.value = schedule.type;
  showLayoutEditor.value = true;
}

/**
 * 关闭布局编辑器
 */
function closeLayoutEditor(): void {
  showLayoutEditor.value = false;
}

/**
 * 打开日程编辑器
 * @param schedule 日程对象
 */
function openScheduleEditor(schedule: Schedule | null): void {
  editingSchedule.value = schedule;
  showScheduleEditor.value = true;
}

/**
 * 关闭日程编辑器
 */
function closeScheduleEditor(): void {
  showScheduleEditor.value = false;
}

/**
 * 保存日程
 * @param schedule 更新后的日程
 */
function saveSchedule(schedule: Schedule): void {
  if (!currentBranch.value || !editingSchedule.value) return;
  
  if (editingSchedule.value.id) {
    // 更新现有日程
    const scheduleIndex = currentBranch.value.schedules.findIndex(s => s.id === editingSchedule.value?.id);
    
    if (scheduleIndex !== -1) {
      // 更新日程
      currentBranch.value.schedules[scheduleIndex] = schedule;
    }
  } else {
    // 添加新日程
    currentBranch.value.schedules.push(schedule);
  }
}

/**
 * 预览布局
 * @param schedule 日程对象
 * @param layout 布局对象
 */
function previewLayout(schedule: Schedule, layout: Layout): void {
  // 设置正在预览的日程和布局
  planStore.setPreviewingScheduleAndLayout(schedule, layout);
  
  // 打印日志以便调试
  console.log('[ScheduleManager.vue 日程管理] 预览布局:', {
    scheduleId: schedule.id,
    layoutId: layout.id,
    layoutTemplate: layout.template,
    planBackground: planStore.currentPlan?.background
  });
}

/**
 * 检查指定的日程和布局是否正在预览
 * @param scheduleId 日程ID
 * @param layoutId 布局ID
 * @returns 是否正在预览
 */
function isPreviewing(scheduleId: string, layoutId: number): boolean {
  return planStore.isPreviewingScheduleAndLayout(scheduleId, layoutId);
}

/**
 * 预加载计划中的所有图片资源
 */
async function preloadAllImages() {
  if (!planStore.currentPlan) {
    console.warn('[ScheduleManager.vue 日程管理] 当前没有选中计划，无法预加载图片');
    return;
  }
  
  try {
    isPreloading.value = true;
    console.log('[ScheduleManager.vue 日程管理] 开始预加载计划图片资源');
    
    // 预加载计划中的所有图片
    await preloadPlanImages(planStore.currentPlan);
    
    // 获取缓存状态
    const status = getCacheStatus();
    console.log('[ScheduleManager.vue 日程管理] 图片预加载完成', status);
    
    // 显示预加载成功消息
    ElMessage.success(`图片资源预加载完成，共加载 ${status.cached} 张图片`);
  } catch (error) {
    console.error('[ScheduleManager.vue 日程管理] 图片预加载失败:', error);
    ElMessage.warning('部分图片资源预加载失败，可能会影响显示效果');
  } finally {
    isPreloading.value = false;
    preloadProgress.value = 100;
  }
}

// 在组件创建时直接初始化数据
const initLayoutAndImages = async () => {
  isLoading.value = true;
  try {
    await loadLayoutTemplates();
    
    // 布局模板加载完成后，预加载计划图片
    if (planStore.currentPlan) {
      await preloadAllImages();
    }
  } catch (error) {
    console.error('[ScheduleManager.vue 日程管理] 组件初始化失败:', error);
    ElMessage.error('组件初始化失败，请刷新页面重试');
  } finally {
    isLoading.value = false;
  }
};

// 直接执行初始化，不等待onMounted
initLayoutAndImages();
</script>

<style scoped>
.schedule-manager {
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.panel-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.edit-schedule-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-color-primary);
  color: #fff;
  border: none;
  font-size: var(--el-font-size-small);
  cursor: pointer;
  transition: background-color 0.3s;
  line-height: 1.5;
}

.edit-schedule-button:hover {
  background-color: var(--el-color-primary-dark-2);
}

.edit-schedule-button i {
  font-size: 14px;
}

.panel-content {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  height: 0; /* 这是关键属性，确保容器可以正确滚动 */
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schedule-card {
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
}

:root.dark .schedule-card {
  background-color: var(--el-fill-color-darker);
  border-color: var(--el-border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.schedule-info {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:root.dark .schedule-info {
  border-bottom-color: var(--el-border-color);
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.schedule-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--el-border-radius-small);
  font-size: var(--el-font-size-extra-small);
  font-weight: 500;
  color: #fff;
}

.schedule-type-tag.surgery {
  background-color: var(--el-color-primary);
}

.schedule-type-tag.lecture {
  background-color: var(--el-color-success);
}

.schedule-time {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.schedule-title {
  font-size: var(--el-font-size-base);
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-list {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
}

:root.dark .layout-list {
  background-color: var(--el-fill-color-dark);
}

.layout-item {
  width: 50%;
  padding: 4px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: var(--el-border-radius-small);
  transition: background-color 0.2s;
}

.layout-item:hover {
  background-color: var(--el-fill-color-light);
}

:root.dark .layout-item:hover {
  background-color: var(--el-fill-color-dark);
}

.layout-item-previewing {
  background-color: var(--el-fill-color-light);
  border: 2px solid var(--el-color-primary);
}

:root.dark .layout-item-previewing {
  background-color: var(--el-fill-color-dark);
  border: 2px solid var(--el-color-primary);
}

.layout-thumbnail {
  width: 60px;
  height: 40px;
  border-radius: var(--el-border-radius-small);
  overflow: hidden;
  background-color: var(--el-fill-color-light);
  margin-right: 8px;
  position: relative;
  border: 1px solid var(--el-border-color-lighter);
}

:root.dark .layout-thumbnail {
  border-color: var(--el-border-color);
  background-color: var(--el-fill-color-darker);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.layout-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.layout-thumbnail:hover .layout-actions {
  opacity: 1;
}

.edit-button {
  background-color: var(--el-color-primary);
  color: #fff;
  border: none;
  border-radius: var(--el-border-radius-small);
  padding: 2px 8px;
  font-size: var(--el-font-size-extra-small);
  cursor: pointer;
}

.edit-button:hover {
  background-color: var(--el-color-primary-dark-2);
}

.layout-info {
  flex: 1;
  min-width: 0;
}

.layout-description {
  font-size: var(--el-font-size-small);
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-template-name {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-id {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-secondary);
}

:root.dark .empty-state {
  background-color: var(--el-fill-color-darker);
  border: 1px solid var(--el-border-color);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 10px;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.content-loading {
  pointer-events: none;
  opacity: 0.5;
}
</style> 