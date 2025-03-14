# ElectronAPI 全局统一调用规范

## 概述

本文档规定了大医AI导播系统中ElectronAPI的统一调用规范，确保在整个项目中对Electron功能的调用保持一致性，提高代码可维护性和可读性。

## 基本原则

1. **安全检查优先**：在调用任何ElectronAPI方法前，必须先检查API是否可用
2. **类型安全**：确保所有API调用都有正确的类型声明
3. **错误处理**：所有API调用都应包含适当的错误处理机制
4. **统一入口**：通过`window.electronAPI`作为统一入口访问所有Electron功能

## API定义与类型声明

所有ElectronAPI的类型定义统一在`src/types/electron.d.ts`文件中声明：

```typescript
interface IElectronAPI {
  // 发送消息到主进程
  send: (channel: string, data: any) => void;
  
  // 接收来自主进程的消息
  receive: (channel: string, func: (...args: any[]) => void) => void;

  // 检查MacOS上Blackhole是否已安装
  checkBlackholeInstalled: () => Promise<boolean>;

  // 检查Windows上立体声混音是否已启用
  checkStereoMixEnabled: () => Promise<boolean>;

  // 获取系统显卡信息
  getGPUInfo: () => Promise<{vendor: string, model: string}>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
```

## 预加载脚本实现

在`electron/preload.ts`中，通过`contextBridge.exposeInMainWorld`方法将API暴露给渲染进程：

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  
  receive: (channel, func) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
      ipcRenderer.on(channel, (_, ...args) => func(...args))
    }
  },

  checkBlackholeInstalled: () => {
    return ipcRenderer.invoke('check-blackhole-installed')
  },

  checkStereoMixEnabled: () => {
    return ipcRenderer.invoke('check-stereo-mix-enabled')
  },

  getGPUInfo: () => {
    return ipcRenderer.invoke('get-gpu-info')
  }
})
```

## 主进程实现

在`electron/main.ts`中，通过`ipcMain.handle`方法处理来自渲染进程的请求：

```typescript
setupIPC() {
  // 检查MacOS上Blackhole是否已安装
  ipcMain.handle('check-blackhole-installed', async () => {
    // 实现逻辑
  })

  // 检查Windows上立体声混音是否已启用
  ipcMain.handle('check-stereo-mix-enabled', async () => {
    // 实现逻辑
  })

  // 获取系统GPU信息
  ipcMain.handle('get-gpu-info', async () => {
    // 实现逻辑
  })
}
```

## 渲染进程调用规范

在渲染进程中调用ElectronAPI时，必须遵循以下规范：

### 1. 检查API可用性

在调用任何ElectronAPI方法前，必须先检查API是否可用：

```typescript
/**
 * 检查Electron API是否可用
 * @returns boolean 是否可用
 */
private isElectronAPIAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}
```

### 2. 安全调用API

使用可选链操作符和类型检查确保安全调用：

```typescript
if (this.isElectronAPIAvailable() && window.electronAPI?.getGPUInfo) {
  const gpuInfo = await window.electronAPI.getGPUInfo();
  // 处理返回数据
}
```

### 3. 错误处理

所有API调用都应包含适当的错误处理机制：

```typescript
try {
  if (this.isElectronAPIAvailable() && window.electronAPI?.getGPUInfo) {
    const gpuInfo = await window.electronAPI.getGPUInfo();
    // 处理返回数据
  }
} catch (error) {
  console.error('调用ElectronAPI失败:', error);
  // 错误处理逻辑
}
```

## 示例代码

以下是一个完整的示例，展示如何在渲染进程中正确调用ElectronAPI：

```typescript
class GPUDetector {
  async getGPUInfo(): Promise<GPUInfo> {
    try {
      // 在Electron环境中，通过IPC调用主进程获取GPU信息
      if (this.isElectronAPIAvailable() && window.electronAPI?.getGPUInfo) {
        const gpuInfo = await window.electronAPI.getGPUInfo();
        return this.parseGPUInfo(gpuInfo);
      }
      
      // 如果不在Electron环境或API不可用，使用备选方案
      return this.getGPUInfoFromWebGL();
    } catch (error) {
      console.error('获取GPU信息失败:', error);
      return {
        vendor: GPUVendor.UNKNOWN,
        model: 'Unknown'
      };
    }
  }
  
  private isElectronAPIAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI;
  }
}
```

## 添加新的API

当需要添加新的ElectronAPI时，需要遵循以下步骤：

1. 在`src/types/electron.d.ts`中添加新API的类型定义
2. 在`electron/preload.ts`中实现API并通过`contextBridge`暴露
3. 在`electron/main.ts`中通过`ipcMain.handle`处理API请求
4. 在渲染进程中按照上述规范调用新API

## 注意事项

1. 不要在渲染进程中直接使用Node.js API，所有需要Node.js功能的操作都应通过ElectronAPI进行
2. 所有IPC通信都应使用白名单机制，只允许预定义的通道被使用
3. 在处理用户输入时，应进行适当的验证和清理，防止安全风险
4. 对于可能耗时的操作，应考虑使用异步方法并提供适当的用户反馈

## 总结

通过遵循本文档规定的ElectronAPI调用规范，可以确保项目中对Electron功能的调用保持一致性，提高代码质量和可维护性，同时减少潜在的错误和安全风险。 