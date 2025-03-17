/**
 * Canvas渲染器工具类
 * 用于高性能绘制预览和直播画面
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Layout, LayoutElement, MediaLayoutElement, TextLayoutElement, LayoutElementType } from '../types/broadcast';
import { useVideoStore } from '../stores/videoStore';
import { usePlanStore } from '../stores/planStore';
import { getCachedImage, preloadImage, isDataUrl } from './imagePreloader';
import { VideoSourceType } from '../types/video';

/**
 * 图像缓存管理器类
 * 用于管理和缓存已加载的图像，避免重复加载
 */
class ImageCache {
  // 图像缓存映射表
  private static cache: Map<string, HTMLImageElement> = new Map();
  
  // 正在加载的图像Promise映射表
  private static loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  
  /**
   * 获取或加载图像
   * @param url 图像URL
   * @param logPrefix 日志前缀
   * @returns 图像加载Promise
   */
  public static getOrLoadImage(url: string, logPrefix: string = ''): Promise<HTMLImageElement> {
    // 如果是data URL格式，直接创建图像对象
    if (isDataUrl(url)) {
      // 检查是否已缓存
      if (this.cache.has(url)) {
        return Promise.resolve(this.cache.get(url)!);
      }
      
      // 创建新的图像对象
      const img = new Image();
      const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => {
          this.cache.set(url, img);
          resolve(img);
        };
        img.onerror = (error) => {
          reject(error);
        };
        img.src = url;
      });
      
      return promise;
    }
    
    // 首先尝试从全局图片预加载器获取图片
    const cachedImage = getCachedImage(url);
    if (cachedImage) {
      return Promise.resolve(cachedImage);
    }
    
    // 如果图像已在缓存中，直接返回
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url)!);
    }
    
    // 如果图像正在加载中，返回现有Promise
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }
    
    // 使用预加载器加载图片
    const loadPromise = preloadImage(url)
      .then(img => {
        // 图像加载成功，添加到本地缓存
        this.cache.set(url, img);
        this.loadingPromises.delete(url);
        return img;
      })
      .catch(error => {
        console.error(`${logPrefix ? logPrefix + ' ' : ''}加载图像失败: ${url}`, error);
        this.loadingPromises.delete(url);
        throw error;
      });
    
    // 存储加载Promise
    this.loadingPromises.set(url, loadPromise);
    
    return loadPromise;
  }
  
  /**
   * 清除缓存
   * @param url 可选，指定要清除的URL，不指定则清除所有缓存
   */
  public static clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * 画布渲染器选项接口
 */
interface CanvasRendererOptions {
  planStore?: ReturnType<typeof usePlanStore>;
  videoStore?: ReturnType<typeof useVideoStore>;
  isPreviewCanvas?: boolean;
}

/**
 * 画布渲染器类
 * 负责高性能绘制预览和直播画面
 */
export class CanvasRenderer {
  // 画布元素
  private canvas: HTMLCanvasElement;
  
  // 2D渲染上下文
  private ctx: CanvasRenderingContext2D | null = null;
  
  // 离屏画布 - 用于背景层
  private backgroundCanvas: OffscreenCanvas | null = null;
  private backgroundCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  // 离屏画布 - 用于前景层
  private foregroundCanvas: OffscreenCanvas | null = null;
  private foregroundCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  // 离屏画布 - 用于文字层
  private textCanvas: OffscreenCanvas | null = null;
  private textCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  // 当前布局
  private currentLayout: Layout | null = null;
  
  // 渲染尺寸
  private width: number = 1920;
  private height: number = 1080;
  
  // 是否需要重新渲染各层
  private needsBackgroundRedraw: boolean = true;
  private needsForegroundRedraw: boolean = true;
  private needsTextRedraw: boolean = true;
  
  // 视频存储
  private videoStore?: ReturnType<typeof useVideoStore>;
  
  // 计划存储
  private planStore?: ReturnType<typeof usePlanStore>;
  
  // 动画帧请求ID
  private animationFrameId: number | null = null;
  
  // 背景图像缓存
  private backgroundImage: HTMLImageElement | null = null;
  
  // 前景图像缓存
  private foregroundImage: HTMLImageElement | null = null;
  
  // 上次渲染时间戳
  private lastRenderTime: number = 0;
  
  // 渲染帧率限制 (毫秒)
  private frameRateLimit: number = 1000 / 30; // 30fps
  
  // 布局更新时间戳
  private layoutUpdateTime: number = 0;
  
  // 是否为预览画布
  private isPreviewCanvas: boolean = false;
  
  // 固定的逻辑坐标系尺寸
  private logicalWidth: number;
  private logicalHeight: number;
  
  // 是否正在渲染
  private isRendering: boolean = false;
  
  // 视频元素数组
  private videoElements: HTMLVideoElement[] = [];
  
  // 图像缓存
  private imageCache: Map<string, HTMLImageElement> = new Map();
  
  // 布局
  private layout: Layout | null = null;
  private currentLayoutId: string | null = null;
  
  // 选项
  private options: CanvasRendererOptions;
  
  // 文字图像缓存
  private textImage: HTMLImageElement | null = null;
  
