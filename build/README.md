# 大医AI导播系统打包指南

## 图标文件准备

### Mac平台图标 (icon.icns)
Mac平台需要使用.icns格式的图标文件，您可以通过以下方式生成：

1. 准备一个1024x1024像素的PNG图像作为源图像
2. 使用iconutil（Mac自带）或在线转换工具将PNG转换为icns
3. 将生成的icon.icns文件放置到build目录下

#### 使用Mac自带工具生成icns的方法：

```bash
# 创建iconset目录
mkdir MyIcon.iconset

# 生成不同尺寸的图标
sips -z 16 16     Source.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     Source.png --out MyIcon.iconset/icon_16x16@2x.png
sips -z 32 32     Source.png --out MyIcon.iconset/icon_32x32.png
sips -z 64 64     Source.png --out MyIcon.iconset/icon_32x32@2x.png
sips -z 128 128   Source.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   Source.png --out MyIcon.iconset/icon_128x128@2x.png
sips -z 256 256   Source.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   Source.png --out MyIcon.iconset/icon_256x256@2x.png
sips -z 512 512   Source.png --out MyIcon.iconset/icon_512x512.png
sips -z 1024 1024 Source.png --out MyIcon.iconset/icon_512x512@2x.png

# 转换为icns
iconutil -c icns MyIcon.iconset -o icon.icns
```

### Windows平台图标 (icon.ico)
Windows平台已有icon.ico图标文件，位于build目录。如需更新，请准备一个256x256像素的PNG图像，通过在线转换工具转换为.ico格式。

## 打包流程

### 安装依赖
```bash
npm install
```

### 清理旧的构建文件
```bash
npm run clean
```

### 打包所有平台
```bash
npm run package:all
```

### 仅打包Windows平台（仅支持x64架构）
```bash
npm run package:win
```

### 仅打包Mac平台
```bash
npm run package:mac
```

### 打包输出
打包后的应用将保存在release目录中：
- Windows (x64架构): `release/大医AI导播系统-{版本号}-win.exe` (安装包) 和 `大医AI导播系统-{版本号}-portable.exe` (便携版)
- Mac: `release/大医AI导播系统-{版本号}-mac.dmg` (安装包) 和 `大医AI导播系统-{版本号}-mac.zip` (压缩包)

## 注意事项

### Mac签名与公证
如需在Mac App Store以外发布应用，建议进行签名和公证：

1. 需要拥有Apple开发者账号
2. 在package.json中配置签名信息
3. 使用以下命令进行签名打包：
```bash
npm run package:mac -- --sign="{开发者ID}" --notarize
```

### Windows证书签名
如需在Windows平台对应用签名：

1. 准备好代码签名证书(.pfx)
2. 在package.json中加入以下配置：
```json
"win": {
  ...
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "密码或环境变量"
}
``` 