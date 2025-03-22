/**
 * 媒体源相关类型定义
 */

/**
 * 媒体源类型
 */
export type MediaSourceType = 'camera' | 'window' | 'screen';

/**
 * 媒体源结构
 */
export interface MediaSource {
  /**
   * 媒体源唯一ID
   */
  id: string;
  
  /**
   * 媒体源名称
   */
  name: string;
  
  /**
   * 媒体源类型
   */
  type: MediaSourceType;
  
  /**
   * 媒体源描述
   */
  description?: string;
  
  /**
   * 媒体源缩略图（base64格式）
   */
  thumbnail?: string;
  
  /**
   * 媒体源视频流
   */
  stream?: MediaStream;
  
  /**
   * 原始媒体源ID
   * 例如对于桌面/窗口捕获，这是desktopCapturer返回的sourceId
   */
  sourceId?: string;
  
  /**
   * 媒体源约束条件
   */
  constraints?: MediaStreamConstraints;
  
  /**
   * 媒体源是否已激活
   */
  isActive?: boolean;
  
  /**
   * 媒体源最后一次激活的时间
   */
  lastActiveTime?: Date;
  
  /**
   * 媒体源实际宽度
   */
  width?: number;
  
  /**
   * 媒体源实际高度
   */
  height?: number;
  
  /**
   * 流引用计数，记录该媒体源被多少处使用
   */
  referenceCount?: number;
  
  /**
   * 附加数据，根据媒体源类型存储不同的额外信息
   */
  metadata?: Record<string, any>;
}

/**
 * 摄像头媒体源
 */
export interface CameraSource extends MediaSource {
  type: 'camera';
  deviceId: string;
  groupId?: string;
  facing?: 'user' | 'environment';
}

/**
 * 窗口媒体源
 */
export interface WindowSource extends MediaSource {
  type: 'window';
  appIcon?: string;
  sourceId: string;
}

/**
 * 屏幕媒体源
 */
export interface ScreenSource extends MediaSource {
  type: 'screen';
  sourceId: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

/**
 * 媒体源捕获配置
 */
export interface MediaSourceCaptureConfig {
  /**
   * 视频帧率，默认30fps
   */
  frameRate?: number;
  
  /**
   * 是否捕获音频（对于窗口和屏幕捕获有效）
   */
  audio?: boolean;
}

/**
 * 媒体源捕获结果
 */
export interface CaptureResult {
  /**
   * 是否成功
   */
  success: boolean;
  
  /**
   * 媒体流
   */
  stream?: MediaStream;
  
  /**
   * 错误信息
   */
  error?: string;
  
  /**
   * 媒体源ID
   */
  sourceId: string;
  
  /**
   * 媒体源宽度
   */
  width?: number;
  
  /**
   * 媒体源高度
   */
  height?: number;
} 