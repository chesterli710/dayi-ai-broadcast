/**
 * 音频设备管理工具类
 * 用于检测和管理系统音频设备
 */
import type { AudioDevice, SystemAudioStatus } from '../types/audio';
import { AudioSourceType } from '../types/audio';
import { isMacOS, isWindows } from './platformUtils';

// 声明全局 Electron API 类型
declare global {
  interface Window {
    electronAPI?: {
      checkBlackholeInstalled: () => Promise<boolean>;
      checkStereoMixEnabled: () => Promise<boolean>;
      setDeviceVolume?: (deviceId: string, volume: number) => Promise<boolean>;
    }
  }
}

/**
 * 音频设备管理器类
 * 负责检测和管理系统音频设备
 */
class AudioDeviceManager {
  /**
   * 音频上下文
   * 用于音频处理和分析
   */
  private audioContext: AudioContext | null = null;
  
  /**
   * 音频分析器映射
   * 用于存储每个设备的音频分析器
   */
  private analyserMap: Map<string, {
    analyser: AnalyserNode;
    stream: MediaStream;
    source: MediaStreamAudioSourceNode;
  }> = new Map();
  
  /**
   * 获取系统可用的音频输入设备
   * @returns Promise<AudioDevice[]> 音频设备列表
   */
  async getAudioInputDevices(): Promise<AudioDevice[]> {
    try {
      // 使用Web API获取音频输入设备
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map((device, index) => {
          return {
            id: device.deviceId,
            name: device.label || `麦克风 ${index + 1}`,
            type: AudioSourceType.MICROPHONE,
            isDefault: device.deviceId === 'default',
            isActive: false,
            volume: 100,
            level: 0
          };
        });
      
      return audioInputDevices;
    } catch (error) {
      console.error('获取音频输入设备失败:', error);
      return [];
    }
  }

  /**
   * 检查系统音频捕获状态
   * @returns Promise<SystemAudioStatus> 系统音频状态
   */
  async checkSystemAudioStatus(): Promise<SystemAudioStatus> {
    // 初始状态
    const status: SystemAudioStatus = {
      isAvailable: false
    };

    try {
      if (isMacOS()) {
        // 在MacOS上检查Blackhole是否已安装
        status.isBlackholeInstalled = await this.checkBlackholeInstalled();
        status.isAvailable = status.isBlackholeInstalled;
      } else if (isWindows()) {
        // 在Windows上检查立体声混音是否已启用
        status.isStereoMixEnabled = await this.checkStereoMixEnabled();
        status.isAvailable = status.isStereoMixEnabled;
      }
      
      return status;
    } catch (error) {
      console.error('检查系统音频状态失败:', error);
      return status;
    }
  }

