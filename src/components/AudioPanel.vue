<template>
  <div class="audio-panel">
    <div class="panel-header">
      <h3>{{ $t('audioPanel.title') }}</h3>
    </div>
    <div class="panel-content">
      <!-- 麦克风设备选择 -->
      <div class="microphone-section">
        <div class="section-title">{{ $t('audioPanel.deviceTypes.microphone') }}</div>
        <el-select 
          v-model="selectedMicrophone" 
          :placeholder="$t('audioPanel.selectMicrophone')"
          class="mic-select"
          @change="handleMicrophoneChange"
        >
          <el-option 
            v-for="mic in microphoneDevices" 
            :key="mic.id" 
            :label="mic.name" 
            :value="mic.id" 
          />
        </el-select>
        
        <!-- 麦克风电平和音量控制 -->
        <div v-if="activeMicrophone" class="device-controls">
          <div class="level-meter-container">
            <div class="level-meter">
              <div 
                class="level-meter-fill" 
                :style="{ width: `${activeMicrophone.level}%` }"
                :class="{ 
                  'level-low': activeMicrophone.level < 30, 
                  'level-medium': activeMicrophone.level >= 30 && activeMicrophone.level < 70,
                  'level-high': activeMicrophone.level >= 70 
                }"
              ></div>
            </div>
            <span class="level-value">{{ activeMicrophone.level }}%</span>
          </div>
          <div class="volume-control">
            <span class="volume-label">{{ $t('audioPanel.volume') }}</span>
            <div class="volume-slider-container">
              <i class="bi bi-volume-down"></i>
              <el-slider
                v-model="microphoneVolume"
                :min="0"
                :max="100"
                :disabled="isMuted"
                @change="setMicrophoneVolume"
              />
              <i class="bi bi-volume-up"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 系统音频设备 -->
      <div class="system-audio-section">
        <div class="section-title">{{ $t('audioPanel.deviceTypes.systemAudio') }}</div>
        
        <!-- 系统音频设备选择 -->
        <div v-if="systemAudioDevices.length > 0" class="system-audio-selection">
          <div class="device-select-container">
            <el-select 
              v-model="selectedSystemAudio" 
              :placeholder="$t('audioPanel.selectSystemAudio')"
              class="device-select"
              @change="handleSystemAudioChange"
            >
              <el-option 
                v-for="device in systemAudioDevices" 
                :key="device.id" 
                :label="device.name" 
                :value="device.id" 
              />
            </el-select>
            <el-button 
              type="primary" 
              size="small" 
              class="refresh-button"
              @click="refreshAudioDevices"
              :title="$t('audioPanel.refreshDevices')"
            >
              <i class="bi bi-arrow-clockwise"></i>
            </el-button>
          </div>
          
          <!-- 系统音频设备选择提示 -->
          <div class="device-selection-hint">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              size="small"
            >
              <template #title>
                <span class="hint-title">{{ $t('audioPanel.deviceSelectionHint') }}</span>
              </template>
              <template #default>
                <p>{{ $t('audioPanel.preferSpecificDevice') }}</p>
              </template>
            </el-alert>
          </div>
          
          <div class="device-activation">
            <span>{{ $t('audioPanel.enable') }}</span>
            <el-switch
              v-model="isSystemAudioActive"
              @change="toggleSystemAudio"
            />
          </div>
          
          <!-- 系统音频电平和音量控制 -->
          <div v-if="activeSystemAudio" class="device-controls">
            <div class="level-meter-container">
              <div class="level-meter">
                <div 
                  class="level-meter-fill" 
                  :style="{ width: `${activeSystemAudio.level}%` }"
                  :class="{ 
                    'level-low': activeSystemAudio.level < 30, 
                    'level-medium': activeSystemAudio.level >= 30 && activeSystemAudio.level < 70,
                    'level-high': activeSystemAudio.level >= 70 
                  }"
                ></div>
              </div>
              <span class="level-value">{{ activeSystemAudio.level }}%</span>
            </div>
            
            <!-- 电平检测提示 -->
            <div v-if="activeSystemAudio.level === 0" class="level-warning">
              <el-alert
                type="info"
                :closable="false"
                show-icon
                :title="$t('audioPanel.noLevelDetected')"
                size="small"
              >
                <template #default>
                  <p>{{ $t('audioPanel.tryDifferentDevice') }}</p>
                  <p class="error-hint">{{ $t('audioPanel.deviceError') }}</p>
                  <div class="device-actions">
                    <el-button 
                      type="primary" 
                      size="small" 
                      @click="refreshAudioDevices"
                    >
                      {{ $t('audioPanel.refreshDevices') }}
                    </el-button>
                  </div>
                </template>
              </el-alert>
            </div>
            
            <div class="volume-control">
              <span class="volume-label">{{ $t('audioPanel.volume') }}</span>
              <div class="volume-slider-container">
                <i class="bi bi-volume-down"></i>
                <el-slider
                  v-model="systemAudioVolume"
                  :min="0"
                  :max="100"
                  :disabled="isMuted"
                  @change="setSystemAudioVolume"
                />
                <i class="bi bi-volume-up"></i>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 系统音频检测失败提示 -->
        <div v-else class="system-audio-guide">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
          >
            <template #title>
              {{ $t('audioPanel.systemAudioNotAvailable') }}
            </template>
            <div class="guide-content">
              <template v-if="isMacOSPlatform">
                <p>{{ $t('audioPanel.macOSGuide.title') }}</p>
                <ol>
                  <li>{{ $t('audioPanel.macOSGuide.step1') }}</li>
                  <li>{{ $t('audioPanel.macOSGuide.step2') }}</li>
                  <li>{{ $t('audioPanel.macOSGuide.step3') }}</li>
                  <li>{{ $t('audioPanel.macOSGuide.step4') }}</li>
                </ol>
              </template>
              <template v-else-if="isWindowsPlatform">
                <p>{{ $t('audioPanel.windowsGuide.title') }}</p>
                <ol>
                  <li>{{ $t('audioPanel.windowsGuide.step1') }}</li>
                  <li>{{ $t('audioPanel.windowsGuide.step2') }}</li>
                  <li>{{ $t('audioPanel.windowsGuide.step3') }}</li>
                  <li>{{ $t('audioPanel.windowsGuide.step4') }}</li>
                  <li>{{ $t('audioPanel.windowsGuide.step5') }}</li>
                  <li>{{ $t('audioPanel.windowsGuide.step6') }}</li>
                </ol>
              </template>
            </div>
            <el-button 
              type="primary" 
              size="small" 
              class="refresh-button"
              @click="refreshAudioDevices"
            >
              {{ $t('audioPanel.refreshDevices') }}
            </el-button>
          </el-alert>
        </div>
      </div>
      
      <!-- 全局音频控制 -->
      <div class="global-audio-controls">
        <div class="section-title">{{ $t('audioPanel.globalControls') }}</div>
        <div class="global-volume-control">
          <span class="volume-label">{{ $t('audioPanel.masterVolume') }}</span>
          <div class="volume-slider-container">
            <i class="bi bi-volume-down"></i>
            <el-slider
              v-model="volume"
              :min="0"
              :max="100"
              :disabled="isMuted"
              @change="setVolume"
            />
            <i class="bi bi-volume-up"></i>
          </div>
        </div>
        <div class="mute-control">
          <span>{{ $t('audioPanel.mute') }}</span>
          <el-switch v-model="isMuted" @change="toggleMute" />
        </div>
      </div>
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

