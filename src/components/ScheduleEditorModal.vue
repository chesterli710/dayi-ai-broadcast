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
          <el-button type="primary" size="small" @click="handleCreateNewSchedule" style="padding: 4px 12px; line-height: 1.5;">
            <i class="bi bi-plus"></i> {{ $t('common.add') }}
          </el-button>
        </div>
        <div class="schedule-list">
          <div v-for="(item, index) in sortedScheduleList" :key="item.id">
            <div class="schedule-item-container">
              <!-- 日程时间信息 -->
              <div class="schedule-time-container">
                <div class="schedule-time start-time" :class="{ 'conflict': hasTimeConflict(item, 'start') }">
                  <span v-if="hasTimeConflict(item, 'start')" class="conflict-icon"><i class="bi bi-exclamation-circle-fill"></i></span>
                  {{ formatDateTime(item.plannedStartDateTime, false) }}
                </div>
                <div class="schedule-time end-time" :class="{ 'conflict': hasTimeConflict(item, 'end') }">
                  <span v-if="hasTimeConflict(item, 'end')" class="conflict-icon"><i class="bi bi-exclamation-circle-fill"></i></span>
                  {{ getEndTimeDisplay(item, false) }}
                </div>
              </div>
              
              <!-- 日程项 -->
              <div 
                class="schedule-item"
                :class="{ 'active': selectedScheduleId === item.id }"
                @click="handleSelectSchedule(item)"
              >
                <div class="schedule-type-tag" :class="item.type">
                  {{ scheduleTypeText(item.type) }}
                </div>
                <div class="schedule-item-content">
                  <div class="schedule-item-title">{{ getScheduleTitle(item) }}</div>
                  <div class="schedule-item-info">
                    <span class="schedule-item-duration" v-if="item.plannedDuration">
                      {{ item.plannedDuration }}{{ $t('scheduleManager.minutes') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 日程间隔 -->
            <div class="schedule-gap-container" v-if="getGapWithNextSchedule(item, index)">
              <div class="schedule-gap">
                <div class="gap-content">
                  {{ $t('scheduleEditor.gap') }}: {{ getGapWithNextSchedule(item, index) }}
                </div>
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
                  v-model="timePickerValue"
                  format="HH:mm"
                  value-format="HH:mm"
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
            
            <h4>
              {{ $t('scheduleEditor.speakers') }}
              <span class="limit-text">{{ $t('scheduleEditor.speakersLimit') }}</span>
            </h4>
            <draggable 
              v-model="scheduleForm.lectureInfo.speakers" 
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
                    @click="removeSpeaker(index)"
                    class="remove-button"
                    :disabled="scheduleForm.lectureInfo.speakers.length <= 1"
                  >
                    <i class="bi bi-trash"></i>
                  </el-button>
                </div>
              </template>
            </draggable>
            
            <el-button 
              type="primary" 
              plain 
              @click="addSpeaker" 
              class="add-button"
              :disabled="scheduleForm.lectureInfo.speakers.length >= 3"
            >
              <i class="bi bi-plus"></i> {{ $t('scheduleEditor.addSpeaker') }}
            </el-button>
            
            <!-- 嘉宾列表 -->
            <h4>
              {{ $t('scheduleEditor.guests') }}
              <span class="limit-text">{{ $t('scheduleEditor.guestsLimit') }}</span>
            </h4>
            <draggable 
              v-model="scheduleForm.lectureInfo.guests" 
              item-key="index"
              handle=".drag-handle"
              class="draggable-list"
              v-if="scheduleForm.lectureInfo.guests.length > 0"
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
                    @click="removeLectureGuest(index)"
                    class="remove-button"
                  >
                    <i class="bi bi-trash"></i>
                  </el-button>
                </div>
              </template>
            </draggable>
            
            <div v-if="scheduleForm.lectureInfo.guests.length === 0" class="empty-person-list">
              {{ $t('scheduleEditor.noGuests') }}
            </div>
            
            <el-button 
              type="primary" 
              plain 
              @click="addLectureGuest" 
              class="add-button"
              :disabled="scheduleForm.lectureInfo.guests.length >= 10"
            >
              <i class="bi bi-plus"></i> {{ $t('scheduleEditor.addGuest') }}
            </el-button>
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
                  <div class="layout-actions">
                    <div class="layout-action-buttons">
                      <el-button 
                        type="danger" 
                        size="small" 
                        class="layout-action-btn"
                        @click.stop="removeLayout(index)"
                      >
                        <i class="bi bi-trash"></i> {{ $t('scheduleEditor.delete') }}
                      </el-button>
                      <el-button 
                        type="primary" 
                        size="small" 
                        class="layout-action-btn"
                        @click.stop="showTemplateSelector(index)"
                      >
                        <i class="bi bi-arrow-repeat"></i> {{ $t('scheduleEditor.change') }}
                      </el-button>
                    </div>
                  </div>
                </div>
                <div class="layout-info">
                  <div class="layout-description">
                    <template v-if="editingLayoutIndex !== index">
                      {{ layout.description || $t('scheduleManager.unnamedLayout') }}
                      <el-button 
                        link
                        size="small" 
                        class="edit-description-btn"
                        @click.stop="startEditingDescription(index)"
                      >
                        <i class="bi bi-pencil-square"></i>
                      </el-button>
                    </template>
                    <div v-else class="edit-description-container">
                      <el-input 
                        v-model="editingLayoutDescription" 
                        size="small"
                        @keyup.enter="saveLayoutDescription(index)"
                        ref="descriptionInputRef"
                      />
                      <el-button 
                        type="success" 
                        size="small" 
                        class="save-description-btn"
                        @click.stop="saveLayoutDescription(index)"
                      >
                        <i class="bi bi-check-lg"></i>
                      </el-button>
                    </div>
                  </div>
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
            
            <el-button type="primary" plain class="add-button" @click="showAddLayoutDialog">
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
    
    <!-- 布局模板选择对话框 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="$t('scheduleEditor.selectTemplate')"
      width="70%"
      append-to-body
    >
      <div class="template-grid">
        <div 
          v-for="template in planStore.layoutTemplates" 
          :key="template.template" 
          class="template-card"
          @click="handleTemplateSelection(template.template)"
        >
          <div class="template-thumbnail">
            <img 
              :src="getTemplateThumbnail(template)" 
              :alt="getTemplateDisplayName(template)" 
              class="thumbnail-img"
              @error="handleThumbnailError"
            />
          </div>
          <div class="template-info">
            <div class="template-name">{{ getTemplateDisplayName(template) }}</div>
            <div class="template-id">{{ template.template }}</div>
          </div>
        </div>
      </div>
      <div v-if="!planStore.layoutTemplates.length" class="empty-templates">
        {{ $t('scheduleEditor.noTemplates') }}
      </div>
    </el-dialog>
    
    <!-- 未保存更改确认对话框 -->
    <el-dialog
      v-model="showUnsavedChangesDialog"
      :title="$t('scheduleEditor.unsavedChanges')"
      width="30%"
      append-to-body
    >
      <span>{{ $t('scheduleEditor.unsavedChangesMessage') }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="discardChanges">{{ $t('scheduleEditor.discard') }}</el-button>
          <el-button type="primary" @click="saveChanges">{{ $t('scheduleEditor.save') }}</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 时间冲突确认对话框 -->
    <el-dialog
      v-model="showTimeConflictDialog"
      :title="$t('scheduleEditor.timeConflict')"
      width="30%"
      append-to-body
    >
      <span>{{ $t('scheduleEditor.timeConflictMessage') }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelSave">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="confirmSaveWithConflict">{{ $t('scheduleEditor.saveAnyway') }}</el-button>
        </span>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { ScheduleType, type Schedule, type PersonInfo, type Layout, type LayoutElement } from '../types/broadcast';
import { usePlanStore } from '../stores/planStore';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import draggable from 'vuedraggable';
import { cloneDeep } from 'lodash-es';
import { getLayoutThumbnail as getImagePreloaderThumbnail } from '../utils/imagePreloader';

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

// 按开始时间排序的日程列表
const sortedScheduleList = computed(() => {
  return [...scheduleList.value].sort((a, b) => {
    const timeA = a.plannedStartDateTime ? new Date(a.plannedStartDateTime).getTime() : 0;
    const timeB = b.plannedStartDateTime ? new Date(b.plannedStartDateTime).getTime() : 0;
    return timeA - timeB;
  });
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
    speakers: PersonInfo[];
    guests: PersonInfo[];
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
    speakers: [{ name: '', title: '教授', organization: '' }],
    guests: []
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

// 错误信息
const validationErrors = ref<string[]>([]);

// 未保存更改相关状态
const hasUnsavedChanges = ref<boolean>(false);
const originalFormData = ref<any>(null);
const showUnsavedChangesDialog = ref<boolean>(false);
const pendingAction = ref<'new' | 'select' | 'close' | null>(null);
const pendingSchedule = ref<Schedule | null>(null);

// 时间冲突相关状态
const showTimeConflictDialog = ref<boolean>(false);
const conflictingSchedules = ref<Schedule[]>([]);

// 在script setup部分添加一个标志变量
const isCreatingNew = ref<boolean>(false);

// 时间选择器的值
const timePickerValue = ref<string>('');

// 监听scheduleForm.plannedStartDateTime变化，更新timePickerValue
watch(() => scheduleForm.plannedStartDateTime, (newDateTime) => {
  if (newDateTime) {
    const date = new Date(newDateTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    timePickerValue.value = `${hours}:${minutes}`;
  } else {
    timePickerValue.value = '';
  }
}, { immediate: true });

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
    // 重置未保存更改状态
    hasUnsavedChanges.value = false;
  }
}, { immediate: true });

// 监听表单变化，检测未保存的更改
watch(() => scheduleForm, () => {
  if (showForm.value && originalFormData.value) {
    // 比较当前表单数据和原始数据
    hasUnsavedChanges.value = !isEqual(scheduleForm, originalFormData.value);
  }
}, { deep: true });

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

/**
 * 检查两个对象是否相等（简化版）
 */
function isEqual(obj1: any, obj2: any): boolean {
  // 使用JSON.stringify进行简单比较
  // 注意：这种方法不能处理循环引用和函数等特殊情况
  // 但对于我们的表单数据比较已经足够
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * 处理创建新日程
 */
function handleCreateNewSchedule(): void {
  if (hasUnsavedChanges.value) {
    // 有未保存的更改，显示确认对话框
    pendingAction.value = 'new';
    showUnsavedChangesDialog.value = true;
  } else {
    // 没有未保存的更改，直接创建新日程
    createNewSchedule();
  }
}

/**
 * 处理选择日程
 */
function handleSelectSchedule(schedule: Schedule): void {
  if (hasUnsavedChanges.value) {
    // 有未保存的更改，显示确认对话框
    pendingAction.value = 'select';
    pendingSchedule.value = schedule;
    showUnsavedChangesDialog.value = true;
  } else {
    // 没有未保存的更改，直接选择日程
    selectSchedule(schedule);
  }
}

/**
 * 处理关闭对话框
 */
function handleClose(): void {
  if (hasUnsavedChanges.value) {
    // 有未保存的更改，显示确认对话框
    pendingAction.value = 'close';
    showUnsavedChangesDialog.value = true;
  } else {
    // 没有未保存的更改，直接关闭
    emit('close');
  }
}

/**
 * 保存更改并继续
 */
async function saveChanges(): Promise<void> {
  // 关闭确认对话框
  showUnsavedChangesDialog.value = false;
  
  try {
    // 保存当前表单
    const saveResult = await handleSaveAndReturn();
    
    // 如果保存失败，不继续执行后续操作
    if (!saveResult) {
      return;
    }
    
    // 根据待处理的操作继续执行
    nextTick(() => {
      if (pendingAction.value === 'new') {
        createNewSchedule();
      } else if (pendingAction.value === 'select' && pendingSchedule.value) {
        selectSchedule(pendingSchedule.value);
      } else if (pendingAction.value === 'close') {
        emit('close');
      }
      
      // 重置待处理操作
      pendingAction.value = null;
      pendingSchedule.value = null;
    });
  } catch (error) {
    console.error('保存日程失败:', error);
    ElMessage.error(t('scheduleEditor.saveFailed'));
  }
}

/**
 * 放弃更改并继续
 */
function discardChanges(): void {
  // 关闭确认对话框
  showUnsavedChangesDialog.value = false;
  
  // 重置未保存更改状态
  hasUnsavedChanges.value = false;
  
  // 根据待处理的操作继续执行
  if (pendingAction.value === 'new') {
    createNewSchedule();
  } else if (pendingAction.value === 'select' && pendingSchedule.value) {
    selectSchedule(pendingSchedule.value);
  } else if (pendingAction.value === 'close') {
    emit('close');
  }
  
  // 重置待处理操作
  pendingAction.value = null;
  pendingSchedule.value = null;
}

/**
 * 保存日程
 */
async function handleSave(): Promise<void> {
  // 检查时间冲突
  const conflicts = checkTimeConflicts();
  
  if (conflicts.length > 0) {
    // 有时间冲突，显示确认对话框
    conflictingSchedules.value = conflicts;
    showTimeConflictDialog.value = true;
  } else {
    // 没有时间冲突，直接保存
    const success = await handleSaveAndReturn();
    if (success) {
      // 不关闭对话框，而是返回到初始界面
      selectedScheduleId.value = '';
      showForm.value = false;
      // 重置未保存更改状态
      hasUnsavedChanges.value = false;
    }
  }
}

/**
 * 取消保存
 */
function cancelSave(): void {
  showTimeConflictDialog.value = false;
}

/**
 * 确认保存（即使有时间冲突）
 */
async function confirmSaveWithConflict(): Promise<void> {
  showTimeConflictDialog.value = false;
  
  // 继续保存
  const success = await handleSaveAndReturn();
  if (success) {
    // 不关闭对话框，而是返回到初始界面
    selectedScheduleId.value = '';
    showForm.value = false;
    // 重置未保存更改状态
    hasUnsavedChanges.value = false;
  }
}

/**
 * 检查时间冲突
 * @returns 与当前日程时间冲突的日程列表
 */
function checkTimeConflicts(): Schedule[] {
  // 如果没有开始时间或持续时间，无法检查冲突
  if (!scheduleForm.plannedStartDateTime || !scheduleForm.plannedDuration) {
    return [];
  }
  
  // 计算当前日程的开始和结束时间
  const currentStartTime = new Date(scheduleForm.plannedStartDateTime).getTime();
  const currentEndTime = currentStartTime + scheduleForm.plannedDuration * 60 * 1000;
  
  // 查找所有与当前日程时间冲突的日程
  return scheduleList.value.filter(schedule => {
    // 跳过当前正在编辑的日程
    if (schedule.id === scheduleForm.id) {
      return false;
    }
    
    // 如果日程没有开始时间或持续时间，无法检查冲突
    if (!schedule.plannedStartDateTime || !schedule.plannedDuration) {
      return false;
    }
    
    // 计算日程的开始和结束时间
    const scheduleStartTime = new Date(schedule.plannedStartDateTime).getTime();
    const scheduleEndTime = scheduleStartTime + schedule.plannedDuration * 60 * 1000;
    
    // 检查是否有时间冲突
    // 1. 当前日程的开始时间在其他日程的时间范围内
    // 2. 当前日程的结束时间在其他日程的时间范围内
    // 3. 当前日程的时间范围包含其他日程的开始时间
    // 4. 当前日程的时间范围包含其他日程的结束时间
    return (
      (currentStartTime >= scheduleStartTime && currentStartTime < scheduleEndTime) ||
      (currentEndTime > scheduleStartTime && currentEndTime <= scheduleEndTime) ||
      (currentStartTime <= scheduleStartTime && currentEndTime >= scheduleEndTime)
    );
  });
}

/**
 * 检查日程的特定时间点是否有冲突
 * @param schedule 日程对象
 * @param timePoint 时间点类型（'start' 或 'end'）
 * @returns 是否有时间冲突
 */
function hasTimeConflict(schedule: Schedule, timePoint: 'start' | 'end'): boolean {
  // 如果日程没有开始时间或持续时间，无法检查冲突
  if (!schedule.plannedStartDateTime || !schedule.plannedDuration) {
    return false;
  }
  
  // 计算日程的开始和结束时间
  const scheduleStartTime = new Date(schedule.plannedStartDateTime).getTime();
  const scheduleEndTime = scheduleStartTime + schedule.plannedDuration * 60 * 1000;
  
  // 检查指定时间点是否与其他日程冲突
  return scheduleList.value.some(otherSchedule => {
    // 跳过自身
    if (otherSchedule.id === schedule.id) {
      return false;
    }
    
    // 如果其他日程没有开始时间或持续时间，无法检查冲突
    if (!otherSchedule.plannedStartDateTime || !otherSchedule.plannedDuration) {
      return false;
    }
    
    // 计算其他日程的开始和结束时间
    const otherStartTime = new Date(otherSchedule.plannedStartDateTime).getTime();
    const otherEndTime = otherStartTime + otherSchedule.plannedDuration * 60 * 1000;
    
    // 检查指定时间点是否与其他日程冲突
    if (timePoint === 'start') {
      return scheduleStartTime >= otherStartTime && scheduleStartTime < otherEndTime;
    } else { // timePoint === 'end'
      return scheduleEndTime > otherStartTime && scheduleEndTime <= otherEndTime;
    }
  });
}

/**
 * 选择日程
 * @param schedule 日程对象
 */
function selectSchedule(schedule: Schedule): void {
  selectedScheduleId.value = schedule.id;
  showForm.value = true;
  isCreatingNew.value = false; // 标记为编辑模式
  
  // 填充表单数据
  scheduleForm.id = schedule.id;
  scheduleForm.type = schedule.type;
  
  // 处理开始时间，确保只保留时分信息
  if (schedule.plannedStartDateTime) {
    const date = new Date(schedule.plannedStartDateTime);
    // 从当前计划日期获取年月日
    let baseDate = new Date();
    if (planStore.currentPlan?.plannedStartDateTime) {
      baseDate = new Date(planStore.currentPlan.plannedStartDateTime);
    }
    
    // 创建新的日期对象，使用计划日期的年月日和选择的时分
    const newDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      date.getHours(),
      date.getMinutes()
    );
    
    scheduleForm.plannedStartDateTime = newDate;
  } else {
    scheduleForm.plannedStartDateTime = null;
  }
  
  // 设置持续时间，如果没有则默认为1小时
  scheduleForm.plannedDuration = schedule.plannedDuration || 60;
  scheduleForm.layouts = schedule.layouts || [];
  
  // 设置持续时间的小时和分钟
  if (schedule.plannedDuration) {
    durationHours.value = Math.floor(schedule.plannedDuration / 60);
    durationMinutes.value = schedule.plannedDuration % 60;
  } else {
    durationHours.value = 1; // 默认1小时
    durationMinutes.value = 0;
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
    scheduleForm.lectureInfo.speakers = [...schedule.lectureInfo.speakers];
    scheduleForm.lectureInfo.guests = schedule.lectureInfo.guests ? [...schedule.lectureInfo.guests] : [];
  } else {
    scheduleForm.lectureInfo.topic = '';
    scheduleForm.lectureInfo.speakers = [{ name: '', title: '教授', organization: '' }];
    scheduleForm.lectureInfo.guests = [];
  }
  
  // 保存原始表单数据用于比较
  originalFormData.value = cloneDeep(scheduleForm);
  hasUnsavedChanges.value = false;
}

/**
 * 创建新日程
 */
function createNewSchedule(): void {
  selectedScheduleId.value = '';
  showForm.value = true;
  isCreatingNew.value = true; // 标记为新建模式
  resetForm();
  
  // 设置默认持续时间为1小时
  scheduleForm.plannedDuration = 60;
  durationHours.value = 1;
  durationMinutes.value = 0;
  
  // 设置默认开始时间为最后一个日程的结束时间
  if (sortedScheduleList.value.length > 0) {
    const lastSchedule = sortedScheduleList.value[sortedScheduleList.value.length - 1];
    if (lastSchedule.plannedStartDateTime && lastSchedule.plannedDuration) {
      const lastStartTime = new Date(lastSchedule.plannedStartDateTime);
      const lastEndTime = new Date(lastStartTime.getTime() + lastSchedule.plannedDuration * 60 * 1000);
      scheduleForm.plannedStartDateTime = lastEndTime;
      
      // 更新时间选择器的值
      const hours = lastEndTime.getHours().toString().padStart(2, '0');
      const minutes = lastEndTime.getMinutes().toString().padStart(2, '0');
      timePickerValue.value = `${hours}:${minutes}`;
    }
  }
  
  // 更新结束时间
  updatePlannedEndTime();
  
  // 保存原始表单数据用于比较
  originalFormData.value = cloneDeep(scheduleForm);
  hasUnsavedChanges.value = false;
}

/**
 * 重置表单
 */
function resetForm(): void {
  scheduleForm.id = '';
  scheduleForm.type = ScheduleType.SURGERY;
  scheduleForm.plannedStartDateTime = null;
  scheduleForm.plannedDuration = 60; // 默认持续时间为1小时
  scheduleForm.surgeryInfo.procedure = '';
  scheduleForm.surgeryInfo.surgeons = [{ name: '', title: '教授', organization: '' }];
  scheduleForm.surgeryInfo.guests = [];
  scheduleForm.lectureInfo.topic = '';
  scheduleForm.lectureInfo.speakers = [{ name: '', title: '教授', organization: '' }];
  scheduleForm.lectureInfo.guests = [];
  scheduleForm.layouts = [];
  
  // 重置持续时间的小时和分钟
  durationHours.value = 1; // 默认1小时
  durationMinutes.value = 0;
  
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
 * 保存日程并返回保存结果
 * @returns 保存是否成功
 */
async function handleSaveAndReturn(): Promise<boolean> {
  // 重置错误信息
  validationErrors.value = [];
  
  // 验证表单
  try {
    const valid = await scheduleFormRef.value?.validate();
    if (!valid) {
      // 表单基本验证失败，收集错误信息
      collectFormErrors();
      // 显示验证错误
      if (validationErrors.value.length > 0) {
        ElMessage.error({
          message: t('scheduleEditor.validationError') + ': ' + validationErrors.value.join(', '),
          duration: 5000
        });
      } else {
        ElMessage.error(t('scheduleEditor.validationError'));
      }
      return false;
    }
    
    // 进行额外验证
    const additionalValidation = validateAdditionalFields();
    if (!additionalValidation) {
      // 显示验证错误
      if (validationErrors.value.length > 0) {
        ElMessage.error({
          message: t('scheduleEditor.validationError') + ': ' + validationErrors.value.join(', '),
          duration: 5000
        });
      }
      return false;
    }
    
    // 构建日程对象
    const schedule: Schedule = {
      id: isCreatingNew.value ? '' : scheduleForm.id, // 新建时不提供ID，编辑时使用原ID
      type: scheduleForm.type,
      plannedStartDateTime: scheduleForm.plannedStartDateTime || undefined,
      plannedDuration: scheduleForm.plannedDuration || undefined,
      layouts: [], // 先创建空数组，后面会填充完整的布局
    };
    
    // 确保每个布局都有完整的树状结构
    if (scheduleForm.layouts && scheduleForm.layouts.length > 0) {
      schedule.layouts = scheduleForm.layouts.map(layout => {
        // 确保每个布局都有elements属性
        if (!layout.elements) {
          // 查找对应的模板
          const template = planStore.layoutTemplates.find(t => t.template === layout.template);
          if (template && template.elements) {
            // 从模板复制元素
            layout.elements = JSON.parse(JSON.stringify(template.elements));
          } else {
            // 如果没有找到模板或模板没有元素，创建空数组
            layout.elements = [];
          }
        }
        return layout;
      });
      
      console.log(`[ScheduleEditorModal.vue 日程编辑器] 保存日程，布局数量: ${schedule.layouts.length}`);
      schedule.layouts.forEach((layout, index) => {
        const elementsCount = layout.elements ? layout.elements.length : 0;
        console.log(`[ScheduleEditorModal.vue 日程编辑器] 布局 ${index+1}: ID=${layout.id}, 模板=${layout.template}, 元素数量=${elementsCount}`);
      });
    }
    
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
        speakers: scheduleForm.lectureInfo.speakers.filter(s => s.name.trim() !== ''),
        guests: scheduleForm.lectureInfo.guests.filter(g => g.name.trim() !== '')
      };
    }
    
    // 根据模式选择保存方法
    let success = false;
    
    if (isCreatingNew.value) {
      // 新建日程
      success = await planStore.createSchedule(schedule);
    } else {
      // 更新日程
      success = await planStore.updateSchedule(schedule);
    }
    
    if (success) {
      // 更新原始表单数据，重置未保存更改状态
      originalFormData.value = cloneDeep(scheduleForm);
      hasUnsavedChanges.value = false;
      
      // 通知预览和直播画布更新
      console.log(`[ScheduleEditorModal.vue 日程编辑器] 日程保存成功，准备刷新画布...`);
      
      // 这里我们做更完整的处理 - 检查是否需要刷新文字图层缓存并更新画布
      // 1. 检查是否需要刷新预览画布
      const isPreviewingThisSchedule = planStore.previewingSchedule?.id === schedule.id;
      if (isPreviewingThisSchedule) {
        console.log(`[ScheduleEditorModal.vue 日程编辑器] 刷新预览画布，日程ID: ${schedule.id}`);
        // 调用planStore的通知方法，这会触发文字图层缓存清除和预览画布重绘
        planStore.notifyPreviewLayoutEdited();
      }
      
      // 2. 检查是否需要刷新直播画布
      const isLiveThisSchedule = planStore.liveSchedule?.id === schedule.id;
      if (isLiveThisSchedule) {
        console.log(`[ScheduleEditorModal.vue 日程编辑器] 刷新直播画布，日程ID: ${schedule.id}`);
        // 调用planStore的通知方法，这会触发文字图层缓存清除和直播画布重绘
        planStore.notifyLiveLayoutEdited();
      }
      
      return true;
    } else {
      ElMessage.error(t('scheduleEditor.saveFailed'));
      return false;
    }
  } catch (error) {
    console.error('保存日程失败:', error);
    ElMessage.error(t('scheduleEditor.saveFailed'));
    return false;
  }
}

/**
 * 收集表单错误信息
 */
function collectFormErrors(): void {
  // 检查术式/讲题
  if (scheduleForm.type === ScheduleType.SURGERY && !scheduleForm.surgeryInfo.procedure) {
    validationErrors.value.push(t('scheduleEditor.procedureRequired'));
  } else if (scheduleForm.type === ScheduleType.LECTURE && !scheduleForm.lectureInfo.topic) {
    validationErrors.value.push(t('scheduleEditor.topicRequired'));
  }
}

/**
 * 验证额外字段
 * @returns 验证是否通过
 */
function validateAdditionalFields(): boolean {
  let isValid = true;
  
  // 验证术者/讲者
  if (scheduleForm.type === ScheduleType.SURGERY) {
    const validSurgeons = scheduleForm.surgeryInfo.surgeons.filter(s => s.name.trim() !== '');
    if (validSurgeons.length === 0) {
      validationErrors.value.push(t('scheduleEditor.surgeonsRequired'));
      isValid = false;
    }
  } else if (scheduleForm.type === ScheduleType.LECTURE) {
    const validSpeakers = scheduleForm.lectureInfo.speakers.filter(s => s.name.trim() !== '');
    if (validSpeakers.length === 0) {
      validationErrors.value.push(t('scheduleEditor.speakersRequired'));
      isValid = false;
    }
  }
  
  // 验证布局
  if (!scheduleForm.layouts || scheduleForm.layouts.length === 0) {
    validationErrors.value.push(t('scheduleEditor.layoutsRequired'));
    isValid = false;
  }
  
  return isValid;
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
 * @param showFullTime 是否显示完整时间（包含日期）
 * @returns 格式化后的日期时间字符串
 */
function formatDateTime(date?: Date | null, showFullTime: boolean = false): string {
  if (!date) return t('scheduleManager.unsetTime');
  
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  if (showFullTime) {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  
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

/**
 * 更新结束时间
 * @param value 时间值
 */
function updateEndTime(value: string | null) {
  if (value) {
    // 从当前计划日期获取年月日
    let baseDate = new Date();
    if (planStore.currentPlan?.plannedStartDateTime) {
      baseDate = new Date(planStore.currentPlan.plannedStartDateTime);
    }
    
    // 解析时间字符串 (HH:mm)
    const [hours, minutes] = value.split(':').map(Number);
    
    // 创建新的日期对象，使用计划日期的年月日和选择的时分
    const newDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      minutes
    );
    
    scheduleForm.plannedStartDateTime = newDate;
    updatePlannedEndTime();
  } else {
    plannedEndTimeDisplay.value = '';
  }
}

// 布局描述编辑
const editingLayoutIndex = ref<number>(-1);
const editingLayoutDescription = ref<string>('');
const descriptionInputRef = ref<any>(null);

/**
 * 开始编辑布局描述
 * @param index 布局索引
 */
function startEditingDescription(index: number): void {
  editingLayoutIndex.value = index;
  editingLayoutDescription.value = scheduleForm.layouts[index].description || '';
  
  // 等待DOM更新后聚焦输入框
  setTimeout(() => {
    if (descriptionInputRef.value && typeof descriptionInputRef.value.focus === 'function') {
      descriptionInputRef.value.focus();
    }
  }, 100);
}

/**
 * 保存布局描述
 * @param index 布局索引
 */
function saveLayoutDescription(index: number): void {
  if (index >= 0 && index < scheduleForm.layouts.length) {
    scheduleForm.layouts[index].description = editingLayoutDescription.value;
  }
  editingLayoutIndex.value = -1;
}

// 布局模板选择
const showTemplateDialog = ref<boolean>(false);
const currentEditingLayoutIndex = ref<number>(-1);
const isAddingNewLayout = ref<boolean>(false);

/**
 * 移除布局
 * @param index 布局索引
 */
function removeLayout(index: number): void {
  if (index >= 0 && index < scheduleForm.layouts.length) {
    scheduleForm.layouts.splice(index, 1);
  }
}

/**
 * 显示模板选择器
 * @param index 布局索引
 */
function showTemplateSelector(index: number): void {
  currentEditingLayoutIndex.value = index;
  isAddingNewLayout.value = false;
  showTemplateDialog.value = true;
}

/**
 * 显示添加布局对话框
 */
function showAddLayoutDialog(): void {
  isAddingNewLayout.value = true;
  showTemplateDialog.value = true;
}

/**
 * 处理模板选择
 * @param templateId 模板ID
 */
function handleTemplateSelection(templateId: string): void {
  if (isAddingNewLayout.value) {
    // 添加新布局
    addNewLayout(templateId);
  } else {
    // 更改现有布局模板
    changeLayoutTemplate(templateId);
  }
}

/**
 * 添加新布局
 * @param templateId 模板ID
 */
function addNewLayout(templateId: string): void {
  // 获取对应的布局模板
  const template = planStore.layoutTemplates.find(t => t.template === templateId);
  
  if (!template) {
    console.error(`[ScheduleEditorModal.vue 日程编辑器] 未找到模板: ${templateId}`);
    return;
  }
  
  // 创建新布局，确保包含完整的树状结构
  const newLayout: Layout = {
    id: Date.now(), // 生成临时ID
    template: templateId,
    description: '',
    // 从模板中复制元素，确保elements属性存在
    elements: template.elements ? JSON.parse(JSON.stringify(template.elements)) : []
  };
  
  // 确保elements属性存在后再访问其length属性
  const elementsCount = newLayout.elements ? newLayout.elements.length : 0;
  console.log(`[ScheduleEditorModal.vue 日程编辑器] 添加新布局: ${newLayout.id}, 模板: ${templateId}, 元素数量: ${elementsCount}`);
  
  // 添加到布局列表
  scheduleForm.layouts.push(newLayout);
  
  // 关闭对话框
  showTemplateDialog.value = false;
  
  // 设置新添加的布局为编辑状态
  const newIndex = scheduleForm.layouts.length - 1;
  setTimeout(() => {
    startEditingDescription(newIndex);
  }, 100);
}

/**
 * 更改布局模板
 * @param templateId 模板ID
 */
function changeLayoutTemplate(templateId: string): void {
  const index = currentEditingLayoutIndex.value;
  if (index >= 0 && index < scheduleForm.layouts.length) {
    // 获取对应的布局模板
    const template = planStore.layoutTemplates.find(t => t.template === templateId);
    
    if (!template) {
      console.error(`[ScheduleEditorModal.vue 日程编辑器] 未找到模板: ${templateId}`);
      return;
    }
    
    // 保存原有的描述信息
    const description = scheduleForm.layouts[index].description;
    // 保存原有的ID
    const layoutId = scheduleForm.layouts[index].id;
    
    // 获取原有的媒体元素信息（如果有）
    const originalElements = scheduleForm.layouts[index].elements || [];
    const mediaElements = originalElements.filter((e: LayoutElement) => e.type === 'media');
    
    // 从模板创建新的元素列表
    const newElements = template.elements ? JSON.parse(JSON.stringify(template.elements)) : [];
    
    // 如果原布局有媒体元素，尝试将其合并到新布局中
    if (mediaElements.length > 0) {
      // 遍历新元素，查找媒体类型的元素
      for (const newElement of newElements) {
        if (newElement.type === 'media') {
          // 查找原布局中相同ID的媒体元素
          const originalMediaElement = mediaElements.find((e: LayoutElement) => e.id === newElement.id);
          if (originalMediaElement) {
            // 复制媒体源信息
            newElement.sourceId = originalMediaElement.sourceId;
            newElement.sourceName = originalMediaElement.sourceName;
            newElement.sourceType = originalMediaElement.sourceType;
          }
        }
      }
    }
    
    // 更新布局
    scheduleForm.layouts[index] = {
      id: layoutId,
      template: templateId,
      description: description,
      elements: newElements
    };
    
    const elementsCount = newElements ? newElements.length : 0;
    console.log(`[ScheduleEditorModal.vue 日程编辑器] 更改布局模板: ${layoutId}, 新模板: ${templateId}, 元素数量: ${elementsCount}`);
  }
  
  // 关闭对话框
  showTemplateDialog.value = false;
  currentEditingLayoutIndex.value = -1;
}

/**
 * 获取模板显示名称
 * @param template 布局模板
 * @returns 显示名称
 */
const getTemplateDisplayName = (template: any): string => {
  const { locale } = useI18n();
  const currentLocale = locale.value;
  
  if (currentLocale === 'zh-CN') {
    return template.name?.['zh-CN'] || template.name?.['en-US'] || template.template;
  } else {
    return template.name?.['en-US'] || template.name?.['zh-CN'] || template.template;
  }
};

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
 * 获取日程结束时间
 * @param schedule 日程对象
 * @returns 结束时间
 */
function getEndTime(schedule: Schedule): Date | null {
  if (!schedule.plannedStartDateTime || !schedule.plannedDuration) {
    return null;
  }
  
  const startTime = new Date(schedule.plannedStartDateTime);
  return new Date(startTime.getTime() + schedule.plannedDuration * 60 * 1000);
}

/**
 * 获取日程结束时间显示
 * @param schedule 日程对象
 * @param showFullTime 是否显示完整时间（包含日期）
 * @returns 结束时间字符串
 */
function getEndTimeDisplay(schedule: Schedule, showFullTime: boolean = true): string {
  const endTime = getEndTime(schedule);
  if (!endTime) {
    return t('scheduleManager.unsetTime');
  }
  
  return formatDateTime(endTime, showFullTime);
}

/**
 * 获取日程间隔
 * @param schedule 当前日程
 * @param index 当前日程索引
 * @returns 时间间隔字符串，如果没有间隔则返回空字符串
 */
function getGapWithNextSchedule(schedule: Schedule, index: number): string {
  // 如果是最后一个日程，没有间隔
  if (index === sortedScheduleList.value.length - 1) return '';
  
  // 如果当前日程没有开始时间或持续时间，没有间隔
  if (!schedule.plannedStartDateTime || !schedule.plannedDuration) return '';
  
  // 获取下一个日程
  const nextSchedule = sortedScheduleList.value[index + 1];
  
  // 如果下一个日程没有开始时间，没有间隔
  if (!nextSchedule.plannedStartDateTime) return '';
  
  // 计算当前日程的结束时间
  const currentStartTime = new Date(schedule.plannedStartDateTime);
  const currentEndTime = new Date(currentStartTime.getTime() + schedule.plannedDuration * 60 * 1000);
  
  // 下一个日程的开始时间
  const nextStartTime = new Date(nextSchedule.plannedStartDateTime);
  
  // 如果当前日程的结束时间等于下一个日程的开始时间，没有间隔
  if (currentEndTime.getTime() === nextStartTime.getTime()) return '';
  
  // 如果下一个日程的开始时间早于当前日程的结束时间，表示日程重叠，没有间隔
  if (nextStartTime.getTime() < currentEndTime.getTime()) return '';
  
  // 计算间隔时间（毫秒）
  const gapMs = nextStartTime.getTime() - currentEndTime.getTime();
  
  // 转换为小时和分钟
  const gapMinutes = Math.floor(gapMs / (60 * 1000));
  const hours = Math.floor(gapMinutes / 60);
  const minutes = gapMinutes % 60;
  
  // 格式化间隔时间
  if (hours > 0 && minutes > 0) {
    return `${hours}${t('scheduleEditor.hours')} ${minutes}${t('scheduleEditor.minutes')}`;
  } else if (hours > 0) {
    return `${hours}${t('scheduleEditor.hours')}`;
  } else {
    return `${minutes}${t('scheduleEditor.minutes')}`;
  }
}

/**
 * 添加讲者
 */
function addSpeaker(): void {
  if (scheduleForm.lectureInfo.speakers.length < 3) {
    // 获取最后一位讲者的单位信息
    const lastSpeaker = scheduleForm.lectureInfo.speakers[scheduleForm.lectureInfo.speakers.length - 1];
    const organization = lastSpeaker && lastSpeaker.organization ? lastSpeaker.organization : '';
    
    // 添加新讲者，并复制上一位讲者的单位
    scheduleForm.lectureInfo.speakers.push({ 
      name: '', 
      title: '教授', 
      organization: organization 
    });
  }
}

/**
 * 移除讲者
 * @param index 讲者索引
 */
function removeSpeaker(index: number): void {
  if (scheduleForm.lectureInfo.speakers.length > 1) {
    scheduleForm.lectureInfo.speakers.splice(index, 1);
  }
}

/**
 * 添加讲课嘉宾
 */
function addLectureGuest(): void {
  if (scheduleForm.lectureInfo.guests.length < 10) {
    scheduleForm.lectureInfo.guests.push({ name: '', title: '教授', organization: '' });
  }
}

/**
 * 移除讲课嘉宾
 * @param index 嘉宾索引
 */
function removeLectureGuest(index: number): void {
  scheduleForm.lectureInfo.guests.splice(index, 1);
}

// 布局缩略图缓存
const layoutThumbnailCache = ref<Map<string, string>>(new Map());

/**
 * 获取布局缩略图
 * @param layout 布局对象
 * @returns 布局缩略图URL
 */
const getLayoutThumbnail = (layout: Layout): string => {
  // 如果缓存中已有此缩略图，直接返回
  if (layoutThumbnailCache.value.has(layout.template)) {
    return layoutThumbnailCache.value.get(layout.template)!;
  }
  
  // 查找对应的布局模板
  const template = planStore.layoutTemplates.find(t => t.template === layout.template);
  
  // 如果找不到模板，返回占位图
  if (!template) {
    console.warn(`[ScheduleEditorModal.vue 日程编辑器] 找不到布局模板: ${layout.template}`);
    return '/placeholder-thumbnail.png';
  }
  
  // 使用默认缩略图，并异步加载
  const defaultThumbnail = template.thumbnail || '/placeholder-thumbnail.png';
  
  // 异步加载缩略图，启用错误抑制
  getImagePreloaderThumbnail(layout.template, template, true)
    .then((thumbnailUrl) => {
      // 加载完成后更新缓存
      layoutThumbnailCache.value.set(layout.template, thumbnailUrl);
    })
    .catch(() => {
      // 静默失败，不打印错误日志
      layoutThumbnailCache.value.set(layout.template, '/placeholder-thumbnail.png');
    });
  
  return defaultThumbnail;
};

/**
 * 获取布局模板缩略图
 * @param template 布局模板
 * @returns 缩略图URL
 */
function getTemplateThumbnail(template: any): string {
  // 如果缓存中已有此缩略图，直接返回
  if (layoutThumbnailCache.value.has(template.template)) {
    return layoutThumbnailCache.value.get(template.template)!;
  }
  
  // 使用默认缩略图，并异步加载
  const defaultThumbnail = template.thumbnail || '/placeholder-thumbnail.png';
  
  // 异步加载缩略图，启用错误抑制
  getImagePreloaderThumbnail(template.template, template, true)
    .then((thumbnailUrl) => {
      // 加载完成后更新缓存
      layoutThumbnailCache.value.set(template.template, thumbnailUrl);
    })
    .catch(() => {
      // 静默失败，不打印错误日志
      layoutThumbnailCache.value.set(template.template, '/placeholder-thumbnail.png');
    });
  
  return defaultThumbnail;
}

/**
 * 处理缩略图加载错误
 * @param event 错误事件
 */
const handleThumbnailError = (event: Event): void => {
  const target = event.target as HTMLImageElement;
  target.src = '/placeholder-thumbnail.png';
};

/**
 * 获取布局模板名称
 * @param templateId 模板ID
 * @returns 模板名称
 */
const getLayoutTemplateName = (templateId: string): string => {
  const template = planStore.layoutTemplates.find(t => t.template === templateId);
  if (!template) return templateId;
  
  const { locale } = useI18n();
  const currentLocale = locale.value;
  
  if (currentLocale === 'zh-CN') {
    return template.name?.['zh-CN'] || template.name?.['en-US'] || templateId;
  } else {
    return template.name?.['en-US'] || template.name?.['zh-CN'] || templateId;
  }
};

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
  width: 400px;
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

.schedule-item-container {
  margin-bottom: 5px;
  display: flex;
  position: relative;
}

.schedule-time-container {
  width: 45px;
  margin-right: 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

.schedule-time {
  font-size: 12px;
  color: #409eff;
  white-space: nowrap;
}

.start-time {
  position: absolute;
  top: 0;
}

.end-time {
  position: absolute;
  bottom: 0;
}

.schedule-item {
  flex: 1;
  padding: 10px;
  border-radius: var(--el-border-radius-base);
  cursor: pointer;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s;
  display: flex;
  align-items: flex-start;
  min-height: 60px;
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
  width: 60px;
  text-align: center;
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

.schedule-item-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.schedule-item-duration {
  color: var(--el-color-primary);
}

.schedule-gap-container {
  display: flex;
  margin: 5px 0;
  padding-left: 50px;
}

.schedule-gap {
  flex: 1;
  padding: 5px;
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  display: flex;
  justify-content: center;
  align-items: center;
}

.gap-content {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
  text-align: center;
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
  width: 140px;
  flex: 0 0 auto;
}

.person-title {
  width: 80px;
  flex: 0 0 auto;
}

.person-org {
  flex: 1;
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
  gap: 20px;
  justify-content: flex-start;
}

.layout-card {
  width: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  margin-bottom: 10px;
}

.layout-thumbnail {
  width: 240px;
  height: 135px;
  overflow: hidden;
  border-radius: var(--el-border-radius-base);
  margin-bottom: 10px;
  position: relative;
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
  display: flex;
  align-items: center;
  justify-content: center;
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

.edit-description-btn {
  margin-left: 5px;
  padding: 2px;
  font-size: 14px;
  color: var(--el-color-primary);
}

.edit-description-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.save-description-btn {
  margin-left: 5px;
  padding: 4px 8px;
  font-size: 14px;
  border-radius: 4px;
}

.layout-actions {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: var(--el-border-radius-base);
}

.layout-thumbnail:hover .layout-actions {
  opacity: 1;
}

.layout-action-buttons {
  display: flex;
  flex-direction: row;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.layout-action-btn {
  width: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
}

/* 模板选择对话框样式 */
.template-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.template-card {
  width: calc(25% - 15px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.template-thumbnail {
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.template-info {
  padding: 10px;
  text-align: center;
}

.template-name {
  font-size: var(--el-font-size-small);
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-id {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.empty-templates {
  text-align: center;
  padding: 30px;
  color: var(--el-text-color-secondary);
}

/* 确认对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.schedule-time.conflict {
  color: #f56c6c;
  font-weight: bold;
}

.conflict-icon {
  color: #f56c6c;
  margin-right: 2px;
}
</style> 