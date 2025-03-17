/**
 * 应用初始化工具
 * 用于在应用启动时初始化各种组件和服务
 */
import { useAudioStore } from '../stores/audioStore'
import gpuDetector from './gpuDetector'
import { EncoderType } from './gpuDetector'
import type { StreamConfig } from '../types/broadcast'

/**
 * 初始化音频设备
 * 检测并初始化系统音频设备
 */
export async function initializeAudioDevices() {
  const audioStore = useAudioStore()
  return await audioStore.initAudioDevices()
}

/**
 * 初始化编码器
 * 根据系统显卡信息选择合适的编码器
 * @param streamConfig - 流配置对象
 */
export async function initializeEncoder(streamConfig: StreamConfig) {
  try {
    // 获取推荐的编码器
    const recommendedEncoder = await gpuDetector.getRecommendedEncoder()
    console.log('[initializeApp.ts 初始化编码器] 推荐的编码器:', recommendedEncoder)
    
    // 更新流配置中的编码器
    if (!streamConfig.codec) {
      console.log('[initializeApp.ts 初始化编码器] 设置默认编码器:', recommendedEncoder)
      streamConfig.codec = recommendedEncoder
    } else {
      console.log('[initializeApp.ts 初始化编码器] 保留现有编码器设置:', streamConfig.codec)
    }
    
    // 设置默认的流配置参数（如果未指定）
    if (!streamConfig.bitrate) {
      streamConfig.bitrate = 3000 // 默认3Mbps
    }
    
    if (!streamConfig.resolution) {
      streamConfig.resolution = '1920x1080' // 默认1080p
    }
    
    if (!streamConfig.fps) {
      streamConfig.fps = 30 // 默认30fps
    }
    
    // 根据编码器类型设置预设
    if (!streamConfig.preset) {
      // 如果是硬件编码器，默认使用低延迟预设
      if (recommendedEncoder !== EncoderType.H264_SOFTWARE) {
        streamConfig.preset = 'zerolatency'
      } else {
        streamConfig.preset = 'performance'
      }
    }
    
    return streamConfig
  } catch (error) {
    console.error('初始化编码器失败:', error)
    
    // 返回默认配置
    return {
      ...streamConfig,
      codec: EncoderType.H264_SOFTWARE,
      bitrate: streamConfig.bitrate || 3000,
      resolution: streamConfig.resolution || '1920x1080',
      fps: streamConfig.fps || 30,
      preset: streamConfig.preset || 'performance'
    }
  }
}

/**
 * 初始化应用
 * 执行所有必要的初始化步骤
 * @param streamConfig - 流配置对象
 */
export async function initializeApp(streamConfig: StreamConfig) {
  try {
    // 初始化音频设备
    await initializeAudioDevices()
    
    // 初始化编码器
    const updatedConfig = await initializeEncoder(streamConfig)
    
    return {
      success: true,
      streamConfig: updatedConfig
    }
  } catch (error) {
    console.error('应用初始化失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
} 