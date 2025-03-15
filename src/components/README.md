# 组件文档

本文档详细说明了大医AI导播系统中主要组件的使用方法。

## ScheduleEditorModal 日程编辑器模态框

日程编辑器模态框用于创建新日程或编辑现有日程。

### 导入方式

```vue
<script setup lang="ts">
import ScheduleEditorModal from '../components/ScheduleEditorModal.vue';
</script>

<template>
  <ScheduleEditorModal
    :visible="showEditor"
    :schedule="selectedSchedule"
    @close="handleEditorClose"
    @save="handleScheduleSave"
  />
</template>
```

### 属性

| 属性名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| visible | boolean | 是 | 控制模态框的显示与隐藏 |
| schedule | Schedule \| null | 是 | 要编辑的日程对象，如果为null则表示创建新日程 |

### 事件

| 事件名 | 参数 | 说明 |
|-------|------|------|
| close | 无 | 当用户关闭模态框时触发 |
| save | schedule: Schedule | 当用户保存日程时触发，参数为保存后的日程对象 |

### 功能说明

1. **创建新日程**：当传入的`schedule`为`null`时，模态框会显示创建新日程的界面。
2. **编辑现有日程**：当传入有效的`schedule`对象时，模态框会加载该日程的数据进行编辑。
3. **日程类型**：支持手术演示和讲课两种类型的日程。
4. **时间设置**：可以设置日程的计划开始时间和持续时间。
5. **手术信息**：对于手术类型的日程，可以设置术式名称、术者列表和嘉宾列表。
6. **讲课信息**：对于讲课类型的日程，可以设置讲课主题和讲者信息。
7. **布局管理**：可以为日程添加多个布局，并从布局模板中选择。

### 日程保存逻辑

日程编辑器使用了基于用户行为的保存逻辑，而不是基于临时ID：

1. **创建新日程**：
   - 当用户点击"新建日程"按钮时，系统会将`isCreatingNew`标志设置为`true`
   - 保存时，系统会调用`planStore.createSchedule()`方法创建新日程
   - 创建成功后，服务器会返回带有新ID的日程对象

2. **编辑现有日程**：
   - 当用户选择一个现有日程进行编辑时，系统会将`isCreatingNew`标志设置为`false`
   - 保存时，系统会调用`planStore.updateSchedule()`方法更新现有日程
   - 更新成功后，本地数据会被更新

3. **表单验证**：
   - 保存前会进行表单验证，确保必填字段已填写
   - 对于手术类型，至少需要一位术者
   - 对于讲课类型，需要填写讲者信息
   - 所有类型的日程都需要至少添加一个布局

### 使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import ScheduleEditorModal from '../components/ScheduleEditorModal.vue';
import type { Schedule } from '../types/broadcast';
import { ElMessage } from 'element-plus';

// 控制模态框显示
const showEditor = ref(false);
// 当前选中的日程
const selectedSchedule = ref<Schedule | null>(null);

// 打开编辑器创建新日程
function createNewSchedule() {
  selectedSchedule.value = null;
  showEditor.value = true;
}

// 打开编辑器编辑现有日程
function editSchedule(schedule: Schedule) {
  selectedSchedule.value = schedule;
  showEditor.value = true;
}

// 处理编辑器关闭
function handleEditorClose() {
  showEditor.value = false;
}

// 处理日程保存
function handleScheduleSave(schedule: Schedule) {
  ElMessage.success('日程保存成功');
  // 执行其他操作，如刷新日程列表等
}
</script>

<template>
  <div>
    <el-button @click="createNewSchedule">新建日程</el-button>
    
    <!-- 日程列表 -->
    <div v-for="schedule in scheduleList" :key="schedule.id">
      <div>{{ schedule.type === 'SURGERY' ? '手术演示' : '讲课' }}: {{ getScheduleTitle(schedule) }}</div>
      <el-button @click="editSchedule(schedule)">编辑</el-button>
    </div>
    
    <!-- 日程编辑器模态框 -->
    <ScheduleEditorModal
      :visible="showEditor"
      :schedule="selectedSchedule"
      @close="handleEditorClose"
      @save="handleScheduleSave"
    />
  </div>
</template>
```

### 布局管理功能

日程编辑器内置了布局管理功能，允许用户：

1. **添加布局**：从可用的布局模板中选择添加新布局
2. **删除布局**：移除不需要的布局
3. **更改布局模板**：将现有布局更改为其他模板
4. **编辑布局描述**：为布局添加自定义描述

布局以卡片形式显示，包含缩略图、描述和模板名称，方便用户直观地管理日程中的布局。

### 注意事项

1. 创建新日程时，不需要提供ID，系统会在保存时自动生成
2. 编辑现有日程时，必须保留原有的ID
3. 保存操作是异步的，成功后会关闭模态框并触发`save`事件
4. 如果保存失败，会显示错误信息，模态框保持打开状态 