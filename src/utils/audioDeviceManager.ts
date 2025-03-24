/**
 * 音频设备管理器
 * 负责管理系统音频设备，提供麦克风和系统音频捕获功能
 */

import { ref, computed, reactive } from 'vue';
import type { MicrophoneDeviceInfo, AudioOutputDeviceInfo, AudioDeviceState, SystemAudioState } from '../types/audio';
import { useAppStore } from '../stores/appStore';

/**
 * 判断当前环境是否为Electron
 */
const isElectron = computed(() => {
  return window.electronAPI !== undefined;
});

/**
 * 判断当前操作系统
 */
const isMac = computed(() => {
  return navigator.platform.toLowerCase().includes('mac');
});

/**
 * 判断当前操作系统是否为Windows
 */
const isWindows = computed(() => {
  return navigator.platform.toLowerCase().includes('win');
});

/**
 * 判断是否安装了BlackHole (仅macOS)
 */
const isBlackholeInstalled = ref(false);

/**
 * 判断是否启用了立体声混音 (仅Windows)
 */
const isStereoMixEnabled = ref(false);

/**
 * 所有麦克风设备列表
 */
const microphoneDevices = ref<MicrophoneDeviceInfo[]>([]);

/**
 * 所有音频输出设备列表 (仅Windows中使用)
 */
const audioOutputDevices = ref<AudioOutputDeviceInfo[]>([]);

/**
 * 音频处理元素，用于音频分析和处理
 */
const audioContext = ref<AudioContext | null>(null);
const microphoneStream = ref<MediaStream | null>(null);
const systemAudioStream = ref<MediaStream | null>(null);
const microphoneSource = ref<MediaStreamAudioSourceNode | null>(null);
const systemAudioSource = ref<MediaStreamAudioSourceNode | null>(null);
const microphoneAnalyser = ref<AnalyserNode | null>(null);
const systemAudioAnalyser = ref<AnalyserNode | null>(null);
const audioDataArray = ref<Uint8Array | null>(null);

/**
 * 麦克风设备状态
 */
const microphoneState = reactive<AudioDeviceState>({
  deviceId: '',
  volume: 100,
  muted: false,
  level: 0
});

/**
 * 系统音频状态
 */
const systemAudioState = reactive<SystemAudioState>({
  enabled: false,
  volume: 100,
  muted: false,
  level: 0,
  captureMethod: 'none'
});

/**
 * 添加systemAudioGainNode的响应式引用定义
 */
const systemAudioGainNode = ref<GainNode | null>(null);

/**
 * 初始化音频设备管理器
 */
export async function initAudioDeviceManager() {
  // 创建音频上下文
  try {
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (error) {
    console.error('[audioDeviceManager.ts] 创建音频上下文失败', error);
  }

  // 检查平台特定功能
  if (isElectron.value) {
    if (isMac.value) {
      if (window.electronAPI && window.electronAPI.checkBlackholeInstalled) {
        isBlackholeInstalled.value = await window.electronAPI.checkBlackholeInstalled() || false;
      }
    }

    if (isWindows.value) {
      if (window.electronAPI && window.electronAPI.checkStereoMixEnabled) {
        isStereoMixEnabled.value = await window.electronAPI.checkStereoMixEnabled() || false;
      }
      
      // 获取音频输出设备列表（Windows平台）
      if (window.electronAPI && window.electronAPI.getAudioOutputDevices) {
        try {
          const devices = await window.electronAPI.getAudioOutputDevices() || [];
          audioOutputDevices.value = devices;
          console.log('[audioDeviceManager.ts] 获取到音频输出设备列表', devices);
        } catch (error) {
          console.error('[audioDeviceManager.ts] 获取音频输出设备列表失败', error);
        }
      }
    }
  }

  // 加载麦克风设备列表
  await refreshMicrophoneDevices();
}

/**
 * 刷新麦克风设备列表
 */
export async function refreshMicrophoneDevices() {
  try {
    // 请求麦克风权限并获取设备列表
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 立即停止流，我们只是为了获取权限
    stream.getTracks().forEach(track => track.stop());
    
    // 获取设备列表
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // 过滤出音频输入设备
    const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
    
    // 格式化为我们的设备信息结构
    microphoneDevices.value = audioInputDevices.map(device => ({
      deviceId: device.deviceId,
      label: device.label || `麦克风 ${device.deviceId.substring(0, 5)}...`,
      isDefault: device.deviceId === 'default'
    }));
    
    console.log('[audioDeviceManager.ts] 获取到麦克风设备列表', microphoneDevices.value);
  } catch (error) {
    console.error('[audioDeviceManager.ts] 获取麦克风设备列表失败', error);
    microphoneDevices.value = [];
  }
}

/**
 * 打开麦克风
 * @param deviceId 设备ID
 */
export async function openMicrophone(deviceId: string | null): Promise<boolean> {
  try {
    // 关闭现有麦克风
    closeMicrophone();
    
    if (!deviceId) return false;
    
    // 更新状态
    microphoneState.deviceId = deviceId;
    
    // 打开麦克风
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId }
      }
    });
    
    microphoneStream.value = stream;
    
    // 创建音频处理节点
    if (audioContext.value) {
      microphoneSource.value = audioContext.value.createMediaStreamSource(stream);
      microphoneAnalyser.value = audioContext.value.createAnalyser();
      microphoneAnalyser.value.fftSize = 256;
      
      // 连接节点
      microphoneSource.value.connect(microphoneAnalyser.value);
      
      // 创建数据数组
      audioDataArray.value = new Uint8Array(microphoneAnalyser.value.frequencyBinCount);
      
      // 开始分析音频电平
      startMicrophoneLevelAnalysis();
    }
    
    console.log('[audioDeviceManager.ts] 成功打开麦克风', deviceId);
    return true;
  } catch (error) {
    console.error('[audioDeviceManager.ts] 打开麦克风失败', error);
    return false;
  }
}

