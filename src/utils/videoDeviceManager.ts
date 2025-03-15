/**
 * 视频设备管理工具类
 * 用于检测和管理系统视频设备
 */
import type { VideoDevice, WindowInfo, DisplayInfo } from '../types/video';
import { VideoSourceType } from '../types/video';
import type { IElectronAPI } from '../types/electron';

/**
 * 视频设备管理器类
 * 负责检测和管理系统视频设备
 */
class VideoDeviceManager {
  // 存储活跃的视频流，避免重复创建
  private activeStreams: Map<string, MediaStream> = new Map();
  
  // 是否已初始化
  private initialized = false;
  
  // 设备类型映射
  private deviceTypeMap: Map<string, VideoSourceType> = new Map();

  // 重试配置
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 300;

  /**
   * 记录日志
   * @param message 日志消息
   * @param data 附加数据
   * @param isError 是否为错误日志
   */
  private log(message: string, data?: any, isError = false): void {
    const prefix = `[VideoDeviceManager]`;
    if (isError) {
      console.error(`${prefix} ${message}`, data || '');
    } else {
      console.log(`${prefix} ${message}`, data || '');
    }
  }
  
  /**
   * 初始化视频设备管理器
   * 确保只初始化一次
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.log('初始化视频设备管理器');
    this.initialized = true;
  }
  
  /**
   * 记录设备类型
   * @param deviceId 设备ID
   * @param type 设备类型
   */
  recordDeviceType(deviceId: string, type: VideoSourceType): void {
    this.deviceTypeMap.set(deviceId, type);
  }
  
