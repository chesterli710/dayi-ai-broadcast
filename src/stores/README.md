# Store文档

本文档详细说明了大医AI导播系统中状态管理的使用方法。

## 计划存储 (planStore)

计划存储用于管理应用的直播计划数据，包括频道、计划、分支、日程和布局模板等信息。

### 导入方式

```typescript
import { usePlanStore } from '../stores/planStore';

// 在组件中使用
const planStore = usePlanStore();
```

### 状态属性

| 属性名 | 类型 | 说明 |
|-------|------|------|
| currentChannel | Channel \| null | 当前选中的频道 |
| currentPlan | Plan \| null | 当前选中的计划 |
| currentBranch | Branch \| null | 当前选中的分支 |
| layoutTemplates | LayoutTemplate[] | 布局模板列表 |
| layoutTemplatesLastUpdated | Date \| null | 布局模板最后更新时间 |
| allLayouts | Layout[] | 计算属性，当前计划中的所有布局 |
| needsLayoutTemplateUpdate | boolean | 计算属性，布局模板是否需要更新 |

### 方法

#### 设置当前频道

```typescript
planStore.setCurrentChannel(channel);
```

#### 设置当前计划

```typescript
planStore.setCurrentPlan(plan);
```

#### 设置当前分支

```typescript
planStore.setCurrentBranch(branch);
```

#### 设置布局模板列表

```typescript
planStore.setLayoutTemplates(templates);
```

#### 从本地存储加载布局模板

```typescript
const success = planStore.loadLayoutTemplatesFromLocalStorage();
if (success) {
  console.log('从本地存储加载布局模板成功');
} else {
  console.log('从本地存储加载布局模板失败或没有缓存');
}
```

#### 保存布局模板到本地存储

```typescript
planStore.saveLayoutTemplatesToLocalStorage();
```

#### 补全布局信息

根据布局模板补全布局中的元素信息。

```typescript
const completedLayout = planStore.completeLayoutInfo(layout);
```

#### 创建新日程

创建一个新的日程，不需要提供ID。返回一个Promise，成功时为true，失败时为false。

```typescript
const newSchedule = {
  type: ScheduleType.SURGERY,
  plannedStartDateTime: new Date(),
  plannedDuration: 60,
  surgeryInfo: {
    procedure: '腹腔镜胆囊切除术',
    surgeons: [
      { name: '张医生', title: '主任医师', organization: '北京协和医院' }
    ],
    guests: []
  },
  layouts: []
};

planStore.createSchedule(newSchedule)
  .then(success => {
    if (success) {
      console.log('日程创建成功');
    } else {
      console.log('日程创建失败');
    }
  })
  .catch(error => {
    console.error('创建日程时发生错误:', error);
  });
```

#### 更新日程

更新现有日程，必须提供有效的日程ID。返回一个Promise，成功时为true，失败时为false。

```typescript
const updatedSchedule = {
  id: 'schedule123', // 必须提供有效的ID
  type: ScheduleType.SURGERY,
  plannedStartDateTime: new Date(),
  plannedDuration: 90, // 更新持续时间
  surgeryInfo: {
    procedure: '腹腔镜胆囊切除术（更新）',
    surgeons: [
      { name: '张医生', title: '主任医师', organization: '北京协和医院' }
    ],
    guests: []
  },
  layouts: []
};

planStore.updateSchedule(updatedSchedule)
  .then(success => {
    if (success) {
      console.log('日程更新成功');
    } else {
      console.log('日程更新失败');
    }
  })
  .catch(error => {
    console.error('更新日程时发生错误:', error);
  });
```

#### 保存日程（兼容旧版本）

根据日程是否包含有效ID自动决定创建新日程或更新现有日程。
推荐使用更明确的`createSchedule`和`updateSchedule`方法，此方法主要用于兼容旧代码。

```typescript
const schedule = {
  // 如果id不存在或为临时ID格式，则创建新日程
  // 如果id存在且为有效格式，则更新现有日程
  id: existingId || undefined,
  type: ScheduleType.SURGERY,
  // 其他日程属性...
};

planStore.saveSchedule(schedule)
  .then(success => {
    if (success) {
      console.log('日程保存成功');
    } else {
      console.log('日程保存失败');
    }
  })
  .catch(error => {
    console.error('保存日程时发生错误:', error);
  });
```

#### 删除日程

```typescript
planStore.deleteSchedule('schedule123')
  .then(success => {
    if (success) {
      console.log('日程删除成功');
    } else {
      console.log('日程删除失败');
    }
  })
  .catch(error => {
    console.error('删除日程时发生错误:', error);
  });
```

### 使用示例

