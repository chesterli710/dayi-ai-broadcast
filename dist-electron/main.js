"use strict";
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
class MainProcess {
  constructor() {
    this.mainWindow = null;
    this.isDevelopment = process.env.NODE_ENV !== "production";
    this.initApp();
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
        contextIsolation: true,
        webSecurity: false
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
}
new MainProcess();
