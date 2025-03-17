/**
 * GPU检测工具
 * 用于检测系统GPU信息并确定适合的编码器
 */

/**
 * GPU供应商
 */
export enum GPUVendor {
  NVIDIA = 'nvidia',
  AMD = 'amd',
  INTEL = 'intel',
  APPLE = 'apple',
  UNKNOWN = 'unknown'
}

/**
 * GPU信息
 */
export interface GPUInfo {
  vendor: GPUVendor;
  model: string;
}

/**
 * 编码器类型
 */
export enum EncoderType {
  H264_VIDEOTOOLBOX = 'h264_videotoolbox', // Apple M系列芯片
  H264_NVENC = 'h264_nvenc',               // NVIDIA显卡
  H264_AMF = 'h264_amf',                   // AMD显卡
  H264_QSV = 'h264_qsv',                   // Intel显卡
  H264_SOFTWARE = 'libx264'                // 软件编码
}

/**
 * GPU检测器类
 * 负责检测系统GPU信息并确定适合的编码器
 */
class GPUDetector {
  /**
   * 获取系统GPU信息
   * @returns Promise<GPUInfo> GPU信息
   */
  async getGPUInfo(): Promise<GPUInfo> {
    try {
      // 在Electron环境中，通过IPC调用主进程获取GPU信息
      if (this.isElectronAPIAvailable() && window.electronAPI?.getGPUInfo) {
        const gpuInfo = await window.electronAPI.getGPUInfo();
        return this.parseGPUInfo(gpuInfo);
      }
      
      // 如果不在Electron环境或API不可用，尝试使用WebGL获取GPU信息
      return this.getGPUInfoFromWebGL();
    } catch (error) {
      console.error('获取GPU信息失败:', error);
      return {
        vendor: GPUVendor.UNKNOWN,
        model: 'Unknown'
      };
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
   * 从WebGL获取GPU信息
   * @returns GPUInfo GPU信息
   */
  private getGPUInfoFromWebGL(): GPUInfo {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext || 
                 canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!gl) {
        throw new Error('无法创建WebGL上下文');
      }
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      if (!debugInfo) {
        throw new Error('无法获取WebGL调试信息');
      }
      
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      
      console.log('[gpuDetector.ts GPU检测器] WebGL获取到的GPU信息:', { vendor, renderer });
      
      return this.parseGPUInfo({
        vendor,
        model: renderer
      });
    } catch (error) {
      console.error('[gpuDetector.ts GPU检测器] 从WebGL获取GPU信息失败:', error);
      return {
        vendor: GPUVendor.UNKNOWN,
        model: 'Unknown'
      };
    }
  }
  
  /**
   * 解析GPU信息
   * @param info - 原始GPU信息
   * @returns GPUInfo 解析后的GPU信息
   */
  private parseGPUInfo(info: { vendor: string, model: string }): GPUInfo {
    const vendorLower = info.vendor.toLowerCase();
    const modelLower = info.model.toLowerCase();
    
    console.log('[gpuDetector.ts GPU检测器] 原始GPU信息:', { vendor: vendorLower, model: modelLower });
    
    let vendor = GPUVendor.UNKNOWN;
    
    if (vendorLower.includes('nvidia') || modelLower.includes('nvidia')) {
      vendor = GPUVendor.NVIDIA;
    } else if (vendorLower.includes('amd') || modelLower.includes('amd') || modelLower.includes('radeon')) {
      vendor = GPUVendor.AMD;
    } else if (vendorLower.includes('intel') || modelLower.includes('intel')) {
      vendor = GPUVendor.INTEL;
    } else if (
      vendorLower.includes('apple') || 
      modelLower.includes('apple') || 
      modelLower.includes('m1') || 
      modelLower.includes('m2') || 
      modelLower.includes('m3') ||
      modelLower.includes('apple gpu')
    ) {
      vendor = GPUVendor.APPLE;
    }
    
    console.log('[gpuDetector.ts GPU检测器] 解析后的GPU信息:', { vendor, model: info.model });
    
    return {
      vendor,
      model: info.model
    };
  }
  
  /**
   * 获取适合的编码器
   * @returns Promise<EncoderType> 编码器类型
   */
  async getRecommendedEncoder(): Promise<EncoderType> {
    const gpuInfo = await this.getGPUInfo();
    
    let encoder: EncoderType;
    
    switch (gpuInfo.vendor) {
      case GPUVendor.APPLE:
        encoder = EncoderType.H264_VIDEOTOOLBOX;
        break;
      case GPUVendor.NVIDIA:
        encoder = EncoderType.H264_NVENC;
        break;
      case GPUVendor.AMD:
        encoder = EncoderType.H264_AMF;
        break;
      case GPUVendor.INTEL:
        encoder = EncoderType.H264_QSV;
        break;
      default:
        encoder = EncoderType.H264_SOFTWARE;
        break;
    }
    
    console.log('[gpuDetector.ts GPU检测器] 推荐的编码器:', { 
      gpuVendor: gpuInfo.vendor, 
      gpuModel: gpuInfo.model, 
      encoder 
    });
    
    return encoder;
  }
}

// 导出单例实例
export default new GPUDetector(); 