<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('scheduleEditor.editTitle')"
    width="80%"
    :before-close="handleClose"
    class="schedule-editor-modal"
    fullscreen
  >
    <div class="schedule-editor-container">
      <!-- 左侧：日程列表 -->
      <div class="schedule-list-panel">
        <div class="panel-header">
          <h3>{{ $t('scheduleManager.title') }}</h3>
          <el-button type="primary" size="small" @click="createNewSchedule">
            <i class="bi bi-plus"></i> {{ $t('common.add') }}
          </el-button>
        </div>
        <div class="schedule-list">
          <div 
            v-for="item in scheduleList" 
            :key="item.id" 
            class="schedule-item"
            :class="{ 'active': selectedScheduleId === item.id }"
            @click="selectSchedule(item)"
          >
            <div class="schedule-type-tag" :class="item.type">
              {{ scheduleTypeText(item.type) }}
            </div>
            <div class="schedule-item-content">
              <div class="schedule-item-title">{{ getScheduleTitle(item) }}</div>
              <div class="schedule-item-time">
                {{ formatDateTime(item.plannedStartDateTime) }}
                <span v-if="item.plannedDuration">
                  ({{ item.plannedDuration }}{{ $t('scheduleManager.minutes') }})
                </span>
              </div>
            </div>
          </div>
          <div v-if="!scheduleList.length" class="empty-list">
            {{ $t('scheduleManager.noSchedules') }}
          </div>
        </div>
      </div>
      
      <!-- 右侧：表单区域 -->
      <div class="schedule-form-panel">
        <el-form
          ref="scheduleFormRef"
          :model="scheduleForm"
          :rules="scheduleRules"
          label-position="top"
          v-if="showForm"
        >
          <!-- 日程类型 -->
          <el-form-item :label="$t('scheduleEditor.type')" prop="type">
            <el-select v-model="scheduleForm.type" class="full-width" :disabled="!!scheduleForm.id">
              <el-option
                :label="$t('scheduleManager.surgeryType')"
                :value="ScheduleType.SURGERY"
              />
              <el-option
                :label="$t('scheduleManager.lectureType')"
                :value="ScheduleType.LECTURE"
              />
            </el-select>
          </el-form-item>
          
          <!-- 时间信息 -->
          <div class="time-section">
            <div class="time-row">
              <el-form-item :label="getPlanDateLabel()" prop="plannedStartDateTime">
                <el-time-picker
                  v-model="scheduleForm.plannedStartDateTime"
                  format="HH:mm"
                  placeholder="选择时间"
                  class="time-input"
                  @change="updateEndTime"
                />
              </el-form-item>
              
              <el-form-item :label="$t('scheduleEditor.durationHoursMinutes')" prop="plannedDuration">
                <div class="duration-inputs">
                  <el-input
                    v-model="durationHours"
                    type="number"
                    :min="0"
                    :placeholder="$t('scheduleEditor.hours')"
                    class="duration-input"
                    @input="updateDuration"
                    :controls="false"
                  />
                  <span class="duration-separator">{{ $t('scheduleEditor.hours') }}</span>
                  <el-input
                    v-model="durationMinutes"
                    type="number"
                    :min="0"
                    :max="59"
                    :placeholder="$t('scheduleEditor.minutes')"
                    class="duration-input"
                    @input="updateDuration"
                    :controls="false"
                  />
                  <span class="duration-separator">{{ $t('scheduleEditor.minutes') }}</span>
                </div>
              </el-form-item>
              
              <el-form-item :label="$t('scheduleEditor.plannedEndTime')">
                <el-input
                  v-model="plannedEndTimeDisplay"
                  disabled
                  class="time-input"
                />
              </el-form-item>
            </div>
          </div>
          
          <!-- 手术信息 -->
          <div v-if="scheduleForm.type === ScheduleType.SURGERY" class="surgery-info">
            <h3>{{ $t('scheduleEditor.surgeryInfo') }}</h3>
            
            <el-form-item :label="$t('scheduleEditor.procedure')" prop="surgeryInfo.procedure">
              <el-input v-model="scheduleForm.surgeryInfo.procedure" />
            </el-form-item>
            
            <h4>
              {{ $t('scheduleEditor.surgeons') }}
              <span class="limit-text">{{ $t('scheduleEditor.surgeonsLimit') }}</span>
            </h4>
            <draggable 
              v-model="scheduleForm.surgeryInfo.surgeons" 
              item-key="index"
              handle=".drag-handle"
              class="draggable-list"
            >
              <template #item="{ element, index }">
                <div class="person-item">
                  <div class="drag-handle">
                    <i class="bi bi-grip-vertical"></i>
                  </div>
                  <div class="person-inputs">
                    <el-input
                      v-model="element.name"
                      :placeholder="$t('scheduleEditor.name')"
                      class="person-name"
                    />
                    <el-input
                      v-model="element.title"
                      :placeholder="$t('scheduleEditor.title')"
                      class="person-title"
                    />
                    <el-input
                      v-model="element.organization"
                      :placeholder="$t('scheduleEditor.organization')"
                      class="person-org"
                    />
                  </div>
                  <el-button
                    type="danger"
                    @click="removeSurgeon(index)"
                    class="remove-button"
                    :disabled="scheduleForm.surgeryInfo.surgeons.length <= 1"
                  >
                    <i class="bi bi-trash"></i>
                  </el-button>
                </div>
              </template>
            </draggable>
            
            <el-button 
              type="primary" 
              plain 
              @click="addSurgeon" 
              class="add-button"
              :disabled="scheduleForm.surgeryInfo.surgeons.length >= 3"
            >
              <i class="bi bi-plus"></i> {{ $t('scheduleEditor.addSurgeon') }}
            </el-button>
            
            <!-- 嘉宾列表 -->
            <h4>
              {{ $t('scheduleEditor.guests') }}
              <span class="limit-text">{{ $t('scheduleEditor.guestsLimit') }}</span>
            </h4>
            <draggable 
              v-model="scheduleForm.surgeryInfo.guests" 
              item-key="index"
              handle=".drag-handle"
              class="draggable-list"
              v-if="scheduleForm.surgeryInfo.guests.length > 0"
            >
              <template #item="{ element, index }">
                <div class="person-item">
                  <div class="drag-handle">
                    <i class="bi bi-grip-vertical"></i>
                  </div>
                  <div class="person-inputs">
                    <el-input
                      v-model="element.name"
                      :placeholder="$t('scheduleEditor.name')"
                      class="person-name"
                    />
                    <el-input
                      v-model="element.title"
                      :placeholder="$t('scheduleEditor.title')"
                      class="person-title"
                    />
                    <el-input
                      v-model="element.organization"
                      :placeholder="$t('scheduleEditor.organization')"
                      class="person-org"
                    />
                  </div>
                  <el-button
                    type="danger"
                    @click="removeGuest(index)"
                    class="remove-button"
                  >
                    <i class="bi bi-trash"></i>
                  </el-button>
                </div>
              </template>
            </draggable>
            
            <div v-if="scheduleForm.surgeryInfo.guests.length === 0" class="empty-person-list">
              {{ $t('scheduleEditor.noGuests') }}
            </div>
            
            <el-button 
              type="primary" 
              plain 
              @click="addGuest" 
              class="add-button"
              :disabled="scheduleForm.surgeryInfo.guests.length >= 10"
            >
              <i class="bi bi-plus"></i> {{ $t('scheduleEditor.addGuest') }}
            </el-button>
          </div>
          
          <!-- 讲课信息 -->
          <div v-if="scheduleForm.type === ScheduleType.LECTURE" class="lecture-info">
            <h3>{{ $t('scheduleEditor.lectureInfo') }}</h3>
            
            <el-form-item :label="$t('scheduleEditor.topic')" prop="lectureInfo.topic">
              <el-input v-model="scheduleForm.lectureInfo.topic" />
            </el-form-item>
            
            <h4>{{ $t('scheduleEditor.speaker') }}</h4>
            <div class="person-inputs">
              <el-input
                v-model="scheduleForm.lectureInfo.speaker.name"
                :placeholder="$t('scheduleEditor.name')"
                class="person-name"
              />
              <el-input
                v-model="scheduleForm.lectureInfo.speaker.title"
                :placeholder="$t('scheduleEditor.title')"
                class="person-title"
              />
              <el-input
                v-model="scheduleForm.lectureInfo.speaker.organization"
                :placeholder="$t('scheduleEditor.organization')"
                class="person-org"
              />
            </div>
          </div>
          
          <!-- 布局管理 -->
          <div class="layouts-section">
            <h3>{{ $t('scheduleEditor.layouts') }}</h3>
            
            <div v-if="scheduleForm.layouts && scheduleForm.layouts.length > 0" class="layout-grid">
              <div 
                v-for="(layout, index) in scheduleForm.layouts" 
                :key="layout.id" 
                class="layout-card"
              >
                <div class="layout-thumbnail">
                  <img 
                    :src="getLayoutThumbnail(layout)" 
                    :alt="layout.description || $t('scheduleManager.unnamedLayout')" 
                    class="thumbnail-img"
                    @error="handleThumbnailError"
                  />
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
            
            <div v-else class="empty-layouts">
              {{ $t('scheduleEditor.noLayouts') }}
            </div>
            
            <el-button type="primary" plain class="add-button">
              <i class="bi bi-plus"></i> {{ $t('scheduleEditor.addLayout') }}
            </el-button>
          </div>
          
          <div class="form-actions">
            <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
            <el-button type="primary" @click="handleSave">{{ $t('common.save') }}</el-button>
          </div>
        </el-form>
        <div v-else class="empty-form">
          <p>{{ $t('scheduleEditor.selectOrCreate') }}</p>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ScheduleType, type Schedule, type PersonInfo, type Layout } from '../types/broadcast';
