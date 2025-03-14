// 使用CommonJS语法
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')

/**
 * Electron主进程类
 * 负责创建窗口、管理应用生命周期和进程间通信
 */
class MainProcess {
  // 类属性声明
  mainWindow;
  isDevelopment;

  constructor() {
    this.mainWindow = null
    this.isDevelopment = process.env.NODE_ENV !== 'production'
    this.initApp()
    this.setupIPC()
  }

  /**
   * 初始化应用，设置应用事件监听器
   */
  initApp() {
    // 当Electron完成初始化时创建窗口
    app.whenReady().then(() => {
      this.createWindow()
      
      // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建一个窗口
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow()
        }
      })
    })

    // 当所有窗口关闭时退出应用，除了在macOS上
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
  }

  /**
   * 创建主窗口
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 1600,
      minHeight: 1000,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        // webSecurity: false, // 禁用web安全策略，允许跨域请求
      },
    })

    // 加载应用
    if (this.isDevelopment) {
      // 开发环境下加载本地服务器
      this.mainWindow.loadURL('http://localhost:5173')
      // 打开开发者工具
      this.mainWindow.webContents.openDevTools()
    } else {
      // 生产环境下加载打包后的文件
      this.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // 窗口关闭时释放资源
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
  }

  /**
   * 设置IPC通信
   */
  setupIPC() {
    // 检查MacOS上Blackhole是否已安装
    ipcMain.handle('check-blackhole-installed', async () => {
      try {
        if (process.platform !== 'darwin') {
          return false
        }
        
        // 使用命令行检查Blackhole是否已安装
        const result = execSync('system_profiler SPAudioDataType | grep "BlackHole"').toString()
        return result.includes('BlackHole')
      } catch (error) {
        console.error('检查Blackhole安装状态失败:', error)
        return false
      }
    })

    // 检查Windows上立体声混音是否已启用
    ipcMain.handle('check-stereo-mix-enabled', async () => {
      try {
        if (process.platform !== 'win32') {
          return false
        }
        
        // 在Windows上检查立体声混音是否已启用
        // 这里简化实现，实际应该使用Windows API
        const result = execSync('powershell "Get-WmiObject Win32_SoundDevice | Select-Object Name"').toString()
        return result.toLowerCase().includes('stereo mix') || result.toLowerCase().includes('立体声混音')
      } catch (error) {
        console.error('检查立体声混音状态失败:', error)
        return false
      }
    })

    // 获取系统GPU信息
    ipcMain.handle('get-gpu-info', async () => {
      try {
        let vendor = 'unknown'
        let model = 'Unknown'
        
        // 根据不同平台获取GPU信息
        if (process.platform === 'darwin') {
          // MacOS
          const result = execSync('system_profiler SPDisplaysDataType').toString()
          
          if (result.includes('Apple M')) {
            vendor = 'apple'
            // 提取M系列芯片型号
            const match = result.match(/Chip Model: Apple (M\d+)/)
            model = match ? match[1] : 'Apple Silicon'
          } else if (result.includes('NVIDIA')) {
            vendor = 'nvidia'
            // 提取NVIDIA显卡型号
            const match = result.match(/Chipset Model: (NVIDIA.+?)(?:\n|$)/)
            model = match ? match[1] : 'NVIDIA GPU'
          } else if (result.includes('AMD') || result.includes('ATI')) {
            vendor = 'amd'
            // 提取AMD显卡型号
            const match = result.match(/Chipset Model: (AMD.+?)(?:\n|$)/)
            model = match ? match[1] : 'AMD GPU'
          } else if (result.includes('Intel')) {
            vendor = 'intel'
            // 提取Intel显卡型号
            const match = result.match(/Chipset Model: (Intel.+?)(?:\n|$)/)
            model = match ? match[1] : 'Intel GPU'
          }
        } else if (process.platform === 'win32') {
          // Windows
          const result = execSync('wmic path win32_VideoController get name').toString()
          
          if (result.toLowerCase().includes('nvidia')) {
            vendor = 'nvidia'
            // 提取NVIDIA显卡型号
            const match = result.match(/NVIDIA (.+?)(?:\r|\n|$)/)
            model = match ? match[1].trim() : 'NVIDIA GPU'
          } else if (result.toLowerCase().includes('amd') || result.toLowerCase().includes('radeon')) {
            vendor = 'amd'
            // 提取AMD显卡型号
            const match = result.match(/(AMD|Radeon) (.+?)(?:\r|\n|$)/)
            model = match ? match[0].trim() : 'AMD GPU'
          } else if (result.toLowerCase().includes('intel')) {
            vendor = 'intel'
            // 提取Intel显卡型号
            const match = result.match(/Intel (.+?)(?:\r|\n|$)/)
            model = match ? match[1].trim() : 'Intel GPU'
          }
        } else {
          // Linux或其他平台
          try {
            const result = execSync('lspci | grep -i vga').toString()
            
            if (result.toLowerCase().includes('nvidia')) {
              vendor = 'nvidia'
              const match = result.match(/NVIDIA (.+?)(?:\[|\(|$)/)
              model = match ? match[1].trim() : 'NVIDIA GPU'
            } else if (result.toLowerCase().includes('amd') || result.toLowerCase().includes('radeon')) {
              vendor = 'amd'
              const match = result.match(/(AMD|Radeon) (.+?)(?:\[|\(|$)/)
              model = match ? match[0].trim() : 'AMD GPU'
            } else if (result.toLowerCase().includes('intel')) {
              vendor = 'intel'
              const match = result.match(/Intel (.+?)(?:\[|\(|$)/)
              model = match ? match[1].trim() : 'Intel GPU'
            }
          } catch (error) {
            console.error('Linux获取GPU信息失败:', error)
          }
        }
        
        return { vendor, model }
      } catch (error) {
        console.error('获取GPU信息失败:', error)
        return { vendor: 'unknown', model: 'Unknown' }
      }
    })
  }
}

// 创建主进程实例
new MainProcess() 