  /**
   * 构造函数
   * @param canvas 画布元素
   * @param options 选项
   */
  constructor(canvas: HTMLCanvasElement, options: CanvasRendererOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    
    // 从选项中获取存储和预览状态
    this.planStore = options.planStore;
    this.videoStore = options.videoStore;
    this.isPreviewCanvas = options.isPreviewCanvas || false;
    
    // 设置固定的逻辑坐标系尺寸为1920x1080
    this.logicalWidth = 1920;
    this.logicalHeight = 1080;
    
    // 设置画布的绘图表面尺寸为固定的1920x1080
    this.canvas.width = this.logicalWidth;
    this.canvas.height = this.logicalHeight;
    
    // 获取父容器尺寸，用于计算CSS尺寸
    const parentWidth = canvas.parentElement?.clientWidth || this.logicalWidth;
    const parentHeight = canvas.parentElement?.clientHeight || this.logicalHeight;
    
    // 保持16:9比例计算CSS尺寸
    let cssWidth = parentWidth;
    let cssHeight = parentHeight;
    const aspectRatio = 16 / 9;
    
    if (cssWidth / cssHeight > aspectRatio) {
      // 宽度过大，以高度为基准
      cssWidth = cssHeight * aspectRatio;
    } else {
      // 高度过大，以宽度为基准
      cssHeight = cssWidth / aspectRatio;
    }
    
    // 确保CSS尺寸至少为1px，避免画布不可见
    cssWidth = Math.max(cssWidth, 1);
    cssHeight = Math.max(cssHeight, 1);
    
    // 设置CSS尺寸
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    
    console.log('[canvasRenderer.ts 画布渲染器] 初始化画布尺寸', {
      logicalWidth: this.logicalWidth,
      logicalHeight: this.logicalHeight,
      cssWidth: cssWidth,
      cssHeight: cssHeight,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    });
    
    // 创建离屏画布
    this.createOffscreenCanvases();
    
    // 初始化其他属性
    this.isRendering = false;
    this.needsBackgroundRedraw = true;
    this.needsForegroundRedraw = true;
    this.needsTextRedraw = true;
    this.videoElements = [];
    this.imageCache = new Map();
    
    // 初始化布局
    this.layout = null;
    this.currentLayoutId = null;
    
    // 初始化渲染循环
    this.startRenderLoop();
  }
  
  /**
   * 初始化画布
   */
  private initCanvas(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 开始初始化画布');
    
    try {
      // 设置画布尺寸
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      
      // 设置初始样式尺寸
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      
      console.log('[canvasRenderer.ts 画布渲染器] 画布尺寸已设置', {
        width: this.canvas.width,
        height: this.canvas.height,
        styleWidth: this.canvas.style.width,
        styleHeight: this.canvas.style.height
      });
      
      // 获取2D渲染上下文
      this.ctx = this.canvas.getContext('2d', {
        alpha: true,
        desynchronized: true, // 减少延迟
        willReadFrequently: false
      });
      
      if (!this.ctx) {
        console.error('[canvasRenderer.ts 画布渲染器] 无法获取2D渲染上下文');
        return;
      }
      
      console.log('[canvasRenderer.ts 画布渲染器] 2D渲染上下文已获取');
      
      // 创建离屏画布 - 背景层
      this.backgroundCanvas = new OffscreenCanvas(this.width, this.height);
      this.backgroundCtx = this.backgroundCanvas.getContext('2d');
      
      // 创建离屏画布 - 前景层
      this.foregroundCanvas = new OffscreenCanvas(this.width, this.height);
      this.foregroundCtx = this.foregroundCanvas.getContext('2d');
      
      // 创建离屏画布 - 文字层
      this.textCanvas = new OffscreenCanvas(this.width, this.height);
      this.textCtx = this.textCanvas.getContext('2d');
      
      console.log('[canvasRenderer.ts 画布渲染器] 离屏画布已创建');
      
      // 绘制一个测试图形，确认画布可见
      if (this.ctx) {
        this.ctx.fillStyle = 'rgba(0, 100, 200, 0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('画布已初始化', this.width / 2, this.height / 2);
        console.log('[canvasRenderer.ts 画布渲染器] 测试图形已绘制');
      }
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 初始化画布时出错:', error);
    }
  }
  
  /**
   * 设置当前布局
   * @param layout 布局对象
   */
  public setLayout(layout: Layout | null): void {
    console.log('[canvasRenderer.ts 画布渲染器] 设置布局', {
      layoutId: layout?.id,
      layoutTemplate: layout?.template,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      styleWidth: this.canvas.style.width,
      styleHeight: this.canvas.style.height
    });
    
    // 清理所有画布，确保没有残留内容
    this.clearAllCanvases();
    
    // 如果布局发生变化，标记所有层需要重绘
    if (this.currentLayout !== layout) {
      this.needsBackgroundRedraw = true;
      this.needsForegroundRedraw = true;
      this.needsTextRedraw = true;
      
      // 清除之前的图像缓存
      this.backgroundImage = null;
      this.foregroundImage = null;
      
      // 更新布局更新时间戳
      this.layoutUpdateTime = performance.now();
      
      // 如果有新布局，自动激活所需的视频设备
      if (layout) {
        // 检查布局是否有元素数据
        const layoutWithElements = layout as any;
        const hasElements = layoutWithElements.elements && layoutWithElements.elements.length > 0;
        
        console.log(`[canvasRenderer.ts 画布渲染器] 新布局${hasElements ? '有' : '没有'}元素数据`, {
          layoutId: layout.id,
          elementsCount: hasElements ? layoutWithElements.elements.length : 0
        });
        
        // 激活所需的视频设备
        this.activateRequiredVideoDevices(layout);
      } else {
        // 如果布局为空，清理视频元素
        this.cleanupVideoElements();
      }
    }
    
    this.currentLayout = layout;
    
    // 如果布局为空，停止渲染循环
    if (!layout) {
      this.stopRenderLoop();
      this.clearCanvas();
      return;
    }
    
    // 启动渲染循环
    this.startRenderLoop();
    
    // 强制立即渲染一帧
    this.render();
  }
  
  /**
   * 清理所有画布
   * 确保在切换布局时不会有残留内容
   */
  private clearAllCanvases(): void {
    // 清理主画布
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // 清理背景画布
    if (this.backgroundCtx && this.backgroundCanvas) {
      this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    }
    
    // 清理前景画布
    if (this.foregroundCtx && this.foregroundCanvas) {
      this.foregroundCtx.clearRect(0, 0, this.foregroundCanvas.width, this.foregroundCanvas.height);
    }
    
    // 清理文字画布
    if (this.textCtx && this.textCanvas) {
      this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
    }
    
    console.log('[canvasRenderer.ts 画布渲染器] 已清理所有画布');
  }
  
