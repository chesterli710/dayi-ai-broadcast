#!/bin/bash

# 创建字体目录
mkdir -p src/assets/fonts

# 下载思源黑体字体
echo "正在下载思源黑体字体..."

# 下载 Regular 字重
echo "下载 Regular 字重..."
curl -L "https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/CN/SourceHanSansCN-Regular.otf" -o "SourceHanSansCN-Regular.otf"

# 下载 Medium 字重
echo "下载 Medium 字重..."
curl -L "https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/CN/SourceHanSansCN-Medium.otf" -o "SourceHanSansCN-Medium.otf"

# 下载 Bold 字重
echo "下载 Bold 字重..."
curl -L "https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/CN/SourceHanSansCN-Bold.otf" -o "SourceHanSansCN-Bold.otf"

# 安装 woff2 工具（如果需要）
if ! command -v woff2_compress &> /dev/null; then
    echo "正在安装 woff2 工具..."
    
    # 对于 macOS 用户（使用 Homebrew）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install woff2
    # 对于 Ubuntu/Debian 用户
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y woff2
    # 对于其他系统，提示手动安装
    else
        echo "请手动安装 woff2 工具，然后将 .otf 文件转换为 .woff2 格式"
        echo "将转换后的文件移动到 src/assets/fonts/ 目录"
        exit 1
    fi
fi

# 转换为 woff2 格式
echo "正在转换为 woff2 格式..."
woff2_compress SourceHanSansCN-Regular.otf
woff2_compress SourceHanSansCN-Medium.otf
woff2_compress SourceHanSansCN-Bold.otf

# 移动到字体目录
echo "移动文件到 src/assets/fonts/ 目录..."
mv SourceHanSansCN-Regular.woff2 src/assets/fonts/
mv SourceHanSansCN-Medium.woff2 src/assets/fonts/
mv SourceHanSansCN-Bold.woff2 src/assets/fonts/

# 清理临时文件
rm -f SourceHanSansCN-Regular.otf SourceHanSansCN-Medium.otf SourceHanSansCN-Bold.otf

echo "字体下载完成！" 