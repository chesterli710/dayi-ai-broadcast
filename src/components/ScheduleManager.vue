<template>
  <div class="schedule-manager">
    <h2 class="schedule-manager-title">日程管理</h2>
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
                ({{ schedule.plannedDuration }}分钟)
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
                :alt="layout.description || '布局缩略图'" 
                class="thumbnail-img"
                @error="handleThumbnailError"
              />
            </div>
            <div class="layout-info">
              <div class="layout-description">{{ layout.description || '未命名布局' }}</div>
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
      <p>当前计划分支没有日程</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePlanStore } from '../stores/planStore';
import { ScheduleType, type Schedule, type Layout } from '../types/broadcast';
import { useI18n } from 'vue-i18n';

const planStore = usePlanStore();
const { locale } = useI18n();

// 获取当前分支
const currentBranch = computed(() => planStore.currentBranch);

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
      return '手术演示';
    case ScheduleType.LECTURE:
      return '讲课';
    default:
      return '未知类型';
  }
}

/**
 * 格式化日期时间
 * @param date 日期时间
 * @returns 格式化后的日期时间字符串
 */
function formatDateTime(date?: Date): string {
  if (!date) return '未设置时间';
  
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
    return schedule.surgeryInfo.procedure;
  } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
    return schedule.lectureInfo.topic;
  }
  return '未命名日程';
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
</script>

<style scoped>
.schedule-manager {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.schedule-manager-title {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schedule-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.schedule-info {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
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
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
}

.schedule-type-tag.surgery {
  background-color: #1890ff;
}

.schedule-type-tag.lecture {
  background-color: #52c41a;
}

.schedule-time {
  font-size: 12px;
  color: #666;
}

.schedule-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-list {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
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
  border-radius: 4px;
  overflow: hidden;
  background-color: #f5f5f5;
  margin-right: 8px;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.layout-info {
  flex: 1;
  min-width: 0;
}

.layout-description {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-template-name {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-id {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: #f9f9f9;
  border-radius: 8px;
  color: #999;
}
</style> 