import { usePlanStore } from '../stores/planStore';
import type { FormInstance, FormRules } from 'element-plus';
import draggable from 'vuedraggable';

// Props
const props = defineProps<{
  visible: boolean;
  schedule: Schedule | null;
}>();

// Emits
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', schedule: Schedule): void;
}>();

const { t } = useI18n();
const planStore = usePlanStore();
const scheduleFormRef = ref<FormInstance>();

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) emit('close');
  }
});

// 日程列表
const scheduleList = computed(() => {
  return planStore.currentBranch?.schedules || [];
});

// 选中的日程ID
const selectedScheduleId = ref<string>('');
const showForm = ref<boolean>(false);

// 持续时间的小时和分钟
const durationHours = ref<number | null>(null);
const durationMinutes = ref<number | null>(null);
const plannedEndTimeDisplay = ref<string>('');

// 表单数据
const scheduleForm = reactive<{
  id: string;
  type: ScheduleType;
  plannedStartDateTime: Date | null;
  plannedDuration: number | null;
  surgeryInfo: {
    procedure: string;
    surgeons: PersonInfo[];
    guests: PersonInfo[];
  };
  lectureInfo: {
    topic: string;
    speaker: PersonInfo;
  };
  layouts: any[];
}>({
  id: '',
  type: ScheduleType.SURGERY,
  plannedStartDateTime: null,
  plannedDuration: null,
  surgeryInfo: {
    procedure: '',
    surgeons: [{ name: '', title: '教授', organization: '' }],
    guests: []
  },
  lectureInfo: {
    topic: '',
    speaker: { name: '', title: '教授', organization: '' }
  },
  layouts: []
});