```typescript
<script setup lang="ts">
import { onMounted } from 'vue';
import { usePlanStore } from '../stores/planStore';
import type { Schedule } from '../types/broadcast';

const planStore = usePlanStore();

// 创建新日程
async function createNewSchedule(scheduleData: Omit<Schedule, 'id'>) {
  try {
    const success = await planStore.createSchedule(scheduleData);
    if (success) {
      // 创建成功，执行后续操作
    } else {
      // 创建失败，显示错误信息
    }
  } catch (error) {
    console.error('创建日程失败:', error);
  }
}

// 更新现有日程
async function updateExistingSchedule(scheduleData: Schedule) {
  try {
    const success = await planStore.updateSchedule(scheduleData);
    if (success) {
      // 更新成功，执行后续操作
    } else {
      // 更新失败，显示错误信息
    }
  } catch (error) {
    console.error('更新日程失败:', error);
  }
}

// 删除日程
async function removeSchedule(scheduleId: string) {
  try {
    const success = await planStore.deleteSchedule(scheduleId);
    if (success) {
      // 删除成功，执行后续操作
    } else {
      // 删除失败，显示错误信息
    }
  } catch (error) {
    console.error('删除日程失败:', error);
  }
}
</script>
```

## 视频存储 (videoStore)

视频存储用于管理应用的视频捕获设备和视频流。

### 导入方式

```typescript
import { useVideoStore } from '../stores/videoStore';

// 在组件中使用
const videoStore = useVideoStore();
```

### 状态属性

| 属性名 | 类型 | 说明 |
|-------|------|------|
| cameraDevices | VideoDevice[] | 摄像头设备列表 |
| windowDevices | VideoDevice[] | 窗口捕获列表 |
| displayDevices | VideoDevice[] | 显示器捕获列表 |
| activeDevices | VideoDevice[] | 活跃的视频设备 |
| previewConfig | VideoPreviewConfig | 视频预览配置 |

### 方法

#### 初始化视频设备

```typescript
await videoStore.initVideoDevices();
```

#### 刷新设备列表

```typescript
await videoStore.refreshDevices();
```

#### 激活视频设备

```typescript
const success = await videoStore.activateDevice('device-id', VideoSourceType.CAMERA);
if (success) {
  console.log('设备激活成功');
} else {
  console.log('设备激活失败');
}
```

#### 停用视频设备

```typescript
const success = videoStore.deactivateDevice('device-id');
if (success) {
  console.log('设备停用成功');
} else {
  console.log('设备停用失败');
}
```

#### 更新设备状态

```typescript
videoStore.updateDeviceStatus('device-id', true); // 设置为活跃状态
```

#### 设置预览配置

```typescript
videoStore.setPreviewConfig({
  width: 640,
  height: 360,
  frameRate: 30
});
```

#### 更新所有设备状态

```typescript
videoStore.updateAllDevicesStatus(false); // 停用所有设备
```

### 使用示例

```typescript
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useVideoStore } from '../stores/videoStore';
import { VideoSourceType } from '../types/video';

const videoStore = useVideoStore();

onMounted(async () => {
  // 初始化视频设备
  await videoStore.initVideoDevices();
  
  // 激活摄像头
  if (videoStore.cameraDevices.length > 0) {
    const firstCamera = videoStore.cameraDevices[0];
    await videoStore.activateDevice(firstCamera.id, VideoSourceType.CAMERA);
  }
});

onUnmounted(() => {
  // 清理资源
  videoStore.cleanup();
});

// 切换设备状态
function toggleDevice(deviceId: string, type: VideoSourceType) {
  const device = videoStore.cameraDevices.find(d => d.id === deviceId) ||
                videoStore.windowDevices.find(d => d.id === deviceId) ||
                videoStore.displayDevices.find(d => d.id === deviceId);
                
  if (device) {
    if (device.isActive) {
      videoStore.deactivateDevice(deviceId);
    } else {
      videoStore.activateDevice(deviceId, type);
    }
  }
}
</script>
```

## 音频存储 (audioStore)

音频存储用于管理应用的音频设备和配置状态。

### 导入方式

```typescript
import { useAudioStore } from '../stores/audioStore';

// 在组件中使用
const audioStore = useAudioStore();
```

### 状态属性

| 属性名 | 类型 | 说明 |
|-------|------|------|
| devices | AudioDevice[] | 可用的音频设备列表 |
| activeDevices | AudioDevice[] | 当前激活的音频设备 |
| config | AudioConfig | 音频配置 |
| systemAudioStatus | SystemAudioStatus | 系统音频状态 |
| isMuted | boolean | 是否静音 |
| volume | number | 音量 (0-100) |

### 方法

#### 初始化音频设备

```typescript
await audioStore.initAudioDevices();
```

#### 激活音频设备

```typescript
audioStore.activateDevice('device-id');
```

#### 停用音频设备

```typescript
audioStore.deactivateDevice('device-id');
```

#### 切换设备状态

```typescript
audioStore.toggleDevice('device-id');
```

#### 更新音频配置

```typescript
audioStore.updateConfig({
  codec: AudioCodecType.AAC,
  sampleRate: AudioSampleRate.RATE_48000,
  bitrate: AudioBitrate.BITRATE_192K,
  channels: 2
});
```

#### 切换静音状态

```typescript
audioStore.toggleMute();
```

#### 设置音量