const { t } = useI18n();
const audioStore = useAudioStore();

// 全局音量
const volume = ref(audioStore.volume);

// 是否静音
const isMuted = ref(audioStore.isMuted);

// 当前选中的麦克风ID
const selectedMicrophone = ref('');

// 当前选中的系统音频ID
const selectedSystemAudio = ref('');

// 系统音频是否激活
const isSystemAudioActive = ref(false);

// 麦克风音量
const microphoneVolume = ref(100);

// 系统音频音量
const systemAudioVolume = ref(100);

// 平台检测
const isMacOSPlatform = computed(() => isMacOS());
const isWindowsPlatform = computed(() => isWindows());

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
  // 先停用所有麦克风
  microphoneDevices.value.forEach(mic => {
    if (mic.isActive && mic.id !== deviceId) {
      audioStore.deactivateDevice(mic.id);
    }
  });
  
  // 激活选中的麦克风
  audioStore.activateDevice(deviceId);
  
  // 更新麦克风音量
  const selectedDevice = audioStore.devices.find(device => device.id === deviceId);
  if (selectedDevice) {
    microphoneVolume.value = selectedDevice.volume;
  }
}

/**
 * 处理系统音频选择变更
 * @param deviceId - 设备ID
 */
function handleSystemAudioChange(deviceId: string) {
  // 先停用所有系统音频设备
  systemAudioDevices.value.forEach(device => {
    if (device.isActive && device.id !== deviceId) {
      audioStore.deactivateDevice(device.id);
    }
  });
  
  // 激活选中的系统音频设备
  audioStore.activateDevice(deviceId);
  
  // 更新系统音频音量
  const selectedDevice = audioStore.devices.find(device => device.id === deviceId);
  if (selectedDevice) {
    systemAudioVolume.value = selectedDevice.volume;
  }
}

