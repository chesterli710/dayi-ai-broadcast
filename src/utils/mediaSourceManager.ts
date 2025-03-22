/**
 * 媒体源管理类
 * 用于管理媒体设备并与Electron的预加载脚本和主进程交互
 */
import { useMediaSourceStore } from '../stores/mediaSourceStore';
import type { 
  MediaSource, 
  CameraSource, 
  WindowSource, 
  ScreenSource, 
  MediaSourceCaptureConfig,
  CaptureResult
} from '../types/mediaSource';

/**
 * Electron API 类型定义
 */
interface IElectronAPI {
  getWindows: () => Promise<any[]>;
  getDisplays: () => Promise<any[]>;
  getCameras: () => Promise<{success: boolean, message: string, error?: string}>;
  getSourceThumbnail: (sourceId: string, sourceType: string, width?: number, height?: number) => Promise<string | null>;
  captureWindow: (sourceId: string, options: any) => Promise<{success: boolean, sourceId: string, message?: string, error?: string}>;
  captureScreen: (sourceId: string, options: any) => Promise<{success: boolean, sourceId: string, message?: string, error?: string}>;
  stopCapture: (sourceId: string) => Promise<{success: boolean, sourceId: string, message?: string, error?: string}>;
  // 添加其他可能存在的Electron API方法
  send?: (channel: string, ...args: any[]) => void;
  receive?: (channel: string, func: (...args: any[]) => void) => void;
}

// 为window添加electronAPI类型声明
declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

/**
 * 理想分辨率配置
 */
const CAMERA_CONFIG = { 
  idealWidth: 1920, 
  idealHeight: 1080,  // 理想16:9比例
  minWidth: 640,
  minHeight: 360
};

/**
 * 媒体源管理类
 * 单例模式实现，统一管理所有媒体源
 */
class MediaSourceManager {
  private static instance: MediaSourceManager;
  private mediaSourceStore!: ReturnType<typeof useMediaSourceStore>;
  private isInitialized: boolean = false;

  /**
   * 私有构造函数，确保单例模式
   */
  private constructor() {}

  /**
   * 获取单例实例
   * @returns MediaSourceManager 单例实例
   */
  public static getInstance(): MediaSourceManager {
    if (!MediaSourceManager.instance) {
      MediaSourceManager.instance = new MediaSourceManager();
    }
    return MediaSourceManager.instance;
  }

  /**
   * 初始化媒体源管理器
   */
  public initialize(): void {
    if (this.isInitialized) return;
    
    this.mediaSourceStore = useMediaSourceStore();
    this.mediaSourceStore.initialize();
    this.isInitialized = true;
    
    console.log('[mediaSourceManager.ts 媒体源管理] 媒体源管理器已初始化');
  }

