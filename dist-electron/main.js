"use strict";const{app:n,BrowserWindow:u,ipcMain:a,desktopCapturer:m}=require("electron"),s=require("path"),{execSync:h}=require("child_process"),d=require("os"),g=require("fs"),f=require("electron").screen;class y{constructor(){const i=n.getPath("userData"),e=s.join(i,"logs");if(!g.existsSync(e))try{g.mkdirSync(e,{recursive:!0})}catch(o){console.error("创建日志目录失败:",o)}const t=new Date,r=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;this.logFile=s.join(e,`app-${r}.log`),this.info("日志系统初始化成功",`日志文件: ${this.logFile}`),this.info("系统信息",{platform:process.platform,arch:process.arch,nodeVersion:process.versions.node,electronVersion:process.versions.electron,osVersion:d.release(),osType:d.type(),isDev:process.env.NODE_ENV!=="production"})}writeToFile(i,e){if(this.logFile)try{const r=`[${new Date().toISOString()}] [${i}] ${e}
`;g.appendFileSync(this.logFile,r)}catch(t){console.error("写入日志文件失败:",t)}}info(i,e=null){const t=e?`${i}: ${JSON.stringify(e)}`:i;console.log(`[INFO] ${t}`),this.writeToFile("INFO",t)}warn(i,e=null){const t=e?`${i}: ${JSON.stringify(e)}`:i;console.warn(`[WARN] ${t}`),this.writeToFile("WARN",t)}error(i,e=null){let t=i;e&&(typeof e=="object"&&e!==null&&"message"in e&&"stack"in e?t+=`: ${e.message}
${e.stack}`:t+=`: ${JSON.stringify(e)}`),console.error(`[ERROR] ${t}`),this.writeToFile("ERROR",t)}}class S{constructor(){this.mainWindow=null,this.isDevelopment=!n.isPackaged&&process.env.NODE_ENV!=="production",this.logger=new y,this.logger.info("应用环境检测",{isPackaged:n.isPackaged,envNodeEnv:process.env.NODE_ENV,isDevelopment:this.isDevelopment}),this.logger.info("环境变量",{VITE_USE_MOCK:process.env.VITE_USE_MOCK,VITE_API_BASE_URL:process.env.VITE_API_BASE_URL,VITE_APP_TITLE:process.env.VITE_APP_TITLE}),this.setupExceptionHandlers(),this.logger.info("主进程启动"),this.initApp(),this.setupIPC()}setupExceptionHandlers(){process.on("uncaughtException",i=>{this.logger.error("未捕获的异常",i)}),process.on("unhandledRejection",(i,e)=>{this.logger.error("未处理的Promise拒绝",i)})}initApp(){try{process.platform==="darwin"&&(this.logger.info("正在为macOS配置屏幕捕获参数"),n.commandLine.appendSwitch("disable-features","ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma")),this.logger.info("等待Electron准备就绪"),n.whenReady().then(()=>{this.logger.info("Electron准备就绪，创建窗口"),this.createWindow(),n.on("activate",()=>{this.logger.info("应用被激活"),u.getAllWindows().length===0&&(this.logger.info("无窗口，重新创建窗口"),this.createWindow())})}).catch(i=>{this.logger.error("应用初始化失败",i)}),n.on("window-all-closed",()=>{this.logger.info("所有窗口已关闭"),process.platform!=="darwin"&&(this.logger.info("退出应用"),n.quit())})}catch(i){this.logger.error("初始化应用失败",i)}}createWindow(){try{this.logger.info("开始创建主窗口"),this.mainWindow=new u({width:1280,height:800,minWidth:1280,minHeight:800,webPreferences:{preload:s.join(__dirname,"preload.js"),nodeIntegration:!1,contextIsolation:!0,additionalArguments:["--disable-features=ThumbnailCapturerMac:capture_mode/sc_screenshot_manager,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma"]},show:!1}),this.mainWindow.once("ready-to-show",()=>{this.logger.info("窗口内容加载完成，显示窗口"),this.mainWindow.show()}),this.loadApplication(),this.mainWindow.on("closed",()=>{this.logger.info("主窗口已关闭"),this.mainWindow=null}),this.mainWindow.webContents.on("did-finish-load",()=>{this.logger.info("页面加载完成")}),this.mainWindow.webContents.on("did-fail-load",(i,e,t)=>{this.logger.error("页面加载失败",{errorCode:e,errorDescription:t}),e===-102&&this.isDevelopment&&(this.logger.warn("开发服务器连接失败，尝试加载本地文件"),this.loadLocalFiles())}),this.logger.info("主窗口创建成功")}catch(i){this.logger.error("创建窗口失败",i)}}loadApplication(){this.isDevelopment?this.loadDevelopmentServer():this.loadLocalFiles()}loadDevelopmentServer(){this.logger.info("开发环境：尝试加载开发服务器URL"),this.mainWindow.loadURL("http://localhost:5173").catch(i=>{this.logger.error("加载开发URL失败",i),this.loadLocalFiles()}),this.mainWindow.webContents.openDevTools()}loadLocalFiles(){let i="";if(n.isPackaged){const t=n.getAppPath();this.logger.info(`应用路径: ${t}`),i=s.join(t,"dist/index.html")}else i=s.join(__dirname,"../dist/index.html");this.logger.info(`确定的HTML文件路径: ${i}`);let e=!1;try{e=g.existsSync(i),this.logger.info(`HTML文件是否存在: ${e}`)}catch(t){this.logger.error(`检查文件是否存在失败: ${i}`,t)}e?(this.logger.info(`加载HTML文件: ${i}`),this.mainWindow.loadFile(i).then(()=>{this.logger.info(`成功加载HTML文件: ${i}`)}).catch(t=>{this.logger.error(`加载HTML文件失败: ${i}`,t),this.showErrorPage()})):(this.logger.error(`HTML文件不存在: ${i}`),this.showErrorPage())}showErrorPage(){this.logger.error("无法加载应用HTML文件，显示错误页面");const i=n.getAppPath();let e="";try{e=n.getPath("exe"),process.platform==="win32"?e=s.join(e,"../resources"):process.platform==="darwin"&&(e=s.join(e,"../Resources"))}catch(r){this.logger.error("获取资源路径失败",r)}const t=`
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
            <pre>应用路径: ${i}
资源路径: ${e}
Electron版本: ${process.versions.electron}
操作系统: ${d.type()} ${d.release()}
时间: ${new Date().toLocaleString()}</pre>
          </div>
        </body>
      </html>
    `;this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(t)}`)}setupIPC(){try{this.logger.info("设置IPC通信"),a.handle("check-blackhole-installed",async()=>{try{if(process.platform!=="darwin")return!1;const t=h('system_profiler SPAudioDataType | grep "BlackHole"').toString().includes("BlackHole");return this.logger.info(`检查BlackHole安装状态: ${t}`),t}catch(e){return this.logger.error("检查Blackhole安装状态失败",e),!1}}),a.handle("check-stereo-mix-enabled",async()=>{try{if(process.platform!=="win32")return!1;const e=h('powershell "Get-WmiObject Win32_SoundDevice | Select-Object Name"').toString(),t=e.toLowerCase().includes("stereo mix")||e.toLowerCase().includes("立体声混音");return this.logger.info(`检查立体声混音状态: ${t}`),t}catch(e){return this.logger.error("检查立体声混音状态失败",e),!1}}),a.handle("set-device-volume",async(e,t,r)=>{try{return this.logger.info("设置设备音量",{deviceId:t,volume:r}),!0}catch(o){return this.logger.error("处理设备音量设置请求失败",o),!0}}),a.handle("get-gpu-info",async()=>{try{let e="unknown",t="Unknown";if(process.platform==="darwin"){const r=h("system_profiler SPDisplaysDataType").toString();if(r.includes("Apple M")){e="apple";const o=r.match(/Chip Model: Apple (M\d+)/);t=o?o[1]:"Apple Silicon"}else if(r.includes("NVIDIA")){e="nvidia";const o=r.match(/Chipset Model: (NVIDIA.+?)(?:\n|$)/);t=o?o[1]:"NVIDIA GPU"}else if(r.includes("AMD")||r.includes("ATI")){e="amd";const o=r.match(/Chipset Model: (AMD.+?)(?:\n|$)/);t=o?o[1]:"AMD GPU"}else if(r.includes("Intel")){e="intel";const o=r.match(/Chipset Model: (Intel.+?)(?:\n|$)/);t=o?o[1]:"Intel GPU"}}else if(process.platform==="win32"){const r=h("wmic path win32_VideoController get name").toString();if(r.toLowerCase().includes("nvidia")){e="nvidia";const o=r.match(/NVIDIA (.+?)(?:\r|\n|$)/);t=o?o[1].trim():"NVIDIA GPU"}else if(r.toLowerCase().includes("amd")||r.toLowerCase().includes("radeon")){e="amd";const o=r.match(/(AMD|Radeon) (.+?)(?:\r|\n|$)/);t=o?o[0].trim():"AMD GPU"}else if(r.toLowerCase().includes("intel")){e="intel";const o=r.match(/Intel (.+?)(?:\r|\n|$)/);t=o?o[1].trim():"Intel GPU"}}return this.logger.info("获取GPU信息",{vendor:e,model:t}),{vendor:e,model:t}}catch(e){return this.logger.error("获取GPU信息失败",e),{vendor:"unknown",model:"Unknown"}}});const i=e=>{if(e&&!e.isEmpty())try{return e.toDataURL()}catch(t){this.logger.error("图像转换失败",t)}return null};a.handle("get-windows",async()=>{try{this.logger.info("开始获取窗口列表");const e=await m.getSources({types:["window"],thumbnailSize:{width:320,height:180},fetchWindowIcons:!0});return this.logger.info(`获取到 ${e.length} 个窗口`),e.filter(r=>r.name&&r.name.trim()!=="").map(r=>{const o=r.thumbnail&&!r.thumbnail.isEmpty();return this.logger.info(`窗口 "${r.name}" ${o?"获取缩略图成功":"没有缩略图"}`),{id:r.id,name:r.name,appIcon:i(r.appIcon),thumbnail:i(r.thumbnail),sourceId:r.id}})}catch(e){return this.logger.error("获取窗口列表失败",e),[]}}),a.handle("get-displays",async()=>{try{this.logger.info("开始获取显示器列表");const e=f.getAllDisplays(),t=f.getPrimaryDisplay();this.logger.info(`获取到 ${e.length} 个显示器`);const r=await m.getSources({types:["screen"],thumbnailSize:{width:320,height:180}});return e.map(l=>{const c=r.find(w=>w.id.includes(`:${l.id}:`));return{id:l.id.toString(),name:`显示器 ${l.id}`,width:l.size.width,height:l.size.height,isPrimary:l.id===t.id,thumbnail:c?i(c.thumbnail):null,sourceId:c?c.id:null}})}catch(e){return this.logger.error("获取显示器列表失败",e),[]}}),this.logger.info("IPC通信设置完成")}catch(i){this.logger.error("设置IPC通信失败",i)}}}try{console.log("启动大医AI导播系统主进程"),new S}catch(p){console.error("主进程启动失败:",p)}
