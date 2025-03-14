/**
 * 音频存储
 * 管理应用的音频设备和配置状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AudioDevice, AudioConfig, SystemAudioStatus } from '../types/audio'
import { AudioSourceType, AudioCodecType, AudioSampleRate, AudioBitrate } from '../types/audio'
import audioDeviceManager from '../utils/audioDeviceManager'

/**
 * 音频存储
 * 管理应用的音频设备和配置状态
 */
export const useAudioStore = defineStore('audio', () => {
  /**
   * 可用的音频设备列表
   */
  const devices = ref<AudioDevice[]>([])
  
  /**
   * 当前激活的音频设备
   */
  const activeDevices = ref<AudioDevice[]>([])
  
  /**
   * 音频配置
   */
  const config = ref<AudioConfig>({
    codec: AudioCodecType.AAC,
    sampleRate: AudioSampleRate.RATE_48000,
    bitrate: AudioBitrate.BITRATE_192K,
    channels: 2
  })
  
  /**
   * 系统音频状态
   */
  const systemAudioStatus = ref<SystemAudioStatus>({
    isAvailable: false
  })
  
  /**
   * 是否静音
   */
  const isMuted = ref(false)
  
  /**
   * 音量 (0-100)
   */
  const volume = ref(100)
  
  /**
   * 初始化音频设备
   */
  async function initAudioDevices() {
    try {
      // 获取所有音频设备
      const allDevices = await audioDeviceManager.getAllAudioDevices()
      devices.value = allDevices
      
      // 检查系统音频状态
      systemAudioStatus.value = await audioDeviceManager.checkSystemAudioStatus()
      
      // 默认激活麦克风和系统音频（如果可用）
      const defaultDevices = allDevices.filter(device => 
        device.type === AudioSourceType.MICROPHONE && device.isDefault ||
        device.type === AudioSourceType.SYSTEM_AUDIO
      )
      
      // 如果没有默认设备，尝试使用第一个麦克风
      if (defaultDevices.length === 0) {
        const firstMic = allDevices.find(device => device.type === AudioSourceType.MICROPHONE)
        if (firstMic) {
          defaultDevices.push(firstMic)
        }
      }
      
      // 设置激活设备
      activeDevices.value = defaultDevices.map(device => ({
        ...device,
        isActive: true
      }))
      
      // 如果系统音频不可用，显示相应的指导
      if (!systemAudioStatus.value.isAvailable) {
        if (systemAudioStatus.value.isBlackholeInstalled === false) {
          audioDeviceManager.showBlackholeInstallGuide()
        } else if (systemAudioStatus.value.isStereoMixEnabled === false) {
          audioDeviceManager.showStereoMixEnableGuide()
        }
      }
      
      return true
    } catch (error) {
      console.error('初始化音频设备失败:', error)
      return false
    }
  }
  
  /**
   * 激活音频设备
   * @param deviceId - 设备ID
   */
  function activateDevice(deviceId: string) {
    const device = devices.value.find(d => d.id === deviceId)
    if (!device) return
    
    // 如果设备已经激活，则不做任何操作
    if (activeDevices.value.some(d => d.id === deviceId)) return
    
    // 添加到激活设备列表
    activeDevices.value.push({
      ...device,
      isActive: true
    })
  }
  
  /**
   * 停用音频设备
   * @param deviceId - 设备ID
   */
  function deactivateDevice(deviceId: string) {
    activeDevices.value = activeDevices.value.filter(d => d.id !== deviceId)
  }
  
  /**
   * 切换设备激活状态
   * @param deviceId - 设备ID
   */
  function toggleDevice(deviceId: string) {
    if (activeDevices.value.some(d => d.id === deviceId)) {
      deactivateDevice(deviceId)
    } else {
      activateDevice(deviceId)
    }
  }
  
  /**
   * 更新音频配置
   * @param newConfig - 新的音频配置
   */
  function updateConfig(newConfig: Partial<AudioConfig>) {
    config.value = {
      ...config.value,
      ...newConfig
    }
  }
  
  /**
   * 切换静音状态
   */
  function toggleMute() {
    isMuted.value = !isMuted.value
  }
  
  /**
   * 设置音量
   * @param newVolume - 新的音量值 (0-100)
   */
  function setVolume(newVolume: number) {
    volume.value = Math.max(0, Math.min(100, newVolume))
  }
  
  /**
   * 刷新设备列表
   */
  async function refreshDevices() {
    const allDevices = await audioDeviceManager.getAllAudioDevices()
    devices.value = allDevices
    
    // 更新激活设备列表，保留已激活的设备
    activeDevices.value = activeDevices.value
      .filter(activeDevice => allDevices.some(d => d.id === activeDevice.id))
  }
  
  /**
   * 计算属性：是否有可用的麦克风
   */
  const hasMicrophone = computed(() => {
    return devices.value.some(device => device.type === AudioSourceType.MICROPHONE)
  })
  
  /**
   * 计算属性：是否有可用的系统音频
   */
  const hasSystemAudio = computed(() => {
    return devices.value.some(device => device.type === AudioSourceType.SYSTEM_AUDIO)
  })
  
  /**
   * 计算属性：是否有激活的麦克风
   */
  const hasActiveMicrophone = computed(() => {
    return activeDevices.value.some(device => device.type === AudioSourceType.MICROPHONE)
  })
  
  /**
   * 计算属性：是否有激活的系统音频
   */
  const hasActiveSystemAudio = computed(() => {
    return activeDevices.value.some(device => device.type === AudioSourceType.SYSTEM_AUDIO)
  })
  
  return {
    devices,
    activeDevices,
    config,
    systemAudioStatus,
    isMuted,
    volume,
    hasMicrophone,
    hasSystemAudio,
    hasActiveMicrophone,
    hasActiveSystemAudio,
    initAudioDevices,
    activateDevice,
    deactivateDevice,
    toggleDevice,
    updateConfig,
    toggleMute,
    setVolume,
    refreshDevices
  }
}) 