// 表单验证规则
const scheduleRules = reactive<FormRules>({
  type: [
    { required: true, message: t('scheduleEditor.typeRequired'), trigger: 'change' }
  ],
  'surgeryInfo.procedure': [
    { required: true, message: t('scheduleEditor.procedureRequired'), trigger: 'blur' }
  ],
  'lectureInfo.topic': [
    { required: true, message: t('scheduleEditor.topicRequired'), trigger: 'blur' }
  ]
});

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 如果传入了schedule，则选中该schedule
    if (props.schedule) {
      selectSchedule(props.schedule);
    } else {
      // 否则不选中任何schedule
      selectedScheduleId.value = '';
      showForm.value = false;
    }
  }
}, { immediate: true });

// 监听plannedDuration变化，更新小时和分钟
watch(() => scheduleForm.plannedDuration, (newDuration) => {
  if (newDuration !== null) {
    durationHours.value = Math.floor(newDuration / 60);
    durationMinutes.value = newDuration % 60;
  } else {
    durationHours.value = null;
    durationMinutes.value = null;
  }
  updatePlannedEndTime();
}, { immediate: true });

// 监听plannedStartDateTime变化，更新结束时间
watch(() => scheduleForm.plannedStartDateTime, () => {
  updatePlannedEndTime();
}, { immediate: true });

