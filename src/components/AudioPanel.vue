<template>
  <div class="audio-panel">
    <div class="panel-header">
      <h3>{{ $t('audioPanel.title') }}</h3>
    </div>
    <div class="panel-content">
      <!-- 音频设备列表 -->
      <div v-if="audioStore.devices.length > 0" class="audio-devices">
        <div v-for="device in audioStore.devices" :key="device.id" class="audio-device-item">
          <div class="device-info">
            <span class="device-name">{{ device.name }}</span>
            <span class="device-type">{{ getDeviceTypeLabel(device.type) }}</span>
          </div>
          <div class="device-controls">
            <el-switch
              v-model="device.isActive"
              @change="toggleDevice(device.id)"
            />
          </div>
        </div>
      </div>
      <el-empty v-else :description="$t('audioPanel.noDevices')" />
      
      <!-- 音频控制 -->
      <div class="audio-controls">
        <div class="volume-control">
          <span>{{ $t('audioPanel.volume') }}</span>
          <el-slider
            v-model="volume"
            :min="0"
            :max="100"
            :disabled="isMuted"
            @change="setVolume"
          />
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
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAudioStore } from '../stores/audioStore';
import { AudioSourceType } from '../types/audio';

const { t } = useI18n();
const audioStore = useAudioStore();

// 音量
const volume = ref(audioStore.volume);

// 是否静音
const isMuted = ref(audioStore.isMuted);

/**
 * 获取设备类型标签
 * @param type - 设备类型
 * @returns 设备类型标签
 */
function getDeviceTypeLabel(type: AudioSourceType): string {
  switch (type) {
    case AudioSourceType.MICROPHONE:
      return t('audioPanel.deviceTypes.microphone');
    case AudioSourceType.SYSTEM_AUDIO:
      return t('audioPanel.deviceTypes.systemAudio');
    default:
      return t('audioPanel.deviceTypes.unknown');
  }
}

/**
 * 切换设备状态
 * @param deviceId - 设备ID
 */
function toggleDevice(deviceId: string) {
  audioStore.toggleDevice(deviceId);
}

/**
 * 设置音量
 * @param value - 音量值
 */
function setVolume(value: number) {
  audioStore.setVolume(value);
}

/**
 * 切换静音状态
 */
function toggleMute() {
  audioStore.toggleMute();
}

onMounted(async () => {
  // 初始化音频设备
  if (audioStore.devices.length === 0) {
    await audioStore.initAudioDevices();
  }
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
  gap: 15px;
}

.audio-devices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audio-device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-blank);
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.device-name {
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.device-type {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.audio-controls {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-light);
}

.volume-control,
.mute-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 