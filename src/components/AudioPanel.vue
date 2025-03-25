<template>
  <div class="audio-panel">
    <div class="panel-header">
      <h3>{{ $t('audio.title') }}</h3>
    </div>
    <div class="panel-content">
      <!-- 麦克风设备选择 -->
      <div class="device-section">
        <div class="section-header">
          <span>{{ $t('audio.microphone') }}</span>
          <el-button
            size="small"
            text
            @click="refreshDevices"
            :title="$t('audio.refreshDevices')"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        <el-select
          v-model="selectedMicrophoneId"
          :placeholder="$t('audio.selectMicrophone')"
          class="device-select"
          @change="onMicrophoneChange"
        >
          <el-option
            v-for="device in microphoneDevices"
            :key="device.deviceId"
            :label="device.label"
            :value="device.deviceId"
          >
            <div class="device-option">
              <el-icon><Microphone /></el-icon>
              <span>{{ device.label }}</span>
              <el-tag size="small" v-if="device.isDefault" type="success">
                {{ $t('audio.default') }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
        
        <!-- 麦克风控制 -->
        <div class="audio-controls" v-if="selectedMicrophoneId">
          <div class="level-meter-container">
            <div class="level-meter" :style="{ width: `${microphoneLevel}%` }"></div>
          </div>
          <div class="control-buttons">
            <el-slider 
              v-model="microphoneVolume" 
              :min="0" 
              :max="100" 
              :show-tooltip="false"
              @change="onMicrophoneVolumeChange"
            />
            <el-button
              :type="microphoneMuted ? 'danger' : 'primary'"
              circle
              @click="toggleMicMuted"
              :title="microphoneMuted ? $t('audio.unmute') : $t('audio.mute')"
            >
              <el-icon v-if="microphoneMuted"><Mute /></el-icon>
              <el-icon v-else><Microphone /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 系统音频捕获 -->
      <div class="device-section">
        <div class="section-header">
          <span>{{ $t('audio.systemAudio') }}</span>
          <el-tag v-if="systemAudioCaptureMethod !== 'none' && systemAudioEnabled" size="small" type="success">
            {{ getSystemAudioCaptureTypeLabel() }}
          </el-tag>
        </div>
        
        <!-- 系统音频状态信息 -->
        <div v-if="!canCaptureSystemAudio" class="status-info warning">
          <el-icon><Warning /></el-icon>
          <span>{{ $t('audio.systemAudioNotSupported') }}</span>
        </div>
        
        <!-- MacOS BlackHole提示 -->
        <div v-else-if="isMacOS && systemAudioCaptureMethod === 'blackhole' && !isBlackholeInstalled" class="status-info warning">
          <el-icon><Warning /></el-icon>
          <span>{{ $t('audio.systemAudioNotAvailable') }}</span>
          <el-link 
            href="https://existential.audio/blackhole/" 
            target="_blank" 
            type="primary"
          >
            {{ $t('audio.showSetupGuide') }}
          </el-link>
        </div>
        
        <!-- 系统音频捕获控制 -->
        <div class="audio-controls" v-if="canCaptureSystemAudio">
          <div class="capture-buttons">
            <el-button 
              v-if="!systemAudioEnabled" 
              type="primary" 
              @click="startSystemAudio"
            >
              {{ $t('audio.enableSystemAudio') }}
            </el-button>
            <el-button 
              v-else 
              type="danger" 
              @click="stopSystemAudio"
            >
              {{ $t('audio.stopCapture') }}
            </el-button>
          </div>
          
          <div class="level-meter-container" v-if="systemAudioEnabled">
            <div class="level-meter" :style="{ width: `${systemAudioLevel}%` }"></div>
          </div>
          
          <div class="control-buttons" v-if="systemAudioEnabled">
            <el-slider 
              v-model="systemAudioVolume" 
              :min="0" 
              :max="100" 
              :show-tooltip="false"
              @change="onSystemAudioVolumeChange"
            />
            <el-button
              :type="systemAudioMuted ? 'danger' : 'primary'"
              circle
              @click="toggleSystemMuted"
              :title="systemAudioMuted ? $t('audio.unmute') : $t('audio.mute')"
            >
              <el-icon v-if="systemAudioMuted"><Mute /></el-icon>
              <el-icon v-else><Bell /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAudioStore } from '../stores/audioStore';
import { useI18n } from 'vue-i18n';
import {
  Microphone,
  Mute,
  Refresh,
  Bell,
  View,
  Warning,
  VideoCamera
} from '@element-plus/icons-vue';

// 初始化音频存储
const audioStore = useAudioStore();
// 初始化国际化
const { t } = useI18n();

// 操作系统检测
const isWindows = computed(() => navigator.platform.toLowerCase().includes('win'));
const isMacOS = computed(() => navigator.platform.toLowerCase().includes('mac'));