```typescript
audioStore.setVolume(75); // 设置音量为75%
```

#### 刷新设备列表

```typescript
await audioStore.refreshDevices();
```

### 使用示例

```typescript
<script setup lang="ts">
import { onMounted } from 'vue';
import { useAudioStore } from '../stores/audioStore';
import { AudioCodecType, AudioSampleRate, AudioBitrate } from '../types/audio';

const audioStore = useAudioStore();

onMounted(async () => {
  // 初始化音频设备
  await audioStore.initAudioDevices();
  
  // 激活第一个麦克风
  if (audioStore.devices.length > 0) {
    const firstMic = audioStore.devices.find(d => d.type === 'microphone');
    if (firstMic) {
      audioStore.activateDevice(firstMic.id);
    }
  }
  
  // 设置音频配置
  audioStore.updateConfig({
    codec: AudioCodecType.AAC,
    sampleRate: AudioSampleRate.RATE_48000,
    bitrate: AudioBitrate.BITRATE_192K
  });
});

// 调整音量
function handleVolumeChange(value: number) {
  audioStore.setVolume(value);
}

// 切换静音
function toggleMute() {
  audioStore.toggleMute();
}
</script>
```

## 用户存储 (userStore)

用户存储用于管理用户登录状态、用户信息等。

### 导入方式

```typescript
import { useUserStore } from '../stores/userStore';

// 在组件中使用
const userStore = useUserStore();
```

### 状态属性

| 属性名 | 类型 | 说明 |
|-------|------|------|
| token | string | 用户令牌 |
| userInfo | UserInfo \| null | 用户信息 |
| isLoggedIn | boolean | 登录状态 |
| loginLoading | boolean | 登录加载状态 |
| loginError | string | 登录错误信息 |

### 方法

#### 使用手机号和密码登录

```typescript
await userStore.loginWithPhone('13800138000', 'password');
```

#### 获取用户信息

```typescript
await userStore.getUserInfo();
```

#### 退出登录

```typescript
userStore.logout();
```

#### 检查登录状态

```typescript
await userStore.checkLoginStatus();
```

### 使用示例

```typescript
<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../stores/userStore';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();

const phone = ref('');
const password = ref('');

async function handleLogin() {
  try {
    await userStore.loginWithPhone(phone.value, password.value);
    if (userStore.isLoggedIn) {
      // 登录成功，跳转到首页
      router.push('/');
    }
  } catch (error) {
    console.error('登录失败:', error);
  }
}

function handleLogout() {
  userStore.logout();
  // 退出登录后跳转到登录页
  router.push('/login');
}
</script>
```

## 应用存储 (appStore)

应用存储用于管理应用的全局状态，如主题、语言等。

### 导入方式

```typescript
import { useAppStore } from '../stores/appStore';

// 在组件中使用
const appStore = useAppStore();
```

### 状态属性

| 属性名 | 类型 | 说明 |
|-------|------|------|
| appName | string | 应用名称 |
| appVersion | string | 应用版本 |
| isDarkMode | boolean | 应用是否处于暗黑模式 |
| currentTheme | ThemeType | 当前主题 |
| customTheme | ThemeConfig | 自定义主题配置 |
| currentLanguage | string | 当前语言 |

### 方法

#### 切换暗黑模式

```typescript
appStore.toggleDarkMode();
```

#### 应用暗黑模式

```typescript
appStore.applyDarkMode();
```

#### 切换主题

```typescript
appStore.switchTheme('default');
```

#### 设置自定义主题

```typescript
appStore.setCustomTheme({
  primaryColor: '#1890ff',
  secondaryColor: '#52c41a'
});
```

#### 切换语言

```typescript
appStore.switchLanguage('zh-CN');
```

#### 初始化应用状态

```typescript
appStore.initAppState();
```

### 使用示例

```typescript
<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from '../stores/appStore';

const appStore = useAppStore();

onMounted(() => {
  // 初始化应用状态
  appStore.initAppState();
});

// 切换主题
function handleThemeChange(theme: 'default' | 'dark' | 'light' | 'custom') {
  appStore.switchTheme(theme);
}

// 切换语言
function handleLanguageChange(lang: 'zh-CN' | 'en-US') {
  appStore.switchLanguage(lang);
}

// 切换暗黑模式
function handleDarkModeToggle() {
  appStore.toggleDarkMode();
}
</script>
```

## 最佳实践

1. 创建新日程时，使用`createSchedule`方法，不提供ID
2. 更新现有日程时，使用`updateSchedule`方法，提供有效的日程ID
3. 避免使用`saveSchedule`方法，除非是为了兼容旧代码
4. 在操作前始终检查`currentBranch`是否存在，因为大多数操作都需要当前分支ID
5. 使用`try/catch`块处理可能的异常，提供良好的用户体验
6. 在组件卸载时调用清理方法（如videoStore.cleanup()）以释放资源
7. 使用计算属性和响应式引用来保持UI与状态的同步
8. 在应用初始化时加载必要的状态（如用户信息、设备列表等） 