/**
 * 启动麦克风音频电平分析
 */
function startMicrophoneLevelAnalysis() {
  if (!microphoneAnalyser.value || !audioDataArray.value) return;
  
  // 定义分析函数
  const analyzeLevel = () => {
    if (!microphoneAnalyser.value || !audioDataArray.value) return;
    
    // 如果已静音，则强制电平为0
    if (microphoneState.muted) {
      microphoneState.level = 0;
      requestAnimationFrame(analyzeLevel);
      return;
    }
    
    // 获取音频数据
    microphoneAnalyser.value.getByteFrequencyData(audioDataArray.value);
    
    // 计算平均电平
    let sum = 0;
    for (let i = 0; i < audioDataArray.value.length; i++) {
      sum += audioDataArray.value[i];
    }
    
    // 计算平均值并转换到0-100范围
    const average = sum / audioDataArray.value.length;
    microphoneState.level = Math.min(100, Math.round((average / 256) * 100));
    
    // 继续下一帧分析
    requestAnimationFrame(analyzeLevel);
  };
  
  // 开始分析
  analyzeLevel();
}

/**
 * 关闭麦克风
 */
export function closeMicrophone() {
  // 停止所有轨道
  if (microphoneStream.value) {
    microphoneStream.value.getTracks().forEach(track => track.stop());
    microphoneStream.value = null;
  }
  
  // 断开音频节点
  if (microphoneSource.value) {
    microphoneSource.value.disconnect();
    microphoneSource.value = null;
  }
  
  microphoneAnalyser.value = null;
  
  // 重置状态
  microphoneState.level = 0;
  console.log('[audioDeviceManager.ts] 麦克风已关闭');
}

/**
 * 设置麦克风静音状态
 * @param muted 是否静音
 */
export function setMicrophoneMuted(muted: boolean) {
  microphoneState.muted = muted;
  
  // 如果有流，设置其轨道的启用状态
  if (microphoneStream.value) {
    microphoneStream.value.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
  }
  
  // 如果静音，确保电平为0
  if (muted) {
    microphoneState.level = 0;
  }
  
  console.log('[audioDeviceManager.ts] 设置麦克风静音状态', muted);
}

/**
 * 设置麦克风音量
 * @param volume 音量值 (0-100)
 */
export function setMicrophoneVolume(volume: number) {
  microphoneState.volume = Math.max(0, Math.min(100, volume));
  console.log('[audioDeviceManager.ts] 设置麦克风音量', microphoneState.volume);
  
  // 如果有GainNode，可以设置音量增益
  // 这里简化处理，仅保存音量值
}

/**
 * 打开系统音频捕获
 * @param outputDeviceId (可选) 输出设备ID，用于系统配置
 */
