/**
 * Electron API类型声明
 * 为渲染进程中使用的Electron API提供类型支持
 */
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
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
} 