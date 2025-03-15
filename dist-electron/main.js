"use strict";
const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const { execSync } = require("child_process");
require("os");
const electronScreen = require("electron").screen;
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
    if (process.platform === "darwin") {
      app.commandLine.appendSwitch("disable-features", "ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma");
    }
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
        if (process.platform !== "darwin") return false;
        const result = execSync('system_profiler SPAudioDataType | grep "BlackHole"').toString();
        return result.includes("BlackHole");
      } catch (error) {
        console.error("检查Blackhole安装状态失败:", error);
        return false;
      }
    });
    ipcMain.handle("check-stereo-mix-enabled", async () => {
      try {
        if (process.platform !== "win32") return false;
        const result = execSync('powershell "Get-WmiObject Win32_SoundDevice | Select-Object Name"').toString();
        return result.toLowerCase().includes("stereo mix") || result.toLowerCase().includes("立体声混音");
      } catch (error) {
        console.error("检查立体声混音状态失败:", error);
        return false;
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
        return { vendor, model };
      } catch (error) {
        console.error("获取GPU信息失败:", error);
        return { vendor: "unknown", model: "Unknown" };
      }
    });
    const toDataURL = (image) => {
      if (image && !image.isEmpty()) {
        try {
          return image.toDataURL();
        } catch (err) {
          console.error("图像转换失败:", err);
        }
      }
      return null;
    };
    ipcMain.handle("get-windows", async () => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["window"],
          thumbnailSize: { width: 320, height: 180 },
          fetchWindowIcons: true
        });
        console.log(`[窗口捕获] 获取到 ${sources.length} 个窗口`);
        const results = sources.filter((source) => source.name && source.name.trim() !== "").map((source) => {
          const hasThumbnail = source.thumbnail && !source.thumbnail.isEmpty();
          console.log(`[窗口捕获] 窗口 "${source.name}" ${hasThumbnail ? "获取缩略图成功" : "没有缩略图"}`);
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
        console.error("[窗口捕获] 获取窗口列表失败:", error);
        return [];
      }
    });
    ipcMain.handle("get-displays", async () => {
      try {
        const displays = electronScreen.getAllDisplays();
        const primaryDisplay = electronScreen.getPrimaryDisplay();
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
        console.error("[显示器捕获] 获取显示器列表失败:", error);
        return [];
      }
    });
  }
}
new MainProcess();
