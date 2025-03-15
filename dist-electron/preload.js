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
   * 获取系统显卡信息
   * @returns Promise<{vendor: string, model: string}> 显卡信息
   */
  getGPUInfo: () => {
    return ipcRenderer.invoke("get-gpu-info");
  },
  /**
   * 获取系统可用窗口列表
   * @returns Promise<Array<{id: string, name: string, appIcon: string|null, thumbnail: string}>> 窗口列表
   */
  getWindows: () => {
    return ipcRenderer.invoke("get-windows");
  },
  /**
   * 获取系统显示器列表
   * @returns Promise<Array<{id: string, name: string, width: number, height: number, isPrimary: boolean, thumbnail: string|null}>> 显示器列表
   */
  getDisplays: () => {
    return ipcRenderer.invoke("get-displays");
  }
});
