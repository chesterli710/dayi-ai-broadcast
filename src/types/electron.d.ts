/**
 * Electron API类型声明
 * 为渲染进程中使用的Electron API提供类型支持
 */
import type { WindowInfo, DisplayInfo } from './video';
import type { AudioOutputDeviceInfo } from './audio';

interface IElectronAPI {
  /**
   * 发送消息到主进程
   * @param channel - 通信频道名称
   * @param data - 要发送的数据
   */
  send: (channel: string, data: any) => void;
  
  /**
   * 接收来自主进程的消息
   * @param channel - 通信频道名称
   * @param func - 回调函数，处理接收到的数据
   */
  receive: (channel: string, func: (...args: any[]) => void) => void;

  /**
   * 检查MacOS上Blackhole是否已安装
   * @returns Promise<boolean> 是否已安装
   */
  checkBlackholeInstalled: () => Promise<boolean>;

  /**
   * 检查Windows上立体声混音是否已启用
   * @returns Promise<boolean> 是否已启用
   */
  checkStereoMixEnabled: () => Promise<boolean>;

  /**
   * 设置设备音量
   * @param deviceId - 设备ID
   * @param volume - 音量值 (0-100)
   * @returns Promise<boolean> 是否设置成功
   */
  setDeviceVolume?: (deviceId: string, volume: number) => Promise<boolean>;
  
  /**
   * 获取音频输出设备列表（Windows平台专用）
   * @returns Promise<AudioOutputDeviceInfo[]> 音频输出设备列表
   */
  getAudioOutputDevices: () => Promise<AudioOutputDeviceInfo[]>;

  /**
   * 获取系统显卡信息
   * @returns Promise<{vendor: string, model: string}> 显卡信息
   */
  getGPUInfo: () => Promise<{vendor: string, model: string}>;

  /**
   * 获取系统可用窗口列表
   * @returns Promise<WindowInfo[]> 窗口列表
   */
  getWindows: () => Promise<WindowInfo[]>;

  /**
   * 获取系统显示器列表
   * @returns Promise<DisplayInfo[]> 显示器列表
   */
  getDisplays: () => Promise<DisplayInfo[]>;

  /**
   * 捕获窗口
   * @param windowId - 窗口ID
   * @param options - 捕获选项
   * @returns Promise<{success: boolean, error?: string}> 捕获结果
   */
  captureWindow: (windowId: string, options?: {
    frameRate?: number;
    audio?: boolean;
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * 捕获显示器
   * @param displayId - 显示器ID
   * @param options - 捕获选项
   * @returns Promise<{success: boolean, error?: string}> 捕获结果
   */
  captureScreen: (displayId: string, options?: {
    frameRate?: number;
    audio?: boolean;
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
} 