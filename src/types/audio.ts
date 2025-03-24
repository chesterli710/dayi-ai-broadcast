/**
 * 音频类型声明
 * 定义系统中使用的音频相关类型
 */

/**
 * 音频编码类型枚举
 */
export enum AudioCodecType {
  /**
   * AAC编码，适用于大多数平台
   */
  AAC = 'aac',
  
  /**
   * MP3编码，历史悠久的音频编码
   */
  MP3 = 'mp3',
  
  /**
   * Opus编码，开源且高效的音频编码
   */
  OPUS = 'opus'
}

/**
 * 音频采样率枚举
 */
export enum AudioSampleRate {
  /**
   * 44.1kHz采样率
   */
  RATE_44100 = 44100,
  
  /**
   * 48kHz采样率
   */
  RATE_48000 = 48000
}

/**
 * 音频比特率枚举
 */
export enum AudioBitrate {
  /**
   * 128Kbps
   */
  BITRATE_128 = 128,
  
  /**
   * 192Kbps
   */
  BITRATE_192 = 192,
  
  /**
   * 256Kbps
   */
  BITRATE_256 = 256,
  
  /**
   * 320Kbps
   */
  BITRATE_320 = 320
}

/**
 * 麦克风设备信息
 */
export interface MicrophoneDeviceInfo {
  /**
   * 设备ID
   */
  deviceId: string;
  
  /**
   * 设备标签/名称
   */
  label: string;
  
  /**
   * 是否是默认设备
   */
  isDefault?: boolean;
}

/**
 * 音频输出设备信息
 */
export interface AudioOutputDeviceInfo {
  /**
   * 设备ID
   */
  id: string;
  
  /**
   * 设备名称
   */
  name: string;
  
  /**
   * 是否是默认设备
   */
  isDefault: boolean;
}

/**
 * 音频设备状态
 */
export interface AudioDeviceState {
  /**
   * 设备ID
   */
  deviceId: string;
  
  /**
   * 音量级别 (0-100)
   */
  volume: number;
  
  /**
   * 是否静音
   */
  muted: boolean;
  
  /**
   * 当前音频电平 (0-100)
   */
  level: number;
}

/**
 * 系统音频状态类型
 */
export interface SystemAudioState {
  /**
   * 是否已启用
   */
  enabled: boolean;
  
  /**
   * 音量级别 (0-100)
   */
  volume: number;
  
  /**
   * 是否静音
   */
  muted: boolean;
  
  /**
   * 当前音频电平 (0-100)
   */
  level: number;
  
  /**
   * 捕获方式
   * - 'blackhole': 使用BlackHole插件捕获 (macOS)
   * - 'desktop-capturer': 使用Electron的desktopCapturer捕获
   * - 'none': 无法捕获
   */
  captureMethod: 'blackhole' | 'desktop-capturer' | 'none';
}

/**
 * 应用音频设置
 */
export interface AudioSettings {
  /**
   * 选中的麦克风设备ID
   */
  selectedMicrophoneId: string | null;
  
  /**
   * 选中的音频输出设备ID（用于系统音频设置）
   */
  selectedOutputDeviceId: string | null;
  
  /**
   * 麦克风音量 (0-100)
   */
  microphoneVolume: number;
  
  /**
   * 麦克风是否静音
   */
  microphoneMuted: boolean;
  
  /**
   * 系统音频音量 (0-100)
   */
  systemAudioVolume: number;
  
  /**
   * 系统音频是否静音
   */
  systemAudioMuted: boolean;
}
