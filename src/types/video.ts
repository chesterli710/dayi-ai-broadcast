/**
 * 视频相关类型定义
 */

/**
 * 窗口信息
 */
export interface WindowInfo {
  /**
   * 窗口ID
   */
  id: string;
  
  /**
   * 窗口名称
   */
  name: string;
  
  /**
   * 窗口所属应用程序名称
   */
  appName?: string;
  
  /**
   * 窗口宽度
   */
  width: number;
  
  /**
   * 窗口高度
   */
  height: number;
  
  /**
   * 窗口图标（base64格式）
   */
  icon?: string;
  
  /**
   * 窗口缩略图（base64格式）
   */
  thumbnail?: string;
}

/**
 * 显示器信息
 */
export interface DisplayInfo {
  /**
   * 显示器ID
   */
  id: string;
  
  /**
   * 显示器名称
   */
  name: string;
  
  /**
   * 显示器宽度
   */
  width: number;
  
  /**
   * 显示器高度
   */
  height: number;
  
  /**
   * 是否是主显示器
   */
  isPrimary: boolean;
  
  /**
   * 刷新率
   */
  refreshRate?: number;
  
  /**
   * 缩略图（base64格式）
   */
  thumbnail?: string;
}

/**
 * 摄像头信息
 */
export interface CameraInfo {
  /**
   * 设备ID
   */
  deviceId: string;
  
  /**
   * 设备名称
   */
  label: string;
  
  /**
   * 设备组ID
   */
  groupId?: string;
  
  /**
   * 是否是默认设备
   */
  isDefault?: boolean;
  
  /**
   * 摄像头朝向
   */
  facing?: 'user' | 'environment';
} 