export async function openSystemAudio(outputDeviceId?: string): Promise<boolean> {
  // 先关闭现有的系统音频捕获
  closeSystemAudio();
  
  // 尝试各种捕获方法
  if (isElectron.value) {
    // 在任何平台上都使用desktop capturer
    if (isWindows.value || (!isMac.value) || (!isBlackholeInstalled.value)) {
      return await startDesktopCapturerAudio();
    } else if (isMac.value && isBlackholeInstalled.value) {
      // macOS下通过BlackHole捕获
      return await startBlackholeCapture();
    }
  } else {
    console.error('[audioDeviceManager.ts] 当前不在Electron环境中，无法捕获系统音频');
    return false;
  }
  
  return false;
}

/**
 * 使用BlackHole插件捕获系统音频 (仅限macOS)
 */
async function startBlackholeCapture(): Promise<boolean> {
  try {
    if (!isElectron.value || !isBlackholeInstalled.value) {
      return false;
    }
    
    // 尝试获取BlackHole设备
    const devices = await navigator.mediaDevices.enumerateDevices();
    const blackholeDevice = devices.find(device => 
      device.kind === 'audioinput' && device.label.includes('BlackHole')
    );
    
    if (!blackholeDevice) {
      console.error('[audioDeviceManager.ts] 找不到BlackHole设备');
      return false;
    }
    
    // 捕获BlackHole设备的音频
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: blackholeDevice.deviceId }
      }
    });
    
    systemAudioStream.value = stream;
    
    // 创建音频处理节点
    if (audioContext.value) {
      systemAudioSource.value = audioContext.value.createMediaStreamSource(stream);
      systemAudioAnalyser.value = audioContext.value.createAnalyser();
      systemAudioAnalyser.value.fftSize = 256;
      
      // 连接节点
      systemAudioSource.value.connect(systemAudioAnalyser.value);
      
      // 创建数据数组
      const dataArray = new Uint8Array(systemAudioAnalyser.value.frequencyBinCount);
      
      // 开始分析音频电平
      const analyzeLevel = () => {
        if (!systemAudioAnalyser.value) return;
        
        // 如果已静音，则强制电平为0
        if (systemAudioState.muted) {
          systemAudioState.level = 0;
          requestAnimationFrame(analyzeLevel);
          return;
        }
        
        // 获取音频数据
        systemAudioAnalyser.value.getByteFrequencyData(dataArray);
        
        // 计算平均电平
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        // 计算平均值并转换到0-100范围
        const average = sum / dataArray.length;
        systemAudioState.level = Math.min(100, Math.round((average / 256) * 100));
        
        // 继续下一帧分析
        requestAnimationFrame(analyzeLevel);
      };
      
      // 开始分析
      analyzeLevel();
    }
    
    systemAudioState.enabled = true;
    systemAudioState.captureMethod = 'blackhole';
    console.log('[audioDeviceManager.ts] 成功启动BlackHole音频捕获');
    
    return true;
  } catch (error) {
    console.error('[audioDeviceManager.ts] BlackHole音频捕获失败', error);
    systemAudioState.captureMethod = 'none';
    return false;
  }
}

/**
 * 使用desktopCapturer API捕获系统音频
 */
