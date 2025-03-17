<template>
  <div class="audio-panel">
    <div class="panel-header">
      <h3>{{ $t('audio.title') }}</h3>
    </div>
    <div class="panel-content">
      <!-- 麦克风部分 -->
      <div class="microphone-section">
        <div class="section-title">
          <el-icon><Microphone /></el-icon>
          <span class="ml-1">{{ $t('audio.microphone') }}</span>
          <!-- 无音频信号提示 - 移到标题旁边 -->
          <div v-if="activeMicrophone && activeMicrophone.level === 0" class="inline-signal-alert">
            <el-icon class="signal-icon"><InfoFilled /></el-icon>
            <span class="signal-text">{{ $t('audio.noSignalDetected') }}</span>
            <el-button
              type="primary"
              size="small"
              class="signal-button"
              @click="refreshAudioDevices"
            >
              {{ $t('audio.refreshDevices') }}
            </el-button>
          </div>
        </div>
        
        <!-- 麦克风选择 -->
        <el-select
          v-model="selectedMicrophone"
          :placeholder="$t('audio.selectMicrophone')"
          class="mic-select"
          size="small"
          @change="handleMicrophoneChange"
        >
          <el-option
            v-for="device in microphoneDevices"
            :key="device.id"
            :label="device.name"
            :value="device.id"
          />
        </el-select>
        
        <!-- 麦克风控制 -->
        <div v-if="activeMicrophone" class="device-controls">
          <!-- 电平指示器 -->
          <div class="level-meter-container">
            <div class="level-meter">
              <div
                class="level-meter-fill"
                :class="{
                  'level-low': activeMicrophone.level < 30,
                  'level-medium': activeMicrophone.level >= 30 && activeMicrophone.level < 70,
                  'level-high': activeMicrophone.level >= 70
                }"
                :style="{ width: `${activeMicrophone.level}%` }"
              ></div>
            </div>
            <div class="level-value">{{ Math.round(activeMicrophone.level) }}%</div>
          </div>
          
          <!-- 音量控制 -->
          <div class="volume-control">
            <div class="volume-label">{{ $t('audio.volume') }}</div>
            <div class="volume-slider-container">
              <el-icon><Mute /></el-icon>
              <el-slider
                v-model="microphoneVolume"
                :max="100"
                :min="0"
                :step="1"
                :show-tooltip="false"
                class="volume-slider"
                :class="{ 'volume-changed': microphoneVolumeChanged }"
                @input="setMicrophoneVolume"
              />
              <el-icon><Plus /></el-icon>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 系统音频部分 -->
      <div class="system-audio-section">
        <div class="section-title">
          <el-icon><Headset /></el-icon>
          <span class="ml-1">{{ $t('audio.systemAudio') }}</span>
          <!-- 无系统音频信号提示 - 移到标题旁边 -->
          <div v-if="isSystemAudioActive && activeSystemAudio && activeSystemAudio.level === 0" class="inline-signal-alert">
            <el-icon class="signal-icon"><InfoFilled /></el-icon>
            <span class="signal-text">{{ $t('audio.noSignalDetected') }}</span>
            <el-button
              type="primary"
              size="small"
              class="signal-button"
              @click="refreshAudioDevices"
            >
              {{ $t('audio.refreshDevices') }}
            </el-button>
          </div>
        </div>
        
        <!-- 系统音频开关 -->
        <div class="device-activation">
          <span>{{ $t('audio.enableSystemAudio') }}</span>
          <el-switch
            v-model="isSystemAudioActive"
            @change="toggleSystemAudio"
          />
        </div>
        
        <!-- 系统音频控制 -->
        <div v-if="isSystemAudioActive && activeSystemAudio" class="device-controls">
          <!-- 电平指示器 -->
          <div class="level-meter-container">
            <div class="level-meter">
              <div
                class="level-meter-fill"
                :class="{
                  'level-low': activeSystemAudio.level < 30,
                  'level-medium': activeSystemAudio.level >= 30 && activeSystemAudio.level < 70,
                  'level-high': activeSystemAudio.level >= 70
                }"
                :style="{ width: `${activeSystemAudio.level}%` }"
              ></div>
            </div>
            <div class="level-value">{{ Math.round(activeSystemAudio.level) }}%</div>
          </div>
          
          <!-- 音量控制 -->
          <div class="volume-control">
            <div class="volume-label">{{ $t('audio.volume') }}</div>
            <div class="volume-slider-container">
              <el-icon><Mute /></el-icon>
              <el-slider
                v-model="systemAudioVolume"
                :max="100"
                :min="0"
                :step="1"
                :show-tooltip="false"
                class="volume-slider"
                :class="{ 'volume-changed': systemAudioVolumeChanged }"
                @input="setSystemAudioVolume"
              />
              <el-icon><Plus /></el-icon>
            </div>
          </div>
        </div>
        
        <!-- 无系统音频设备提示 -->
        <div v-if="systemAudioDevices.length === 0" class="system-audio-guide">
          <el-alert
            :title="$t('audio.systemAudioNotAvailable')"
            type="info"
            :closable="false"
            show-icon
          >
            <div class="guide-content">
              <p>{{ $t('audio.systemAudioGuide') }}</p>
            </div>
          </el-alert>
        </div>
      </div>
      
      <!-- 全局音频控制 -->
      <div class="global-audio-controls">
        <div class="section-title">
          <el-icon><Setting /></el-icon>
          <span class="ml-1">{{ $t('audio.globalSettings') }}</span>
        </div>
        
        <!-- 静音控制 -->
        <div class="mute-control">
          <span>{{ $t('audio.mute') }}</span>
          <el-switch
            v-model="audioStore.isMuted"
            @change="toggleMute"
          />
        </div>
        
        <!-- 全局音量控制 -->
        <div class="global-volume-control">
          <div class="volume-label">{{ $t('audio.globalVolume') }}</div>
          <div class="volume-slider-container">
            <el-icon><Mute /></el-icon>
            <el-slider
              v-model="audioStore.volume"
              :max="100"
              :min="0"
              :step="1"
              :show-tooltip="false"
              class="volume-slider"
              @input="setVolume"
            />
            <el-icon><Plus /></el-icon>
          </div>
        </div>
      </div>
      
      <!-- 刷新设备按钮 -->
      <el-button
        type="primary"
        class="refresh-button"
        @click="refreshAudioDevices"
      >
        <el-icon><Refresh /></el-icon>
        {{ $t('audio.refreshDevices') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 音频面板组件
 * 用于管理音频设备和控制
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAudioStore } from '../stores/audioStore';
import { AudioSourceType } from '../types/audio';
import { isMacOS, isWindows } from '../utils/platformUtils';
import { 
  InfoFilled, 
  Microphone, 
  Headset, 
  Setting, 
  Refresh,
  Mute,
  Plus
} from '@element-plus/icons-vue';

// 添加防抖函数
function debounce(fn: Function, delay: number) {
  let timer: number | null = null;
  return function(this: any, ...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

const { t } = useI18n();
const audioStore = useAudioStore();

// 全局音量
const volume = ref(audioStore.volume);

// 是否静音
const isMuted = ref(audioStore.isMuted);

// 当前选中的麦克风ID
const selectedMicrophone = ref('');

// 系统音频是否激活
const isSystemAudioActive = ref(false);

// 麦克风音量
const microphoneVolume = ref(100);

// 系统音频音量
const systemAudioVolume = ref(100);

// 平台检测
const isMacOSPlatform = computed(() => isMacOS());
const isWindowsPlatform = computed(() => isWindows());

// 添加音量变化状态
const microphoneVolumeChanged = ref(false);
const systemAudioVolumeChanged = ref(false);

/**
 * 获取麦克风设备列表
 */
const microphoneDevices = computed(() => {
  return audioStore.devices.filter(device => device.type === AudioSourceType.MICROPHONE);
});

/**
 * 获取系统音频设备
 */
const systemAudioDevices = computed(() => {
  return audioStore.devices.filter(device => device.type === AudioSourceType.SYSTEM_AUDIO);
});

/**
 * 获取当前激活的麦克风
 */
const activeMicrophone = computed(() => {
  return audioStore.activeDevices.find(device => device.type === AudioSourceType.MICROPHONE);
});

/**
 * 获取当前激活的系统音频设备
 */
const activeSystemAudio = computed(() => {
  return audioStore.activeDevices.find(device => device.type === AudioSourceType.SYSTEM_AUDIO);
});

/**
 * 处理麦克风选择变更
 * @param deviceId - 设备ID
 */
function handleMicrophoneChange(deviceId: string) {
  console.log(`切换麦克风到: ${deviceId}`);
  
  // 先停用所有麦克风
  microphoneDevices.value.forEach(mic => {
    if (mic.isActive && mic.id !== deviceId) {
      console.log(`停用麦克风: ${mic.id}`);
      audioStore.deactivateDevice(mic.id);
    }
  });
  
  // 激活选中的麦克风
  console.log(`激活麦克风: ${deviceId}`);
  audioStore.activateDevice(deviceId);
  
  // 更新麦克风音量
  const selectedDevice = audioStore.devices.find(device => device.id === deviceId);
  if (selectedDevice) {
    microphoneVolume.value = selectedDevice.volume;
    console.log(`设置麦克风音量: ${selectedDevice.volume}`);
  }
  
  // 强制更新选中状态
  selectedMicrophone.value = deviceId;
}

/**
 * 切换系统音频设备状态
 * @param active - 是否激活
 */
function toggleSystemAudio(active: boolean) {
  if (active && systemAudioDevices.value.length > 0) {
    // 使用第一个系统音频设备
    const deviceId = systemAudioDevices.value[0].id;
    // 激活系统音频
    audioStore.activateDevice(deviceId);
    
    // 更新系统音频音量
    systemAudioVolume.value = systemAudioDevices.value[0].volume;
  } else if (!active && activeSystemAudio.value) {
    // 停用系统音频
    audioStore.deactivateDevice(activeSystemAudio.value.id);
  }
}

/**
 * 设置全局音量
 * @param value - 音量值
 */
function setVolume(value: number) {
  audioStore.setVolume(value);
}

/**
 * 设置麦克风音量
 * @param value - 音量值
 */
function setMicrophoneVolume(value: number) {
  // 立即更新UI状态
  microphoneVolume.value = value;
  
  // 立即设置实际音量，不使用防抖
  if (activeMicrophone.value) {
    // 添加视觉反馈
    audioStore.setDeviceVolume(activeMicrophone.value.id, value)
      .then(() => {
        // 音量设置成功的视觉反馈
        microphoneVolumeChanged.value = true;
        setTimeout(() => {
          microphoneVolumeChanged.value = false;
        }, 500); // 减少反馈时间
      });
  }
}

/**
 * 设置系统音频音量
 * @param value - 音量值
 */
function setSystemAudioVolume(value: number) {
  // 立即更新UI状态
  systemAudioVolume.value = value;
  
  // 立即设置实际音量，不使用防抖
  if (activeSystemAudio.value) {
    // 添加视觉反馈
    audioStore.setDeviceVolume(activeSystemAudio.value.id, value)
      .then(() => {
        // 音量设置成功的视觉反馈
        systemAudioVolumeChanged.value = true;
        setTimeout(() => {
          systemAudioVolumeChanged.value = false;
        }, 500); // 减少反馈时间
      });
  }
}

/**
 * 切换静音状态
 */
function toggleMute() {
  audioStore.toggleMute();
}

/**
 * 刷新音频设备
 */
async function refreshAudioDevices() {
  await audioStore.refreshDevices();
  updateSelectedDevices();
}

/**
 * 更新选中的设备
 */
function updateSelectedDevices() {
  // 更新麦克风
  const activeMic = audioStore.activeDevices.find(
    device => device.type === AudioSourceType.MICROPHONE
  );
  
  if (activeMic) {
    // 只有当selectedMicrophone为空或者与当前激活的麦克风不同时才更新
    if (!selectedMicrophone.value || !microphoneDevices.value.some(mic => mic.id === selectedMicrophone.value)) {
      selectedMicrophone.value = activeMic.id;
      console.log(`更新选中麦克风: ${activeMic.id}`);
    }
    microphoneVolume.value = activeMic.volume;
  } else if (microphoneDevices.value.length > 0) {
    // 如果没有激活的麦克风，默认选择第一个
    selectedMicrophone.value = microphoneDevices.value[0].id;
    microphoneVolume.value = microphoneDevices.value[0].volume;
    audioStore.activateDevice(selectedMicrophone.value);
    console.log(`默认选择第一个麦克风: ${selectedMicrophone.value}`);
  }
  
  // 更新系统音频
  const activeSysAudio = audioStore.activeDevices.find(
    device => device.type === AudioSourceType.SYSTEM_AUDIO
  );
  
  if (activeSysAudio) {
    systemAudioVolume.value = activeSysAudio.volume;
    isSystemAudioActive.value = true;
  } else {
    isSystemAudioActive.value = false;
    if (systemAudioDevices.value.length > 0) {
      systemAudioVolume.value = systemAudioDevices.value[0].volume;
    }
  }
}

// 监听激活设备变化，更新音量值
watch(() => audioStore.activeDevices, () => {
  updateSelectedDevices();
}, { deep: true });

onMounted(async () => {
  // 初始化音频设备
  if (audioStore.devices.length === 0) {
    await audioStore.initAudioDevices();
  }
  
  // 设置当前选中的麦克风
  updateSelectedDevices();
  
  // 确保音频电平监测已启动
  audioStore.startLevelMonitoring();
});

onUnmounted(() => {
  // 停止音频电平监测
  audioStore.stopLevelMonitoring();
});
</script>

<style scoped>
.audio-panel {
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.panel-header {
  padding: 8px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.microphone-section, .system-audio-section, .global-audio-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--el-fill-color-blank);
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.mic-select {
  width: 100%;
}

.system-audio-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-activation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}

.device-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.level-meter-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-meter {
  flex: 1;
  height: 8px;
  background-color: var(--el-fill-color-darker);
  border-radius: 4px;
  overflow: hidden;
}

.level-meter-fill {
  height: 100%;
  transition: width 0.1s ease;
}

.level-low {
  background-color: #67c23a;
}

.level-medium {
  background-color: #e6a23c;
}

.level-high {
  background-color: #f56c6c;
}

.level-value {
  min-width: 36px;
  text-align: right;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.volume-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.volume-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.volume-slider-container {
  display: flex;
  align-items: center;
  gap: 5px;
}

.volume-slider-container i {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.volume-slider-container .el-slider {
  flex: 1;
  margin: 0;
}

.system-audio-guide {
  margin-top: 4px;
}

.guide-content {
  margin: 8px 0;
  font-size: 12px;
}

.guide-content ol {
  padding-left: 18px;
  margin: 4px 0;
}

.refresh-button {
  margin-top: 8px;
}

.global-audio-controls {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.global-volume-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mute-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.level-warning {
  margin-top: 4px;
}

.signal-alert {
  display: flex;
  align-items: center;
  background-color: var(--el-color-info-light-9);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
}

.signal-icon {
  color: var(--el-color-info);
  margin-right: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.signal-text {
  flex: 1;
  color: var(--el-color-info-dark-2);
}

.signal-button {
  margin: 0 0 0 8px !important;
  padding: 2px 8px;
  height: 24px;
  font-size: 12px;
  line-height: 1;
}

/* 添加音量变化的视觉反馈样式 */
.volume-changed :deep(.el-slider__bar) {
  background-color: #67c23a !important;
  transition: background-color 0.5s ease;
}

.volume-changed :deep(.el-slider__button) {
  border-color: #67c23a !important;
  transition: border-color 0.5s ease;
}

/* 优化音量滑块样式，提供更好的视觉反馈 */
.volume-slider {
  width: 100%;
  margin: 0;
}

.volume-slider :deep(.el-slider__button) {
  width: 14px;
  height: 14px;
  border: 2px solid var(--el-color-primary);
  background-color: #fff;
  transition: transform 0.1s;
}

.volume-slider :deep(.el-slider__button):hover,
.volume-slider :deep(.el-slider__button.hover) {
  transform: scale(1.2);
}

.volume-slider :deep(.el-slider__bar) {
  background-color: var(--el-color-primary);
  transition: width 0.1s;
}

/* 优化下拉选择框样式 */
.mic-select :deep(.el-input__wrapper) {
  padding: 0 8px;
}

.mic-select :deep(.el-input__inner) {
  height: 32px;
}

/* 优化系统音频指南样式 */
.system-audio-guide :deep(.el-alert) {
  padding: 8px 12px;
}

.system-audio-guide :deep(.el-alert__content) {
  padding: 0 8px;
}

.system-audio-guide :deep(.el-alert__title) {
  font-size: 13px;
}

/* 添加过渡动画 */
.device-controls {
  transition: all 0.3s ease;
}

/* 内联信号提示样式 */
.inline-signal-alert {
  display: flex;
  align-items: center;
  margin-left: auto;
  background-color: var(--el-color-info-light-9);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
}

.inline-signal-alert .signal-icon {
  color: var(--el-color-info);
  margin-right: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.inline-signal-alert .signal-text {
  color: var(--el-color-info-dark-2);
  margin-right: 4px;
}

.inline-signal-alert .signal-button {
  margin: 0 !important;
  padding: 1px 6px;
  height: 20px;
  font-size: 11px;
  line-height: 1;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .panel-content {
    padding: 10px;
    gap: 12px;
  }
  
  .microphone-section, .system-audio-section, .global-audio-controls {
    padding: 8px;
  }
}
</style> 