// 麦克风设备列表
const microphoneDevices = computed(() => audioStore.microphoneDevices);

// 捕获支持状态
const isBlackholeInstalled = computed(() => audioStore.captureSupport.isBlackholeInstalled);
const isStereoMixEnabled = computed(() => audioStore.captureSupport.isStereoMixEnabled);

// 是否可以捕获系统音频
const canCaptureSystemAudio = computed(() => audioStore.canCaptureSystemAudio);

// 当前可用的系统音频捕获方法
const systemAudioCaptureMethod = computed(() => audioStore.availableCaptureMethod);

// 选中的麦克风设备
const selectedMicrophoneId = computed({
  get: () => audioStore.audioSettings.selectedMicrophoneId,
  set: (value) => { audioStore.audioSettings.selectedMicrophoneId = value; }
});

// 麦克风音量
const microphoneVolume = computed({
  get: () => audioStore.audioSettings.microphoneVolume,
  set: (value) => { audioStore.audioSettings.microphoneVolume = value; }
});

// 麦克风静音状态
const microphoneMuted = computed({
  get: () => audioStore.audioSettings.microphoneMuted,
  set: (value) => { audioStore.audioSettings.microphoneMuted = value; }
});

// 系统音频音量
const systemAudioVolume = computed({
  get: () => audioStore.audioSettings.systemAudioVolume,
  set: (value) => { audioStore.audioSettings.systemAudioVolume = value; }
});

// 系统音频静音状态
const systemAudioMuted = computed({
  get: () => audioStore.audioSettings.systemAudioMuted,
  set: (value) => { audioStore.audioSettings.systemAudioMuted = value; }
});

// 麦克风电平
const microphoneLevel = computed(() => audioStore.microphoneState.level);

// 系统音频电平
const systemAudioLevel = computed(() => audioStore.systemAudioState.level);

// 系统音频是否已启用
const systemAudioEnabled = computed(() => audioStore.systemAudioState.enabled);

/**
 * 刷新设备列表
 */
const refreshDevices = async () => {
  await audioStore.refreshDevices();
};

/**
 * 麦克风设备变更处理
 */
const onMicrophoneChange = (deviceId: string | null) => {
  audioStore.selectMicrophoneDevice(deviceId);
};

/**
 * 麦克风音量变更处理
 */
const onMicrophoneVolumeChange = (volume: number) => {
  audioStore.setMicVolume(volume);
};

/**
 * 切换麦克风静音状态
 */
const toggleMicMuted = () => {
  audioStore.toggleMicMuted();
};

/**
 * 开始系统音频捕获
 */
const startSystemAudio = async () => {
  await audioStore.startSystemAudio();
};

/**
 * 停止系统音频捕获
 */
const stopSystemAudio = () => {
  audioStore.stopSystemAudio();
};

/**
 * 系统音频音量变更处理
 */
const onSystemAudioVolumeChange = (volume: number) => {
  audioStore.setSystemVolume(volume);
};

/**
 * 切换系统音频静音状态
 */
const toggleSystemMuted = () => {
  audioStore.toggleSystemMuted();
};

/**
 * 获取当前系统音频捕获类型的显示标签
 */
const getSystemAudioCaptureTypeLabel = () => {
  const method = audioStore.systemAudioState.captureMethod;
  
  switch (method) {
    case 'blackhole':
      return 'BlackHole';
    case 'desktop-capturer':
      return isWindows.value ? t('audio.desktopCapture') : 'Desktop Capturer';
    default:
      return t('audio.notCapturing');
  }
};

// 组件挂载时初始化
onMounted(async () => {
  await audioStore.initialize();
  
  // 如果有默认麦克风，自动打开它
  if (selectedMicrophoneId.value) {
    audioStore.selectMicrophoneDevice(selectedMicrophoneId.value);
  }

  // 自动启用系统音频捕获
  if (canCaptureSystemAudio.value && !systemAudioEnabled.value) {
    console.log('[AudioPanel.vue] 自动启用系统音频捕获');
    startSystemAudio();
  }
});

// 组件卸载时清理资源
onUnmounted(() => {
  audioStore.cleanup();
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

.device-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-blank);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.device-select {
  width: 100%;
}

.device-select-label {
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.device-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-option span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-controls {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.capture-buttons {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-meter-container {
  height: 6px;
  background-color: var(--el-fill-color);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.level-meter {
  height: 100%;
  background-color: var(--el-color-success);
  border-radius: 3px;
  transition: width 0.1s ease;
}

.control-buttons .el-slider {
  flex: 1;
  margin: 0;
  margin-right: 10px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.status-info.warning {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
}

.status-info .el-link {
  margin-left: auto;
}
</style> 

