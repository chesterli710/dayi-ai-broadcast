<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('liveControlPanel.settingsTitle')"
    width="600px"
    destroy-on-close
  >
    <div class="settings-container">
      <!-- 推流设置区块 -->
      <div class="settings-section">
        <h4 class="section-title">{{ $t('liveControlPanel.streamSettings') }}</h4>
        <el-divider />
        
        <el-form label-position="top" :model="streamConfig" v-if="streamConfig">
          <el-form-item :label="$t('liveControlPanel.streamUrl')">
            <el-input v-model="streamConfig.streamUrl" placeholder="rtmp://..." />
          </el-form-item>
          
          <el-form-item :label="$t('liveControlPanel.streamKey')">
            <el-input v-model="streamConfig.streamSecret" placeholder="stream-key" show-password />
          </el-form-item>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.videoCodec')">
                <el-select v-model="streamConfig.codec" style="width: 100%">
                  <el-option label="H.264 (软件编码)" value="libx264" />
                  <el-option label="H.264 (NVIDIA)" value="h264_nvenc" />
                  <el-option label="H.264 (AMD)" value="h264_amf" />
                  <el-option label="H.264 (Intel)" value="h264_qsv" />
                  <el-option label="H.264 (Apple)" value="h264_videotoolbox" />
                  <el-option label="H.265" value="h265" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.videoBitrate')">
                <el-input-number 
                  v-model="streamConfig.bitrate" 
                  :min="500" 
                  :max="10000" 
                  :step="100"
                  style="width: 100%"
                >
                  <template #suffix>Kbps</template>
                </el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.resolution')">
                <el-select v-model="streamConfig.resolution" style="width: 100%">
                  <el-option label="1920x1080 (FHD)" value="1920x1080" />
                  <el-option label="1280x720 (HD)" value="1280x720" />
                  <el-option label="854x480 (SD)" value="854x480" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.fps')">
                <el-select v-model="streamConfig.fps" style="width: 100%">
                  <el-option label="30 fps" :value="30" />
                  <el-option label="50 fps" :value="50" />
                  <el-option label="60 fps" :value="60" />
                  <el-option label="24 fps" :value="24" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item :label="$t('liveControlPanel.preset')">
            <el-radio-group v-model="streamConfig.preset">
              <el-radio :value="'performance'">{{ $t('liveControlPanel.highQuality') }}</el-radio>
              <el-radio :value="'zerolatency'">{{ $t('liveControlPanel.lowLatency') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <el-empty v-else :description="$t('liveControlPanel.noStreamConfig')" />
      </div>
      
      <!-- 音频设置区块 -->
      <div class="settings-section">
        <h4 class="section-title">{{ $t('liveControlPanel.audioSettings') }}</h4>
        <el-divider />
        
        <el-form label-position="top" :model="localAudioConfig">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.audioCodec')">
                <el-select v-model="localAudioConfig.codec" style="width: 100%">
                  <el-option 
                    v-for="codec in audioCodecOptions" 
                    :key="codec.value" 
                    :label="codec.label" 
                    :value="codec.value" 
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.audioBitrate')">
                <el-input-number 
                  v-model="localAudioConfig.bitrate" 
                  :min="64" 
                  :max="320" 
                  :step="16"
                  style="width: 100%"
                >
                  <template #suffix>Kbps</template>
                </el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.sampleRate')">
                <el-select v-model="localAudioConfig.sampleRate" style="width: 100%">
                  <el-option 
                    v-for="rate in sampleRateOptions" 
                    :key="rate.value" 
                    :label="rate.label" 
                    :value="rate.value" 
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('liveControlPanel.channels')">
                <el-select v-model="localAudioConfig.channels" style="width: 100%">
                  <el-option :label="$t('liveControlPanel.mono')" :value="1" />
                  <el-option :label="$t('liveControlPanel.stereo')" :value="2" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSave">{{ $t('common.save') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 直播设置弹窗组件
 * 用于配置直播推流和音频设置
 */
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { AudioCodecType, AudioSampleRate } from '../types/audio';
import type { StreamConfig } from '../types/broadcast';

const { t } = useI18n();

// 定义组件属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  streamConfig: {
    type: Object as () => StreamConfig | null,
    default: null
  },
  audioConfig: {
    type: Object,
    required: true
  }
});

// 定义组件事件
const emit = defineEmits(['update:visible', 'save']);

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// 检查是否为Apple硬件
const isAppleHardware = computed(() => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('macintosh') && (
    userAgent.includes('apple') || 
    userAgent.includes('mac os x') || 
    userAgent.includes('macos')
  );
});

// 组件挂载时设置默认编码器
onMounted(() => {
  // 如果是Apple硬件且streamConfig存在，设置默认编码器为h264_videotoolbox
  if (isAppleHardware.value && props.streamConfig && !props.streamConfig.codec) {
    console.log('[LiveSettingsModal.vue 直播设置弹窗] 检测到Apple硬件，设置默认编码器为h264_videotoolbox');
    props.streamConfig.codec = 'h264_videotoolbox';
  }
});

// 监听对话框打开
watch(() => props.visible, (newVisible) => {
  if (newVisible && isAppleHardware.value && props.streamConfig) {
    // 当对话框打开时，检查编码器设置
    if (props.streamConfig.codec === 'h264_nvenc' || !props.streamConfig.codec) {
      console.log('[LiveSettingsModal.vue 直播设置弹窗] 检测到Apple硬件但编码器设置不正确，修正为h264_videotoolbox');
      props.streamConfig.codec = 'h264_videotoolbox';
    }
  }
});

// 本地音频配置（避免直接修改父组件的状态）
const localAudioConfig = reactive({
  codec: props.audioConfig.codec,
  sampleRate: props.audioConfig.sampleRate,
  bitrate: Number(props.audioConfig.bitrate) / 1000,
  channels: props.audioConfig.channels
});

// 监听父组件传入的音频配置变化
watch(() => props.audioConfig, (newConfig) => {
  localAudioConfig.codec = newConfig.codec;
  localAudioConfig.sampleRate = newConfig.sampleRate;
  localAudioConfig.bitrate = Number(newConfig.bitrate) / 1000;
  localAudioConfig.channels = newConfig.channels;
}, { deep: true });

// 音频编解码器选项
const audioCodecOptions = [
  { label: 'AAC', value: AudioCodecType.AAC },
  { label: 'MP3', value: AudioCodecType.MP3 },
  { label: 'Opus', value: AudioCodecType.OPUS }
];

// 采样率选项
const sampleRateOptions = [
  { label: '44.1 kHz', value: AudioSampleRate.RATE_44100 },
  { label: '48 kHz', value: AudioSampleRate.RATE_48000 }
];

/**
 * 关闭对话框
 */
function closeDialog() {
  dialogVisible.value = false;
}

/**
 * 保存设置
 */
function handleSave() {
  // 将本地音频配置同步回父组件
  Object.assign(props.audioConfig, {
    codec: localAudioConfig.codec,
    sampleRate: localAudioConfig.sampleRate,
    bitrate: Number(localAudioConfig.bitrate) * 1000,
    channels: localAudioConfig.channels
  });
  
  // 触发保存事件
  emit('save');
}
</script>

<style scoped>
.settings-container {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 10px;
}

.settings-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin: 0 0 10px 0;
}
</style> 