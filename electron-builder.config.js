/**
 * @file electron-builder配置文件
 * @description 提供更精细的跨平台打包控制
 */
module.exports = {
  productName: '大医AI导播系统',
  appId: 'com.dayi.ai.broadcast',
  copyright: `Copyright © ${new Date().getFullYear()} 大医直播`,
  asar: true,
  compression: 'maximum', // 最大压缩级别
  
  // 打包文件配置
  directories: {
    output: 'release',
    app: '.',
    buildResources: 'build'
  },
  
  // 打包文件
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'package.json'
  ],
  
  // Mac平台配置
  mac: {
    artifactName: '${productName}-${version}-mac.${ext}',
    category: 'public.app-category.utilities',
    target: ['dmg', 'zip'],
    icon: 'build/icon.icns',
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    // 如需公证，取消下方注释并配置
    // identity: null, // Apple开发者ID
    // notarize: false // 是否进行公证
    extraResources: [
      {
        "from": "resources/ffmpeg/mac/ffmpeg",
        "to": "ffmpeg/ffmpeg"
      }
    ]
  },
  
  // DMG配置
  dmg: {
    contents: [
      {
        x: 410,
        y: 150,
        type: 'link',
        path: '/Applications'
      },
      {
        x: 130,
        y: 150,
        type: 'file'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },
  
  // Windows平台配置
  win: {
    artifactName: '${productName}-${version}-win.${ext}',
    target: [
      {
        target: 'nsis',
        arch: ['x64']  // 仅构建x64架构版本
      },
      {
        target: 'portable',
        arch: ['x64']  // 仅构建x64架构版本
      }
    ],
    icon: 'build/icon.ico',
    publisherName: '大医AI导播系统',
    // 如需签名，取消下方注释并配置
    // certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
    // certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
    // signDlls: true
    extraResources: [
      {
        "from": "resources/ffmpeg/win/ffmpeg.exe",
        "to": "ffmpeg/ffmpeg.exe"
      }
    ]
  },
  
  // NSIS安装包配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '大医AI导播系统',
    uninstallDisplayName: '大医AI导播系统',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico'
  },
  

  
  // 自动更新配置（如需使用）
  // publish: {
  //   provider: 'generic',
  //   url: 'https://your-update-server.com/updates/'
  // },
  
  // 额外依赖，确保应用正常运行所需的系统库
  extraResources: [
    // 添加字体文件作为额外资源
    {
      "from": "public/fonts",
      "to": "fonts",
      "filter": ["*.woff2", "*.ttf", "*.otf"]
    }
  ],
  
  // 使用electron-builder支持的钩子
  afterPack: (context) => {
    console.log('打包完成！');
    return Promise.resolve();
  },
  
  beforePack: (context) => {
    console.log('正在准备构建...');
    return Promise.resolve();
  }
}; 