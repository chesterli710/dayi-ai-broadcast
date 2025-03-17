<template>
  <div class="live-control-panel">
    <div class="panel-header">
      <h3>{{ $t('liveControlPanel.title') }}</h3>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="openSettingsModal">
          <el-icon><Setting /></el-icon>
          <span>{{ $t('liveControlPanel.settings') }}</span>
        </el-button>
      </div>
    </div>
    <div class="panel-content">
      <!-- 直播控制面板内容将在这里实现 -->
      <el-empty :description="$t('liveControlPanel.emptyText')" />
    </div>

    <!-- 设置弹窗 -->
    <LiveSettingsModal
      v-model:visible="settingsModalVisible"
      :stream-config="streamConfig"
      :audio-config="audioConfig"
      @save="saveSettings"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 直播控制面板组件
 * 用于控制直播相关功能
 */
import { ref, computed, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';
import { useAudioStore } from '../stores/audioStore';
import { ElMessage } from 'element-plus';
import { Setting } from '@element-plus/icons-vue';
import { AudioCodecType, AudioSampleRate } from '../types/audio';
import LiveSettingsModal from './LiveSettingsModal.vue';

const { t } = useI18n();
const planStore = usePlanStore();
const audioStore = useAudioStore();

// 当前直播状态
const isStreaming = computed(() => planStore.isStreaming);

// 设置弹窗可见性
const settingsModalVisible = ref(false);

// 推流配置
const streamConfig = computed(() => {
  if (!planStore.currentBranch || !planStore.currentBranch.streamConfig) {
    return null;
  }
  return planStore.currentBranch.streamConfig;
});

// 在组件挂载时输出当前配置
onMounted(() => {
  if (streamConfig.value) {
    console.log('[LiveControlPanel.vue 直播控制面板] 初始推流配置:', {
      codec: streamConfig.value.codec,
      bitrate: streamConfig.value.bitrate,
      resolution: streamConfig.value.resolution,
      fps: streamConfig.value.fps,
      preset: streamConfig.value.preset
    });
  }
});

// 音频配置
const audioConfig = reactive({
  codec: audioStore.config.codec,
  sampleRate: audioStore.config.sampleRate,
  bitrate: Number(audioStore.config.bitrate),
  channels: audioStore.config.channels
});

/**
 * 打开设置弹窗
 */
function openSettingsModal() {
  // 同步当前音频配置
  audioConfig.codec = audioStore.config.codec;
  audioConfig.sampleRate = audioStore.config.sampleRate;
  audioConfig.bitrate = Number(audioStore.config.bitrate);
  audioConfig.channels = audioStore.config.channels;
  
  // 输出当前推流配置信息
  if (streamConfig.value) {
    console.log('[LiveControlPanel.vue 直播控制面板] 当前推流配置:', {
      codec: streamConfig.value.codec,
      bitrate: streamConfig.value.bitrate,
      resolution: streamConfig.value.resolution,
      fps: streamConfig.value.fps,
      preset: streamConfig.value.preset
    });
  }
  
  settingsModalVisible.value = true;
}

/**
 * 保存设置
 */
function saveSettings() {
  try {
    // 保存音频配置
    audioStore.updateConfig({
      codec: audioConfig.codec,
      sampleRate: audioConfig.sampleRate,
      bitrate: Number(audioConfig.bitrate),
      channels: audioConfig.channels
    });
    
    // 保存推流配置
    if (streamConfig.value && planStore.currentBranch) {
      // 确保数值类型正确
      if (streamConfig.value.bitrate) {
        streamConfig.value.bitrate = Number(streamConfig.value.bitrate);
      }
      if (streamConfig.value.fps) {
        streamConfig.value.fps = Number(streamConfig.value.fps);
      }
      
      // 通知用户保存成功
      ElMessage.success(t('liveControlPanel.settingsSaved'));
    }

    // 关闭弹窗
    settingsModalVisible.value = false;
  } catch (error) {
    console.error('[LiveControlPanel.vue 直播控制面板] 保存设置时出错:', error);
    ElMessage.error(t('liveControlPanel.settingsSaveError'));
  }
}

/**
 * 开始直播
 */
function startStreaming() {
  planStore.startStreaming();
  // 这里将来会添加实际的直播控制逻辑
}

/**
 * 停止直播
 */
function stopStreaming() {
  planStore.stopStreaming();
  // 这里将来会添加实际的直播控制逻辑
}
</script>

<style scoped>
.live-control-panel {
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
  align-items: center;
  justify-content: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style> 