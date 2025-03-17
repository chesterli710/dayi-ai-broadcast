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
   * 全局音量 (0-100)
   */
  const volume = ref(100)
  
  /**
   * 音频电平监测定时器
   */
  let levelMonitorTimer: number | null = null;
  
  /**
   * 初始化音频设备
   */
  async function initAudioDevices() {
    try {
      // 获取所有音频设备
      const allDevices = await audioDeviceManager.getAllAudioDevices()
      
      // 加载保存的音量设置
      const savedVolumeSettings = loadDeviceVolumeSettings()
      
      // 为每个设备添加默认音量和电平值，应用保存的音量设置
      devices.value = allDevices.map(device => ({
        ...device,
        volume: savedVolumeSettings[device.id] ?? 100,
        level: 0
      }))
      
      // 检查系统音频状态
      systemAudioStatus.value = await audioDeviceManager.checkSystemAudioStatus()
      
      // 默认激活麦克风和系统音频（如果可用）
      const defaultDevices = devices.value.filter(device => 
        device.type === AudioSourceType.MICROPHONE && device.isDefault ||
        device.type === AudioSourceType.SYSTEM_AUDIO
      )
      
      // 如果没有默认设备，尝试使用第一个麦克风
      if (defaultDevices.length === 0) {
        const firstMic = devices.value.find(device => device.type === AudioSourceType.MICROPHONE)
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
      
      // 启动音频电平监测
      startLevelMonitoring()
      
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
   * 设置全局音量
   * @param newVolume - 新的音量值 (0-100)
   */
  function setVolume(newVolume: number) {
    volume.value = Math.max(0, Math.min(100, newVolume))
  }
  
  /**
   * 设置设备音量
   * @param deviceId - 设备ID
   * @param newVolume - 新的音量值 (0-100)
   */
  async function setDeviceVolume(deviceId: string, newVolume: number) {
    const clampedVolume = Math.max(0, Math.min(100, newVolume))
    
    // 记录当前时间，用于防止电平监测覆盖音量设置
    const setTime = Date.now()
    
    // 更新设备列表中的设备音量
    devices.value = devices.value.map(device => {
      if (device.id === deviceId) {
        return { 
          ...device, 
          volume: clampedVolume,
          // 添加音量设置时间戳，用于防止电平监测覆盖
          lastVolumeSetTime: setTime
        }
      }
      return device
    })
    
    // 更新激活设备列表中的设备音量
    activeDevices.value = activeDevices.value.map(device => {
      if (device.id === deviceId) {
        return { 
          ...device, 
          volume: clampedVolume,
          // 添加音量设置时间戳，用于防止电平监测覆盖
          lastVolumeSetTime: setTime
        }
      }
      return device
    })
    
    // 保存音量设置到本地存储，以便下次启动时恢复
    saveDeviceVolumeSetting(deviceId, clampedVolume)
    
    // 调用设备管理器设置设备音量
    try {
      const success = await audioDeviceManager.setDeviceVolume(deviceId, clampedVolume)
      if (success) {
        console.log(`设备 ${deviceId} 采集音量已设置为 ${clampedVolume}`)
      } else {
        console.error(`设置设备 ${deviceId} 采集音量失败`)
      }
      return success
    } catch (error) {
      console.error(`设置设备 ${deviceId} 采集音量出错:`, error)
      return false
    }
  }
  
  /**
   * 保存设备音量设置到本地存储
   * @param deviceId - 设备ID
   * @param volume - 音量值
   */
  function saveDeviceVolumeSetting(deviceId: string, volume: number) {
    try {
      // 获取现有设置
      const volumeSettingsStr = localStorage.getItem('audioDeviceVolumes')
      const volumeSettings = volumeSettingsStr ? JSON.parse(volumeSettingsStr) : {}
      
      // 更新设置
      volumeSettings[deviceId] = volume
      
      // 保存回本地存储
      localStorage.setItem('audioDeviceVolumes', JSON.stringify(volumeSettings))
      console.log(`设备 ${deviceId} 音量设置 ${volume} 已保存到本地存储`)
    } catch (error) {
      console.error('保存设备音量设置失败:', error)
    }
  }
  
  /**
   * 从本地存储加载设备音量设置
   */
  function loadDeviceVolumeSettings() {
    try {
      const volumeSettingsStr = localStorage.getItem('audioDeviceVolumes')
      if (!volumeSettingsStr) return {}
      
      return JSON.parse(volumeSettingsStr)
    } catch (error) {
      console.error('加载设备音量设置失败:', error)
      return {}
    }
  }
  
  /**
   * 启动音频电平监测
   */
  function startLevelMonitoring() {
    // 如果已经在监测中，先停止
    if (levelMonitorTimer !== null) {
      stopLevelMonitoring()
    }
    
    // 每100ms更新一次音频电平
    levelMonitorTimer = window.setInterval(async () => {
      // 只监测激活的设备
      for (const device of activeDevices.value) {
        try {
          // 获取设备当前音频电平
          const level = await audioDeviceManager.getDeviceLevel(device.id)
          
          // 更新设备列表中的设备电平，但不修改音量
          devices.value = devices.value.map(d => {
            if (d.id === device.id) {
              return { 
                ...d, 
                level
                // 不再更新音量，只更新电平
              }
            }
            return d
          })
          
          // 更新激活设备列表中的设备电平，但不修改音量
          activeDevices.value = activeDevices.value.map(d => {
            if (d.id === device.id) {
              return { 
                ...d, 
                level
                // 不再更新音量，只更新电平
              }
            }
            return d
          })
        } catch (error) {
          console.error(`获取设备 ${device.id} 音频电平失败:`, error)
        }
      }
    }, 100)
  }
  
  /**
   * 停止音频电平监测
   */
  function stopLevelMonitoring() {
    if (levelMonitorTimer !== null) {
      window.clearInterval(levelMonitorTimer)
      levelMonitorTimer = null
    }
  }
  
  /**
   * 刷新设备列表
   */
  async function refreshDevices() {
    const allDevices = await audioDeviceManager.getAllAudioDevices()
    
    // 为新设备添加默认音量和电平值，保留已有设备的音量设置
    devices.value = allDevices.map(newDevice => {
      const existingDevice = devices.value.find(d => d.id === newDevice.id)
      return {
        ...newDevice,
        volume: existingDevice?.volume ?? 100,
        level: existingDevice?.level ?? 0
      }
    })
    
    // 更新激活设备列表，保留已激活的设备
    activeDevices.value = activeDevices.value
      .filter(activeDevice => devices.value.some(d => d.id === activeDevice.id))
      .map(activeDevice => {
        const updatedDevice = devices.value.find(d => d.id === activeDevice.id)
        return updatedDevice ? { ...updatedDevice, isActive: true } : activeDevice
      })
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
    setDeviceVolume,
    refreshDevices,
    startLevelMonitoring,
    stopLevelMonitoring
  }
}) 