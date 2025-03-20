"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");
const fs = require("fs");
const electronScreen = require("electron").screen;
class Logger {
  constructor() {
    const userDataPath = app.getPath("userData");
    const logDir = path.join(userDataPath, "logs");
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (err) {
        console.error("创建日志目录失败:", err);
      }
    }
    const date = /* @__PURE__ */ new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    this.logFile = path.join(logDir, `app-${dateStr}.log`);
    this.info("日志系统初始化成功", `日志文件: ${this.logFile}`);
    this.info("系统信息", {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      osVersion: os.release(),
      osType: os.type(),
      isDev: process.env.NODE_ENV !== "production"
    });
  }
  /**
   * 写入日志到文件
   */
  writeToFile(level, message) {
    if (!this.logFile) return;
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const logEntry = `[${timestamp}] [${level}] ${message}
`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (err) {
      console.error("写入日志文件失败:", err);
    }
  }
  /**
   * 记录信息日志
   */
  info(message, data = null) {
    const logMsg = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.log(`[INFO] ${logMsg}`);
    this.writeToFile("INFO", logMsg);
  }
  /**
   * 记录警告日志
   */
  warn(message, data = null) {
    const logMsg = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.warn(`[WARN] ${logMsg}`);
    this.writeToFile("WARN", logMsg);
  }
  /**
   * 记录错误日志
   */
  error(message, error = null) {
    let logMsg = message;
    if (error) {
      if (typeof error === "object" && error !== null && "message" in error && "stack" in error) {
        logMsg += `: ${error.message}
${error.stack}`;
      } else {
        logMsg += `: ${JSON.stringify(error)}`;
      }
    }
    console.error(`[ERROR] ${logMsg}`);
    this.writeToFile("ERROR", logMsg);
  }
}
class MainProcess {
  constructor() {
    this.mainWindow = null;
    this.isDevelopment = !app.isPackaged && process.env.NODE_ENV !== "production";
    this.logger = new Logger();
    this.logger.info("应用环境检测", {
      isPackaged: app.isPackaged,
      envNodeEnv: process.env.NODE_ENV,
      isDevelopment: this.isDevelopment
    });
    this.logger.info("环境变量", {
      VITE_USE_MOCK: process.env.VITE_USE_MOCK,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
      VITE_APP_TITLE: process.env.VITE_APP_TITLE
    });
    this.setupExceptionHandlers();
    this.logger.info("主进程启动");
    this.initApp();
    this.setupIPC();
  }
  /**
   * 设置全局异常处理
   */
  setupExceptionHandlers() {
    process.on("uncaughtException", (error) => {
      this.logger.error("未捕获的异常", error);
    });
    process.on("unhandledRejection", (reason, promise) => {
      this.logger.error("未处理的Promise拒绝", reason);
    });
  }
  /**
   * 初始化应用，设置应用事件监听器
   */
  initApp() {
    try {
      if (process.platform === "darwin") {
        this.logger.info("正在为macOS配置屏幕捕获参数");
        app.commandLine.appendSwitch("disable-features", "ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma");
      }
      this.logger.info("等待Electron准备就绪");
      app.whenReady().then(() => {
        this.logger.info("Electron准备就绪，创建窗口");
        this.createWindow();
        app.on("activate", () => {
          this.logger.info("应用被激活");
          if (BrowserWindow.getAllWindows().length === 0) {
            this.logger.info("无窗口，重新创建窗口");
            this.createWindow();
          }
        });
      }).catch((err) => {
        this.logger.error("应用初始化失败", err);
      });
      app.on("window-all-closed", () => {
        this.logger.info("所有窗口已关闭");
        if (process.platform !== "darwin") {
          this.logger.info("退出应用");
          app.quit();
        }
      });
    } catch (err) {
      this.logger.error("初始化应用失败", err);
    }
  }
  /**
   * 创建主窗口
   */
  createWindow() {
    try {
      this.logger.info("开始创建主窗口");
      this.mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1280,
        minHeight: 800,
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          nodeIntegration: false,
          contextIsolation: true,
          additionalArguments: [
            "--disable-features=ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma"
          ]
        },
        show: false
        // 先创建窗口但不显示，等内容加载完再显示
      });
      this.mainWindow.once("ready-to-show", () => {
        this.logger.info("窗口内容加载完成，显示窗口");
        this.mainWindow.show();
      });
      this.loadApplication();
      this.mainWindow.on("closed", () => {
        this.logger.info("主窗口已关闭");
        this.mainWindow = null;
      });
      this.mainWindow.webContents.on("did-finish-load", () => {
        this.logger.info("页面加载完成");
      });
      this.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        this.logger.error("页面加载失败", { errorCode, errorDescription });
        if (errorCode === -102 && this.isDevelopment) {
          this.logger.warn("开发服务器连接失败，尝试加载本地文件");
          this.loadLocalFiles();
        }
      });
      this.logger.info("主窗口创建成功");
    } catch (err) {
      this.logger.error("创建窗口失败", err);
    }
  }
  /**
   * 加载应用
   */
  loadApplication() {
    if (this.isDevelopment) {
      this.loadDevelopmentServer();
    } else {
      this.loadLocalFiles();
    }
  }
  /**
   * 加载开发服务器
   */
  loadDevelopmentServer() {
    this.logger.info("开发环境：尝试加载开发服务器URL");
    this.mainWindow.loadURL("http://localhost:5173").catch((err) => {
      this.logger.error("加载开发URL失败", err);
      this.loadLocalFiles();
    });
    this.mainWindow.webContents.openDevTools();
  }
  /**
   * 加载本地文件
   */
  loadLocalFiles() {
    let indexPath = "";
    if (app.isPackaged) {
      const appPath = app.getAppPath();
      this.logger.info(`应用路径: ${appPath}`);
      indexPath = path.join(appPath, "dist/index.html");
    } else {
      indexPath = path.join(__dirname, "../dist/index.html");
    }
    this.logger.info(`确定的HTML文件路径: ${indexPath}`);
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
      }).catch((err) => {
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
    this.logger.error("无法加载应用HTML文件，显示错误页面");
    const appPath = app.getAppPath();
    let resourcePath = "";
    try {
      resourcePath = app.getPath("exe");
      if (process.platform === "win32") {
        resourcePath = path.join(resourcePath, "../resources");
      } else if (process.platform === "darwin") {
        resourcePath = path.join(resourcePath, "../Resources");
      }
    } catch (err) {
      this.logger.error("获取资源路径失败", err);
    }
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
时间: ${(/* @__PURE__ */ new Date()).toLocaleString()}</pre>
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
      this.logger.info("设置IPC通信");
      ipcMain.handle("check-blackhole-installed", async () => {
        try {
          if (process.platform !== "darwin") return false;
          const result = execSync('system_profiler SPAudioDataType | grep "BlackHole"').toString();
          const isInstalled = result.includes("BlackHole");
          this.logger.info(`检查BlackHole安装状态: ${isInstalled}`);
          return isInstalled;
        } catch (error) {
          this.logger.error("检查Blackhole安装状态失败", error);
          return false;
        }
      });
      ipcMain.handle("check-stereo-mix-enabled", async () => {
        try {
          if (process.platform !== "win32") return false;
          const result = execSync('powershell "Get-WmiObject Win32_SoundDevice | Select-Object Name"').toString();
          const isEnabled = result.toLowerCase().includes("stereo mix") || result.toLowerCase().includes("立体声混音");
          this.logger.info(`检查立体声混音状态: ${isEnabled}`);
          return isEnabled;
        } catch (error) {
          this.logger.error("检查立体声混音状态失败", error);
          return false;
        }
      });
      ipcMain.handle("check-wasapi-available", async () => {
        try {
          if (process.platform !== "win32") return false;
          try {
            require.resolve("audio-stream");
            this.logger.info(`WASAPI捕获模块可用`);
            return true;
          } catch (error) {
            this.logger.warn(`WASAPI捕获模块不可用`, error);
            return false;
          }
        } catch (error) {
          this.logger.error("检查WASAPI捕获状态失败", error);
          return false;
        }
      });
      let wasapiCapture = null;
      let wasapiAudioLevel = 0;
      let wasapiAudioLevelTimer = null;
      ipcMain.handle("start-wasapi-capture", async (event, deviceId) => {
        try {
          if (process.platform !== "win32") return null;
          let AudioStream;
          try {
            AudioStream = require("audio-stream");
          } catch (error) {
            this.logger.error("加载WASAPI捕获模块失败", error);
            return null;
          }
          if (wasapiCapture) {
            try {
              wasapiCapture.stop();
              wasapiCapture = null;
            } catch (error) {
              this.logger.error("停止现有WASAPI捕获失败", error);
            }
          }
          if (wasapiAudioLevelTimer) {
            clearInterval(wasapiAudioLevelTimer);
            wasapiAudioLevelTimer = null;
          }
          const options = {
            sampleRate: 48e3,
            channels: 2,
            exitOnSilence: -1,
            // 不自动退出
            device: deviceId || "default",
            // 使用指定设备或默认设备
            type: "loopback"
            // 捕获输出音频
          };
          wasapiCapture = new AudioStream(options);
          wasapiAudioLevel = 0;
          const bufferSize = 2048;
          const buffer = new Float32Array(bufferSize);
          wasapiAudioLevelTimer = setInterval(() => {
            if (wasapiCapture && wasapiCapture.read) {
              const bytesRead = wasapiCapture.read(buffer);
              if (bytesRead > 0) {
                let sum = 0;
                for (let i = 0; i < bytesRead; i++) {
                  sum += Math.abs(buffer[i]);
                }
                const average = sum / bytesRead;
                wasapiAudioLevel = Math.min(100, Math.round(average * 5 * 100));
              } else {
                wasapiAudioLevel = 0;
              }
            } else {
              wasapiAudioLevel = 0;
            }
          }, 100);
          this.logger.info("启动WASAPI捕获成功", { deviceId: deviceId || "default" });
          return { wasapiStarted: true };
        } catch (error) {
          this.logger.error("启动WASAPI捕获失败", error);
          return null;
        }
      });
      ipcMain.handle("stop-wasapi-capture", async () => {
        try {
          if (wasapiCapture) {
            wasapiCapture.stop();
            wasapiCapture = null;
            this.logger.info("停止WASAPI捕获成功");
          }
          if (wasapiAudioLevelTimer) {
            clearInterval(wasapiAudioLevelTimer);
            wasapiAudioLevelTimer = null;
          }
          return true;
        } catch (error) {
          this.logger.error("停止WASAPI捕获失败", error);
          return false;
        }
      });
      ipcMain.handle("get-wasapi-audio-level", async () => {
        return wasapiAudioLevel;
      });
      ipcMain.handle("get-default-audio-output", async () => {
        try {
          if (process.platform !== "win32") return null;
          const result = execSync('powershell -command "Get-AudioDevice -Playback | Where-Object {$_.Default -eq $true} | Select-Object Name | Format-List"').toString();
          const match = result.match(/Name\s*:\s*(.*)/i);
          const defaultDevice = match ? match[1].trim() : null;
          this.logger.info(`当前默认音频输出设备: ${defaultDevice}`);
          return defaultDevice;
        } catch (error) {
          try {
            const result = execSync(`powershell -command "(Get-CimInstance -Class Win32_SoundDevice | Where-Object {$_.Status -eq 'OK' -and $_.ConfigManagerErrorCode -eq 0 -and ($_.Name -like '*speaker*' -or $_.Name -like '*耳机*' -or $_.Name -like '*headphone*' -or $_.Name -like '*headset*')} | Select-Object Name | Format-List).Name"`).toString();
            if (result.trim()) {
              const defaultDevice = result.trim();
              this.logger.info(`使用备用方法获取的默认音频输出设备: ${defaultDevice}`);
              return defaultDevice;
            }
          } catch (fallbackError) {
            this.logger.error("备用方法获取默认音频输出设备失败", fallbackError);
          }
          this.logger.error("获取默认音频输出设备失败", error);
          return null;
        }
      });
      ipcMain.handle("get-audio-output-devices", async () => {
        try {
          if (process.platform !== "win32") return [];
          try {
            const result = execSync('powershell -command "Get-AudioDevice -Playback | Select-Object Name,Default | ConvertTo-Json"').toString();
            const devices = JSON.parse(result);
            const formattedDevices = Array.isArray(devices) ? devices : [devices];
            const outputDevices = formattedDevices.map((device) => ({
              id: device.ID || device.Name,
              // 有些版本可能使用不同的属性
              name: device.Name,
              isDefault: device.Default === true
            }));
            this.logger.info(`获取到 ${outputDevices.length} 个音频输出设备`);
            return outputDevices;
          } catch (cmdletError) {
            const result = execSync(`powershell -command "Get-CimInstance -Class Win32_SoundDevice | Where-Object {$_.Status -eq 'OK' -and $_.ConfigManagerErrorCode -eq 0 -and ($_.Name -like '*speaker*' -or $_.Name -like '*耳机*' -or $_.Name -like '*headphone*' -or $_.Name -like '*headset*' -or $_.Name -like '*output*')} | Select-Object Name | Format-List"`).toString();
            const devices = result.split("\r\n\r\n").filter((block) => block.trim()).map((block) => {
              const match = block.match(/Name\s*:\s*(.*)/i);
              return match ? match[1].trim() : null;
            }).filter((name) => name);
            const defaultDeviceResult = await ipcMain.handle("get-default-audio-output", {});
            const defaultDevice = typeof defaultDeviceResult === "function" ? await defaultDeviceResult() : defaultDeviceResult;
            const outputDevices = devices.map((name) => ({
              id: name,
              name,
              isDefault: name === defaultDevice
            }));
            this.logger.info(`使用备用方法获取到 ${outputDevices.length} 个音频输出设备`);
            return outputDevices;
          }
        } catch (error) {
          this.logger.error("获取音频输出设备失败", error);
          return [];
        }
      });
      ipcMain.handle("set-device-volume", async (event, deviceId, volume) => {
        try {
          this.logger.info(`设置设备音量`, { deviceId, volume });
          return true;
        } catch (error) {
          this.logger.error(`处理设备音量设置请求失败`, error);
          return true;
        }
      });
      ipcMain.handle("get-gpu-info", async () => {
        try {
          let vendor = "unknown", model = "Unknown";
          if (process.platform === "darwin") {
            const result = execSync("system_profiler SPDisplaysDataType").toString();
            if (result.includes("Apple M")) {
              vendor = "apple";
              const match = result.match(/Chip Model: Apple (M\d+)/);
              model = match ? match[1] : "Apple Silicon";
            } else if (result.includes("NVIDIA")) {
              vendor = "nvidia";
              const match = result.match(/Chipset Model: (NVIDIA.+?)(?:\n|$)/);
              model = match ? match[1] : "NVIDIA GPU";
            } else if (result.includes("AMD") || result.includes("ATI")) {
              vendor = "amd";
              const match = result.match(/Chipset Model: (AMD.+?)(?:\n|$)/);
              model = match ? match[1] : "AMD GPU";
            } else if (result.includes("Intel")) {
              vendor = "intel";
              const match = result.match(/Chipset Model: (Intel.+?)(?:\n|$)/);
              model = match ? match[1] : "Intel GPU";
            }
          } else if (process.platform === "win32") {
            const result = execSync("wmic path win32_VideoController get name").toString();
            if (result.toLowerCase().includes("nvidia")) {
              vendor = "nvidia";
              const match = result.match(/NVIDIA (.+?)(?:\r|\n|$)/);
              model = match ? match[1].trim() : "NVIDIA GPU";
            } else if (result.toLowerCase().includes("amd") || result.toLowerCase().includes("radeon")) {
              vendor = "amd";
              const match = result.match(/(AMD|Radeon) (.+?)(?:\r|\n|$)/);
              model = match ? match[0].trim() : "AMD GPU";
            } else if (result.toLowerCase().includes("intel")) {
              vendor = "intel";
              const match = result.match(/Intel (.+?)(?:\r|\n|$)/);
              model = match ? match[1].trim() : "Intel GPU";
            }
          }
          this.logger.info("获取GPU信息", { vendor, model });
          return { vendor, model };
        } catch (error) {
          this.logger.error("获取GPU信息失败", error);
          return { vendor: "unknown", model: "Unknown" };
        }
      });
      const toDataURL = (image) => {
        if (image && !image.isEmpty()) {
          try {
            return image.toDataURL();
          } catch (err) {
            this.logger.error("图像转换失败", err);
          }
        }
        return null;
      };
      ipcMain.handle("get-windows", async () => {
        try {
          this.logger.info("开始获取窗口列表");
          const sources = await desktopCapturer.getSources({
            types: ["window"],
            thumbnailSize: { width: 320, height: 180 },
            fetchWindowIcons: true
          });
          this.logger.info(`获取到 ${sources.length} 个窗口`);
          const results = sources.filter((source) => source.name && source.name.trim() !== "").map((source) => {
            const hasThumbnail = source.thumbnail && !source.thumbnail.isEmpty();
            this.logger.info(`窗口 "${source.name}" ${hasThumbnail ? "获取缩略图成功" : "没有缩略图"}`);
            return {
              id: source.id,
              name: source.name,
              appIcon: toDataURL(source.appIcon),
              thumbnail: toDataURL(source.thumbnail),
              sourceId: source.id
            };
          });
          return results;
        } catch (error) {
          this.logger.error("获取窗口列表失败", error);
          return [];
        }
      });
      ipcMain.handle("get-displays", async () => {
        try {
          this.logger.info("开始获取显示器列表");
          const displays = electronScreen.getAllDisplays();
          const primaryDisplay = electronScreen.getPrimaryDisplay();
          this.logger.info(`获取到 ${displays.length} 个显示器`);
          const sources = await desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 320, height: 180 }
          });
          const result = displays.map((display) => {
            const source = sources.find((s) => s.id.includes(`:${display.id}:`));
            return {
              id: display.id.toString(),
              name: `显示器 ${display.id}`,
              width: display.size.width,
              height: display.size.height,
              isPrimary: display.id === primaryDisplay.id,
              thumbnail: source ? toDataURL(source.thumbnail) : null,
              sourceId: source ? source.id : null
            };
          });
          return result;
        } catch (error) {
          this.logger.error("获取显示器列表失败", error);
          return [];
        }
      });
      this.logger.info("IPC通信设置完成");
    } catch (err) {
      this.logger.error("设置IPC通信失败", err);
    }
  }
}
try {
  console.log("启动大医AI导播系统主进程");
  new MainProcess();
} catch (err) {
  console.error("主进程启动失败:", err);
}
