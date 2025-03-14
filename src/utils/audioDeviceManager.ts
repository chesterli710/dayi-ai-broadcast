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
    }
  }
}

/**
 * 音频设备管理器类
 * 负责检测和管理系统音频设备
 */
class AudioDeviceManager {
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
            isActive: false
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
      isActive: false
    };
  }

  /**
   * 获取所有音频设备（包括麦克风和系统音频）
   * @returns Promise<AudioDevice[]> 所有音频设备
   */
  async getAllAudioDevices(): Promise<AudioDevice[]> {
    const inputDevices = await this.getAudioInputDevices();
    const systemAudioDevice = await this.getSystemAudioDevice();
    
    return systemAudioDevice 
      ? [...inputDevices, systemAudioDevice]
      : inputDevices;
  }

  /**
   * 显示安装Blackhole的指导（MacOS）
   */
  showBlackholeInstallGuide(): void {
    // 在实际应用中，这里可以显示一个模态框或通知，指导用户安装Blackhole
    console.log('请按照以下步骤安装Blackhole:');
    console.log('1. 访问 https://github.com/ExistentialAudio/BlackHole');
    console.log('2. 下载并安装最新版本');
    console.log('3. 重启应用程序');
  }

  /**
   * 显示启用立体声混音的指导（Windows）
   */
  showStereoMixEnableGuide(): void {
    // 在实际应用中，这里可以显示一个模态框或通知，指导用户启用立体声混音
    console.log('请按照以下步骤启用立体声混音:');
    console.log('1. 右键点击系统托盘中的音量图标');
    console.log('2. 选择"打开声音设置"');
    console.log('3. 点击"声音控制面板"');
    console.log('4. 在"录制"选项卡中，右键点击空白处');
    console.log('5. 选择"显示禁用的设备"');
    console.log('6. 右键点击"立体声混音"，选择"启用"');
    console.log('7. 重启应用程序');
  }
}

// 导出单例实例
export default new AudioDeviceManager(); 