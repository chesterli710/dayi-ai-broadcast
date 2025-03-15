<template>
  <div class="schedule-manager">
    <div class="panel-header">
      <h3>{{ $t('scheduleManager.title') }}</h3>
    </div>
    <div class="panel-content">
      <div class="schedule-list" v-if="currentBranch && currentBranch.schedules.length > 0">
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
              :class="{ 'layout-item-odd': index % 2 === 0, 'layout-item-even': index % 2 === 1 }"
            >
              <div class="layout-thumbnail">
                <img 
                  :src="getLayoutThumbnail(layout)" 
                  :alt="layout.description || $t('scheduleManager.unnamedLayout')" 
                  class="thumbnail-img"
                  @error="handleThumbnailError"
                />
                <div class="layout-actions">
                  <button class="edit-button" @click="openLayoutEditor(schedule, layout)">
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
      <div class="empty-state" v-else>
        <p>{{ $t('scheduleManager.noSchedules') }}</p>
      </div>
    </div>
    
    <!-- 布局编辑器Modal -->
    <LayoutEditorModal
      v-if="showLayoutEditor"
      :visible="showLayoutEditor"
      :layout="selectedLayout"
      :scheduleType="selectedScheduleType"
      @close="closeLayoutEditor"
      @save="saveLayout"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePlanStore } from '../stores/planStore';
import { ScheduleType, type Schedule, type Layout } from '../types/broadcast';
import { useI18n } from 'vue-i18n';
import LayoutEditorModal from './LayoutEditorModal.vue';

const planStore = usePlanStore();
const { locale, t } = useI18n();

// 获取当前分支
const currentBranch = computed(() => planStore.currentBranch);

// 布局编辑器状态
const showLayoutEditor = ref(false);
const selectedLayout = ref<Layout>({
  id: 0,
  template: '',
});
const selectedSchedule = ref<Schedule | null>(null);
const selectedScheduleType = ref('');

// 组件挂载时检查布局模板
onMounted(() => {
  if (planStore.layoutTemplates.length === 0) {
    console.warn('警告：布局模板为空，可能会导致布局名称显示不正确');
  }
});

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
    // 讲课：讲题 - 讲者 称谓
    const lectureInfo = schedule.lectureInfo;
    const topic = lectureInfo.topic;
    const speaker = lectureInfo.speaker;
    
    // 获取讲者信息
    let speakerInfo = '';
    if (speaker) {
      speakerInfo = `${speaker.name}${speaker.title ? ` ${speaker.title}` : ''}`;
    }
    
    return speakerInfo ? `${topic} - ${speakerInfo}` : topic;
  }
  
  return t('scheduleManager.unnamedSchedule');
}

/**
 * 获取布局缩略图
 * @param layout 布局对象
 * @returns 布局缩略图URL
 */
function getLayoutThumbnail(layout: Layout): string {
  // 查找对应的布局模板
  const template = planStore.layoutTemplates.find(t => t.template === layout.template);
  
  // 如果找到模板并且有缩略图，则返回缩略图URL
  if (template && template.thumbnail) {
    return template.thumbnail;
  }
  
  // 否则返回默认缩略图
  return '/assets/placeholder-layout.svg';
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
 * 保存布局
 * @param layout 更新后的布局
 * @param saveAll 是否保存所有相似布局
 */
function saveLayout(layout: Layout, saveAll: boolean): void {
  if (!selectedSchedule.value) return;
  
  if (saveAll) {
    // 保存所有相似布局
    saveSimilarLayouts(layout);
  } else {
    // 仅保存当前布局
    saveCurrentLayout(layout);
  }
}

/**
 * 保存当前布局
 * @param layout 更新后的布局
 */
function saveCurrentLayout(layout: Layout): void {
  if (!selectedSchedule.value || !currentBranch.value) return;
  
  // 查找当前日程
  const scheduleIndex = currentBranch.value.schedules.findIndex(s => s.id === selectedSchedule.value?.id);
  
  if (scheduleIndex !== -1) {
    // 查找当前布局
    const layoutIndex = currentBranch.value.schedules[scheduleIndex].layouts.findIndex(l => l.id === layout.id);
    
    if (layoutIndex !== -1) {
      // 更新布局
      currentBranch.value.schedules[scheduleIndex].layouts[layoutIndex] = layout;
    }
  }
}

/**
 * 保存所有相似布局
 * @param layout 更新后的布局
 */
function saveSimilarLayouts(layout: Layout): void {
  if (!selectedSchedule.value || !currentBranch.value) return;
  
  // 遍历所有日程
  currentBranch.value.schedules.forEach(schedule => {
    // 如果日程类型与当前选中的日程类型相同
    if (schedule.type === selectedSchedule.value?.type) {
      // 遍历该日程的所有布局
      schedule.layouts.forEach((l, index) => {
        // 如果布局模板与当前选中的布局模板相同
        if (l.template === layout.template) {
          // 更新布局的媒体源信息
          const updatedLayout = { ...l };
          
          // 获取布局模板
          const template = planStore.layoutTemplates.find(t => t.template === layout.template);
          
          if (template && template.elements) {
            // 遍历模板中的所有媒体元素
            const mediaElements = template.elements.filter(element => element.type === 'media');
            
            // 查找布局中对应的媒体元素
            mediaElements.forEach(element => {
              // 如果元素有sourceId和sourceName属性，则认为它是MediaLayoutElement
              const mediaElement = element as any;
              if (mediaElement.sourceId && mediaElement.sourceName) {
                // 更新布局中对应的媒体元素
                // 注意：这里我们不能直接访问updatedLayout.elements，因为Layout类型没有定义elements属性
                // 我们可以使用类型断言来处理这种情况
                const updatedLayoutAny = updatedLayout as any;
                if (updatedLayoutAny.elements) {
                  const updatedElement = updatedLayoutAny.elements.find((e: any) => e.id === element.id && e.type === 'media');
                  if (updatedElement) {
                    updatedElement.sourceId = mediaElement.sourceId;
                    updatedElement.sourceName = mediaElement.sourceName;
                  }
                }
              }
            });
          }
          
          // 更新布局
          schedule.layouts[index] = updatedLayout;
        }
      });
    }
  });
}
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
}

.panel-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.panel-content {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
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
</style> 