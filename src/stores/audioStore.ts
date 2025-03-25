/**
 * 音频状态管理
 * 提供音频设备管理和状态共享的Pinia Store
 */

import { defineStore } from 'pinia';
import { ref, reactive, computed, watch, onUnmounted } from 'vue';
import {
  type MicrophoneDeviceInfo,
  type AudioOutputDeviceInfo,
  type AudioSettings,
  AudioCodecType,
  AudioSampleRate,
  AudioBitrate
} from '../types/audio';
import {
  initAudioDeviceManager,
  refreshMicrophoneDevices,
  getMicrophoneDevices,
  getAudioOutputDevices,
  getMicrophoneState,
  getSystemAudioState,
  getCaptureSupport,
  openMicrophone,
  closeMicrophone,
  setMicrophoneMuted,
  setMicrophoneVolume,
  openSystemAudio,
  closeSystemAudio,
  setSystemAudioMuted,
  setSystemAudioVolume,
  cleanupAudioDeviceManager
} from '../utils/audioDeviceManager';

/**
 * 音频状态Store
 */
export const useAudioStore = defineStore('audio', () => {
  // 判断当前操作系统是否为Windows
  const isWindows = computed(() => {
    return navigator.platform.toLowerCase().includes('win');
  });

  // 是否已初始化
  const initialized = ref(false);
  
  // 麦克风设备列表
  const microphoneDevices = ref<MicrophoneDeviceInfo[]>([]);
  
  // 音频输出设备列表
  const audioOutputDevices = ref<AudioOutputDeviceInfo[]>([]);
  
  // 捕获支持状态
  const captureSupport = reactive({
    isBlackholeInstalled: false,
    isStereoMixEnabled: false
  });
  
  // 麦克风状态
  const microphoneState = reactive({
    deviceId: '',
    volume: 100,
    muted: false,
    level: 0
  });
  
  // 系统音频状态
  const systemAudioState = reactive({
    enabled: false,
    volume: 100,
    muted: false,
    level: 0,
    captureMethod: 'none' as 'blackhole' | 'desktop-capturer' | 'stereo-mix' | 'none'
  });
  
  // 当前音频设置
  const audioSettings = reactive<AudioSettings>({
    selectedMicrophoneId: null,
    selectedOutputDeviceId: null,
    microphoneVolume: 100,
    microphoneMuted: false,
    systemAudioVolume: 100,
    systemAudioMuted: false
  });
  
  // 音频编码配置
  const config = reactive({
    codec: AudioCodecType.AAC,
    sampleRate: AudioSampleRate.RATE_44100,
    bitrate: AudioBitrate.BITRATE_128,
    channels: 2
  });
  
  /**
   * 初始化音频管理系统
   */
  async function initialize() {
    if (initialized.value) return;
    
    try {
      // 初始化音频设备管理器
      await initAudioDeviceManager();
      
      // 获取设备列表
      microphoneDevices.value = getMicrophoneDevices();
      audioOutputDevices.value = getAudioOutputDevices();
      
      // 获取捕获支持状况
      const support = getCaptureSupport();
      captureSupport.isBlackholeInstalled = support.isBlackholeInstalled;
      captureSupport.isStereoMixEnabled = support.isStereoMixEnabled;
      
      // 尝试选择默认麦克风
      if (microphoneDevices.value.length > 0) {
        const defaultDevice = microphoneDevices.value.find(device => device.isDefault);
        if (defaultDevice) {
          audioSettings.selectedMicrophoneId = defaultDevice.deviceId;
        } else {
          audioSettings.selectedMicrophoneId = microphoneDevices.value[0].deviceId;
        }
      }
      
      // 尝试选择默认输出设备
      if (audioOutputDevices.value.length > 0) {
        const defaultOutputDevice = audioOutputDevices.value.find(device => device.isDefault);
        if (defaultOutputDevice) {
          audioSettings.selectedOutputDeviceId = defaultOutputDevice.id;
        } else {
          audioSettings.selectedOutputDeviceId = audioOutputDevices.value[0].id;
        }
      }
      
      // 设置监听器，同步状态
      setInterval(() => {
        const mic = getMicrophoneState();
        const sys = getSystemAudioState();
        
        // 更新麦克风状态
        microphoneState.deviceId = mic.deviceId;
        microphoneState.volume = mic.volume;
        microphoneState.muted = mic.muted;
        microphoneState.level = mic.level;
        
        // 更新系统音频状态
        systemAudioState.enabled = sys.enabled;
        systemAudioState.volume = sys.volume;
        systemAudioState.muted = sys.muted;
        systemAudioState.level = sys.level;
        systemAudioState.captureMethod = sys.captureMethod;
      }, 100);
      
      initialized.value = true;
      console.log('[audioStore.ts] 音频系统初始化完成');
    } catch (error) {
      console.error('[audioStore.ts] 音频系统初始化失败', error);
    }
  }
  
  /**
   * 刷新麦克风设备列表
   */
  async function refreshDevices() {
    try {
      // 使用导出的刷新设备函数，将同时刷新麦克风和音频输出设备列表
      await refreshMicrophoneDevices();
      
      // 更新Store中的设备列表
      microphoneDevices.value = getMicrophoneDevices();
      audioOutputDevices.value = getAudioOutputDevices();
      
      console.log('[audioStore.ts] 已刷新所有音频设备列表');
      
      // 如果当前选中设备不在列表中，尝试选择新的默认设备
      if (audioSettings.selectedMicrophoneId) {
        const deviceExists = microphoneDevices.value.some(
          device => device.deviceId === audioSettings.selectedMicrophoneId
        );
        
        if (!deviceExists) {
          const defaultDevice = microphoneDevices.value.find(device => device.isDefault);
          if (defaultDevice) {
            audioSettings.selectedMicrophoneId = defaultDevice.deviceId;
          } else if (microphoneDevices.value.length > 0) {
            audioSettings.selectedMicrophoneId = microphoneDevices.value[0].deviceId;
          } else {
            audioSettings.selectedMicrophoneId = null;
          }
        }
      }
      
      // 如果当前选中的输出设备不在列表中，尝试选择新的默认设备
      if (audioSettings.selectedOutputDeviceId) {
        const outputDeviceExists = audioOutputDevices.value.some(
          device => device.id === audioSettings.selectedOutputDeviceId
        );
        
        if (!outputDeviceExists) {
          const defaultOutputDevice = audioOutputDevices.value.find(device => device.isDefault);
          if (defaultOutputDevice) {
            audioSettings.selectedOutputDeviceId = defaultOutputDevice.id;
          } else if (audioOutputDevices.value.length > 0) {
            audioSettings.selectedOutputDeviceId = audioOutputDevices.value[0].id;
          } else {
            audioSettings.selectedOutputDeviceId = null;
          }
        }
      }
    } catch (error) {
      console.error('[audioStore.ts] 刷新设备列表失败', error);
    }
  }
  
  /**
   * 选择麦克风设备
   * @param deviceId 麦克风设备ID
   */
  async function selectMicrophoneDevice(deviceId: string | null) {
    audioSettings.selectedMicrophoneId = deviceId;
    
    if (deviceId) {
      try {
        const success = await openMicrophone(deviceId);
        if (success) {
          // 设置麦克风音量和静音状态
          setMicrophoneMuted(audioSettings.microphoneMuted);
          setMicrophoneVolume(audioSettings.microphoneVolume);
          console.log('[audioStore.ts] 已选择麦克风设备', deviceId);
        } else {
          console.error('[audioStore.ts] 打开麦克风设备失败', deviceId);
        }
      } catch (error) {
        console.error('[audioStore.ts] 选择麦克风设备异常', error);
      }
    } else {
      closeMicrophone();
      console.log('[audioStore.ts] 已关闭麦克风');
    }
  }
  
  /**
   * 选择音频输出设备（用于系统音频捕获）
   * @param deviceId 输出设备ID
   */
  async function selectAudioOutputDevice(deviceId: string | null) {
    audioSettings.selectedOutputDeviceId = deviceId;
    console.log('[audioStore.ts] 已选择音频输出设备', deviceId);
  }
  
  /**
   * 设置麦克风音量
   * @param volume 音量值 (0-100)
   */
  function setMicVolume(volume: number) {
    audioSettings.microphoneVolume = Math.max(0, Math.min(100, volume));
    setMicrophoneVolume(audioSettings.microphoneVolume);
    console.log('[audioStore.ts] 设置麦克风音量', volume);
  }
  
  /**
   * 设置麦克风静音状态
   * @param muted 是否静音
   */
  function setMicMuted(muted: boolean) {
    audioSettings.microphoneMuted = muted;
    setMicrophoneMuted(muted);
    console.log('[audioStore.ts] 设置麦克风静音状态', muted);
  }
  
  /**
   * 切换麦克风静音状态
   */
  function toggleMicMuted() {
    setMicMuted(!audioSettings.microphoneMuted);
  }
  
  /**
   * 打开系统音频捕获
   */
  async function startSystemAudio() {
    try {
      const success = await openSystemAudio();
      
      if (success) {
        // 设置系统音频音量和静音状态
        setSystemAudioMuted(audioSettings.systemAudioMuted);
        setSystemAudioVolume(audioSettings.systemAudioVolume);
        console.log('[audioStore.ts] 成功启动系统音频捕获');
      } else {
        console.error('[audioStore.ts] 启动系统音频捕获失败');
      }
    } catch (error) {
      console.error('[audioStore.ts] 启动系统音频捕获异常', error);
    }
  }
  
  /**
   * 关闭系统音频捕获
   */
  function stopSystemAudio() {
    closeSystemAudio();
    console.log('[audioStore.ts] 已关闭系统音频捕获');
  }
  
  /**
   * 设置系统音频音量
   * @param volume 音量值 (0-100)
   */
  function setSystemVolume(volume: number) {
    audioSettings.systemAudioVolume = Math.max(0, Math.min(100, volume));
    setSystemAudioVolume(audioSettings.systemAudioVolume);
    console.log('[audioStore.ts] 设置系统音频音量', volume);
  }
  
  /**
   * 设置系统音频静音状态
   * @param muted 是否静音
   */
  function setSystemMuted(muted: boolean) {
    audioSettings.systemAudioMuted = muted;
    setSystemAudioMuted(muted);
    console.log('[audioStore.ts] 设置系统音频静音状态', muted);
  }
  
  /**
   * 切换系统音频静音状态
   */
  function toggleSystemMuted() {
    setSystemMuted(!audioSettings.systemAudioMuted);
  }
  
  /**
   * 更新音频编码配置
   * @param newConfig 新的音频编码配置
   */
  function updateAudioConfig(newConfig: {
    codec?: AudioCodecType;
    sampleRate?: AudioSampleRate;
    bitrate?: AudioBitrate;
    channels?: number;
  }) {
    if (newConfig.codec !== undefined) {
      config.codec = newConfig.codec;
    }
    
    if (newConfig.sampleRate !== undefined) {
      config.sampleRate = newConfig.sampleRate;
    }
    
    if (newConfig.bitrate !== undefined) {
      config.bitrate = newConfig.bitrate;
    }
    
    if (newConfig.channels !== undefined) {
      config.channels = newConfig.channels;
    }
    
    console.log('[audioStore.ts] 更新音频配置', config);
  }
  
  /**
   * 清理资源
   */
  function cleanup() {
    cleanupAudioDeviceManager();
    console.log('[audioStore.ts] 音频系统资源已清理');
  }
  
  /**
   * 判断是否支持捕获系统音频
   */
  const canCaptureSystemAudio = computed(() => {
    // 在Electron环境下，通过以下任一方式可以捕获系统音频：
    // 1. macOS下安装了BlackHole插件
    // 2. 使用desktopCapturer API (兼容所有平台)
    return (
      captureSupport.isBlackholeInstalled ||
      window.electronAPI !== undefined // 在Electron环境中可以使用desktopCapturer
    );
  });
  
  /**
   * 判断当前可用的捕获方式
   */
  const availableCaptureMethod = computed(() => {
    // 所有平台都优先使用desktop-capturer
    if (window.electronAPI !== undefined) {
      return 'desktop-capturer';
    } else if (captureSupport.isBlackholeInstalled) {
      return 'blackhole';
    } else {
      return 'none';
    }
  });
  
  return {
    // 状态
    initialized,
    microphoneDevices,
    audioOutputDevices,
    captureSupport,
    microphoneState,
    systemAudioState,
    audioSettings,
    config,
    canCaptureSystemAudio,
    availableCaptureMethod,
    
    // 方法
    initialize,
    refreshDevices,
    selectMicrophoneDevice,
    selectAudioOutputDevice,
    setMicVolume,
    setMicMuted,
    toggleMicMuted,
    startSystemAudio,
    stopSystemAudio,
    setSystemVolume,
    setSystemMuted,
    toggleSystemMuted,
    updateAudioConfig,
    cleanup
  };
});
