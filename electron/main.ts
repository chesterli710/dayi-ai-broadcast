// 使用CommonJS语法
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

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
}

// 创建主进程实例
new MainProcess() 