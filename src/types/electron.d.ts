/**
 * Electron API类型声明
 * 为渲染进程中使用的Electron API提供类型支持
 */
import type { WindowInfo, DisplayInfo } from './video';

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

  // 注意：以下两个方法在当前应用中未被使用，已从main.ts和preload.ts中移除
  /*
  /**
   * 捕获窗口缩略图
   * @param windowId - 窗口ID
   * @returns Promise<{success: boolean, dataUrl?: string, error?: string}> 捕获结果
   */
  /*
  captureWindow: (windowId: string) => Promise<{
    success: boolean;
    dataUrl?: string;
    error?: string;
  }>;
  */

  /**
   * 捕获显示器缩略图
   * @param displayId - 显示器ID
   * @returns Promise<{success: boolean, dataUrl?: string, error?: string}> 捕获结果
   */
  /*
  captureDisplay: (displayId: string) => Promise<{
    success: boolean;
    dataUrl?: string;
    error?: string;
  }>;
  */
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
} 