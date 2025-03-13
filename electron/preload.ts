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
  }
}) 