  /**
   * 检查是否已初始化
   * @throws 如果未初始化则抛出异常
   */
  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('媒体源管理器未初始化，请先调用 initialize() 方法');
    }
  }

  /**
   * 获取媒体源
   * @param sourceId 媒体源ID
   * @returns 媒体源对象，不存在则返回null
   */
  public getSourceById(sourceId: string): MediaSource | null {
    this.checkInitialized();
    return this.mediaSourceStore.getSourceById(sourceId);
  }

  /**
   * 释放所有未使用的媒体流
   */
  public releaseUnusedStreams(): void {
    const toRelease: string[] = [];
    this.mediaSourceStore.sources.forEach((source: MediaSource) => {
      if (!source.isActive && source.stream && source.referenceCount === 0) {
        this.releaseMediaStream(source.stream);
        source.stream = undefined;
        toRelease.push(source.id);
      }
    });
    
    // 从store中移除已释放所有流的媒体源
    toRelease.forEach((sourceId: string) => {
      this.mediaSourceStore.removeSource(sourceId);
    });
  }
  
  /**
   * 捕获摄像头视频源
   * @param sourceId 设备ID
   * @param config 捕获配置
   * @returns 捕获结果
   */
  public async captureCamera(
    sourceId: string,
    config: Partial<MediaSourceCaptureConfig> = {}
  ): Promise<CaptureResult> {
    try {
      // 查找媒体源对象
      const source = this.getSourceById(sourceId);
      if (!source || source.type !== 'camera') {
        throw new Error(`无效的摄像头源: ${sourceId}`);
      }
      
      // 使用设备原始ID进行捕获
      const cameraSource = source as CameraSource;
      const deviceId = cameraSource.deviceId || '';
      if (!deviceId) {
        throw new Error(`摄像头没有有效的设备ID: ${sourceId}`);
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { 
            ideal: CAMERA_CONFIG.idealWidth,
            min: CAMERA_CONFIG.minWidth
          },
          height: { 
            ideal: CAMERA_CONFIG.idealHeight,
            min: CAMERA_CONFIG.minHeight
          },
          aspectRatio: { ideal: 16/9 }, // 理想宽高比16:9，但会保持设备自身的宽高比
          frameRate: config.frameRate ? { ideal: config.frameRate } : { ideal: 30 }
        },
        audio: false
      };

      return await this.captureStream(sourceId, constraints);
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 捕获摄像头失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sourceId
      };
    }
  }

  /**
   * 捕获窗口视频源 - 以原始分辨率捕获
   * @param sourceId 窗口ID
   * @param config 捕获配置
   * @returns 捕获结果
   */
  public async captureWindow(
    sourceId: string,
    config: Partial<MediaSourceCaptureConfig> = {}
  ): Promise<CaptureResult> {
    try {
      // 查找媒体源对象
      const source = this.getSourceById(sourceId);
      if (!source || source.type !== 'window') {
        throw new Error(`无效的窗口源: ${sourceId}`);
      }
      
      // 使用窗口原始ID进行捕获
      const windowSource = source as WindowSource;
      const windowId = windowSource.sourceId || '';
      if (!windowId) {
        throw new Error(`窗口没有有效的源ID: ${sourceId}`);
      }

      console.log(`[mediaSourceManager.ts 媒体源管理] 捕获窗口: ${sourceId}, 使用源ID: ${windowId}`);

      // 使用Electron API捕获窗口，而不是getUserMedia
      if (window.electronAPI && window.electronAPI.captureWindow) {
        try {
          const result = await window.electronAPI.captureWindow(windowId, {
            frameRate: config.frameRate || 30,
            audio: config.audio || false
          });
          
          if (!result.success) {
            throw new Error(`Electron捕获窗口失败: ${result.error || '未知错误'}`);
          }
          
          // 从结果中获取媒体流
          // 使用any类型绕过TypeScript对Electron特有约束的检查
          const constraints: any = {
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: windowId
              }
            },
            audio: false
          };

          return await this.captureStream(sourceId, constraints);
        } catch (error) {
          console.error('[mediaSourceManager.ts 媒体源管理] Electron捕获窗口失败:', error);
          throw error;
        }
      } else {
        // 使用Web API捕获，这种方式在桌面应用中通常无法获取窗口
        // 使用any类型绕过TypeScript对Electron特有约束的检查
        const constraints: any = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: windowId
            }
          }
        };

        return await this.captureStream(sourceId, constraints);
      }
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 捕获窗口失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sourceId
      };
    }
  }
  
  /**
   * 捕获屏幕视频源 - 以原始分辨率捕获
   * @param sourceId 屏幕ID
   * @param config 捕获配置
   * @returns 捕获结果
   */
  public async captureScreen(
    sourceId: string,
    config: Partial<MediaSourceCaptureConfig> = {}
  ): Promise<CaptureResult> {
    try {
      // 查找媒体源对象
      const source = this.getSourceById(sourceId);
      if (!source || source.type !== 'screen') {
        throw new Error(`无效的屏幕源: ${sourceId}`);
      }
      
      // 使用屏幕原始ID进行捕获
      const screenSource = source as ScreenSource;
      const screenId = screenSource.sourceId || '';
      if (!screenId) {
        throw new Error(`屏幕没有有效的源ID: ${sourceId}`);
      }

      console.log(`[mediaSourceManager.ts 媒体源管理] 捕获屏幕: ${sourceId}, 使用源ID: ${screenId}`);

      // 使用Electron API捕获屏幕，而不是getUserMedia
      if (window.electronAPI && window.electronAPI.captureScreen) {
        try {
          const result = await window.electronAPI.captureScreen(screenId, {
            frameRate: config.frameRate || 30,
            audio: config.audio || false
          });
          
          if (!result.success) {
            throw new Error(`Electron捕获屏幕失败: ${result.error || '未知错误'}`);
          }
          
          // 从结果中获取媒体流
          // 使用any类型绕过TypeScript对Electron特有约束的检查
          const constraints: any = {
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenId
              }
            },
            audio: false
          };

          return await this.captureStream(sourceId, constraints);
        } catch (error) {
          console.error('[mediaSourceManager.ts 媒体源管理] Electron捕获屏幕失败:', error);
          throw error;
        }
      } else {
        // 使用Web API捕获
        // 使用any类型绕过TypeScript对Electron特有约束的检查
        const constraints: any = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screenId
            }
          }
        };

        return await this.captureStream(sourceId, constraints);
      }
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 捕获屏幕失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sourceId
      };
    }
  }

  /**
   * 捕获媒体流
   * @param sourceId 媒体源ID
   * @param constraints 媒体约束
   * @returns 捕获结果
   */
  private async captureStream(
    sourceId: string,
    constraints: MediaStreamConstraints
  ): Promise<CaptureResult> {
    try {
      // 设置媒体源为加载状态
      this.mediaSourceStore.setSourceLoading(sourceId, true);
      
      // 捕获媒体流
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 获取源对象
      const source = this.getSourceById(sourceId);
      if (!source) {
        throw new Error(`媒体源不存在: ${sourceId}`);
      }
      
      // 获取实际的视频尺寸
      if (stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        source.width = settings.width || 0;
        source.height = settings.height || 0;
        console.log(`[mediaSourceManager.ts 媒体源管理] 捕获到的媒体流分辨率: ${source.width}x${source.height}`);
      }
      
      // 保存流
      source.stream = stream;
      
      // 增加引用计数
      this.mediaSourceStore.incrementStreamReferenceCount(sourceId);
      
      // 激活媒体源
      source.isActive = true;
      source.lastActiveTime = new Date();
      this.mediaSourceStore.activateSource(sourceId);
      
      return {
        success: true,
        stream,
        sourceId
      };
    } catch (error) {
      console.error(`[mediaSourceManager.ts 媒体源管理] 捕获媒体流失败: ${sourceId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sourceId
      };
    } finally {
      // 取消加载状态
      this.mediaSourceStore.setSourceLoading(sourceId, false);
    }
  }

  /**
   * 释放媒体流的资源
   * @param stream 媒体流
   */
  private releaseMediaStream(stream: MediaStream): void {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
    }
  }

  /**
   * 克隆媒体流
   * @param sourceId 媒体源ID
   * @returns 克隆的媒体流
   */
  public cloneStream(sourceId: string): MediaStream | null {
    const source = this.getSourceById(sourceId);
    if (!source || !source.stream) {
      return null;
    }

    // 增加引用计数
    this.mediaSourceStore.incrementStreamReferenceCount(sourceId);
    return source.stream.clone();
  }

  /**
   * 释放媒体流
   * @param sourceId 媒体源ID
   */
  public releaseStream(sourceId: string): void {
    this.mediaSourceStore.decrementStreamReferenceCount(sourceId);
    
    // 检查是否需要释放资源
    const refCount = this.mediaSourceStore.getStreamReferenceCount(sourceId);
    if (refCount === 0) {
      const source = this.getSourceById(sourceId);
      if (source && source.stream) {
        this.releaseMediaStream(source.stream);
        source.stream = undefined;
        
        // 设置为非激活状态
        source.isActive = false;
        source.lastActiveTime = new Date();
      }
    }
  }

  /**
   * 获取所有可用摄像头
   * @returns Promise<CameraSource[]> 摄像头列表
   */
  public async getCameras(): Promise<CameraSource[]> {
    this.checkInitialized();
    
    try {
      console.log('[mediaSourceManager.ts 媒体源管理] 获取系统摄像头列表');
      this.mediaSourceStore.isLoading = true;
      
      // 调用navigator.mediaDevices.enumerateDevices获取所有媒体设备
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // 筛选出视频输入设备(摄像头)
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log(`[mediaSourceManager.ts 媒体源管理] 找到 ${videoDevices.length} 个摄像头设备`);
      
      // 转换为CameraSource格式
      const cameraSources: CameraSource[] = videoDevices.map((device, index) => ({
        id: `camera-${device.deviceId}`,
        name: device.label || `摄像头 ${index + 1}`,
        type: 'camera',
        deviceId: device.deviceId,
        groupId: device.groupId,
        sourceId: device.deviceId,
        isActive: false,
        referenceCount: 0
      }));
      
      // 更新store中的摄像头列表
      cameraSources.forEach(source => {
        this.mediaSourceStore.addSource(source);
      });
      
      return cameraSources;
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 获取摄像头列表失败:', error);
      throw error;
    } finally {
      this.mediaSourceStore.isLoading = false;
    }
  }

  /**
   * 获取所有可用窗口
   * @returns Promise<WindowSource[]> 窗口列表
   */
  public async getWindows(): Promise<WindowSource[]> {
    this.checkInitialized();
    
    try {
      console.log('[mediaSourceManager.ts 媒体源管理] 获取系统窗口列表');
      this.mediaSourceStore.isLoading = true;
      
      // 调用Electron API获取窗口列表
      if (!window.electronAPI) {
        throw new Error('Electron API不可用');
      }
      
      const windows = await window.electronAPI.getWindows();
      console.log(`[mediaSourceManager.ts 媒体源管理] 找到 ${windows.length} 个窗口`);
      
      // 转换为WindowSource格式
      const windowSources: WindowSource[] = windows.map(window => ({
        id: `window-${window.id}`,
        name: window.name,
        type: 'window',
        sourceId: window.sourceId,
        appIcon: window.appIcon,
        thumbnail: window.thumbnail,
        isActive: false,
        referenceCount: 0
      }));
      
      // 更新store中的窗口列表
      windowSources.forEach(source => {
        this.mediaSourceStore.addSource(source);
      });
      
      return windowSources;
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 获取窗口列表失败:', error);
      throw error;
    } finally {
      this.mediaSourceStore.isLoading = false;
    }
  }

  /**
   * 获取所有可用屏幕
   * @returns Promise<ScreenSource[]> 屏幕列表
   */
  public async getScreens(): Promise<ScreenSource[]> {
    this.checkInitialized();
    
    try {
      console.log('[mediaSourceManager.ts 媒体源管理] 获取系统屏幕列表');
      this.mediaSourceStore.isLoading = true;
      
      // 调用Electron API获取屏幕列表
      if (!window.electronAPI) {
        throw new Error('Electron API不可用');
      }
      
      const displays = await window.electronAPI.getDisplays();
      console.log(`[mediaSourceManager.ts 媒体源管理] 找到 ${displays.length} 个屏幕`);
      
      // 转换为ScreenSource格式
      const screenSources: ScreenSource[] = displays.map(display => ({
        id: `screen-${display.id}`,
        name: display.name,
        type: 'screen',
        sourceId: display.sourceId,
        width: display.width,
        height: display.height,
        isPrimary: display.isPrimary,
        thumbnail: display.thumbnail,
        isActive: false,
        referenceCount: 0
      }));
      
      // 更新store中的屏幕列表
      screenSources.forEach(source => {
        this.mediaSourceStore.addSource(source);
      });
      
      return screenSources;
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 获取屏幕列表失败:', error);
      throw error;
    } finally {
      this.mediaSourceStore.isLoading = false;
    }
  }

  /**
   * 刷新所有媒体源列表
   */
  public async refreshAllSources(): Promise<void> {
    this.checkInitialized();
    
    console.log('[mediaSourceManager.ts 媒体源管理] 刷新所有媒体源列表');
    this.mediaSourceStore.isLoading = true;
    
    try {
      await Promise.all([
        this.getCameras(),
        this.getWindows(),
        this.getScreens()
      ]);
      
      console.log('[mediaSourceManager.ts 媒体源管理] 所有媒体源刷新完成');
    } catch (error) {
      console.error('[mediaSourceManager.ts 媒体源管理] 刷新媒体源失败:', error);
      throw error;
    } finally {
      this.mediaSourceStore.isLoading = false;
    }
  }

  /**
   * 捕获媒体源
   * @param sourceId 媒体源ID
   * @param config 捕获配置
   * @returns 捕获结果
   */
  public async captureSource(
    sourceId: string,
    config: Partial<MediaSourceCaptureConfig> = {}
  ): Promise<CaptureResult> {
    this.checkInitialized();
    
    // 查找媒体源
    const source = this.getSourceById(sourceId);
    if (!source) {
      return {
        success: false,
        error: `媒体源不存在: ${sourceId}`,
        sourceId
      };
    }
    
    // 检查是否已经有流
    if (source.stream) {
      // 增加引用计数
      this.mediaSourceStore.incrementStreamReferenceCount(sourceId);
      
      // 返回流的克隆，而不是原始流，确保每个使用者都有独立的流实例
      const clonedStream = source.stream.clone();
      
      return {
        success: true,
        stream: clonedStream, // 返回克隆的流
        sourceId,
        width: source.width,
        height: source.height
      };
    }
    
    // 设置加载状态
    this.mediaSourceStore.setSourceLoading(sourceId, true);
    
    try {
      console.log(`[mediaSourceManager.ts 媒体源管理] 开始捕获媒体源: ${sourceId}`);
      
      let result: CaptureResult;
      
      // 根据媒体源类型选择不同的捕获方法
      switch (source.type) {
        case 'camera':
          result = await this.captureCamera(sourceId, config);
          break;
        case 'window':
          result = await this.captureWindow(sourceId, config);
          break;
        case 'screen':
          result = await this.captureScreen(sourceId, config);
          break;
        default:
          throw new Error(`不支持的媒体源类型: ${source.type}`);
      }
      
      if (!result.success || !result.stream) {
        throw new Error(result.error || `捕获媒体源失败: ${sourceId}`);
      }
      
      // 传递尺寸信息到结果中
      if (source.width && source.height) {
        result.width = source.width;
        result.height = source.height;
      }
      
      // 返回流的克隆而不是原始流
      if (result.stream) {
        result.stream = result.stream.clone();
      }
      
      return result;
    } catch (error) {
      console.error(`[mediaSourceManager.ts 媒体源管理] 捕获媒体源失败: ${sourceId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sourceId
      };
    } finally {
      this.mediaSourceStore.setSourceLoading(sourceId, false);
    }
  }

  /**
   * 获取媒体源存储对象
   * @returns 媒体源存储对象
   */
  public getMediaSourceStore(): ReturnType<typeof useMediaSourceStore> {
    this.checkInitialized();
    return this.mediaSourceStore;
  }

  /**
   * 重置媒体流引用计数
   * 用于修复异常状态下的引用计数
   * @param sourceId 媒体源ID
   */
  public resetStreamReferenceCount(sourceId: string): void {
    this.checkInitialized();
    const source = this.getSourceById(sourceId);
    if (source) {
      console.log(`[mediaSourceManager.ts 媒体源管理] 重置媒体源引用计数: ${sourceId}, 从 ${source.referenceCount} 重置为 0`);
      source.referenceCount = 0;
    }
  }
}

// 导出单例实例
export const mediaSourceManager = MediaSourceManager.getInstance();
export default mediaSourceManager; 