/**
 * 切换系统音频设备状态
 * @param active - 是否激活
 */
function toggleSystemAudio(active: boolean) {
  if (active && selectedSystemAudio.value) {
    // 激活系统音频
    audioStore.activateDevice(selectedSystemAudio.value);
    
    // 更新系统音频音量
    const selectedDevice = audioStore.devices.find(device => device.id === selectedSystemAudio.value);
    if (selectedDevice) {
      systemAudioVolume.value = selectedDevice.volume;
    }
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
  if (activeMicrophone.value) {
    audioStore.setDeviceVolume(activeMicrophone.value.id, value);
  }
}

/**
 * 设置系统音频音量
 * @param value - 音量值
 */
function setSystemAudioVolume(value: number) {
  if (activeSystemAudio.value) {
    audioStore.setDeviceVolume(activeSystemAudio.value.id, value);
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
    selectedMicrophone.value = activeMic.id;
    microphoneVolume.value = activeMic.volume;
  } else if (microphoneDevices.value.length > 0) {
    // 如果没有激活的麦克风，默认选择第一个
    selectedMicrophone.value = microphoneDevices.value[0].id;
    microphoneVolume.value = microphoneDevices.value[0].volume;
    audioStore.activateDevice(selectedMicrophone.value);
  }
  
  // 更新系统音频
  const activeSysAudio = audioStore.activeDevices.find(
    device => device.type === AudioSourceType.SYSTEM_AUDIO
  );
  
  if (activeSysAudio) {
    selectedSystemAudio.value = activeSysAudio.id;
    systemAudioVolume.value = activeSysAudio.volume;
    isSystemAudioActive.value = true;
  } else if (systemAudioDevices.value.length > 0) {
    // 如果没有激活的系统音频，默认选择第一个但不激活
    selectedSystemAudio.value = systemAudioDevices.value[0].id;
    systemAudioVolume.value = systemAudioDevices.value[0].volume;
    isSystemAudioActive.value = false;
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
}

.microphone-section, .system-audio-section, .global-audio-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mic-select {
  width: 100%;
}

.system-audio-selection {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-select-container {
  display: flex;
  align-items: center;
  gap: 5px;
}

.device-select {
  flex: 1;
  width: auto;
}

.device-activation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
}

.audio-device-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-blank);
}

.device-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-name {
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.device-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 5px;
}

.level-meter-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-meter {
  flex: 1;
  height: 10px;
  background-color: var(--el-fill-color-darker);
  border-radius: 5px;
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
  min-width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.volume-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.volume-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.volume-slider-container {
  display: flex;
  align-items: center;
  gap: 5px;
}

.volume-slider-container i {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.volume-slider-container .el-slider {
  flex: 1;
  margin: 0;
}

.system-audio-guide {
  margin-top: 5px;
}

.guide-content {
  margin: 10px 0;
  font-size: 13px;
}

.guide-content ol {
  padding-left: 20px;
  margin: 5px 0;
}

.refresh-button {
  margin-top: 10px;
}

.global-audio-controls {
  margin-top: 10px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-light);
}

.global-volume-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mute-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
}

.level-warning {
  margin-top: 5px;
}

.error-hint {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 5px;
}

.device-actions {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.device-selection-hint {
  margin-top: 5px;
}

.hint-title {
  font-weight: bold;
  color: var(--el-text-color-primary);
}
</style> 