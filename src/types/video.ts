/**
 * 视频设备相关类型定义
 */

/**
 * 视频源类型
 */
export enum VideoSourceType {
  CAMERA = 'camera',           // 摄像头
  WINDOW = 'window',           // 窗口捕获
  DISPLAY = 'display',         // 显示器捕获
  CUSTOM = 'custom'            // 自定义源
}

/**
 * 视频设备信息
 */
export interface VideoDevice {
  id: string;                  // 设备ID
  name: string;                // 设备名称
  type: VideoSourceType;       // 设备类型
  isActive: boolean;           // 是否激活
  thumbnail?: string;          // 缩略图URL
  stream?: MediaStream;        // 媒体流
  sourceId?: string;           // 媒体源ID，用于获取实时流
}

/**
 * 窗口信息
 */
export interface WindowInfo {
  id: string;                  // 窗口ID
  name: string;                // 窗口名称
  appIcon?: string;            // 应用图标
  thumbnail?: string;          // 窗口缩略图
  sourceId?: string;           // 媒体源ID，用于获取实时流
}

/**
 * 显示器信息
 */
export interface DisplayInfo {
  id: string;                  // 显示器ID
  name: string;                // 显示器名称
  width: number;               // 宽度
  height: number;              // 高度
  isPrimary: boolean;          // 是否为主显示器
  thumbnail?: string;          // 显示器缩略图
  sourceId?: string;           // 媒体源ID，用于获取实时流
}

/**
 * 视频源状态
 */
export interface VideoSourceStatus {
  isAvailable: boolean;        // 是否可用
  errorMessage?: string;       // 错误信息
}

/**
 * 视频源分组
 */
export interface VideoSourceGroup {
  type: VideoSourceType;       // 分组类型
  title: string;               // 分组标题
  sources: VideoDevice[];      // 分组内的视频源
}

/**
 * 视频源预览配置
 */
export interface VideoPreviewConfig {
  width: number;               // 预览宽度
  height: number;              // 预览高度
  frameRate?: number;          // 帧率
  quality?: number;            // 质量 (0-1)
} 