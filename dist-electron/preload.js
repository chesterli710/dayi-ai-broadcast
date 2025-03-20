"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * 发送消息到主进程
   * @param channel - 通信频道名称
   * @param data - 要发送的数据
   */
  send: (channel, data) => {
    const validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  /**
   * 接收来自主进程的消息
   * @param channel - 通信频道名称
   * @param func - 回调函数，处理接收到的数据
   */
  receive: (channel, func) => {
    const validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (_, ...args) => func(...args));
    }
  },
  /**
   * 检查MacOS上Blackhole是否已安装
   * @returns Promise<boolean> 是否已安装
   */
  checkBlackholeInstalled: () => {
    return ipcRenderer.invoke("check-blackhole-installed");
  },
  /**
   * 检查Windows上立体声混音是否已启用
   * @returns Promise<boolean> 是否已启用
   */
  checkStereoMixEnabled: () => {
    return ipcRenderer.invoke("check-stereo-mix-enabled");
  },
  /**
   * 检查Windows上WASAPI捕获是否可用
   * @returns Promise<boolean> 是否可用
   */
  checkWasapiAvailable: () => {
    return ipcRenderer.invoke("check-wasapi-available");
  },
  /**
   * 启动WASAPI音频捕获
   * @param deviceId - 可选的输出设备ID，如果不提供则使用默认输出设备
   * @returns Promise<MediaStream> 捕获的媒体流
   */
  startWasapiCapture: (deviceId) => {
    return ipcRenderer.invoke("start-wasapi-capture", deviceId);
  },
  /**
   * 停止WASAPI音频捕获
   */
  stopWasapiCapture: () => {
    return ipcRenderer.invoke("stop-wasapi-capture");
  },
  /**
   * 获取WASAPI音频电平
   * @param deviceId - 可选的输出设备ID，如果不提供则使用当前捕获的设备
   * @returns Promise<number> 音频电平 (0-100)
   */
  getWasapiAudioLevel: (deviceId) => {
    return ipcRenderer.invoke("get-wasapi-audio-level", deviceId);
  },
  /**
   * 设置设备音量
   * @param deviceId - 设备ID
   * @param volume - 音量值 (0-100)
   * @returns Promise<boolean> 是否设置成功
   */
  setDeviceVolume: (deviceId, volume) => {
    return ipcRenderer.invoke("set-device-volume", deviceId, volume);
  },
  /**
   * 获取Windows上的默认音频输出设备
   * @returns Promise<string> 默认音频输出设备名称
   */
  getDefaultAudioOutput: () => {
    return ipcRenderer.invoke("get-default-audio-output");
  },
  /**
   * 获取Windows上的所有音频输出设备
   * @returns Promise<{id: string, name: string, isDefault: boolean}[]> 音频输出设备列表
   */
  getAudioOutputDevices: () => {
    return ipcRenderer.invoke("get-audio-output-devices");
  },
  /**
   * 获取系统显卡信息
   * @returns Promise<{vendor: string, model: string}> 显卡信息
   */
  getGPUInfo: () => {
    return ipcRenderer.invoke("get-gpu-info");
  },
  /**
   * 获取系统可用窗口列表
   * @returns Promise<WindowInfo[]> 窗口列表
   */
  getWindows: () => {
    return ipcRenderer.invoke("get-windows");
  },
  /**
   * 获取系统显示器列表
   * @returns Promise<DisplayInfo[]> 显示器列表
   */
  getDisplays: () => {
    return ipcRenderer.invoke("get-displays");
  }
});