  /**
   * 获取系统可用的摄像头设备
   * @returns Promise<VideoDevice[]> 摄像头设备列表
   */
  async getCameraDevices(): Promise<VideoDevice[]> {
    try {
      // 使用Web API获取视频输入设备
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => {
          return {
            id: device.deviceId,
            name: device.label || `摄像头 ${index + 1}`,
            type: VideoSourceType.CAMERA,
            isActive: false
          };
        });
      
      // 为每个摄像头设备获取实时视频流
      const devicesWithStreams = await Promise.all(
        videoInputDevices.map(async (device) => {
          try {
            // 检查是否已有活跃流
            if (this.activeStreams.has(device.id)) {
              const stream = this.activeStreams.get(device.id);
              if (stream && this.isStreamActive(stream)) {
                // 生成缩略图
                const thumbnail = await this.createThumbnailFromStream(stream);
                return {
                  ...device,
                  stream,
                  thumbnail,
                  isActive: true
                } as VideoDevice;
              } else {
                this.stopStream(device.id);
              }
            }
            
            // 获取摄像头视频流
            const stream = await this.getCameraStream(device.id);
            if (stream) {
              // 存储流
              this.activeStreams.set(device.id, stream);
              
              // 生成缩略图
              const thumbnail = await this.createThumbnailFromStream(stream);
              return {
                ...device,
                stream,
                thumbnail,
                isActive: true
              } as VideoDevice;
            }
            return device;
          } catch (error) {
            return device;
          }
        })
      );
      
      return devicesWithStreams;
    } catch (error) {
      this.log('获取摄像头设备失败:', error, true);
      return [];
    }
  }

  /**
   * 获取系统可用的窗口列表
   * @returns Promise<VideoDevice[]> 窗口设备列表
   */
  async getWindowDevices(): Promise<VideoDevice[]> {
    try {
      // 检查Electron API是否可用
      const electronAPI = this.getElectronAPI();
      if (!electronAPI || !electronAPI.getWindows) {
        console.warn('Electron API不可用，无法获取窗口列表');
        return [];
      }

      // 通过Electron API获取窗口列表
      const windows = await electronAPI.getWindows();
      
      // 转换为VideoDevice格式
      const devices = windows.map((win: WindowInfo) => {
        // 检查缩略图是否存在且有效
        const hasThumbnail = win.thumbnail && typeof win.thumbnail === 'string' && win.thumbnail.length > 22;
        
        return {
          id: win.id,
          name: win.name,
          type: VideoSourceType.WINDOW,
          isActive: false,
          thumbnail: hasThumbnail ? win.thumbnail : undefined,
          sourceId: win.sourceId,
          appIcon: win.appIcon
        };
      });
      
      return devices;
    } catch (error) {
      console.error('获取窗口列表失败:', error);
      return [];
    }
  }

  /**
   * 获取系统可用的显示器列表
   * @returns Promise<VideoDevice[]> 显示器设备列表
   */
  async getDisplayDevices(): Promise<VideoDevice[]> {
    try {
      // 检查Electron API是否可用
      const electronAPI = this.getElectronAPI();
      if (!electronAPI || !electronAPI.getDisplays) {
        console.warn('[videoDeviceManager.ts 视频设备] Electron API不可用，无法获取显示器列表');
        return [];
      }

      // 通过Electron API获取显示器列表
      const displays = await electronAPI.getDisplays();
      
      // 转换为VideoDevice格式
      return displays.map((display: DisplayInfo) => ({
        id: display.id,
        name: display.name || (display.isPrimary ? '主显示器' : `显示器 ${display.id}`),
        type: VideoSourceType.DISPLAY,
        isActive: false,
        thumbnail: display.thumbnail,
        sourceId: display.sourceId
      }));
    } catch (error) {
      console.error('[videoDeviceManager.ts 视频设备] 获取显示器列表失败:', error);
      return [];
    }
  }

  /**
   * 获取媒体流的通用方法
   * @param deviceId 设备ID
   * @param type 设备类型
   * @param constraints 媒体约束
   * @returns Promise<MediaStream | null> 视频流
   */
  private async getMediaStream(
    deviceId: string, 
    type: VideoSourceType, 
    constraints: MediaStreamConstraints
  ): Promise<MediaStream | null> {
    try {
      // 记录设备类型
      this.recordDeviceType(deviceId, type);
      
      // 检查是否已有活跃流
      if (this.activeStreams.has(deviceId)) {
        const existingStream = this.activeStreams.get(deviceId);
        if (existingStream && this.isStreamActive(existingStream)) {
          return existingStream;
        } else {
          this.stopStream(deviceId);
        }
      }
      
      // 添加简化的重试机制
      let stream: MediaStream | null = null;
      let retryCount = 0;
      
      while (retryCount < this.MAX_RETRIES && !stream) {
        try {
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          }
          
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (stream && stream.getTracks().length > 0) {
            // 存储新获取的流
            this.activeStreams.set(deviceId, stream);
            return stream;
          } else {
            retryCount++;
          }
        } catch (error) {
          retryCount++;
        }
      }
      
      return null;
    } catch (error) {
      this.log(`获取媒体流失败 (ID: ${deviceId}, 类型: ${type}):`, error, true);
      return null;
    }
  }

  /**
   * 获取摄像头视频流
   * @param deviceId 设备ID
   * @param width 视频宽度
   * @param height 视频高度
   * @returns Promise<MediaStream | null> 视频流
   */
  async getCameraStream(deviceId: string, width = 1280, height = 720): Promise<MediaStream | null> {
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: width },
        height: { ideal: height }
      }
    };
    
    return this.getMediaStream(deviceId, VideoSourceType.CAMERA, constraints);
  }

  /**
   * 获取窗口视频流
   * @param sourceId 窗口源ID
   * @returns Promise<MediaStream | null> 视频流
   */
  async getWindowStream(sourceId: string): Promise<MediaStream | null> {
    // 设置约束 - 使用Electron特有的约束，不设置宽高约束，保持原始尺寸
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      }
    } as MediaStreamConstraints;
    
    return this.getMediaStream(sourceId, VideoSourceType.WINDOW, constraints);
  }

  /**
   * 获取显示器视频流
   * @param sourceId 显示器源ID
   * @returns Promise<MediaStream | null> 视频流
   */
  async getDisplayStream(sourceId: string): Promise<MediaStream | null> {
    // 设置约束 - 使用Electron特有的约束，不设置宽高约束，保持原始尺寸
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      }
    } as MediaStreamConstraints;
    
    return this.getMediaStream(sourceId, VideoSourceType.DISPLAY, constraints);
  }

  /**
   * 从视频流创建缩略图
   * @param stream 视频流
   * @returns Promise<string | undefined> 缩略图数据URL
   */
  async createThumbnailFromStream(stream: MediaStream): Promise<string | undefined> {
    return new Promise((resolve) => {
      try {
        // 创建视频元素
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        // 视频加载完成后捕获帧
        video.onloadedmetadata = () => {
          video.play().then(() => {
            // 等待视频播放
            setTimeout(() => {
              try {
                // 创建canvas并绘制视频帧
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                  // 绘制视频帧
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  // 转换为数据URL
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  resolve(dataUrl);
                } else {
                  resolve(undefined);
                }
              } catch (error) {
                resolve(undefined);
              } finally {
                // 清理资源
                video.pause();
                video.srcObject = null;
              }
            }, 300);
          }).catch(() => resolve(undefined));
        };
        
        // 错误处理
        video.onerror = () => resolve(undefined);
      } catch (error) {
        resolve(undefined);
      }
    });
  }

  /**
   * 检查流是否活跃
   * @param stream 媒体流
   * @returns boolean 是否活跃
   */
  private isStreamActive(stream: MediaStream): boolean {
    return stream.active && stream.getTracks().some(track => track.readyState === 'live');
  }

  /**
   * 停止视频流
   * @param deviceId 设备ID
   */
  stopStream(deviceId: string): void {
    try {
      // 停止流
      const stream = this.activeStreams.get(deviceId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        this.activeStreams.delete(deviceId);
      }
    } catch (error) {
      this.log(`停止视频流失败 (ID: ${deviceId}):`, error, true);
    }
  }

  /**
   * 停止所有视频流
   */
  stopAllStreams(): void {
    try {
      this.activeStreams.forEach((stream, deviceId) => {
        stream.getTracks().forEach(track => track.stop());
      });
      this.activeStreams.clear();
    } catch (error) {
      this.log('停止所有视频流失败:', error, true);
    }
  }

  /**
   * 获取Electron API
   * @returns IElectronAPI | undefined Electron API
   */
  private getElectronAPI(): IElectronAPI | undefined {
    return window.electronAPI as IElectronAPI | undefined;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 停止所有流
    this.stopAllStreams();
    
    // 清空映射
    this.deviceTypeMap.clear();
  }
}

// 导出单例
export default new VideoDeviceManager(); 