  /**
   * 检查MacOS上Blackhole是否已安装
   * @returns Promise<boolean> 是否已安装
   */
  private async checkBlackholeInstalled(): Promise<boolean> {
    try {
      // 在Electron环境中，通过IPC调用主进程执行命令行检查
      if (this.isElectronAPIAvailable() && window.electronAPI?.checkBlackholeInstalled) {
        return await window.electronAPI.checkBlackholeInstalled();
      }
      
      // 如果不在Electron环境或API不可用，尝试通过枚举设备检查
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => 
        device.label.toLowerCase().includes('blackhole') && 
        (device.kind === 'audioinput' || device.kind === 'audiooutput')
      );
    } catch (error) {
      console.error('检查Blackhole安装状态失败:', error);
      return false;
    }
  }

  /**
   * 检查Windows上立体声混音是否已启用
   * @returns Promise<boolean> 是否已启用
   */
  private async checkStereoMixEnabled(): Promise<boolean> {
    try {
      // 在Electron环境中，通过IPC调用主进程执行命令行检查
      if (this.isElectronAPIAvailable() && window.electronAPI?.checkStereoMixEnabled) {
        return await window.electronAPI.checkStereoMixEnabled();
      }
      
      // 如果不在Electron环境或API不可用，尝试通过枚举设备检查
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => 
        (device.label.toLowerCase().includes('stereo mix') || 
         device.label.toLowerCase().includes('立体声混音')) && 
        device.kind === 'audioinput'
      );
    } catch (error) {
      console.error('检查立体声混音状态失败:', error);
      return false;
    }
  }

  /**
   * 检查Electron API是否可用
   * @returns boolean 是否可用
   */
  private isElectronAPIAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI;
  }

  /**
   * 获取系统音频设备
   * @returns Promise<AudioDevice | null> 系统音频设备
   */
  async getSystemAudioDevice(): Promise<AudioDevice | null> {
    const status = await this.checkSystemAudioStatus();
    
    if (!status.isAvailable) {
      return null;
    }
    
    // 创建系统音频设备对象
    return {
      id: 'system-audio',
      name: '系统音频',
      type: AudioSourceType.SYSTEM_AUDIO,
      isDefault: false,
      isActive: false,
      volume: 100,
      level: 0
    };
  }

  /**
   * 获取所有可能的系统音频设备
   * 包括虚拟音频设备和系统混音设备
   * @returns Promise<AudioDevice[]> 系统音频设备列表
   */
  async getSystemAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices: AudioDevice[] = [];
      
      // 检查系统音频状态
      const status = await this.checkSystemAudioStatus();
      
      // 添加默认系统音频设备
      if (status.isAvailable) {
        devices.push({
          id: 'system-audio',
          name: '系统音频',
          type: AudioSourceType.SYSTEM_AUDIO,
          isDefault: true,
          isActive: false,
          volume: 100,
          level: 0
        });
      }
      
      // 在macOS上，查找所有可能的虚拟音频设备
      if (isMacOS()) {
        // 查找所有包含"BlackHole"的设备
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const blackholeDevices = allDevices
          .filter(device => 
            device.kind === 'audioinput' && 
            device.label.toLowerCase().includes('blackhole')
          )
          .map((device, index) => ({
            id: device.deviceId,
            name: device.label || `BlackHole ${index + 1}`,
            type: AudioSourceType.SYSTEM_AUDIO,
            isDefault: false,
            isActive: false,
            volume: 100,
            level: 0
          }));
        
        // 添加其他常见的macOS虚拟音频设备
        const commonMacDevices = [
          { name: 'Soundflower (2ch)', id: 'soundflower-2ch' },
          { name: 'Soundflower (64ch)', id: 'soundflower-64ch' },
          { name: 'Loopback Audio', id: 'loopback-audio' }
        ];
        
        // 检查这些设备是否存在
        for (const device of commonMacDevices) {
          const exists = allDevices.some(d => 
            d.kind === 'audioinput' && 
            d.label.toLowerCase().includes(device.name.toLowerCase())
          );
          
          if (exists) {
            const matchedDevice = allDevices.find(d => 
              d.kind === 'audioinput' && 
              d.label.toLowerCase().includes(device.name.toLowerCase())
            );
            
            devices.push({
              id: matchedDevice?.deviceId || device.id,
              name: matchedDevice?.label || device.name,
              type: AudioSourceType.SYSTEM_AUDIO,
              isDefault: false,
              isActive: false,
              volume: 100,
              level: 0
            });
          }
        }
        
        // 添加找到的BlackHole设备
        devices.push(...blackholeDevices);
      }
      
      // 在Windows上，查找所有可能的系统混音设备
      if (isWindows()) {
        // 查找所有包含"立体声混音"或"Stereo Mix"的设备
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const stereoMixDevices = allDevices
          .filter(device => 
            device.kind === 'audioinput' && 
            (device.label.toLowerCase().includes('立体声混音') || 
             device.label.toLowerCase().includes('stereo mix'))
          )
          .map((device, index) => ({
            id: device.deviceId,
            name: device.label || `立体声混音 ${index + 1}`,
            type: AudioSourceType.SYSTEM_AUDIO,
            isDefault: false,
            isActive: false,
            volume: 100,
            level: 0
          }));
        
        // 添加其他常见的Windows虚拟音频设备
        const commonWinDevices = [
          { name: 'CABLE Output', id: 'vb-cable-output' },
          { name: 'VoiceMeeter Output', id: 'voicemeeter-output' },
          { name: 'WASAPI Loopback', id: 'wasapi-loopback' }
        ];
        
        // 检查这些设备是否存在
        for (const device of commonWinDevices) {
          const exists = allDevices.some(d => 
            d.kind === 'audioinput' && 
            d.label.toLowerCase().includes(device.name.toLowerCase())
          );
          
          if (exists) {
            const matchedDevice = allDevices.find(d => 
              d.kind === 'audioinput' && 
              d.label.toLowerCase().includes(device.name.toLowerCase())
            );
            
            devices.push({
              id: matchedDevice?.deviceId || device.id,
              name: matchedDevice?.label || device.name,
              type: AudioSourceType.SYSTEM_AUDIO,
              isDefault: false,
              isActive: false,
              volume: 100,
              level: 0
            });
          }
        }
        
        // 添加找到的立体声混音设备
        devices.push(...stereoMixDevices);
      }
      
      return devices;
    } catch (error) {
      console.error('获取系统音频设备失败:', error);
      return [];
    }
  }

  /**
   * 获取所有音频设备（包括麦克风和系统音频）
   * @returns Promise<AudioDevice[]> 所有音频设备
   */
  async getAllAudioDevices(): Promise<AudioDevice[]> {
    const inputDevices = await this.getAudioInputDevices();
    const systemAudioDevices = await this.getSystemAudioDevices();
    
    return [...inputDevices, ...systemAudioDevices];
  }
  
  /**
   * 设置设备音量
   * @param deviceId - 设备ID
   * @param volume - 音量值 (0-100)
   * @returns Promise<boolean> 是否设置成功
   */
  async setDeviceVolume(deviceId: string, volume: number): Promise<boolean> {
    try {
      // 在Electron环境中，通过IPC调用主进程设置设备音量
      if (this.isElectronAPIAvailable() && window.electronAPI?.setDeviceVolume) {
        return await window.electronAPI.setDeviceVolume(deviceId, volume);
      }
      
      // 如果不在Electron环境或API不可用，尝试使用Web Audio API
      // 注意：Web Audio API对设置设备音量的支持有限
      // 这里只是模拟实现，实际应用中可能需要更复杂的处理
      console.log(`[音频设备管理] 设置设备 ${deviceId} 音量为 ${volume}`);
      return true;
    } catch (error) {
      console.error(`设置设备 ${deviceId} 音量失败:`, error);
      return false;
    }
  }
  
  /**
   * 获取设备音频电平
   * @param deviceId - 设备ID
   * @returns Promise<number> 音频电平 (0-100)
   */
  async getDeviceLevel(deviceId: string): Promise<number> {
    try {
      // 如果设备已经有分析器，使用现有分析器
      if (this.analyserMap.has(deviceId)) {
        return this.getAnalyserLevel(deviceId);
      }
      
      // 如果没有分析器，尝试创建一个
      try {
        console.log(`[音频设备管理] 尝试为设备 ${deviceId} 创建音频分析器`);
        await this.createAnalyserForDevice(deviceId);
        if (this.analyserMap.has(deviceId)) {
          return this.getAnalyserLevel(deviceId);
        }
      } catch (error: any) {
        // 如果是system-audio设备，尝试查找其他可能的系统音频设备
        if (deviceId === 'system-audio') {
          console.warn(`[音频设备管理] 无法为system-audio创建分析器: ${error.message}`);
          console.log(`[音频设备管理] 尝试查找其他可用的系统音频设备...`);
          
          // 查找所有可能的系统音频设备
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          console.log(`[音频设备管理] 找到 ${allDevices.length} 个设备，开始筛选系统音频设备`);
          
          // 筛选可能的系统音频设备
          const potentialSystemAudioDevices = allDevices.filter(device => 
            device.kind === 'audioinput' && 
            (device.label.toLowerCase().includes('blackhole') || 
             device.label.toLowerCase().includes('stereo mix') ||
             device.label.toLowerCase().includes('立体声混音') ||
             device.label.toLowerCase().includes('cable') ||
             device.label.toLowerCase().includes('voicemeeter') ||
             device.label.toLowerCase().includes('soundflower') ||
             device.label.toLowerCase().includes('loopback'))
          );
          
          console.log(`[音频设备管理] 找到 ${potentialSystemAudioDevices.length} 个潜在的系统音频设备`);
          
          // 尝试每一个潜在的系统音频设备
          for (const device of potentialSystemAudioDevices) {
            console.log(`[音频设备管理] 尝试使用系统音频设备: ${device.label} (${device.deviceId})`);
            try {
              await this.createRealDeviceAnalyser(device.deviceId);
              // 将分析器映射到system-audio
              if (this.analyserMap.has(device.deviceId)) {
                const analyserInfo = this.analyserMap.get(device.deviceId);
                if (analyserInfo) {
                  console.log(`[音频设备管理] 成功创建分析器，将其映射到system-audio`);
                  this.analyserMap.set(deviceId, analyserInfo);
                  return this.getAnalyserLevel(deviceId);
                }
              }
            } catch (innerError: any) {
              console.warn(`[音频设备管理] 尝试使用设备 ${device.label} 失败: ${innerError.message}`);
              // 继续尝试下一个设备
            }
          }
          
          console.error(`[音频设备管理] 所有系统音频设备尝试失败，无法获取音频电平`);
        } else {
          console.error(`[音频设备管理] 获取设备 ${deviceId} 音频电平失败: ${error.message}`);
        }
        
        // 所有尝试都失败，返回0
        return 0;
      }
      
      return 0;
    } catch (error: any) {
      console.error(`[音频设备管理] 获取设备 ${deviceId} 音频电平失败: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * 为设备创建音频分析器
   * @param deviceId - 设备ID
   */
  private async createAnalyserForDevice(deviceId: string): Promise<void> {
    try {
      // 如果已经有分析器，先释放资源
      if (this.analyserMap.has(deviceId)) {
        console.log(`[音频设备管理] 设备 ${deviceId} 已有分析器，先释放资源`);
        this.releaseAnalyser(deviceId);
      }
      
      // 如果没有音频上下文，创建一个
      if (!this.audioContext) {
        console.log(`[音频设备管理] 创建音频上下文`);
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // 特殊处理system-audio设备ID
      // 这是一个虚拟设备ID，不能直接用于getUserMedia
      if (deviceId === 'system-audio') {
        console.log('[音频设备管理] system-audio是虚拟设备ID，无法直接创建分析器');
        
        // 尝试查找真实的系统音频设备
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        console.log(`[音频设备管理] 找到 ${allDevices.length} 个设备，开始查找系统音频设备`);
        
        const systemAudioDevice = allDevices.find(device => 
          device.kind === 'audioinput' && 
          (device.label.toLowerCase().includes('blackhole') || 
           device.label.toLowerCase().includes('stereo mix') ||
           device.label.toLowerCase().includes('立体声混音') ||
           device.label.toLowerCase().includes('cable') ||
           device.label.toLowerCase().includes('voicemeeter') ||
           device.label.toLowerCase().includes('soundflower') ||
           device.label.toLowerCase().includes('loopback'))
        );
        
        if (systemAudioDevice) {
          console.log(`[音频设备管理] 找到系统音频设备: ${systemAudioDevice.label} (${systemAudioDevice.deviceId})`);
          // 使用找到的真实设备ID创建分析器
          await this.createRealDeviceAnalyser(systemAudioDevice.deviceId);
          // 将分析器映射到虚拟设备ID
          if (this.analyserMap.has(systemAudioDevice.deviceId)) {
            const analyserInfo = this.analyserMap.get(systemAudioDevice.deviceId);
            if (analyserInfo) {
              console.log(`[音频设备管理] 将分析器映射到虚拟设备ID: system-audio`);
              this.analyserMap.set(deviceId, analyserInfo);
              // 不要删除原始映射，因为我们需要在两个ID上都能访问同一个分析器
            }
          } else {
            console.warn(`[音频设备管理] 无法为找到的系统音频设备创建分析器`);
            throw new Error(`无法为找到的系统音频设备 ${systemAudioDevice.label} 创建分析器`);
          }
        } else {
          console.warn('[音频设备管理] 未找到可用的系统音频设备');
          throw new Error('未找到可用的系统音频设备');
        }
      } else {
        // 正常设备ID，直接创建分析器
        console.log(`[音频设备管理] 为设备 ${deviceId} 创建分析器`);
        await this.createRealDeviceAnalyser(deviceId);
      }
    } catch (error: any) {
      console.error(`[音频设备管理] 为设备 ${deviceId} 创建音频分析器失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 为真实设备ID创建音频分析器
   * @param deviceId - 真实设备ID
   */
  private async createRealDeviceAnalyser(deviceId: string): Promise<void> {
    try {
      console.log(`[音频设备管理] 开始为真实设备 ${deviceId} 创建音频分析器`);
      
      // 获取设备的媒体流
      console.log(`[音频设备管理] 尝试获取设备 ${deviceId} 的媒体流`);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false
      });
      
      console.log(`[音频设备管理] 成功获取设备 ${deviceId} 的媒体流`);
      
      // 创建音频源和分析器
      const source = this.audioContext!.createMediaStreamSource(stream);
      const analyser = this.audioContext!.createAnalyser();
      
      // 配置分析器
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // 连接音频源到分析器
      source.connect(analyser);
      
      console.log(`[音频设备管理] 成功为设备 ${deviceId} 创建并配置音频分析器`);
      
      // 存储分析器信息
      this.analyserMap.set(deviceId, { analyser, stream, source });
    } catch (error: any) {
      console.error(`[音频设备管理] 为真实设备 ${deviceId} 创建音频分析器失败: ${error.message}`);
      if (error.name === 'OverconstrainedError') {
        console.error(`[音频设备管理] 设备ID不存在或无法访问: ${deviceId}`);
      } else if (error.name === 'NotAllowedError') {
        console.error(`[音频设备管理] 用户拒绝了麦克风访问权限`);
      } else if (error.name === 'NotFoundError') {
        console.error(`[音频设备管理] 找不到指定的设备: ${deviceId}`);
      }
      throw error;
    }
  }
  
  /**
   * 获取分析器的音频电平
   * @param deviceId - 设备ID
   * @returns number 音频电平 (0-100)
   */
  private getAnalyserLevel(deviceId: string): number {
    const analyserInfo = this.analyserMap.get(deviceId);
    if (!analyserInfo) {
      console.warn(`[音频设备管理] 设备 ${deviceId} 没有对应的分析器`);
      return 0;
    }
    
    const { analyser } = analyserInfo;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // 计算平均值
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // 将平均值转换为0-100范围
    const level = Math.min(100, Math.round(average / 255 * 100));
    
    // 记录音频电平，但不要过于频繁地记录
    if (level > 0) {
      console.debug(`[音频设备管理] 设备 ${deviceId} 音频电平: ${level}%`);
    } else if (level === 0) {
      // 只在调试模式下记录零电平，避免日志过多
      console.debug(`[音频设备管理] 设备 ${deviceId} 无音频信号`);
    }
    
    return level;
  }
  
  /**
   * 释放分析器资源
   * @param deviceId - 设备ID
   */
  private releaseAnalyser(deviceId: string): void {
    const analyserInfo = this.analyserMap.get(deviceId);
    if (!analyserInfo) {
      console.warn(`[音频设备管理] 尝试释放不存在的分析器: ${deviceId}`);
      return;
    }
    
    console.log(`[音频设备管理] 开始释放设备 ${deviceId} 的分析器资源`);
    
    const { source, stream } = analyserInfo;
    
    try {
      // 断开连接
      source.disconnect();
      console.log(`[音频设备管理] 已断开设备 ${deviceId} 的音频源连接`);
      
      // 停止媒体流的所有轨道
      const tracks = stream.getTracks();
      console.log(`[音频设备管理] 设备 ${deviceId} 有 ${tracks.length} 个音频轨道需要停止`);
      
      tracks.forEach((track, index) => {
        try {
          track.stop();
          console.log(`[音频设备管理] 已停止设备 ${deviceId} 的第 ${index + 1} 个音频轨道`);
        } catch (error: any) {
          console.error(`[音频设备管理] 停止设备 ${deviceId} 的音频轨道失败: ${error.message}`);
        }
      });
      
      // 从映射中移除
      this.analyserMap.delete(deviceId);
      console.log(`[音频设备管理] 已从映射中移除设备 ${deviceId} 的分析器`);
    } catch (error: any) {
      console.error(`[音频设备管理] 释放设备 ${deviceId} 的分析器资源时发生错误: ${error.message}`);
    }
  }
  
  /**
   * 模拟音频电平
   * 用于系统音频等无法直接获取电平的设备
   * @returns number 模拟的音频电平 (0-100)
   */
  private simulateAudioLevel(): number {
    // 不再使用模拟电平，而是返回0
    console.warn('[音频设备管理] 不再使用模拟电平功能，请使用真实设备分析器');
    return 0;
  }

  /**
   * 显示安装Blackhole的指导（MacOS）
   */
  showBlackholeInstallGuide(): void {
    // 在实际应用中，这里可以显示一个模态框或通知，指导用户安装Blackhole
    console.log('[音频设备管理] 显示Blackhole安装指南');
    console.log('[音频设备管理] 请按照以下步骤安装Blackhole:');
    console.log('[音频设备管理] 1. 访问 https://github.com/ExistentialAudio/BlackHole');
    console.log('[音频设备管理] 2. 下载并安装最新版本');
    console.log('[音频设备管理] 3. 重启应用程序');
  }

  /**
   * 显示启用立体声混音的指导（Windows）
   */
  showStereoMixEnableGuide(): void {
    // 在实际应用中，这里可以显示一个模态框或通知，指导用户启用立体声混音
    console.log('[音频设备管理] 显示立体声混音启用指南');
    console.log('[音频设备管理] 请按照以下步骤启用立体声混音:');
    console.log('[音频设备管理] 1. 右键点击系统托盘中的音量图标');
    console.log('[音频设备管理] 2. 选择"打开声音设置"');
    console.log('[音频设备管理] 3. 点击"声音控制面板"');
    console.log('[音频设备管理] 4. 在"录制"选项卡中，右键点击空白处');
    console.log('[音频设备管理] 5. 选择"显示禁用的设备"');
    console.log('[音频设备管理] 6. 右键点击"立体声混音"，选择"启用"');
    console.log('[音频设备管理] 7. 重启应用程序');
  }
  
  /**
   * 释放所有资源
   * 在应用关闭时调用
   */
  releaseResources(): void {
    console.log('[音频设备管理] 开始释放所有资源');
    
    // 释放所有分析器
    const deviceIds = Array.from(this.analyserMap.keys());
    console.log(`[音频设备管理] 需要释放 ${deviceIds.length} 个设备的分析器资源`);
    
    for (const deviceId of deviceIds) {
      try {
        this.releaseAnalyser(deviceId);
      } catch (error: any) {
        console.error(`[音频设备管理] 释放设备 ${deviceId} 的资源时发生错误: ${error.message}`);
      }
    }
    
    // 关闭音频上下文
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        console.log('[音频设备管理] 关闭音频上下文');
        this.audioContext.close();
        console.log('[音频设备管理] 音频上下文已关闭');
      } catch (error: any) {
        console.error(`[音频设备管理] 关闭音频上下文时发生错误: ${error.message}`);
      }
    } else {
      console.log('[音频设备管理] 音频上下文不存在或已关闭');
    }
    
    this.audioContext = null;
    console.log('[音频设备管理] 所有资源已释放');
  }
}

// 导出单例实例
const audioDeviceManager = new AudioDeviceManager();

// 在窗口关闭前释放资源
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioDeviceManager.releaseResources();
  });
}

export default audioDeviceManager; 