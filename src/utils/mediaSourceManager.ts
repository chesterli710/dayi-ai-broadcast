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
import { ref, computed } from 'vue';
import type { WindowInfo, DisplayInfo, CameraInfo } from '../types/video';
import type { AudioOutputDeviceInfo } from '../types/audio';

/**
 * Electron API 类型定义
 */
interface IElectronAPI {
  // 全局通信方法
  send?: (channel: string, ...args: any[]) => void;
  receive?: (channel: string, func: (...args: any[]) => void) => void;
  
  // 媒体设备相关
  getCameras: () => Promise<{success: boolean, message: string, error?: string}>;
  getSourceThumbnail: (sourceId: string, sourceType: string, width?: number, height?: number) => Promise<string | null>;
  
  // 媒体捕获相关
  captureWindow: (sourceId: string, options: any) => Promise<{success: boolean, sourceId: string, message?: string, error?: string}>;
  captureScreen: (sourceId: string, options: any) => Promise<{success: boolean, sourceId: string, message?: string, error?: string}>;
  stopCapture: (sourceId: string) => Promise<{success: boolean, sourceId: string, message?: string, error?: string}>;
  
  // 桌面捕获器
  desktopCapturer: {
    getSources: (options: { 
      types: string[], 
      thumbnailSize?: { width: number, height: number }, 
      fetchWindowIcons?: boolean 
    }) => Promise<any[]>;
  };
  
  // 其他API...
  checkBlackholeInstalled?: () => Promise<boolean>;
  checkStereoMixEnabled?: () => Promise<boolean>;
  checkWasapiAvailable?: () => Promise<boolean>;
  startWasapiCapture?: (deviceId?: string) => Promise<any>;
  stopWasapiCapture?: () => Promise<void>;
  getWasapiAudioLevel?: (deviceId?: string) => Promise<number>;
  setDeviceVolume?: (deviceId: string, volume: number) => Promise<boolean>;
  getDefaultAudioOutput?: () => Promise<string>;
  getAudioOutputDevices?: () => Promise<any[]>;
  getGPUInfo?: () => Promise<any>;
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
 * 摄像头黑名单
 * 这些虚拟摄像头可能会导致捕获错误
 */
const CAMERA_BLACKLIST = [
  'vmix', 
  'gxplayer',
];

// Electron桌面捕获器选项类型
interface DesktopCapturerOptions {
  types: string[];
  thumbnailSize?: {
    width: number;
    height: number;
  };
  fetchWindowIcons?: boolean;
}

// Electron桌面捕获源类型
interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: Electron.NativeImage;
  display_id?: string;
  appIcon?: Electron.NativeImage;
}

/**
 * 扩展的Electron API接口，用于类型安全
 */
export interface ExtendedElectronAPI {
  send: (channel: string, data: unknown) => void;
  receive: (channel: string, func: (...args: unknown[]) => void) => void;
  
  // 音频设备相关
  checkBlackholeInstalled?: () => Promise<boolean>;
  checkStereoMixEnabled?: () => Promise<boolean>;
  
  // 设备音量控制
  setDeviceVolume?: (deviceId: string, volume: number) => Promise<boolean>;
  
  // 获取设备信息
  getDefaultAudioOutput?: () => Promise<string>;
  getAudioOutputDevices?: () => Promise<AudioOutputDeviceInfo[]>;
  
  // 获取系统信息
  getGPUInfo?: () => Promise<{ vendor: string; model: string }>;
  
  // 系统窗口和显示器
  getWindows?: () => Promise<WindowInfo[]>;
  getDisplays?: () => Promise<DisplayInfo[]>;
  
  // 摄像头相关
  getCameras?: () => Promise<CameraInfo[]>;
  
  // 媒体源缩略图
  getSourceThumbnail?: (sourceId: string, sourceType: 'window'|'screen'|'camera', width?: number, height?: number) => Promise<string>;
  
  // 捕获媒体源
  captureWindow?: (options: { windowId: string; frameRate?: number; audio?: boolean }) => Promise<any>;
  captureScreen?: (options: { displayId: string; frameRate?: number; audio?: boolean }) => Promise<any>;
  stopCapture?: (sourceId: string) => Promise<boolean>;
  