async function startDesktopCapturerAudio(): Promise<boolean> {
  try {
    if (!isElectron.value) {
      return false;
    }
    
    console.log('[audioDeviceManager.ts] 尝试使用desktopCapturer捕获系统音频');
    
    // 使用getUserMedia和desktopCapturer结合捕获系统音频
    const constraints: MediaStreamConstraints = {
      audio: {
        // 添加TypeScript注释忽略类型检查，因为这是Electron特有的非标准参数
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      },
      video: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: 'screen:0:0',
          minWidth: 1,
          maxWidth: 1,
          minHeight: 1,
          maxHeight: 1
        }
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // 安全地移除视频轨道，防止removeChild错误
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach(track => {
        try {
          track.stop();
          stream.removeTrack(track);
        } catch (e) {
          console.warn('[audioDeviceManager.ts] 移除视频轨道时出错', e);
          track.enabled = false; // 如果无法移除，至少禁用它
        }
      });
    }
    
    // 确保我们只处理音频轨道
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('[audioDeviceManager.ts] 捕获的桌面流中没有音频轨道');
      return false;
    }
    
    // 创建一个只包含音频轨道的新流
    const audioOnlyStream = new MediaStream(audioTracks);
    systemAudioStream.value = audioOnlyStream;
    
    // 创建音频处理节点
    if (audioContext.value && systemAudioStream.value) {
      // 首先检查音频上下文的状态
      if (audioContext.value.state === 'suspended') {
        await audioContext.value.resume();
      }
      
      // 创建和连接音频节点
      systemAudioSource.value = audioContext.value.createMediaStreamSource(systemAudioStream.value);
      systemAudioAnalyser.value = audioContext.value.createAnalyser();
      
      // 增强音频分析配置
      systemAudioAnalyser.value.fftSize = 1024; // 更高的FFT尺寸以获得更好的频率分辨率
      systemAudioAnalyser.value.smoothingTimeConstant = 0.8; // 增加平滑系数，使电平变化更平滑
      
      // 连接节点
      systemAudioSource.value.connect(systemAudioAnalyser.value);
      
      // 创建一个增益节点，用于应用系统音量
      systemAudioGainNode.value = audioContext.value.createGain();
      systemAudioGainNode.value.gain.value = systemAudioState.volume / 100;
      
      // 连接增益节点
      systemAudioAnalyser.value.connect(systemAudioGainNode.value);
      
      // 创建数据数组
      const bufferLength = systemAudioAnalyser.value.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // 开始分析音频电平
      const analyzeLevel = () => {
        if (!systemAudioAnalyser.value) return;
        
        // 如果已静音，则强制电平为0
        if (systemAudioState.muted) {
          systemAudioState.level = 0;
          requestAnimationFrame(analyzeLevel);
          return;
        }
        
        // 获取频域数据
        systemAudioAnalyser.value.getByteFrequencyData(dataArray);
        
        // Windows平台优化的电平检测算法
        let sum = 0;
        let significantBins = 0;
        
        // 低频范围（通常包含大部分听觉上重要的声音）
        const lowFreqEndIndex = Math.floor(bufferLength * 0.4); // 低频占总频谱的40%
        for (let i = 0; i < lowFreqEndIndex; i++) {
          // 给予低频更高的权重，因为人耳对低频更敏感
          const weight = 1.5 - (i / lowFreqEndIndex) * 0.5; // 权重从1.5线性降至1.0
          sum += dataArray[i] * weight;
          
          // 只统计有显著能量的频率
          if (dataArray[i] > 5) {
            significantBins++;
          }
        }
        
        // 中高频范围（检测语音、音乐等）
        for (let i = lowFreqEndIndex; i < bufferLength; i++) {
          // 给予中高频正常权重
          sum += dataArray[i];
          
          // 只统计有显著能量的频率
          if (dataArray[i] > 10) { // 中高频要求更高的能量才算显著
            significantBins++;
          }
        }
        
        // 计算加权平均值并应用调整因子
        let average = sum / bufferLength;
        
        // 增加Windows平台的电平灵敏度
        if (isWindows.value) {
          const sensitivity = 2.5; // Windows平台需要更高的灵敏度
          average *= sensitivity;
          
          // 确保有意义的微弱信号也能显示
          if (significantBins > 3 && average < 10) {
            average = Math.max(average, 10); // 至少显示10%的电平
          }
        }
        
        // 计算最终电平值（0-100）
        systemAudioState.level = Math.min(100, Math.round((average / 256) * 100));
        
        // 继续下一帧分析
        requestAnimationFrame(analyzeLevel);
      };
      
      // 开始分析
      analyzeLevel();
      
      // 创建一个静音的音频节点连接到目标，防止"AudioContext was not allowed to start"警告
      const silentNode = audioContext.value.createGain();
      silentNode.gain.value = 0;
      silentNode.connect(audioContext.value.destination);
      
      console.log('[audioDeviceManager.ts] 音频分析器已设置，电平检测已启动');
    }
    
    systemAudioState.enabled = true;
    systemAudioState.captureMethod = 'desktop-capturer';
    console.log('[audioDeviceManager.ts] 成功启动desktopCapturer音频捕获');
    
    return true;
  } catch (error) {
    console.error('[audioDeviceManager.ts] desktopCapturer音频捕获失败', error);
    systemAudioState.captureMethod = 'none';
    return false;
  }
}

/**
 * 关闭系统音频捕获
 */
