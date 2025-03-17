/**
 * 音频设备相关类型定义
 */

/**
 * 音频源类型
 */
export enum AudioSourceType {
  MICROPHONE = 'microphone', // 麦克风
  SYSTEM_AUDIO = 'system_audio', // 系统音频
}

/**
 * 音频设备接口
 */
export interface AudioDevice {
  /**
   * 设备ID
   */
  id: string;
  
  /**
   * 设备名称
   */
  name: string;
  
  /**
   * 设备类型
   */
  type: AudioSourceType;
  
  /**
   * 是否为默认设备
   */
  isDefault: boolean;
  
  /**
   * 是否激活
   */
  isActive: boolean;
  
  /**
   * 设备音量 (0-100)
   */
  volume: number;
  
  /**
   * 音频电平 (0-100)
   */
  level: number;

  /**
   * 最后一次设置音量的时间戳
   * 用于防止电平监测覆盖音量设置
   */
  lastVolumeSetTime?: number;
}

/**
 * 音频编码器类型
 */
export enum AudioCodecType {
  AAC = 'aac',          // AAC编码
  MP3 = 'mp3',          // MP3编码
  OPUS = 'opus',        // OPUS编码
}

/**
 * 音频采样率
 */
export enum AudioSampleRate {
  RATE_44100 = 44100,   // 44.1kHz
  RATE_48000 = 48000,   // 48kHz
  RATE_96000 = 96000,   // 96kHz
}

/**
 * 音频码率
 */
export enum AudioBitrate {
  BITRATE_96K = 96000,   // 96kbps
  BITRATE_128K = 128000, // 128kbps
  BITRATE_192K = 192000, // 192kbps
  BITRATE_256K = 256000, // 256kbps
  BITRATE_320K = 320000, // 320kbps
}

/**
 * 音频配置
 */
export interface AudioConfig {
  codec: AudioCodecType;       // 编码器类型
  sampleRate: AudioSampleRate; // 采样率
  bitrate: AudioBitrate;       // 码率
  channels: number;            // 声道数
}

/**
 * 系统音频状态
 */
export interface SystemAudioStatus {
  isAvailable: boolean;        // 系统音频是否可用
  isBlackholeInstalled?: boolean; // MacOS: Blackhole是否已安装
  isStereoMixEnabled?: boolean;   // Windows: 立体声混音是否已启用
}

/**
 * 音频存储状态
 */
export interface AudioState {
  devices: AudioDevice[];      // 可用的音频设备列表
  activeDevices: AudioDevice[]; // 当前激活的音频设备
  config: AudioConfig;         // 音频配置
  systemAudioStatus: SystemAudioStatus; // 系统音频状态
  isMuted: boolean;            // 是否静音
  volume: number;              // 音量 (0-100)
} 