  // 桌面捕获器
  desktopCapturer?: {
    getSources: (options: DesktopCapturerOptions) => Promise<DesktopCapturerSource[]>;
  };
}

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
      
      console.log(`[mediaSourceManager.ts 媒体源管理] 捕获窗口: ${sourceId}`);

      // 使用desktopCapturer提供的sourceId直接构建媒体约束
      // 使用any类型绕过TypeScript对Electron特有约束的检查
      const constraints: any = {
        audio: false, // 通常窗口捕获不包含音频，如需音频需要额外处理
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 8192,
            minHeight: 720,
            maxHeight: 4320
          }
        }
      };

      // 设置帧率 (如果提供)
      if (config.frameRate) {
        constraints.video.mandatory.maxFrameRate = config.frameRate;
      }

      return await this.captureStream(sourceId, constraints);
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
      
      console.log(`[mediaSourceManager.ts 媒体源管理] 捕获屏幕: ${sourceId}`);

      // 使用desktopCapturer提供的sourceId直接构建媒体约束
      // 使用any类型绕过TypeScript对Electron特有约束的检查
      const constraints: any = {
        audio: false, // 通常屏幕捕获不包含音频，如需音频需要额外处理
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 8192,
            minHeight: 720,
            maxHeight: 4320
          }
        }
      };

      // 设置帧率 (如果提供)
      if (config.frameRate) {
        constraints.video.mandatory.maxFrameRate = config.frameRate;
      }

      return await this.captureStream(sourceId, constraints);
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
      
      // 筛选出不在黑名单中的摄像头
      const filteredDevices = videoDevices.filter(device => {
        // 没有标签的设备（可能是未激活的设备）不进行过滤
        if (!device.label) return true;
        
        // 检查设备名称是否包含黑名单关键词（不区分大小写）
        const deviceLabelLower = device.label.toLowerCase();
        const isBlacklisted = CAMERA_BLACKLIST.some(keyword => deviceLabelLower.includes(keyword.toLowerCase()));
        
        // 保留OBS虚拟摄像头，即使它可能包含黑名单关键词
        const isObsCamera = deviceLabelLower.includes('obs') && deviceLabelLower.includes('virtual camera');
        
        // 如果设备被列入黑名单但不是OBS虚拟摄像头，则排除
        if (isBlacklisted && !isObsCamera) {
          console.log(`[mediaSourceManager.ts 媒体源管理] 排除黑名单摄像头: ${device.label}`);
          return false;
        }
        
        return true;
      });
      
      console.log(`[mediaSourceManager.ts 媒体源管理] 找到 ${videoDevices.length} 个摄像头设备，过滤后剩余 ${filteredDevices.length} 个`);
      
      // 转换为CameraSource格式
      const cameraSources: CameraSource[] = filteredDevices.map((device, index) => ({
        id: device.deviceId, // 使用原始deviceId
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
      
      // 使用Electron API获取窗口列表
      if (!window.electronAPI) {
        throw new Error('Electron API不可用');
      }
      
      // 调用预加载脚本中的desktopCapturer.getSources
      const sources = await window.electronAPI.desktopCapturer.getSources({
        types: ['window'], // 只获取窗口类型的源
        thumbnailSize: { width: 150, height: 150 }, // 缩略图尺寸
        fetchWindowIcons: true // 获取窗口图标
      });
      
      console.log(`[mediaSourceManager.ts 媒体源管理] 找到 ${sources.length} 个窗口`);
      
      // 转换为WindowSource格式
      const windowSources: WindowSource[] = sources.map((source: any) => ({
        id: source.id, // 使用desktopCapturer提供的id
        name: source.name || '未知窗口',
        type: 'window',
        sourceId: source.id, // desktopCapturer提供的id直接用作sourceId
        appIcon: source.appIcon || '', // 已经是Data URL格式
        thumbnail: source.thumbnail || '', // 已经是Data URL格式
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
      
      // 使用Electron API获取屏幕列表
      if (!window.electronAPI) {
        throw new Error('Electron API不可用');
      }
      
      // 调用预加载脚本中的desktopCapturer.getSources
      const sources = await window.electronAPI.desktopCapturer.getSources({
        types: ['screen'], // 只获取屏幕类型的源
        thumbnailSize: { width: 150, height: 150 }, // 缩略图尺寸
        fetchWindowIcons: false // 不需要获取窗口图标
      });
      
      console.log(`[mediaSourceManager.ts 媒体源管理] 找到 ${sources.length} 个屏幕`);
      
      // 转换为ScreenSource格式
      const screenSources: ScreenSource[] = sources.map((source: any, index: number) => ({
        id: source.id, // 使用desktopCapturer提供的id
        name: source.name || `屏幕 ${index + 1}`,
        type: 'screen',
        sourceId: source.id, // desktopCapturer提供的id直接用作sourceId
        width: source.display_id ? source.display_id.width : 0,
        height: source.display_id ? source.display_id.height : 0,
        isPrimary: source.display_id ? source.display_id.isPrimary : false,
        thumbnail: source.thumbnail || '', // 已经是Data URL格式
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
      // 并行执行获取所有媒体源的操作
      const [cameras, windows, screens] = await Promise.all([
        this.getCameras(),
        this.getWindows(),
        this.getScreens()
      ]);
      
      console.log('[mediaSourceManager.ts 媒体源管理] 所有媒体源刷新完成');
      console.log(`[mediaSourceManager.ts 媒体源管理] 摄像头: ${cameras.length}, 窗口: ${windows.length}, 屏幕: ${screens.length}`);
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