export function closeSystemAudio() {
  // 停止媒体流
  if (systemAudioStream.value) {
    systemAudioStream.value.getTracks().forEach(track => track.stop());
    systemAudioStream.value = null;
  }
  
  // 断开音频节点
  if (systemAudioSource.value) {
    systemAudioSource.value.disconnect();
    systemAudioSource.value = null;
  }
  
  systemAudioAnalyser.value = null;
  
  // 重置状态
  systemAudioState.enabled = false;
  systemAudioState.level = 0;
  systemAudioState.captureMethod = 'none';
  console.log('[audioDeviceManager.ts] 系统音频捕获已关闭');
}

/**
 * 设置系统音频静音状态
 * @param muted 是否静音
 */
export function setSystemAudioMuted(muted: boolean) {
  systemAudioState.muted = muted;
  
  // 根据不同的捕获方法处理静音
  if (systemAudioStream.value) {
    // 对音频轨道设置启用状态
    systemAudioStream.value.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
    
    // 如果使用desktop-capturer且有增益节点，设置增益为0实现静音
    if (systemAudioState.captureMethod === 'desktop-capturer' && systemAudioGainNode.value) {
      try {
        systemAudioGainNode.value.gain.value = muted ? 0 : systemAudioState.volume / 100;
      } catch (error) {
        console.error('[audioDeviceManager.ts] 设置系统音频静音状态失败', error);
      }
    }
    
    if (muted) {
      systemAudioState.level = 0;
    }
  }
  
  console.log('[audioDeviceManager.ts] 设置系统音频静音状态', muted);
}

/**
 * 设置系统音频音量
 * @param volume 音量值 (0-100)
 */
export function setSystemAudioVolume(volume: number) {
  systemAudioState.volume = Math.max(0, Math.min(100, volume));
  console.log('[audioDeviceManager.ts] 设置系统音频音量', systemAudioState.volume);
  
  // 如果使用desktop-capturer，通过GainNode应用音量
  if (systemAudioState.captureMethod === 'desktop-capturer' && systemAudioGainNode.value) {
    try {
      // 音量值从0-100转换为0-1的增益值
      systemAudioGainNode.value.gain.value = systemAudioState.volume / 100;
      console.log('[audioDeviceManager.ts] 已应用系统音频增益', systemAudioGainNode.value.gain.value);
    } catch (error) {
      console.error('[audioDeviceManager.ts] 设置系统音频增益失败', error);
    }
  }
}

/**
 * 获取麦克风设备列表
 */
export function getMicrophoneDevices() {
  return microphoneDevices.value;
}

/**
 * 获取音频输出设备列表
 */
export function getAudioOutputDevices() {
  return audioOutputDevices.value;
}

/**
 * 获取麦克风状态
 */
export function getMicrophoneState() {
  return microphoneState;
}

/**
 * 获取系统音频状态
 */
export function getSystemAudioState() {
  return systemAudioState;
}

/**
 * 获取捕获支持信息
 */
export function getCaptureSupport() {
  return {
    isBlackholeInstalled: isBlackholeInstalled.value,
    isStereoMixEnabled: isStereoMixEnabled.value
  };
}

/**
 * 清理音频设备管理器资源
 */
export function cleanupAudioDeviceManager() {
  // 关闭麦克风
  closeMicrophone();
  
  // 关闭系统音频捕获
  closeSystemAudio();
  
  // 关闭音频上下文
  if (audioContext.value) {
    audioContext.value.close();
    audioContext.value = null;
  }
  
  console.log('[audioDeviceManager.ts] 音频设备管理器资源已清理');
}

/**
 * 刷新设备列表
 */
export async function refreshDevices(): Promise<void> {
  try {
    // 获取麦克风设备列表
    await refreshMicrophoneDevices();
    
    // 获取音频输出设备列表（Windows平台特有）
    if (isWindows.value && isElectron.value && window.electronAPI?.getAudioOutputDevices) {
      try {
        const outputDevices = await window.electronAPI.getAudioOutputDevices();
        if (outputDevices && Array.isArray(outputDevices)) {
          audioOutputDevices.value = outputDevices;
          console.log('[audioDeviceManager.ts] 已刷新音频输出设备列表', audioOutputDevices.value);
        }
      } catch (err) {
        console.error('[audioDeviceManager.ts] 获取音频输出设备失败', err);
        audioOutputDevices.value = [];
      }
    }
  } catch (error) {
    console.error('[audioDeviceManager.ts] 刷新设备列表失败', error);
  }
}
