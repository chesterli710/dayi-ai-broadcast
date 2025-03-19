// 使用CommonJS语法
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')
const fs = require('fs')
const electronScreen = require('electron').screen

/**
 * 日志工具类
 * 负责记录应用运行日志，同时输出到控制台和文件
 */
class Logger {
  logFile;
  
  constructor() {
    // 确定日志文件路径
    const userDataPath = app.getPath('userData');
    const logDir = path.join(userDataPath, 'logs');
    
    // 创建日志目录
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (err) {
        console.error('创建日志目录失败:', err);
      }
    }
    
    // 日志文件名格式: app-YYYY-MM-DD.log
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.logFile = path.join(logDir, `app-${dateStr}.log`);
    
    this.info('日志系统初始化成功', `日志文件: ${this.logFile}`);
    this.info('系统信息', {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      osVersion: os.release(),
      osType: os.type(),
      isDev: process.env.NODE_ENV !== 'production'
    });
  }
  
  /**
   * 写入日志到文件
   */
  writeToFile(level, message) {
    if (!this.logFile) return;
    
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level}] ${message}\n`;
      
      fs.appendFileSync(this.logFile, logEntry);
    } catch (err) {
      console.error('写入日志文件失败:', err);
    }
  }
  
  /**
   * 记录信息日志
   */
  info(message: string, data: any = null) {
    const logMsg = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.log(`[INFO] ${logMsg}`);
    this.writeToFile('INFO', logMsg);
  }
  
  /**
   * 记录警告日志
   */
  warn(message: string, data: any = null) {
    const logMsg = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.warn(`[WARN] ${logMsg}`);
    this.writeToFile('WARN', logMsg);
  }
  
  /**
   * 记录错误日志
   */
  error(message: string, error: any = null) {
    let logMsg = message;
    
    if (error) {
      if (typeof error === 'object' && error !== null && 'message' in error && 'stack' in error) {
        logMsg += `: ${error.message}\n${error.stack}`;
      } else {
        logMsg += `: ${JSON.stringify(error)}`;
      }
    }
    
    console.error(`[ERROR] ${logMsg}`);
    this.writeToFile('ERROR', logMsg);
  }
}

/**
 * Electron主进程类
 * 负责创建窗口、管理应用生命周期和进程间通信
 */
class MainProcess {
  // 类属性声明
  mainWindow;
  isDevelopment;
  logger;

  constructor() {
    this.mainWindow = null
    this.isDevelopment = !app.isPackaged && process.env.NODE_ENV !== 'production'
    
    // 初始化日志系统
    this.logger = new Logger();
    
    // 记录应用是否打包的状态
    this.logger.info('应用环境检测', {
      isPackaged: app.isPackaged,
      envNodeEnv: process.env.NODE_ENV,
      isDevelopment: this.isDevelopment
    });
    
    // 记录环境变量
    this.logger.info('环境变量', {
      VITE_USE_MOCK: process.env.VITE_USE_MOCK,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
      VITE_APP_TITLE: process.env.VITE_APP_TITLE
    });
    
    // 设置全局未捕获异常处理器
    this.setupExceptionHandlers();
    
    this.logger.info('主进程启动');
    this.initApp()
    this.setupIPC()
  }

  /**
   * 设置全局异常处理
   */
  setupExceptionHandlers() {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      this.logger.error('未捕获的异常', error);
    });
    
    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('未处理的Promise拒绝', reason);
    });
  }

  /**
   * 初始化应用，设置应用事件监听器
   */
  initApp() {
    try {
      // 禁用macOS上的新屏幕捕获API，以解决某些窗口无法捕获缩略图的问题
      if (process.platform === 'darwin') {
        this.logger.info('正在为macOS配置屏幕捕获参数');
        app.commandLine.appendSwitch('disable-features', 'ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma');
      }
      
      // 当Electron完成初始化时创建窗口
      this.logger.info('等待Electron准备就绪');
      app.whenReady().then(() => {
        this.logger.info('Electron准备就绪，创建窗口');
        this.createWindow()
        
        // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建一个窗口
        app.on('activate', () => {
          this.logger.info('应用被激活');
          if (BrowserWindow.getAllWindows().length === 0) {
            this.logger.info('无窗口，重新创建窗口');
            this.createWindow()
          }
        })
      }).catch(err => {
        this.logger.error('应用初始化失败', err);
      });

      // 当所有窗口关闭时退出应用，除了在macOS上
      app.on('window-all-closed', () => {
        this.logger.info('所有窗口已关闭');
        if (process.platform !== 'darwin') {
          this.logger.info('退出应用');
          app.quit()
        }
      })
    } catch (err) {
      this.logger.error('初始化应用失败', err);
    }
  }

  /**
   * 创建主窗口
   */
  createWindow() {
    try {
      this.logger.info('开始创建主窗口');
      this.mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1280,
        minHeight: 800,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
          additionalArguments: [
            '--disable-features=ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma'
          ]
        },
        show: false // 先创建窗口但不显示，等内容加载完再显示
      })

      // 窗口准备好显示时再显示，避免白屏
      this.mainWindow.once('ready-to-show', () => {
        this.logger.info('窗口内容加载完成，显示窗口');
        this.mainWindow.show();
      });
      
      // 加载应用
      this.loadApplication();

      // 窗口关闭时释放资源
      this.mainWindow.on('closed', () => {
        this.logger.info('主窗口已关闭');
        this.mainWindow = null
      })
      
      // 监听页面加载事件
      this.mainWindow.webContents.on('did-finish-load', () => {
        this.logger.info('页面加载完成');
      });
      
      // 监听页面加载失败事件
      this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        this.logger.error('页面加载失败', { errorCode, errorDescription });
        
        // 如果是连接被拒绝错误，可能是开发服务器未运行，尝试加载本地文件
        if (errorCode === -102 && this.isDevelopment) {
          this.logger.warn('开发服务器连接失败，尝试加载本地文件');
          this.loadLocalFiles();
        }
      });
      
      this.logger.info('主窗口创建成功');
    } catch (err) {
      this.logger.error('创建窗口失败', err);
    }
  }
  
  /**
   * 加载应用
   */
  loadApplication() {
    if (this.isDevelopment) {
      // 开发环境下加载本地服务器
      this.loadDevelopmentServer();
    } else {
      // 生产环境下加载打包后的文件
      this.loadLocalFiles();
    }
  }
  
  /**
   * 加载开发服务器
   */
  loadDevelopmentServer() {
    this.logger.info('开发环境：尝试加载开发服务器URL');
    this.mainWindow.loadURL('http://localhost:5173').catch(err => {
      this.logger.error('加载开发URL失败', err);
      // 开发服务器加载失败，尝试加载本地文件
      this.loadLocalFiles();
    });
    
    // 打开开发者工具
    this.mainWindow.webContents.openDevTools();
  }
  
  /**
   * 加载本地文件
   */
  loadLocalFiles() {
    // 根据Electron-builder打包规则确定唯一正确的路径
    // 在打包应用中，HTML文件被放置在应用根目录下的dist文件夹中
    // Windows: resources/app.asar/dist/index.html
    // Mac: Resources/app.asar/dist/index.html
    
    // 唯一确定的路径
    let indexPath = '';
    
    if (app.isPackaged) {
      // 生产环境 - 打包后的应用
      // 获取应用程序所在目录（app.asar所在目录）
      const appPath = app.getAppPath();
      this.logger.info(`应用路径: ${appPath}`);
      
      // 在asar包中的路径是固定的: dist/index.html
      indexPath = path.join(appPath, 'dist/index.html');
    } else {
      // 开发环境 - 未打包的应用
      indexPath = path.join(__dirname, '../dist/index.html');
    }
    
    this.logger.info(`确定的HTML文件路径: ${indexPath}`);
    
    // 检查文件是否存在
    let fileExists = false;
    try {
      fileExists = fs.existsSync(indexPath);
      this.logger.info(`HTML文件是否存在: ${fileExists}`);
    } catch (err) {
      this.logger.error(`检查文件是否存在失败: ${indexPath}`, err);
    }
    
    if (fileExists) {
      this.logger.info(`加载HTML文件: ${indexPath}`);
      this.mainWindow.loadFile(indexPath).then(() => {
        this.logger.info(`成功加载HTML文件: ${indexPath}`);
      }).catch(err => {
        this.logger.error(`加载HTML文件失败: ${indexPath}`, err);
        this.showErrorPage();
      });
    } else {
      this.logger.error(`HTML文件不存在: ${indexPath}`);
      this.showErrorPage();
    }
  }
  
  /**
   * 显示错误页面
   */
  showErrorPage() {
    this.logger.error('无法加载应用HTML文件，显示错误页面');
    
    // 获取应用信息
    const appPath = app.getAppPath();
    let resourcePath = '';
    try {
      resourcePath = app.getPath('exe');
      if (process.platform === 'win32') {
        resourcePath = path.join(resourcePath, '../resources');
      } else if (process.platform === 'darwin') {
        resourcePath = path.join(resourcePath, '../Resources');
      }
    } catch (err) {
      this.logger.error('获取资源路径失败', err);
    }
    
    // 显示错误页面
    const errorHTML = `
      <html>
        <head>
          <title>加载错误</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              background: #f0f0f0;
              color: #333;
              text-align: center;
              padding: 50px;
              margin: 0;
            }
            .container {
              background: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 600px;
              margin: 0 auto;
            }
            h1 { color: #e74c3c; }
            pre {
              background: #f8f8f8;
              padding: 15px;
              border-radius: 5px;
              text-align: left;
              overflow: auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>应用加载失败</h1>
            <p>无法找到应用程序的主HTML文件。这可能是由于以下原因：</p>
            <ul style="text-align: left">
              <li>应用没有正确打包</li>
              <li>应用资源文件丢失或损坏</li>
              <li>应用安装路径包含非ASCII字符</li>
            </ul>
            <p>请尝试重新安装应用或联系开发者获取支持。</p>
            <h3>技术信息</h3>
            <pre>应用路径: ${appPath}
资源路径: ${resourcePath}
Electron版本: ${process.versions.electron}
操作系统: ${os.type()} ${os.release()}
时间: ${new Date().toLocaleString()}</pre>
          </div>
        </body>
      </html>
    `;
    
    this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  }

  /**
   * 设置IPC通信
   */
  setupIPC() {
    try {
      this.logger.info('设置IPC通信');
      
      // 检查MacOS上Blackhole是否已安装
      ipcMain.handle('check-blackhole-installed', async () => {
        try {
          if (process.platform !== 'darwin') return false
          const result = execSync('system_profiler SPAudioDataType | grep "BlackHole"').toString()
          const isInstalled = result.includes('BlackHole');
          this.logger.info(`检查BlackHole安装状态: ${isInstalled}`);
          return isInstalled;
        } catch (error) {
          this.logger.error('检查Blackhole安装状态失败', error);
          return false
        }
      })

      // 检查Windows上立体声混音是否已启用
      ipcMain.handle('check-stereo-mix-enabled', async () => {
        try {
          if (process.platform !== 'win32') return false
          const result = execSync('powershell "Get-WmiObject Win32_SoundDevice | Select-Object Name"').toString()
          const isEnabled = result.toLowerCase().includes('stereo mix') || result.toLowerCase().includes('立体声混音');
          this.logger.info(`检查立体声混音状态: ${isEnabled}`);
          return isEnabled;
        } catch (error) {
          this.logger.error('检查立体声混音状态失败', error);
          return false
        }
      })

      // 设置设备音量
      ipcMain.handle('set-device-volume', async (event, deviceId, volume) => {
        try {
          this.logger.info(`设置设备音量`, { deviceId, volume });
          return true
        } catch (error) {
          this.logger.error(`处理设备音量设置请求失败`, error);
          return true
        }
      })

      // 获取系统GPU信息
      ipcMain.handle('get-gpu-info', async () => {
        try {
          let vendor = 'unknown', model = 'Unknown'
          
          if (process.platform === 'darwin') {
            const result = execSync('system_profiler SPDisplaysDataType').toString()
            
            if (result.includes('Apple M')) {
              vendor = 'apple'
              const match = result.match(/Chip Model: Apple (M\d+)/)
              model = match ? match[1] : 'Apple Silicon'
            } else if (result.includes('NVIDIA')) {
              vendor = 'nvidia'
              const match = result.match(/Chipset Model: (NVIDIA.+?)(?:\n|$)/)
              model = match ? match[1] : 'NVIDIA GPU'
            } else if (result.includes('AMD') || result.includes('ATI')) {
              vendor = 'amd'
              const match = result.match(/Chipset Model: (AMD.+?)(?:\n|$)/)
              model = match ? match[1] : 'AMD GPU'
            } else if (result.includes('Intel')) {
              vendor = 'intel'
              const match = result.match(/Chipset Model: (Intel.+?)(?:\n|$)/)
              model = match ? match[1] : 'Intel GPU'
            }
          } else if (process.platform === 'win32') {
            const result = execSync('wmic path win32_VideoController get name').toString()
            
            if (result.toLowerCase().includes('nvidia')) {
              vendor = 'nvidia'
              const match = result.match(/NVIDIA (.+?)(?:\r|\n|$)/)
              model = match ? match[1].trim() : 'NVIDIA GPU'
            } else if (result.toLowerCase().includes('amd') || result.toLowerCase().includes('radeon')) {
              vendor = 'amd'
              const match = result.match(/(AMD|Radeon) (.+?)(?:\r|\n|$)/)
              model = match ? match[0].trim() : 'AMD GPU'
            } else if (result.toLowerCase().includes('intel')) {
              vendor = 'intel'
              const match = result.match(/Intel (.+?)(?:\r|\n|$)/)
              model = match ? match[1].trim() : 'Intel GPU'
            }
          }
          
          this.logger.info('获取GPU信息', { vendor, model });
          return { vendor, model }
        } catch (error) {
          this.logger.error('获取GPU信息失败', error);
          return { vendor: 'unknown', model: 'Unknown' }
        }
      })

      /**
       * 将NativeImage转换为dataURL
       * @param image NativeImage对象
       * @returns dataURL或null
       */
      const toDataURL = (image) => {
        if (image && !image.isEmpty()) {
          try {
            return image.toDataURL()
          } catch (err) {
            this.logger.error('图像转换失败', err);
          }
        }
        return null
      }

      // 获取系统可用窗口列表
      ipcMain.handle('get-windows', async () => {
        try {
          this.logger.info('开始获取窗口列表');
          // 获取所有窗口信息
          const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 320, height: 180 },
            fetchWindowIcons: true
          })
          
          this.logger.info(`获取到 ${sources.length} 个窗口`);
          
          // 过滤并处理窗口
          const results = sources
            .filter(source => source.name && source.name.trim() !== '')
            .map(source => {
              const hasThumbnail = source.thumbnail && !source.thumbnail.isEmpty()
              this.logger.info(`窗口 "${source.name}" ${hasThumbnail ? '获取缩略图成功' : '没有缩略图'}`);
              
              return {
                id: source.id,
                name: source.name,
                appIcon: toDataURL(source.appIcon),
                thumbnail: toDataURL(source.thumbnail),
                sourceId: source.id
              }
            })
          
          return results
        } catch (error) {
          this.logger.error('获取窗口列表失败', error);
          return []
        }
      })

      // 获取系统显示器列表
      ipcMain.handle('get-displays', async () => {
        try {
          this.logger.info('开始获取显示器列表');
          const displays = electronScreen.getAllDisplays()
          const primaryDisplay = electronScreen.getPrimaryDisplay()
          
          this.logger.info(`获取到 ${displays.length} 个显示器`);
          
          // 获取所有屏幕源
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 320, height: 180 }
          })
          
          // 处理每个显示器
          const result = displays.map(display => {
            // 查找对应的屏幕源
            const source = sources.find(s => s.id.includes(`:${display.id}:`))
            
            return {
              id: display.id.toString(),
              name: `显示器 ${display.id}`,
              width: display.size.width,
              height: display.size.height,
              isPrimary: display.id === primaryDisplay.id,
              thumbnail: source ? toDataURL(source.thumbnail) : null,
              sourceId: source ? source.id : null
            }
          })
          
          return result
        } catch (error) {
          this.logger.error('获取显示器列表失败', error);
          return []
        }
      })
      
      this.logger.info('IPC通信设置完成');
    } catch (err) {
      this.logger.error('设置IPC通信失败', err);
    }
  }
}

// 创建主进程实例
try {
  console.log('启动大医AI导播系统主进程');
  new MainProcess();
} catch (err) {
  console.error('主进程启动失败:', err);
} 