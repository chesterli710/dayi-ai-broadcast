/**
 * 视频源存储
 * 管理应用的视频捕获设备和视频流
 */
import { defineStore } from 'pinia'
import { ref, computed, onUnmounted, onMounted } from 'vue'
import type { VideoDevice, VideoSourceGroup, VideoPreviewConfig } from '../types/video'
import { VideoSourceType } from '../types/video'
import videoDeviceManager from '../utils/videoDeviceManager'

// 定义视频流状态变更事件类型
interface VideoStreamStateChangeEvent extends CustomEvent {
  detail: {
    deviceId: string;
    isActive: boolean;
  }
}

/**
 * 视频源存储
 * 管理应用的视频捕获设备和视频流
 */
export const useVideoStore = defineStore('video', () => {
  /**
   * 摄像头设备列表
   */
  const cameraDevices = ref<VideoDevice[]>([])
  
  /**
   * 窗口捕获列表
   */
  const windowDevices = ref<VideoDevice[]>([])
  
  /**
   * 显示器捕获列表
   */
  const displayDevices = ref<VideoDevice[]>([])
  
  /**
   * 活跃的视频设备
   */
  const activeDevices = ref<VideoDevice[]>([])
  
  /**
   * 视频预览配置
   */
  const previewConfig = ref<VideoPreviewConfig>({
    width: 320,
    height: 180,
    frameRate: 15,
    quality: 0.7
  })
  
  /**
   * 是否正在加载设备
   */
  const isLoading = ref<boolean>(false)
  
  /**
   * 自动恢复流的标志
   */
  const autoRecoverStreams = ref<boolean>(true)
  
  /**
   * 监听视频流状态变更事件
   */
  function setupStreamStateChangeListener() {
    window.addEventListener('video-stream-state-change', ((event: Event) => {
      // 类型转换
      const customEvent = event as VideoStreamStateChangeEvent;
      handleStreamStateChange(customEvent);
    }) as EventListener);
  }
  
  /**
   * 移除视频流状态变更事件监听
   */
  function removeStreamStateChangeListener() {
    window.removeEventListener('video-stream-state-change', ((event: Event) => {
      // 类型转换
      const customEvent = event as VideoStreamStateChangeEvent;
      handleStreamStateChange(customEvent);
    }) as EventListener);
  }
  
  /**
   * 处理视频流状态变更事件
   * @param event 事件对象
   */
  async function handleStreamStateChange(event: VideoStreamStateChangeEvent) {
    const { deviceId, isActive } = event.detail;
    
    if (!isActive && autoRecoverStreams.value) {
      console.log(`[videoStore.ts 视频存储] 检测到设备 ${deviceId} 流状态变更为不活跃，尝试恢复...`);
      
      // 查找设备类型
      let deviceType: VideoSourceType | undefined;
      let device: VideoDevice | undefined;
      
      // 检查摄像头设备
      device = cameraDevices.value.find(d => d.id === deviceId);
      if (device) {
        deviceType = VideoSourceType.CAMERA;
      }
      
      // 检查窗口设备
      if (!deviceType) {
        device = windowDevices.value.find(d => d.id === deviceId);
        if (device) {
          deviceType = VideoSourceType.WINDOW;
        }
      }
      
      // 检查显示器设备
      if (!deviceType) {
        device = displayDevices.value.find(d => d.id === deviceId);
        if (device) {
          deviceType = VideoSourceType.DISPLAY;
        }
      }
      
      // 如果找到设备类型，尝试重新激活
      if (deviceType && device) {
        console.log(`[videoStore.ts 视频存储] 尝试重新激活设备 ${deviceId} (类型: ${deviceType})`);
        
        // 更新设备状态
        device.isActive = false;
        device.stream = undefined;
        
        // 从活跃设备列表中移除
        const activeIndex = activeDevices.value.findIndex(d => d.id === deviceId);
        if (activeIndex !== -1) {
          activeDevices.value.splice(activeIndex, 1);
        }
        
        // 尝试重新激活设备
        await activateDevice(deviceId, deviceType);
      }
    }
  }
  
  /**
   * 初始化视频设备
   * 获取系统可用的视频设备
   * @param preserveActiveDevices 是否保留已激活的设备流，默认为false
   */
  async function initVideoDevices(preserveActiveDevices = false) {
    isLoading.value = true
    
    try {
      // 保存当前活跃设备列表（如果需要保留）
      const currentActiveDevices = preserveActiveDevices ? [...activeDevices.value] : [];
      
      // 确保视频设备管理器初始化
      // @ts-ignore - 访问内部方法
      if (typeof videoDeviceManager.initialize === 'function') {
        // @ts-ignore
        await videoDeviceManager.initialize();
      }
      
      // 设置流状态变更监听器
      setupStreamStateChangeListener();
      
      // 获取摄像头设备
      const cameras = await videoDeviceManager.getCameraDevices()
      
      // 如果需要保留已激活的设备，则合并设备状态
      if (preserveActiveDevices && currentActiveDevices.length > 0) {
        // 为新获取的设备设置激活状态和流（如果之前已激活）
        for (const camera of cameras) {
          const prevDevice = currentActiveDevices.find(d => d.id === camera.id);
          if (prevDevice && prevDevice.isActive && prevDevice.stream) {
            camera.isActive = true;
            camera.stream = prevDevice.stream;
            console.log(`[videoStore.ts 视频存储] 保留已激活的摄像头: ${camera.id} (${camera.name})`);
          }
        }
      }
      
      cameraDevices.value = cameras
      
      // 更新活跃设备列表
      updateActiveDevices(cameras)
      
      // 获取窗口捕获
      const windows = await videoDeviceManager.getWindowDevices()
      
      // 如果需要保留已激活的设备，则合并设备状态
      if (preserveActiveDevices && currentActiveDevices.length > 0) {
        // 为新获取的设备设置激活状态和流（如果之前已激活）
        for (const window of windows) {
          const prevDevice = currentActiveDevices.find(d => d.id === window.id);
          if (prevDevice && prevDevice.isActive && prevDevice.stream) {
            window.isActive = true;
            window.stream = prevDevice.stream;
            console.log(`[videoStore.ts 视频存储] 保留已激活的窗口: ${window.id} (${window.name})`);
          }
        }
      }
      
      windowDevices.value = windows
      
      // 获取显示器捕获
      const displays = await videoDeviceManager.getDisplayDevices()
      
      // 如果需要保留已激活的设备，则合并设备状态
      if (preserveActiveDevices && currentActiveDevices.length > 0) {
        // 为新获取的设备设置激活状态和流（如果之前已激活）
        for (const display of displays) {
          const prevDevice = currentActiveDevices.find(d => d.id === display.id);
          if (prevDevice && prevDevice.isActive && prevDevice.stream) {
            display.isActive = true;
            display.stream = prevDevice.stream;
            console.log(`[videoStore.ts 视频存储] 保留已激活的显示器: ${display.id} (${display.name})`);
          }
        }
      }
      
      displayDevices.value = displays
      
      // 如果需要保留活跃设备，合并活跃设备列表
      if (preserveActiveDevices) {
        const allDevices = [...cameras, ...windows, ...displays];
        const activeDevicesAfterInit = allDevices.filter(device => device.isActive);
        
        // 确保活跃设备列表包含所有活跃设备
        activeDevices.value = activeDevicesAfterInit;
        console.log(`[videoStore.ts 视频存储] 初始化后保留了 ${activeDevicesAfterInit.length} 个活跃设备`);
      }
      
      return {
        success: true,
        cameras: cameras.length,
        windows: windows.length,
        displays: displays.length
      }
    } catch (error) {
      console.error('[videoStore.ts 视频存储] 初始化视频设备失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 更新活跃设备列表
   * @param devices 设备列表
   */
  function updateActiveDevices(devices: VideoDevice[]) {
    // 找出活跃的设备
    const active = devices.filter(device => device.isActive)
    
    // 更新活跃设备列表
    activeDevices.value = active
  }
  
  /**
   * 刷新视频设备列表
   * @param preserveActiveDevices 是否保留已激活的设备流，默认为false
   */
  async function refreshDevices(preserveActiveDevices = false) {
    return await initVideoDevices(preserveActiveDevices)
  }
  
  /**
   * 激活视频设备
   * @param deviceId 设备ID
   * @param type 设备类型
   */
  async function activateDevice(deviceId: string, type: VideoSourceType): Promise<boolean> {
    try {
      // 检查设备是否已激活
      const isActive = activeDevices.value.some(d => d.id === deviceId);
      if (isActive) {
        console.log(`[videoStore.ts 视频存储] 设备 ${deviceId} 已激活`);
        return true;
      }
      
      console.log(`[videoStore.ts 视频存储] 激活设备 ${deviceId} (类型: ${type})`);
      
      // 根据类型获取视频流
      let stream: MediaStream | null = null;
      let device: VideoDevice | undefined;
      
      switch (type) {
        case VideoSourceType.CAMERA:
          // 查找设备
          device = cameraDevices.value.find(d => d.id === deviceId);
          if (device) {
            // 获取摄像头视频流
            stream = await videoDeviceManager.getCameraStream(deviceId);
          }
          break;
        case VideoSourceType.WINDOW:
          // 查找设备
          device = windowDevices.value.find(d => d.id === deviceId);
          if (device) {
            // 获取窗口视频流
            stream = await videoDeviceManager.getWindowStream(device.sourceId || deviceId);
          }
          break;
        case VideoSourceType.DISPLAY:
          // 查找设备
          device = displayDevices.value.find(d => d.id === deviceId);
          if (device) {
            // 获取显示器视频流
            stream = await videoDeviceManager.getDisplayStream(device.sourceId || deviceId);
          }
          break;
      }
      
      // 如果获取到流，添加到活跃设备列表
      if (stream && device) {
        console.log(`[videoStore.ts 视频存储] 成功获取设备 ${deviceId} 的视频流`);
        
        // 更新设备信息
        device.stream = stream;
        device.isActive = true;
        
        // 添加到活跃设备列表
        activeDevices.value.push({ ...device });
        
        // 记录设备类型
        // @ts-ignore - 访问内部方法
        if (typeof videoDeviceManager.recordDeviceType === 'function') {
          // @ts-ignore
          videoDeviceManager.recordDeviceType(deviceId, type);
        }
        
        return true;
      } else {
        console.warn(`[videoStore.ts 视频存储] 无法获取设备 ${deviceId} 的视频流`);
        return false;
      }
    } catch (error) {
      console.error(`[videoStore.ts 视频存储] 激活设备 ${deviceId} 失败:`, error);
      return false;
    }
  }
  
  /**
   * 停用视频设备
   * @param deviceId 设备ID
   */
  function deactivateDevice(deviceId: string): boolean {
    try {
      console.log(`[videoStore.ts 视频存储] 停用设备 ${deviceId}`);
      
      // 停止视频流
      videoDeviceManager.stopStream(deviceId);
      
      // 从活跃设备列表中移除
      const index = activeDevices.value.findIndex(d => d.id === deviceId);
      if (index !== -1) {
        // 更新设备状态
        const device = activeDevices.value[index];
        device.isActive = false;
        device.stream = undefined;
        
        // 移除设备
        activeDevices.value.splice(index, 1);
      }
      
      // 更新相应设备列表中的状态
      updateDeviceStatus(deviceId, false);
      
      return true;
    } catch (error) {
      console.error(`[videoStore.ts 视频存储] 停用设备 ${deviceId} 失败:`, error);
      return false;
    }
  }
  
  /**
   * 更新设备状态
   * @param deviceId 设备ID
   * @param isActive 是否活跃
   */
  function updateDeviceStatus(deviceId: string, isActive: boolean) {
    // 更新摄像头设备状态
    const cameraDevice = cameraDevices.value.find(d => d.id === deviceId);
    if (cameraDevice) {
      cameraDevice.isActive = isActive;
      if (!isActive) {
        cameraDevice.stream = undefined;
      }
    }
    
    // 更新窗口设备状态
    const windowDevice = windowDevices.value.find(d => d.id === deviceId);
    if (windowDevice) {
      windowDevice.isActive = isActive;
      if (!isActive) {
        windowDevice.stream = undefined;
      }
    }
    
    // 更新显示器设备状态
    const displayDevice = displayDevices.value.find(d => d.id === deviceId);
    if (displayDevice) {
      displayDevice.isActive = isActive;
      if (!isActive) {
        displayDevice.stream = undefined;
      }
    }
  }
  
  /**
   * 设置预览配置
   * @param config 预览配置
   */
  function setPreviewConfig(config: Partial<VideoPreviewConfig>) {
    previewConfig.value = {
      ...previewConfig.value,
      ...config
    }
  }
  
  /**
   * 清理所有资源
   */
  function cleanup() {
    try {
      console.log('[videoStore.ts 视频存储] 清理所有资源');
      
      // 停止所有视频流
      videoDeviceManager.stopAllStreams();
      
      // 清理视频设备管理器资源
      // @ts-ignore - 访问内部方法
      if (typeof videoDeviceManager.cleanup === 'function') {
        // @ts-ignore
        videoDeviceManager.cleanup();
      }
      
      // 清空活跃设备列表
      activeDevices.value = [];
      
      // 更新所有设备状态
      updateAllDevicesStatus(false);
    } catch (error) {
      console.error('[videoStore.ts 视频存储] 清理资源失败:', error);
    }
  }
  
  /**
   * 更新所有设备状态
   * @param isActive 是否活跃
   */
  function updateAllDevicesStatus(isActive: boolean) {
    // 更新摄像头设备
    cameraDevices.value.forEach(device => {
      device.isActive = isActive;
      if (!isActive) {
        device.stream = undefined;
      }
    });
    
    // 更新窗口设备
    windowDevices.value.forEach(device => {
      device.isActive = isActive;
      if (!isActive) {
        device.stream = undefined;
      }
    });
    
    // 更新显示器设备
    displayDevices.value.forEach(device => {
      device.isActive = isActive;
      if (!isActive) {
        device.stream = undefined;
      }
    });
  }
  
  /**
   * 计算属性：所有视频源分组
   */
  const videoSourceGroups = computed<VideoSourceGroup[]>(() => {
    return [
      {
        type: VideoSourceType.CAMERA,
        title: '设备捕获',
        sources: cameraDevices.value
      },
      {
        type: VideoSourceType.WINDOW,
        title: '窗口捕获',
        sources: windowDevices.value
      },
      {
        type: VideoSourceType.DISPLAY,
        title: '显示器捕获',
        sources: displayDevices.value
      }
    ]
  })
  
  /**
   * 计算属性：是否有可用的视频设备
   */
  const hasVideoDevices = computed<boolean>(() => {
    return cameraDevices.value.length > 0 || 
           windowDevices.value.length > 0 || 
           displayDevices.value.length > 0
  })
  
  // 组件挂载时设置监听器
  onMounted(() => {
    setupStreamStateChangeListener();
  });
  
  // 组件卸载时清理资源
  onUnmounted(() => {
    cleanup();
  });
  
  return {
    cameraDevices,
    windowDevices,
    displayDevices,
    activeDevices,
    previewConfig,
    isLoading,
    autoRecoverStreams,
    videoSourceGroups,
    hasVideoDevices,
    initVideoDevices,
    refreshDevices,
    activateDevice,
    deactivateDevice,
    setPreviewConfig,
    cleanup
  }
}) 