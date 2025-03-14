"use strict";
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { execSync } = require("child_process");
require("os");
class MainProcess {
  constructor() {
    this.mainWindow = null;
    this.isDevelopment = process.env.NODE_ENV !== "production";
    this.initApp();
    this.setupIPC();
  }
  /**
   * 初始化应用，设置应用事件监听器
   */
  initApp() {
    app.whenReady().then(() => {
      this.createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  }
  /**
   * 创建主窗口
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1e3,
      minWidth: 1600,
      minHeight: 1e3,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true
        // webSecurity: false, // 禁用web安全策略，允许跨域请求
      }
    });
    if (this.isDevelopment) {
      this.mainWindow.loadURL("http://localhost:5173");
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }
  /**
   * 设置IPC通信
   */
  setupIPC() {
    ipcMain.handle("check-blackhole-installed", async () => {
      try {
        if (process.platform !== "darwin") {
          return false;
        }
        const result = execSync('system_profiler SPAudioDataType | grep "BlackHole"').toString();
        return result.includes("BlackHole");
      } catch (error) {
        console.error("检查Blackhole安装状态失败:", error);
        return false;
      }
    });
    ipcMain.handle("check-stereo-mix-enabled", async () => {
      try {
        if (process.platform !== "win32") {
          return false;
        }
        const result = execSync('powershell "Get-WmiObject Win32_SoundDevice | Select-Object Name"').toString();
        return result.toLowerCase().includes("stereo mix") || result.toLowerCase().includes("立体声混音");
      } catch (error) {
        console.error("检查立体声混音状态失败:", error);
        return false;
      }
    });
    ipcMain.handle("get-gpu-info", async () => {
      try {
        let vendor = "unknown";
        let model = "Unknown";
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
        } else {
          try {
            const result = execSync("lspci | grep -i vga").toString();
            if (result.toLowerCase().includes("nvidia")) {
              vendor = "nvidia";
              const match = result.match(/NVIDIA (.+?)(?:\[|\(|$)/);
              model = match ? match[1].trim() : "NVIDIA GPU";
            } else if (result.toLowerCase().includes("amd") || result.toLowerCase().includes("radeon")) {
              vendor = "amd";
              const match = result.match(/(AMD|Radeon) (.+?)(?:\[|\(|$)/);
              model = match ? match[0].trim() : "AMD GPU";
            } else if (result.toLowerCase().includes("intel")) {
              vendor = "intel";
              const match = result.match(/Intel (.+?)(?:\[|\(|$)/);
              model = match ? match[1].trim() : "Intel GPU";
            }
          } catch (error) {
            console.error("Linux获取GPU信息失败:", error);
          }
        }
        return { vendor, model };
      } catch (error) {
        console.error("获取GPU信息失败:", error);
        return { vendor: "unknown", model: "Unknown" };
      }
    });
  }
}
new MainProcess();
