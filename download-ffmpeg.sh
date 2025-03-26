#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 输出带颜色的信息
info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# 创建目录
create_directories() {
    info "创建目录结构..."
    
    # 确保在项目根目录
    if [ ! -f "package.json" ]; then
        error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 创建目录
    mkdir -p "resources/ffmpeg/mac"
    mkdir -p "resources/ffmpeg/win"
    
    info "目录创建完成"
}

# 下载 macOS 版本
download_mac_ffmpeg() {
    info "下载 macOS 版本的 FFmpeg..."
    local temp_dir="temp_ffmpeg_mac"
    mkdir -p "$temp_dir"
    
    # 下载macOS版本
    curl -L "https://evermeet.cx/ffmpeg/ffmpeg-6.1.zip" -o "$temp_dir/ffmpeg.zip"
    
    # 解压
    unzip -q "$temp_dir/ffmpeg.zip" -d "$temp_dir"
    
    # 移动到目标目录
    mv "$temp_dir/ffmpeg" "resources/ffmpeg/mac/"
    
    # 设置执行权限
    chmod +x "resources/ffmpeg/mac/ffmpeg"
    
    # 清理临时文件
    rm -rf "$temp_dir"
    
    info "macOS FFmpeg 下载完成"
}

# 下载 Windows 版本
download_win_ffmpeg() {
    info "下载 Windows 版本的 FFmpeg..."
    local temp_dir="temp_ffmpeg_win"
    mkdir -p "$temp_dir"
    
    # 下载Windows版本
    curl -L "https://github.com/GyanD/codexffmpeg/releases/download/6.1/ffmpeg-6.1-essentials_build.zip" -o "$temp_dir/ffmpeg-win.zip"
    
    # 解压
    unzip -q "$temp_dir/ffmpeg-win.zip" -d "$temp_dir"
    
    # 移动到目标目录
    mv "$temp_dir/ffmpeg-6.1-essentials_build/bin/ffmpeg.exe" "resources/ffmpeg/win/"
    
    # 清理临时文件
    rm -rf "$temp_dir"
    
    info "Windows FFmpeg 下载完成"
}

# 验证下载
verify_ffmpeg() {
    info "验证 FFmpeg 文件..."
    
    # 验证 macOS 版本
    if [ ! -f "resources/ffmpeg/mac/ffmpeg" ]; then
        error "macOS FFmpeg 未找到"
        return 1
    fi
    
    # 验证 Windows 版本
    if [ ! -f "resources/ffmpeg/win/ffmpeg.exe" ]; then
        error "Windows FFmpeg 未找到"
        return 1
    fi
    
    # 在 macOS 上额外验证可执行性
    if [ "$(uname)" == "Darwin" ]; then
        if ! "resources/ffmpeg/mac/ffmpeg" -version >/dev/null 2>&1; then
            error "macOS FFmpeg 验证失败"
            return 1
        fi
    fi
    
    info "FFmpeg 验证成功"
    return 0
}

# 主函数
main() {
    info "开始下载 FFmpeg..."
    
    # 创建目录
    create_directories
    
    # 下载两个平台的版本
    download_mac_ffmpeg
    download_win_ffmpeg
    
    # 验证安装
    verify_ffmpeg
    
    if [ $? -eq 0 ]; then
        info "FFmpeg 下载完成！"
        info "文件位置:"
        info "- macOS: $(pwd)/resources/ffmpeg/mac/ffmpeg"
        info "- Windows: $(pwd)/resources/ffmpeg/win/ffmpeg.exe"
    else
        error "FFmpeg 下载过程中出现错误"
        exit 1
    fi
}

# 运行主函数
main 