  /**
   * 清理视频元素
   */
  private cleanupVideoElements(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 清理视频元素');
    
    // 移除所有视频元素
    document.querySelectorAll('[id^="video-"]').forEach((element) => {
      const videoElement = element as HTMLVideoElement;
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          // 不停止轨道，只分离视频元素
          // track.stop();
        });
        videoElement.srcObject = null;
      }
      videoElement.remove();
    });
  }
  
  /**
   * 激活布局所需的视频设备
   * @param layout 布局对象
   */
  private async activateRequiredVideoDevices(layout: Layout): Promise<void> {
    // 获取布局中的元素
    const layoutWithElements = layout as any;
    const layoutElements = layoutWithElements.elements || [];
    
    if (layoutElements.length === 0) {
      console.log('[canvasRenderer.ts 画布渲染器] 布局中没有元素数据，无需激活视频设备');
      return;
    }
    
    // 筛选媒体元素
    const mediaElements = layoutElements.filter(
      (element: any) => element.type === 'media' && element.sourceId
    );
    
    if (mediaElements.length === 0) {
      console.log('[canvasRenderer.ts 画布渲染器] 布局中没有媒体元素，无需激活视频设备');
      return;
    }
    
    console.log(`[canvasRenderer.ts 画布渲染器] 布局中包含 ${mediaElements.length} 个媒体元素，准备激活视频设备`);
    
    // 获取所有需要激活的设备ID
    const deviceIds: string[] = mediaElements.map((element: any) => String(element.sourceId));
    
    // 去重
    const uniqueDeviceIds = [...new Set(deviceIds)];
    
    // 激活每个设备
    for (const deviceId of uniqueDeviceIds) {
      // 检查设备是否已激活
      const isActive = this.videoStore?.activeDevices.some(d => d.id === deviceId);
      if (isActive) {
        console.log(`[canvasRenderer.ts 画布渲染器] 设备 ${deviceId} 已激活，无需重复激活`);
        continue;
      }
      
      // 查找设备类型
      let deviceType: VideoSourceType | null = null;
      
      // 检查摄像头设备
      const cameraDevice = this.videoStore?.cameraDevices.find(d => d.id === deviceId);
      if (cameraDevice) {
        deviceType = VideoSourceType.CAMERA;
      }
      
      // 检查窗口设备
      const windowDevice = this.videoStore?.windowDevices.find(d => d.id === deviceId);
      if (windowDevice) {
        deviceType = VideoSourceType.WINDOW;
      }
      
      // 检查显示器设备
      const displayDevice = this.videoStore?.displayDevices.find(d => d.id === deviceId);
      if (displayDevice) {
        deviceType = VideoSourceType.DISPLAY;
      }
      
      if (deviceType === null) {
        console.warn(`[canvasRenderer.ts 画布渲染器] 未找到设备 ${deviceId} 的类型，无法激活`);
        continue;
      }
      
      // 激活设备
      console.log(`[canvasRenderer.ts 画布渲染器] 激活设备 ${deviceId} (类型: ${deviceType})`);
      try {
        await this.videoStore?.activateDevice(deviceId, deviceType);
      } catch (error) {
        console.error(`[canvasRenderer.ts 画布渲染器] 激活设备 ${deviceId} 失败:`, error);
      }
    }
  }
  
  /**
   * 清空画布
   */
  private clearCanvas(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
  
  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    // 如果已经在运行，不重复启动
    if (this.animationFrameId !== null) return;
    
    const renderFrame = (timestamp: number) => {
      // 计算自上次渲染以来的时间
      const elapsed = timestamp - this.lastRenderTime;
      
      // 如果距离上次渲染时间不足帧率限制，跳过本次渲染
      // 但如果布局刚刚更新，则强制渲染
      if (elapsed < this.frameRateLimit && timestamp - this.layoutUpdateTime > 100) {
        this.animationFrameId = requestAnimationFrame(renderFrame);
        return;
      }
      
      // 更新上次渲染时间
      this.lastRenderTime = timestamp;
      
      // 执行渲染
      this.render();
      
      // 继续下一帧
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };
    
    // 开始渲染循环
    this.lastRenderTime = performance.now();
    this.animationFrameId = requestAnimationFrame(renderFrame);
  }
  
  /**
   * 停止渲染循环
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * 渲染画面
   */
  private render(): void {
    // 如果没有布局，则清空画布并返回
    if (!this.currentLayout) {
      this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    
    // 保存当前上下文状态
    this.ctx?.save();
    
    try {
      // 清空主画布
      this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 计算缩放比例 - 从逻辑坐标系(1920x1080)到当前画布尺寸
      const scaleX = this.canvas.width / this.logicalWidth;
      const scaleY = this.canvas.height / this.logicalHeight;
      
      console.log('[canvasRenderer.ts 画布渲染器] 渲染帧', {
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        logicalWidth: this.logicalWidth,
        logicalHeight: this.logicalHeight,
        scaleX: scaleX,
        scaleY: scaleY
      });
      
      // 应用缩放
      this.ctx?.scale(scaleX, scaleY);
      
      // 按顺序渲染各层
      this.renderBackgroundLayer();
      this.renderVideoLayer();
      this.renderForegroundLayer();
      this.renderTextLayer();
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 渲染时出错:', error);
    } finally {
      // 恢复上下文状态
      this.ctx?.restore();
    }
  }
  
  /**
   * 将OffscreenCanvas转换为Image对象
   * @param canvas OffscreenCanvas对象
   * @returns 转换后的Image对象
   */
  private async convertOffscreenCanvasToImage(canvas: OffscreenCanvas): Promise<HTMLImageElement> {
    try {
      // 创建临时canvas元素
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      
      // 获取2D上下文
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('无法获取临时Canvas的2D上下文');
      }
      
      // 将OffscreenCanvas内容绘制到临时canvas
      const bitmap = await createImageBitmap(canvas);
      tempCtx.drawImage(bitmap, 0, 0);
      bitmap.close();
      
      // 从临时canvas创建图像
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // 图像加载完成后移除临时canvas
          tempCanvas.remove();
          resolve(img);
        };
        img.onerror = (error) => {
          tempCanvas.remove();
          reject(error);
        };
        
        // 使用临时canvas的toDataURL方法
        try {
          img.src = tempCanvas.toDataURL('image/png');
        } catch (error) {
          console.error('[canvasRenderer.ts 画布渲染器] 无法创建图像数据URL:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 转换OffscreenCanvas为Image失败:', error);
      throw error;
    }
  }
  
  /**
   * 渲染背景层
   */
  private renderBackgroundLayer(): void {
    if (!this.backgroundCtx || !this.currentLayout) {
      return;
    }
    
    // 如果不需要重绘背景，直接使用缓存
    if (!this.needsBackgroundRedraw && this.backgroundImage) {
      if (this.ctx) {
        this.ctx.drawImage(this.backgroundImage, 0, 0, 1920, 1080);
      }
      return;
    }
    
    // 清空背景画布
    this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas!.width, this.backgroundCanvas!.height);
    
    // 如果有背景图片，加载并绘制
    if (this.currentLayout.background) {
      // 绘制一个临时背景色，确保在图片加载前有内容
      this.backgroundCtx.fillStyle = '#333333';
      this.backgroundCtx.fillRect(0, 0, this.backgroundCanvas!.width, this.backgroundCanvas!.height);
      
      // 将临时背景绘制到主画布
      if (this.backgroundCanvas && this.ctx) {
        this.ctx.drawImage(this.backgroundCanvas, 0, 0, 1920, 1080);
      }
      
      // 使用图像缓存加载背景图片
      ImageCache.getOrLoadImage(
        this.currentLayout.background,
        '[canvasRenderer.ts 画布渲染器]'
      ).then(img => {
        // 绘制背景图片 - 始终使用1920x1080的尺寸
        if (this.backgroundCtx) {
          // 记录背景图像的原始尺寸，用于调试
          console.log(`[canvasRenderer.ts 画布渲染器] 背景图像尺寸:`, {
            imgWidth: img.width,
            imgHeight: img.height,
            canvasWidth: this.backgroundCanvas!.width,
            canvasHeight: this.backgroundCanvas!.height,
            targetWidth: 1920,
            targetHeight: 1080
          });
          
          // 清空背景画布
          this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas!.width, this.backgroundCanvas!.height);
          
          // 绘制背景图片 - 始终使用1920x1080的尺寸，无论画布实际大小如何
          this.backgroundCtx.drawImage(img, 0, 0, 1920, 1080);
          
          // 标记背景已绘制
          this.needsBackgroundRedraw = false;
          
          // 将背景画布内容绘制到主画布
          if (this.backgroundCanvas && this.ctx) {
            // 保存当前背景图像作为缓存
            this.convertOffscreenCanvasToImage(this.backgroundCanvas)
              .then(image => {
                this.backgroundImage = image;
                
                // 绘制到主画布 - 使用1920x1080的尺寸
                if (this.ctx && this.backgroundCanvas) {
                  this.ctx.drawImage(this.backgroundCanvas, 0, 0, 1920, 1080);
                }
              })
              .catch(error => {
                console.error('[canvasRenderer.ts 画布渲染器] 背景图像缓存创建失败:', error);
                // 直接绘制背景，不使用缓存
                if (this.ctx && this.backgroundCanvas) {
                  this.ctx.drawImage(this.backgroundCanvas, 0, 0, 1920, 1080);
                }
              });
          }
        }
      }).catch(error => {
        console.error('[canvasRenderer.ts 画布渲染器] 背景图片加载或绘制失败:', error);
      });
    } else {
      // 绘制默认背景色
      this.backgroundCtx.fillStyle = '#222222';
      this.backgroundCtx.fillRect(0, 0, this.backgroundCanvas!.width, this.backgroundCanvas!.height);
      
      // 将默认背景绘制到主画布
      if (this.backgroundCanvas && this.ctx) {
        this.ctx.drawImage(this.backgroundCanvas, 0, 0, 1920, 1080);
      }
      
      // 标记背景已绘制
      this.needsBackgroundRedraw = false;
    }
  }
  
  /**
   * 渲染前景层
   */
  private renderForegroundLayer(): void {
    if (!this.foregroundCtx || !this.currentLayout) return;
    
    // 如果不需要重绘前景，直接使用缓存
    if (!this.needsForegroundRedraw && this.foregroundImage) {
      this.ctx?.drawImage(this.foregroundImage, 0, 0, 1920, 1080);
      return;
    }
    
    // 清空前景画布
    this.foregroundCtx.clearRect(0, 0, this.foregroundCanvas!.width, this.foregroundCanvas!.height);
    
    // 如果有前景图片，加载并绘制
    if (this.currentLayout.foreground) {
      // 使用图像缓存加载前景图片
      ImageCache.getOrLoadImage(
        this.currentLayout.foreground,
        '[canvasRenderer.ts 画布渲染器]'
      ).then(img => {
        // 绘制前景图片 - 始终使用1920x1080的尺寸
        if (this.foregroundCtx) {
          // 记录前景图像的原始尺寸，用于调试
          console.log(`[canvasRenderer.ts 画布渲染器] 前景图像尺寸:`, {
            imgWidth: img.width,
            imgHeight: img.height,
            canvasWidth: this.foregroundCanvas!.width,
            canvasHeight: this.foregroundCanvas!.height,
            targetWidth: 1920,
            targetHeight: 1080
          });
          
          // 清空前景画布
          this.foregroundCtx.clearRect(0, 0, this.foregroundCanvas!.width, this.foregroundCanvas!.height);
          
          // 绘制前景图片 - 始终使用1920x1080的尺寸
          this.foregroundCtx.drawImage(img, 0, 0, 1920, 1080);
          
          // 标记前景已绘制
          this.needsForegroundRedraw = false;
          
          // 将前景画布内容绘制到主画布
          if (this.foregroundCanvas && this.ctx) {
            // 保存当前前景图像作为缓存
            this.convertOffscreenCanvasToImage(this.foregroundCanvas)
              .then(image => {
                this.foregroundImage = image;
                
                // 绘制到主画布 - 使用1920x1080的尺寸
                if (this.ctx && this.foregroundCanvas) {
                  this.ctx.drawImage(this.foregroundCanvas, 0, 0, 1920, 1080);
                }
              })
              .catch(error => {
                console.error('[canvasRenderer.ts 画布渲染器] 前景图像缓存创建失败:', error);
                // 直接绘制前景，不使用缓存
                if (this.ctx && this.foregroundCanvas) {
                  this.ctx.drawImage(this.foregroundCanvas, 0, 0, 1920, 1080);
                }
              });
          }
        }
      }).catch(error => {
        console.error('[canvasRenderer.ts 画布渲染器] 前景图片加载或绘制失败:', error);
      });
    }
  }
  
  /**
   * 渲染视频层
   */
  private renderVideoLayer(): void {
    if (!this.ctx || !this.currentLayout) return;
    
    // 获取当前布局的日程类型（如果可用）
    let scheduleType = '未知';
    if (this.isPreviewCanvas && this.planStore?.previewingSchedule) {
      scheduleType = this.planStore.previewingSchedule.type;
    } else if (!this.isPreviewCanvas && this.planStore?.liveSchedule) {
      scheduleType = this.planStore.liveSchedule.type;
    }
    
    // 获取当前布局的媒体元素
    const layoutWithElements = this.currentLayout as any;
    const layoutElements = layoutWithElements.elements || [];
    
    console.log(`[canvasRenderer.ts 画布渲染器] 渲染视频层:`, {
      layoutId: this.currentLayout.id,
      layoutTemplate: this.currentLayout.template,
      scheduleType: scheduleType,
      hasLayoutElements: layoutElements.length > 0,
      layoutElementsCount: layoutElements.length
    });
    
    // 如果布局中没有元素数据，则不渲染任何媒体元素
    if (layoutElements.length === 0) {
      console.log(`[canvasRenderer.ts 画布渲染器] 布局中没有元素数据，不渲染媒体元素`);
      return;
    }
    
    // 使用布局中的元素数据进行渲染
    console.log(`[canvasRenderer.ts 画布渲染器] 使用布局中的元素数据进行渲染`);
    
    // 先确保所有需要的视频设备都已激活
    const mediaElements = layoutElements.filter((element: any) => element.type === 'media' && element.sourceId);
    
    // 检查并激活所有需要的视频设备
    if (mediaElements.length > 0) {
      console.log(`[canvasRenderer.ts 画布渲染器] 布局中有 ${mediaElements.length} 个媒体元素需要激活`);
      
      // 异步激活设备，但不等待完成
      this.ensureMediaElementsActive(mediaElements);
    }
    
    // 按zIndex排序元素
    const sortedElements = [...layoutElements].sort((a: any, b: any) => {
      return (a.zIndex || 0) - (b.zIndex || 0);
    });
    
    // 筛选媒体元素
    const mediaElementsToRender = sortedElements.filter((element: any) => element.type === 'media');
    
    console.log(`[canvasRenderer.ts 画布渲染器] 布局中的媒体元素:`, 
      mediaElementsToRender.map((e: any) => ({
        id: e.id,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        sourceType: e.sourceType
      }))
    );
    
    // 绘制媒体元素
    for (const element of mediaElementsToRender) {
      this.renderMediaElement(element);
    }
  }
  
  /**
   * 确保媒体元素的视频设备已激活
   * @param mediaElements 媒体元素列表
   */
  private async ensureMediaElementsActive(mediaElements: any[]): Promise<void> {
    // 获取所有需要激活的设备ID和类型
    const deviceActivations: {deviceId: string, sourceType: string}[] = [];
    
    for (const element of mediaElements) {
      if (element.sourceId && element.sourceType) {
        // 检查设备是否已激活
        const isActive = this.videoStore?.activeDevices.some(d => d.id === element.sourceId);
        if (!isActive) {
          deviceActivations.push({
            deviceId: element.sourceId,
            sourceType: element.sourceType
          });
        }
      }
    }
    
    if (deviceActivations.length === 0) {
      console.log(`[canvasRenderer.ts 画布渲染器] 所有媒体设备已激活，无需额外激活`);
      return;
    }
    
    console.log(`[canvasRenderer.ts 画布渲染器] 需要激活 ${deviceActivations.length} 个媒体设备`);
    
    // 激活每个设备
    for (const activation of deviceActivations) {
      try {
        let sourceType;
        switch (activation.sourceType) {
          case 'camera':
            sourceType = VideoSourceType.CAMERA;
            // 检查摄像头设备是否存在
            const cameraExists = this.videoStore?.cameraDevices.some(d => d.id === activation.deviceId);
            if (!cameraExists) {
              console.warn(`[canvasRenderer.ts 画布渲染器] 摄像头设备不存在: ${activation.deviceId}`);
              continue;
            }
            break;
          case 'window':
            sourceType = VideoSourceType.WINDOW;
            // 检查窗口设备是否存在
            const windowExists = this.videoStore?.windowDevices.some(d => d.id === activation.deviceId);
            if (!windowExists) {
              console.warn(`[canvasRenderer.ts 画布渲染器] 窗口设备不存在: ${activation.deviceId}`);
              continue;
            }
            break;
          case 'display':
            sourceType = VideoSourceType.DISPLAY;
            // 检查显示器设备是否存在
            const displayExists = this.videoStore?.displayDevices.some(d => d.id === activation.deviceId);
            if (!displayExists) {
              console.warn(`[canvasRenderer.ts 画布渲染器] 显示器设备不存在: ${activation.deviceId}`);
              continue;
            }
            break;
          default:
            console.warn(`[canvasRenderer.ts 画布渲染器] 未知的媒体源类型: ${activation.sourceType}`);
            continue;
        }
        
        console.log(`[canvasRenderer.ts 画布渲染器] 激活设备: ${activation.deviceId}, 类型: ${activation.sourceType}`);
        await this.videoStore?.activateDevice(activation.deviceId, sourceType);
      } catch (error) {
        console.error(`[canvasRenderer.ts 画布渲染器] 激活设备失败: ${activation.deviceId}`, error);
      }
    }
  }
  
  /**
   * 渲染媒体元素
   * @param element 媒体元素
   */
  private renderMediaElement(element: MediaLayoutElement): void {
    if (!this.ctx) return;
    
    // 如果没有sourceId，不绘制任何内容
    if (!element.sourceId) {
      console.log(`[canvasRenderer.ts 画布渲染器] 媒体元素没有sourceId`, element);
      return;
    }
    
    // 获取视频设备
    const device = this.videoStore?.activeDevices.find(d => d.id === element.sourceId);
    
    // 如果没有找到设备或设备没有流，不绘制任何内容
    if (!device) {
      console.log(`[canvasRenderer.ts 画布渲染器] 未找到设备: ${element.sourceId}，尝试重新激活`);
      
      // 尝试查找设备类型并重新激活
      let deviceType: VideoSourceType | null = null;
      
      // 检查摄像头设备
      const cameraDevice = this.videoStore?.cameraDevices.find(d => d.id === element.sourceId);
      if (cameraDevice) {
        deviceType = VideoSourceType.CAMERA;
      }
      
      // 检查窗口设备
      const windowDevice = this.videoStore?.windowDevices.find(d => d.id === element.sourceId);
      if (windowDevice) {
        deviceType = VideoSourceType.WINDOW;
      }
      
      // 检查显示器设备
      const displayDevice = this.videoStore?.displayDevices.find(d => d.id === element.sourceId);
      if (displayDevice) {
        deviceType = VideoSourceType.DISPLAY;
      }
      
      if (deviceType !== null) {
        console.log(`[canvasRenderer.ts 画布渲染器] 尝试激活设备: ${element.sourceId} (类型: ${deviceType})`);
        this.videoStore?.activateDevice(element.sourceId, deviceType).catch(error => {
          console.error(`[canvasRenderer.ts 画布渲染器] 激活设备失败: ${element.sourceId}`, error);
        });
      }
      
      return;
    }
    
    if (!device.stream) {
      console.log(`[canvasRenderer.ts 画布渲染器] 设备没有视频流: ${element.sourceId}，尝试重新激活`);
      
      // 尝试重新激活设备
      if (device.type) {
        console.log(`[canvasRenderer.ts 画布渲染器] 尝试重新激活设备: ${element.sourceId} (类型: ${device.type})`);
        this.videoStore?.activateDevice(element.sourceId, device.type).catch(error => {
          console.error(`[canvasRenderer.ts 画布渲染器] 重新激活设备失败: ${element.sourceId}`, error);
        });
      }
      
      return;
    }
    
    // 创建视频元素（如果不存在）
    const videoId = `video-${element.sourceId}`;
    let videoElement = document.getElementById(videoId) as HTMLVideoElement;
    
    if (!videoElement) {
      console.log(`[canvasRenderer.ts 画布渲染器] 创建新的视频元素: ${videoId}`);
      videoElement = document.createElement('video');
      videoElement.id = videoId;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.style.display = 'none';
      document.body.appendChild(videoElement);
      
      // 设置视频源
      videoElement.srcObject = device.stream;
      
      // 添加事件监听
      videoElement.onloadedmetadata = () => {
        console.log(`[canvasRenderer.ts 画布渲染器] 视频元数据已加载: ${videoId}`);
        videoElement.play().catch(error => {
          console.error(`[canvasRenderer.ts 画布渲染器] 视频播放失败: ${videoId}`, error);
        });
      };
      
      // 添加错误处理
      videoElement.onerror = (event) => {
        console.error(`[canvasRenderer.ts 画布渲染器] 视频元素错误: ${videoId}`, event);
      };
    } else if (videoElement.srcObject !== device.stream) {
      // 如果视频元素存在但流不匹配，更新流
      console.log(`[canvasRenderer.ts 画布渲染器] 更新视频元素流: ${videoId}`);
      videoElement.srcObject = device.stream;
    }
    
    // 绘制视频
    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      // 计算视频的宽高比
      const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
      const elementRatio = element.width / element.height;
      
      let drawWidth = element.width;
      let drawHeight = element.height;
      let offsetX = 0;
      let offsetY = 0;
      
      // 保持宽高比
      if (videoRatio > elementRatio) {
        // 视频更宽，以高度为基准
        drawWidth = element.height * videoRatio;
        offsetX = (element.width - drawWidth) / 2;
      } else {
        // 视频更高，以宽度为基准
        drawHeight = element.width / videoRatio;
        offsetY = (element.height - drawHeight) / 2;
      }
      
      // 绘制视频
      try {
        this.ctx.drawImage(
          videoElement,
          element.x + offsetX,
          element.y + offsetY,
          drawWidth,
          drawHeight
        );
        
        // 绘制边框（调试用）
        if (this.isPreviewCanvas) {
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        }
      } catch (error) {
        console.error(`[canvasRenderer.ts 画布渲染器] 绘制视频失败:`, error);
      }
    } else if (videoElement.paused && videoElement.readyState >= 1) {
      // 尝试播放视频
      console.log(`[canvasRenderer.ts 画布渲染器] 尝试播放视频: ${videoId} (readyState: ${videoElement.readyState})`);
      videoElement.play().catch(error => {
        console.error(`[canvasRenderer.ts 画布渲染器] 无法播放视频:`, error);
      });
    } else {
      console.log(`[canvasRenderer.ts 画布渲染器] 视频元素未准备好: ${videoId} (readyState: ${videoElement.readyState}, paused: ${videoElement.paused})`);
      
      // 绘制占位符
      if (this.isPreviewCanvas) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(element.x, element.y, element.width, element.height);
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // 绘制文字
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          `等待视频源: ${element.sourceId}`,
          element.x + element.width / 2,
          element.y + element.height / 2
        );
      }
    }
  }
  
  /**
   * 渲染文字层
   */
  private renderTextLayer(): void {
    if (!this.textCtx || !this.currentLayout) return;
    
    // 如果不需要重绘文字层，直接使用缓存
    if (!this.needsTextRedraw && this.textImage) {
      this.ctx?.drawImage(this.textImage, 0, 0, 1920, 1080);
      return;
    }
    
    // 清空文字画布
    this.textCtx.clearRect(0, 0, this.textCanvas!.width, this.textCanvas!.height);
    
    // 获取布局中的文字元素
    const layoutWithElements = this.currentLayout as any;
    if (!layoutWithElements.elements) return;
    
    // 获取当前日程
    const schedule = this.isPreviewCanvas ? this.planStore?.previewingSchedule : this.planStore?.liveSchedule;
    
    if (!schedule) {
      console.log('[canvasRenderer.ts 画布渲染器] 无法渲染文字元素：未找到当前日程');
      return;
    }
    
    // 过滤出文字类型的元素
    const textElements = layoutWithElements.elements.filter((element: any) => 
      element.type === 'host-label' || 
      element.type === 'host-info' || 
      element.type === 'subject-label' || 
      element.type === 'subject-info' || 
      element.type === 'guest-label' || 
      element.type === 'guest-info'
    );
    
    if (textElements.length === 0) {
      // 如果没有文字元素，标记文字层已重绘
      this.needsTextRedraw = false;
      return;
    }
    
    console.log(`[canvasRenderer.ts 画布渲染器] 渲染 ${textElements.length} 个文字元素`);
    
    // 渲染文字元素
    for (const element of textElements) {
      this.renderTextElement(element, schedule);
    }
    
    // 标记文字层已重绘
    this.needsTextRedraw = false;
    
    // 将文字画布内容绘制到主画布
    if (this.textCanvas && this.ctx) {
      // 保存当前文字图像作为缓存
      this.convertOffscreenCanvasToImage(this.textCanvas)
        .then(image => {
          this.textImage = image;
          
          // 绘制到主画布 - 使用1920x1080的尺寸
          if (this.ctx && this.textCanvas) {
            this.ctx.drawImage(this.textCanvas, 0, 0, 1920, 1080);
          }
        })
        .catch(error => {
          console.error('[canvasRenderer.ts 画布渲染器] 文字图像缓存创建失败:', error);
          // 直接绘制文字层，不使用缓存
          if (this.ctx && this.textCanvas) {
            this.ctx.drawImage(this.textCanvas, 0, 0, 1920, 1080);
          }
        });
    }
  }
  
  /**
   * 渲染文字元素
   * @param element 文字元素
   * @param schedule 日程
   */
  private renderTextElement(element: TextLayoutElement, schedule: any): void {
    if (!this.textCtx || !this.currentLayout) return;
    
    // 设置文字样式
    this.textCtx.font = `${element.fontStyle.fontWeight} ${element.fontStyle.fontSize}px Arial`;
    this.textCtx.fillStyle = element.fontStyle.fontColor || this.currentLayout.textColor || '#ffffff';
    this.textCtx.textAlign = 'center';
    this.textCtx.textBaseline = 'middle';
    
    // 获取文字内容
    let text = '';
    let labelBackground = this.currentLayout.labelBackground || '';
    
    switch (element.type) {
      case 'host-label':
        text = this.currentLayout.surgeonLabelDisplayName || '术者';
        break;
      case 'host-info':
        if (schedule.type === 'surgery' && schedule.surgeryInfo) {
          text = schedule.surgeryInfo.surgeons
            .map((s: any) => `${s.name}${s.title ? ` ${s.title}` : ''}`)
            .join(' / ');
        } else if (schedule.type === 'lecture' && schedule.lectureInfo) {
          text = schedule.lectureInfo.speakers
            .map((s: any) => `${s.name}${s.title ? ` ${s.title}` : ''}`)
            .join(' / ');
        }
        break;
      case 'subject-label':
        text = this.currentLayout.surgeryLabelDisplayName || '术式';
        break;
      case 'subject-info':
        if (schedule.type === 'surgery' && schedule.surgeryInfo) {
          text = schedule.surgeryInfo.procedure;
        } else if (schedule.type === 'lecture' && schedule.lectureInfo) {
          text = schedule.lectureInfo.topic;
        }
        break;
      case 'guest-label':
        text = this.currentLayout.guestLabelDisplayName || '互动嘉宾';
        break;
      case 'guest-info':
        if (schedule.surgeryInfo?.guests || schedule.lectureInfo?.guests) {
          const guests = schedule.surgeryInfo?.guests || schedule.lectureInfo?.guests;
          if (guests && guests.length > 0) {
            text = guests
              .map((g: any) => `${g.name}${g.title ? ` ${g.title}` : ''}`)
              .join(' / ');
          }
        }
        break;
      default:
        break;
    }
    
    // 如果文本为空，不绘制
    if (!text) return;
    
    // 绘制标签背景（如果有）
    if (labelBackground && (element.type === 'host-label' || element.type === 'subject-label' || element.type === 'guest-label')) {
      this.loadAndDrawImage(
        labelBackground,
        this.textCtx,
        element.x,
        element.y,
        element.width,
        element.height
      );
    }
    
    // 绘制文字
    if (element.orientation === 'vertical') {
      // 垂直文字
      this.drawVerticalText(
        this.textCtx,
        text,
        element.x + element.width / 2,
        element.y + element.height / 2,
        element.height
      );
    } else {
      // 水平文字
      this.textCtx.fillText(
        text,
        element.x + element.width / 2,
        element.y + element.height / 2
      );
    }
  }
  
  /**
   * 绘制垂直文字
   * @param ctx 渲染上下文
   * @param text 文本内容
   * @param x X坐标
   * @param y Y坐标
   * @param height 高度
   */
  private drawVerticalText(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    height: number
  ): void {
    const chars = text.split('');
    const charHeight = height / chars.length;
    
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < chars.length; i++) {
      const charY = y - height / 2 + charHeight * (i + 0.5);
      ctx.fillText(chars[i], x, charY);
    }
    
    ctx.restore();
  }
  
  /**
   * 加载并绘制图像
   * @param url 图像URL
   * @param ctx 渲染上下文
   * @param x X坐标
   * @param y Y坐标
   * @param width 宽度
   * @param height 高度
   */
  private async loadAndDrawImage(
    url: string,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    try {
      // 使用图像缓存加载图像
      const img = await ImageCache.getOrLoadImage(url, '[canvasRenderer.ts 画布渲染器]');
      
      // 绘制图像
      ctx.drawImage(img, x, y, width, height);
      
      return Promise.resolve();
    } catch (error) {
      console.error(`[canvasRenderer.ts 画布渲染器] 图像处理过程中发生错误: ${url}`, error);
      return Promise.reject(error);
    }
  }
  
  /**
   * 调整画布大小
   * @param width 宽度
   * @param height 高度
   */
  public resize(width: number, height: number): void {
    // 确保宽高至少为1像素
    width = Math.max(1, width);
    height = Math.max(1, height);
    
    console.log('[canvasRenderer.ts 画布渲染器] 调整画布大小', {
      originalWidth: this.canvas.width,
      originalHeight: this.canvas.height,
      newWidth: width,
      newHeight: height
    });

    // 保存原始尺寸用于计算缩放比例
    this.width = width;
    this.height = height;
    
    // 仅更新CSS尺寸，保持绘图表面尺寸为1920x1080
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // 标记所有层需要重绘
    this.needsBackgroundRedraw = true;
    this.needsForegroundRedraw = true;
    this.needsTextRedraw = true;
    
    // 强制立即渲染
    this.render();
    
    console.log('[canvasRenderer.ts 画布渲染器] 画布大小已调整', {
      cssWidth: this.canvas.style.width,
      cssHeight: this.canvas.style.height,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    });
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    // 停止渲染循环
    this.stopRenderLoop();
    
    // 清空画布
    this.clearCanvas();
    
    // 移除所有视频元素
    document.querySelectorAll('[id^="video-"]').forEach((element) => {
      element.remove();
    });
    
    // 清除图像缓存
    ImageCache.clearCache();
  }
  
  /**
   * 监听布局变化
   * 当布局编辑器修改布局时调用此方法
   */
  public onLayoutEdited(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 布局已编辑，重新渲染');
    
    // 清理所有画布，确保没有残留内容
    this.clearAllCanvases();
    
    // 标记所有层需要重绘
    this.needsBackgroundRedraw = true;
    this.needsForegroundRedraw = true;
    this.needsTextRedraw = true;
    
    // 清除之前的图像缓存
    this.backgroundImage = null;
    this.foregroundImage = null;
    this.textImage = null;
    
    // 更新布局更新时间戳
    this.layoutUpdateTime = performance.now();
    
    // 清除可能存在的视频元素缓存
    if (this.currentLayout) {
      const layoutWithElements = this.currentLayout as any;
      const mediaElements = (layoutWithElements.elements || [])
        .filter((element: any) => element.type === 'media' && element.sourceId);
      
      // 移除并重新创建视频元素
      for (const element of mediaElements) {
        const videoId = `video-${element.sourceId}`;
        const videoElement = document.getElementById(videoId) as HTMLVideoElement;
        if (videoElement) {
          console.log(`[canvasRenderer.ts 画布渲染器] 重置视频元素: ${videoId}`);
          // 停止视频播放
          if (videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach(track => {
              // 不停止轨道，只分离视频元素
              // track.stop();
            });
          }
          videoElement.srcObject = null;
          videoElement.remove();
        }
      }
      
      // 重新激活所需的视频设备
      this.activateRequiredVideoDevices(this.currentLayout);
    }
    
    // 强制立即渲染一帧
    this.render();
  }

  /**
   * 创建离屏画布
   */
  private createOffscreenCanvases(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 创建离屏画布');
    
    try {
      // 创建离屏画布 - 背景层 (始终使用1920x1080的尺寸)
      this.backgroundCanvas = new OffscreenCanvas(1920, 1080);
      this.backgroundCtx = this.backgroundCanvas.getContext('2d');
      
      // 创建离屏画布 - 前景层 (始终使用1920x1080的尺寸)
      this.foregroundCanvas = new OffscreenCanvas(1920, 1080);
      this.foregroundCtx = this.foregroundCanvas.getContext('2d');
      
      // 创建离屏画布 - 文字层 (始终使用1920x1080的尺寸)
      this.textCanvas = new OffscreenCanvas(1920, 1080);
      this.textCtx = this.textCanvas.getContext('2d');
      
      console.log('[canvasRenderer.ts 画布渲染器] 离屏画布已创建', {
        width: 1920,
        height: 1080,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height
      });
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 创建离屏画布时出错:', error);
    }
  }

  /**
   * 更新布局元素
   * 允许外部直接更新布局的元素数据，特别是媒体元素的sourceId
   * @param layoutElements 布局元素数组
   */
  public updateLayoutElements(layoutElements: any[]): void {
    if (!this.currentLayout) {
      console.warn('[canvasRenderer.ts 画布渲染器] 无法更新布局元素：当前没有活动布局');
      return;
    }
    
    console.log('[canvasRenderer.ts 画布渲染器] 更新布局元素:', {
      layoutId: this.currentLayout.id,
      elementsCount: layoutElements.length,
      mediaElementsCount: layoutElements.filter(e => e.type === 'media').length
    });
    
    // 更新当前布局的元素
    (this.currentLayout as any).elements = JSON.parse(JSON.stringify(layoutElements));
    
    // 标记所有层需要重绘
    this.needsBackgroundRedraw = true;
    this.needsForegroundRedraw = true;
    this.needsTextRedraw = true;
    
    // 更新布局更新时间戳
    this.layoutUpdateTime = performance.now();
    
    // 筛选媒体元素
    const mediaElements = layoutElements.filter(element => element.type === 'media' && element.sourceId);
    
    if (mediaElements.length > 0) {
      console.log(`[canvasRenderer.ts 画布渲染器] 布局中有 ${mediaElements.length} 个媒体元素需要激活`);
      
      // 清理现有的视频元素
      this.cleanupVideoElements();
      
      // 激活所需的视频设备
      this.ensureMediaElementsActive(mediaElements);
    }
    
    // 强制立即渲染一帧
    this.render();
  }
}

/**
 * 创建预览画布渲染器
 * @param canvas 画布元素
 * @returns 画布渲染器实例
 */
export function createPreviewCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  return new CanvasRenderer(canvas, {
    planStore: usePlanStore(),
    videoStore: useVideoStore(),
    isPreviewCanvas: true
  });
}

/**
 * 创建直播画布渲染器
 * @param canvas 画布元素
 * @returns 画布渲染器实例
 */
export function createLiveCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  return new CanvasRenderer(canvas, {
    planStore: usePlanStore(),
    videoStore: useVideoStore(),
    isPreviewCanvas: false
  });
}

/**
 * 创建Canvas渲染器（向后兼容）
 * @param canvas 画布元素
 * @returns 画布渲染器实例
 * @deprecated 使用createPreviewCanvasRenderer或createLiveCanvasRenderer替代
 */
export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  console.warn('[canvasRenderer.ts 画布渲染器] createCanvasRenderer已废弃，请使用createPreviewCanvasRenderer或createLiveCanvasRenderer替代');
  return new CanvasRenderer(canvas, {
    planStore: usePlanStore(),
    videoStore: useVideoStore(),
    isPreviewCanvas: false
  });
} 