/**
 * 更新计划结束时间
 */
function updatePlannedEndTime() {
  if (scheduleForm.plannedStartDateTime && scheduleForm.plannedDuration) {
    const startTime = new Date(scheduleForm.plannedStartDateTime);
    const endTime = new Date(startTime.getTime() + scheduleForm.plannedDuration * 60 * 1000);
    
    // 格式化为 YYYY-MM-DD HH:MM
    const year = endTime.getFullYear();
    const month = (endTime.getMonth() + 1).toString().padStart(2, '0');
    const day = endTime.getDate().toString().padStart(2, '0');
    const hours = endTime.getHours().toString().padStart(2, '0');
    const minutes = endTime.getMinutes().toString().padStart(2, '0');
    
    plannedEndTimeDisplay.value = `${year}-${month}-${day} ${hours}:${minutes}`;
  } else {
    plannedEndTimeDisplay.value = '';
  }
}

/**
 * 获取计划日期标签
 * @returns 带有计划日期的标签文本
 */
function getPlanDateLabel() {
  if (planStore.currentPlan?.plannedStartDateTime) {
    const date = new Date(planStore.currentPlan.plannedStartDateTime);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${t('scheduleEditor.plannedStartTime')}（${year}-${month}-${day}）`;
  }
  return t('scheduleEditor.plannedStartTime');
}

/**
 * 更新持续时间
 */
function updateDuration() {
  // 获取当前输入的分钟数
  const minutes = durationMinutes.value || 0;
  
  // 处理分钟超过59的情况
  if (minutes > 59) {
    // 清空小时输入框已有数据后进行换算
    const totalMinutes = minutes;
    durationHours.value = Math.floor(totalMinutes / 60);
    durationMinutes.value = totalMinutes % 60;
  } else {
    // 正常情况，保留小时数
    const hours = durationHours.value || 0;
    scheduleForm.plannedDuration = hours * 60 + minutes;
  }
  
  // 转换为分钟存储
  scheduleForm.plannedDuration = (durationHours.value || 0) * 60 + (durationMinutes.value || 0);
  
  // 更新结束时间显示
  updatePlannedEndTime();
}

/**
 * 选择日程
 * @param schedule 日程对象
 */
function selectSchedule(schedule: Schedule): void {
  selectedScheduleId.value = schedule.id;
  showForm.value = true;
  
  // 填充表单数据
  scheduleForm.id = schedule.id;
  scheduleForm.type = schedule.type;
  scheduleForm.plannedStartDateTime = schedule.plannedStartDateTime || null;
  scheduleForm.plannedDuration = schedule.plannedDuration || null;
  scheduleForm.layouts = schedule.layouts || [];
  
  // 设置持续时间的小时和分钟
  if (schedule.plannedDuration) {
    durationHours.value = Math.floor(schedule.plannedDuration / 60);
    durationMinutes.value = schedule.plannedDuration % 60;
  } else {
    durationHours.value = null;
    durationMinutes.value = null;
  }
  
  // 更新结束时间
  updatePlannedEndTime();
  
  if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo) {
    scheduleForm.surgeryInfo.procedure = schedule.surgeryInfo.procedure;
    scheduleForm.surgeryInfo.surgeons = [...schedule.surgeryInfo.surgeons];
    scheduleForm.surgeryInfo.guests = schedule.surgeryInfo.guests ? [...schedule.surgeryInfo.guests] : [];
  } else {
    scheduleForm.surgeryInfo.procedure = '';
    scheduleForm.surgeryInfo.surgeons = [{ name: '', title: '教授', organization: '' }];
    scheduleForm.surgeryInfo.guests = [];
  }
  
  if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
    scheduleForm.lectureInfo.topic = schedule.lectureInfo.topic;
    scheduleForm.lectureInfo.speaker = { ...schedule.lectureInfo.speaker };
  } else {
    scheduleForm.lectureInfo.topic = '';
    scheduleForm.lectureInfo.speaker = { name: '', title: '教授', organization: '' };
  }
}

/**
 * 创建新日程
 */
function createNewSchedule(): void {
  selectedScheduleId.value = '';
  showForm.value = true;
  resetForm();
}

/**
 * 重置表单
 */
function resetForm(): void {
  scheduleForm.id = '';
  scheduleForm.type = ScheduleType.SURGERY;
  scheduleForm.plannedStartDateTime = null;
  scheduleForm.plannedDuration = null;
  scheduleForm.surgeryInfo.procedure = '';
  scheduleForm.surgeryInfo.surgeons = [{ name: '', title: '教授', organization: '' }];
  scheduleForm.surgeryInfo.guests = [];
  scheduleForm.lectureInfo.topic = '';
  scheduleForm.lectureInfo.speaker = { name: '', title: '教授', organization: '' };
  scheduleForm.layouts = [];
  
  // 重置持续时间的小时和分钟
  durationHours.value = null;
  durationMinutes.value = null;
  
  // 重置结束时间显示
  plannedEndTimeDisplay.value = '';
}

/**
 * 添加术者
 */
function addSurgeon(): void {
  if (scheduleForm.surgeryInfo.surgeons.length < 3) {
    // 获取最后一位术者的单位信息
    const lastSurgeon = scheduleForm.surgeryInfo.surgeons[scheduleForm.surgeryInfo.surgeons.length - 1];
    const organization = lastSurgeon && lastSurgeon.organization ? lastSurgeon.organization : '';
    
    // 添加新术者，并复制上一位术者的单位
    scheduleForm.surgeryInfo.surgeons.push({ 
      name: '', 
      title: '教授', 
      organization: organization 
    });
  }
}

/**
 * 移除术者
 * @param index 术者索引
 */
function removeSurgeon(index: number): void {
  if (scheduleForm.surgeryInfo.surgeons.length > 1) {
    scheduleForm.surgeryInfo.surgeons.splice(index, 1);
  }
}

/**
 * 添加嘉宾
 */
function addGuest(): void {
  if (scheduleForm.surgeryInfo.guests.length < 10) {
    scheduleForm.surgeryInfo.guests.push({ name: '', title: '教授', organization: '' });
  }
}

/**
 * 移除嘉宾
 * @param index 嘉宾索引
 */
function removeGuest(index: number): void {
  scheduleForm.surgeryInfo.guests.splice(index, 1);
}

/**
 * 关闭对话框
 */
function handleClose(): void {
  emit('close');
}

/**
 * 保存日程
 */
function handleSave(): void {
  scheduleFormRef.value?.validate((valid) => {
    if (valid) {
      // 构建日程对象
      const schedule: Schedule = {
        id: scheduleForm.id || Date.now().toString(), // 如果是新建，生成一个临时ID
        type: scheduleForm.type,
        plannedStartDateTime: scheduleForm.plannedStartDateTime || undefined,
        plannedDuration: scheduleForm.plannedDuration || undefined,
        layouts: scheduleForm.layouts || [], // 保留原有布局
      };
      
      // 根据类型添加特定信息
      if (scheduleForm.type === ScheduleType.SURGERY) {
        schedule.surgeryInfo = {
          procedure: scheduleForm.surgeryInfo.procedure,
          surgeons: scheduleForm.surgeryInfo.surgeons.filter(s => s.name.trim() !== ''),
          guests: scheduleForm.surgeryInfo.guests.filter(g => g.name.trim() !== '')
        };
      } else if (scheduleForm.type === ScheduleType.LECTURE) {
        schedule.lectureInfo = {
          topic: scheduleForm.lectureInfo.topic,
          speaker: scheduleForm.lectureInfo.speaker
        };
      }
      
      emit('save', schedule);
    }
  });
}

/**
 * 获取日程类型文本
 * @param type 日程类型
 * @returns 日程类型的文本
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
    // 手术演示：术式
    const surgeryInfo = schedule.surgeryInfo;
    return surgeryInfo.procedure;
  } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
    // 讲课：讲题
    const lectureInfo = schedule.lectureInfo;
    return lectureInfo.topic;
  }
  
  return t('scheduleManager.unnamedSchedule');
}

function updateEndTime(value: Date | null) {
  if (value) {
    scheduleForm.plannedStartDateTime = value;
    updatePlannedEndTime();
  } else {
    plannedEndTimeDisplay.value = '';
  }
}

/**
 * 获取布局缩略图URL
 * @param layout 布局对象
 * @returns 缩略图URL
 */
const getLayoutThumbnail = (layout: Layout): string => {
  const template = planStore.layoutTemplates.find(t => t.template === layout.template)
  return template?.thumbnail || '/placeholder-thumbnail.png'
}

/**
 * 获取布局模板名称
 * @param templateId 模板ID
 * @returns 模板名称
 */
const getLayoutTemplateName = (templateId: string): string => {
  const template = planStore.layoutTemplates.find(t => t.template === templateId)
  if (!template) return templateId
  
  const { locale } = useI18n()
  const currentLocale = locale.value
  
  if (currentLocale === 'zh-CN') {
    return template.name?.['zh-CN'] || template.name?.['en-US'] || templateId
  } else {
    return template.name?.['en-US'] || template.name?.['zh-CN'] || templateId
  }
}

/**
 * 处理缩略图加载错误
 * @param event 错误事件
 */
const handleThumbnailError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = '/placeholder-thumbnail.png'
}
</script>

<style scoped>
.schedule-editor-modal {
  display: flex;
  flex-direction: column;
}

.schedule-editor-container {
  display: flex;
  height: calc(100vh - 120px);
  overflow: hidden;
}

.schedule-list-panel {
  width: 300px;
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.schedule-form-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.panel-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.schedule-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.schedule-item {
  padding: 10px;
  border-radius: var(--el-border-radius-base);
  margin-bottom: 10px;
  cursor: pointer;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s;
  display: flex;
  align-items: flex-start;
}

.schedule-item:hover {
  background-color: var(--el-fill-color-light);
}

.schedule-item.active {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.schedule-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--el-border-radius-small);
  font-size: var(--el-font-size-extra-small);
  font-weight: 500;
  color: #fff;
  margin-right: 10px;
  white-space: nowrap;
}

.schedule-type-tag.surgery {
  background-color: var(--el-color-primary);
}

.schedule-type-tag.lecture {
  background-color: var(--el-color-success);
}

.schedule-item-content {
  flex: 1;
  min-width: 0;
}

.schedule-item-title {
  font-size: var(--el-font-size-small);
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.schedule-item-time {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.empty-list {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

.empty-form {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-base);
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
}

.full-width {
  width: 100%;
}

.time-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-light);
}

.time-row {
  display: flex;
  gap: 15px;
}

.time-row .el-form-item {
  flex: 1;
  margin-bottom: 0;
}

.time-input {
  width: 100%;
}

.duration-inputs {
  display: flex;
  align-items: center;
}

.duration-input {
  width: 60px;
  text-align: center;
}

.duration-separator {
  margin: 0 5px;
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

.surgery-info,
.lecture-info {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-light);
}

.person-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-small);
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.drag-handle {
  cursor: move;
  padding: 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 16px;
}

.drag-handle:hover {
  color: var(--el-text-color-primary);
}

.draggable-list {
  min-height: 10px;
}

.person-inputs {
  display: flex;
  gap: 10px;
  flex: 1;
}

.person-name {
  flex: 2;
}

.person-title {
  flex: 1;
}

.person-org {
  flex: 2;
}

.remove-button {
  margin-left: 10px;
}

.add-button {
  margin-top: 10px;
}

.form-actions {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

h4 {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.empty-person-list {
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-extra-small);
}

.limit-text {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.layouts-section {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-light);
}

.layout-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.layout-card {
  width: calc(33.33% - 10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}

.layout-thumbnail {
  width: 100%;
  height: 150px;
  overflow: hidden;
  border-radius: var(--el-border-radius-base);
  margin-bottom: 10px;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.layout-info {
  text-align: center;
}

.layout-description {
  font-size: var(--el-font-size-small);
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 5px;
}

.layout-template-name {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.template-id {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.empty-layouts {
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-extra-small);
}
</style> 