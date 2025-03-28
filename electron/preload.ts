// 使用CommonJS语法
const { contextBridge, ipcRenderer } = require('electron')

/**
 * 预加载脚本
 * 通过contextBridge安全地暴露Electron API给渲染进程
 * 使用上下文隔离确保渲染进程不能直接访问Node.js API
 */

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 发送消息到主进程
   * @param channel - 通信频道名称
   * @param data - 要发送的数据
   */
  send: (channel, data) => {
    // 白名单频道，只允许特定的频道被使用
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  
  /**
   * 接收来自主进程的消息
   * @param channel - 通信频道名称
   * @param func - 回调函数，处理接收到的数据
   */
  receive: (channel, func) => {
    // 白名单频道，只允许特定的频道被使用
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      // 删除旧的监听器以避免内存泄漏
      ipcRenderer.removeAllListeners(channel)
      // 添加新的监听器
      ipcRenderer.on(channel, (_, ...args) => func(...args))
    }
  },

  /**
   * 检查MacOS上Blackhole是否已安装
   * @returns Promise<boolean> 是否已安装
   */
  checkBlackholeInstalled: () => {
    return ipcRenderer.invoke('check-blackhole-installed')
  },

  /**
   * 检查Windows上立体声混音是否已启用
   * @returns Promise<boolean> 是否已启用
   */
  checkStereoMixEnabled: () => {
    return ipcRenderer.invoke('check-stereo-mix-enabled')
  },

  /**
   * 设置设备音量
   * @param deviceId - 设备ID
   * @param volume - 音量值 (0-100)
   * @returns Promise<boolean> 是否设置成功
   */
  setDeviceVolume: (deviceId, volume) => {
    return ipcRenderer.invoke('set-device-volume', deviceId, volume)
  },

  /**
   * 获取Windows上的默认音频输出设备
   * @returns Promise<string> 默认音频输出设备名称
   */
  getDefaultAudioOutput: () => {
    return ipcRenderer.invoke('get-default-audio-output')
  },

  /**
   * 获取Windows上的所有音频输出设备
   * @returns Promise<{id: string, name: string, isDefault: boolean}[]> 音频输出设备列表
   */
  getAudioOutputDevices: () => {
    return ipcRenderer.invoke('get-audio-output-devices')
  },

  /**
   * 获取系统显卡信息
   * @returns Promise<{vendor: string, model: string}> 显卡信息
   */
  getGPUInfo: () => {
    return ipcRenderer.invoke('get-gpu-info')
  },

  /**
   * 获取系统可用窗口列表
   * @returns Promise<WindowInfo[]> 窗口列表
   */
  getWindows: () => {
    return ipcRenderer.invoke('get-windows')
  },

  /**
   * 获取系统显示器列表
   * @returns Promise<DisplayInfo[]> 显示器列表
   */
  getDisplays: () => {
    return ipcRenderer.invoke('get-displays')
  },

  /**
   * 获取系统摄像头列表
   * @returns Promise<CameraInfo[]> 摄像头列表
   */
  getCameras: () => {
    return ipcRenderer.invoke('get-cameras')
  },

  /**
   * 获取媒体源缩略图
   * @param sourceId 媒体源ID
   * @param sourceType 媒体源类型 ('window'|'screen'|'camera')
   * @param width 缩略图宽度
   * @param height 缩略图高度
   * @returns Promise<string> base64编码的缩略图
   */
  getSourceThumbnail: (sourceId, sourceType, width = 320, height = 180) => {
    return ipcRenderer.invoke('get-source-thumbnail', sourceId, sourceType, width, height)
  },

  /**
   * 捕获窗口
   * @param windowId 窗口ID
   * @param options 捕获选项
   * @returns 捕获结果
   */
  captureWindow: (windowId: string, options?: { frameRate?: number; audio?: boolean }) => {
    return ipcRenderer.invoke('capture-window', { windowId, ...options });
  },

  /**
   * 捕获屏幕
   * @param displayId 显示器ID
   * @param options 捕获选项
   * @returns 捕获结果
   */
  captureScreen: (displayId: string, options?: { frameRate?: number; audio?: boolean }) => {
    return ipcRenderer.invoke('capture-screen', { displayId, ...options });
  },

  /**
   * 停止捕获媒体流
   * @param sourceId 媒体源ID
   * @returns Promise<boolean> 是否成功停止
   */
  stopCapture: (sourceId) => {
    return ipcRenderer.invoke('stop-capture', sourceId)
  },

  /**
   * 桌面捕获器API
   * 用于获取可用的桌面媒体源（屏幕、窗口）
   */
  desktopCapturer: {
    /**
     * 获取可用的桌面媒体源
     * @param options 选项
     * @returns Promise<DesktopCapturerSource[]> 可用的桌面媒体源列表
     */
    getSources: (options) => {
      return ipcRenderer.invoke('desktop-capturer-get-sources', options);
    }
  }
}) 