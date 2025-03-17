/**
 * Canvas渲染器工具类
 * 用于高性能绘制预览和直播画面
 */
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
  private videoStore = useVideoStore();
  
  // 计划存储
  private planStore = usePlanStore();
  
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
  
  /**
   * 构造函数
   * @param canvas 画布元素
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    console.log('[canvasRenderer.ts 画布渲染器] 初始化渲染器', {
      canvasElement: canvas,
      width: canvas.width,
      height: canvas.height
    });
    this.initCanvas();
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
      layout,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      styleWidth: this.canvas.style.width,
      styleHeight: this.canvas.style.height
    });
    
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
        this.activateRequiredVideoDevices(layout);
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
  }
  
  /**
   * 激活布局所需的视频设备
   * @param layout 布局对象
   */
  private async activateRequiredVideoDevices(layout: Layout): Promise<void> {
    // 获取布局模板
    const template = this.planStore.layoutTemplates.find(
      t => t.template === layout.template
    );
    
    if (!template || !template.elements) {
      console.log('[canvasRenderer.ts 画布渲染器] 无法激活视频设备：未找到布局模板或元素');
      return;
    }
    
    // 筛选媒体元素
    const mediaElements = template.elements.filter(
      element => element.type === 'media'
    ) as MediaLayoutElement[];
    
    if (mediaElements.length === 0) {
      console.log('[canvasRenderer.ts 画布渲染器] 布局中没有媒体元素，无需激活视频设备');
      return;
    }
    
    console.log(`[canvasRenderer.ts 画布渲染器] 布局中包含 ${mediaElements.length} 个媒体元素，准备激活视频设备`);
    
    // 获取所有需要激活的设备ID
    const deviceIds = mediaElements
      .filter(element => element.sourceId)
      .map(element => element.sourceId!);
    
    // 去重
    const uniqueDeviceIds = [...new Set(deviceIds)];
    
    // 激活每个设备
    for (const deviceId of uniqueDeviceIds) {
      // 检查设备是否已激活
      const isActive = this.videoStore.activeDevices.some(d => d.id === deviceId);
      if (isActive) {
        console.log(`[canvasRenderer.ts 画布渲染器] 设备 ${deviceId} 已激活，无需重复激活`);
        continue;
      }
      
      // 查找设备类型
      let deviceType: VideoSourceType | null = null;
      
      // 检查摄像头设备
      const cameraDevice = this.videoStore.cameraDevices.find(d => d.id === deviceId);
      if (cameraDevice) {
        deviceType = VideoSourceType.CAMERA;
      }
      
      // 检查窗口设备
      const windowDevice = this.videoStore.windowDevices.find(d => d.id === deviceId);
      if (windowDevice) {
        deviceType = VideoSourceType.WINDOW;
      }
      
      // 检查显示器设备
      const displayDevice = this.videoStore.displayDevices.find(d => d.id === deviceId);
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
        await this.videoStore.activateDevice(deviceId, deviceType);
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
    if (!this.ctx || !this.currentLayout) return;
    
    // 清空主画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 记录渲染开始时间
    const renderStartTime = performance.now();
    
    // 按正确的层级顺序渲染各层
    // 1. 首先渲染背景层（最底层）
    this.renderBackgroundLayer();
    
    // 2. 然后渲染视频层
    this.renderVideoLayers();
    
    // 3. 接着渲染前景层
    this.renderForegroundLayer();
    
    // 4. 最后渲染文字层（最上层）
    this.renderTextLayer();
    
    // 记录渲染结束时间和耗时
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime;
    
    // 如果渲染时间超过帧率限制的80%，输出警告
    if (renderTime > this.frameRateLimit * 0.8) {
      console.warn(`[canvasRenderer.ts 画布渲染器] 渲染耗时较长: ${renderTime.toFixed(2)}ms，接近帧率限制 ${this.frameRateLimit}ms`);
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
        this.ctx.drawImage(this.backgroundImage, 0, 0);
      }
      return;
    }
    
    // 清空背景画布
    this.backgroundCtx.clearRect(0, 0, this.width, this.height);
    
    // 如果有背景图片，加载并绘制
    if (this.currentLayout.background) {
      // 绘制一个临时背景色，确保在图片加载前有内容
      this.backgroundCtx.fillStyle = '#333333';
      this.backgroundCtx.fillRect(0, 0, this.width, this.height);
      
      // 将临时背景绘制到主画布
      if (this.backgroundCanvas && this.ctx) {
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);
      }
      
      // 使用图像缓存加载背景图片
      ImageCache.getOrLoadImage(
        this.currentLayout.background,
        '[canvasRenderer.ts 画布渲染器]'
      ).then(img => {
        // 绘制背景图片
        if (this.backgroundCtx) {
          this.backgroundCtx.drawImage(img, 0, 0, this.width, this.height);
          
          // 标记背景已绘制
          this.needsBackgroundRedraw = false;
          
          // 将背景画布内容绘制到主画布
          if (this.backgroundCanvas && this.ctx) {
            // 保存当前背景图像作为缓存
            this.convertOffscreenCanvasToImage(this.backgroundCanvas)
              .then(image => {
                this.backgroundImage = image;
                
                // 绘制到主画布
                if (this.ctx && this.backgroundCanvas) {
                  this.ctx.drawImage(this.backgroundCanvas, 0, 0);
                }
              })
              .catch(error => {
                console.error('[canvasRenderer.ts 画布渲染器] 背景图像缓存创建失败:', error);
                // 直接绘制背景，不使用缓存
                if (this.ctx && this.backgroundCanvas) {
                  this.ctx.drawImage(this.backgroundCanvas, 0, 0);
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
      this.backgroundCtx.fillRect(0, 0, this.width, this.height);
      
      // 将默认背景绘制到主画布
      if (this.backgroundCanvas && this.ctx) {
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);
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
      this.ctx?.drawImage(this.foregroundImage, 0, 0);
      return;
    }
    
    // 清空前景画布
    this.foregroundCtx.clearRect(0, 0, this.width, this.height);
    
    // 如果有前景图片，加载并绘制
    if (this.currentLayout.foreground) {
      // 使用图像缓存加载前景图片
      ImageCache.getOrLoadImage(
        this.currentLayout.foreground,
        '[canvasRenderer.ts 画布渲染器]'
      ).then(img => {
        // 绘制前景图片
        if (this.foregroundCtx) {
          this.foregroundCtx.drawImage(img, 0, 0, this.width, this.height);
          
          // 标记前景已绘制
          this.needsForegroundRedraw = false;
          
          // 将前景画布内容绘制到主画布
          if (this.foregroundCanvas && this.ctx) {
            // 保存当前前景图像作为缓存
            this.convertOffscreenCanvasToImage(this.foregroundCanvas)
              .then(image => {
                this.foregroundImage = image;
                
                // 绘制到主画布
                if (this.ctx && this.foregroundCanvas) {
                  this.ctx.drawImage(this.foregroundCanvas, 0, 0);
                }
              })
              .catch(error => {
                console.error('[canvasRenderer.ts 画布渲染器] 前景图像缓存创建失败:', error);
                // 直接绘制前景，不使用缓存
                if (this.ctx && this.foregroundCanvas) {
                  this.ctx.drawImage(this.foregroundCanvas, 0, 0);
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
  private renderVideoLayers(): void {
    if (!this.ctx || !this.currentLayout) return;
    
    // 获取布局模板
    const template = this.planStore.layoutTemplates.find(
      t => t.template === this.currentLayout?.template
    );
    
    if (!template || !template.elements) return;
    
    // 按zIndex排序元素
    const sortedElements = [...template.elements].sort((a, b) => {
      return (a.zIndex || 0) - (b.zIndex || 0);
    });
    
    // 筛选媒体元素
    const mediaElements = sortedElements.filter(element => element.type === 'media');
    
    // 绘制媒体元素
    for (const element of mediaElements) {
      this.renderMediaElement(element as MediaLayoutElement);
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
    const device = this.videoStore.activeDevices.find(d => d.id === element.sourceId);
    
    // 如果没有找到设备或设备没有流，不绘制任何内容
    if (!device) {
      console.log(`[canvasRenderer.ts 画布渲染器] 未找到设备: ${element.sourceId}`);
      return;
    }
    
    if (!device.stream) {
      console.log(`[canvasRenderer.ts 画布渲染器] 设备没有视频流: ${element.sourceId}`);
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
      } catch (error) {
        console.error(`[canvasRenderer.ts 画布渲染器] 绘制视频失败:`, error);
      }
    } else if (videoElement.paused && videoElement.readyState >= 1) {
      // 尝试播放视频
      console.log(`[canvasRenderer.ts 画布渲染器] 尝试播放视频: ${videoId}`);
      videoElement.play().catch(error => {
        console.error(`[canvasRenderer.ts 画布渲染器] 无法播放视频:`, error);
      });
    }
  }
  
  /**
   * 渲染文字层
   */
  private renderTextLayer(): void {
    if (!this.textCtx || !this.currentLayout || !this.ctx) return;
    
    // 如果不需要重绘文字层，直接使用缓存
    if (!this.needsTextRedraw) {
      this.ctx.drawImage(this.textCanvas!, 0, 0);
      return;
    }
    
    // 清空文字画布
    this.textCtx.clearRect(0, 0, this.width, this.height);
    
    // 获取布局模板
    const template = this.planStore.layoutTemplates.find(
      t => t.template === this.currentLayout?.template
    );
    
    if (!template || !template.elements) return;
    
    // 获取当前日程
    const schedule = this.planStore.previewingSchedule;
    
    if (!schedule) return;
    
    // 按zIndex排序元素
    const sortedElements = [...template.elements].sort((a, b) => {
      return (a.zIndex || 0) - (b.zIndex || 0);
    });
    
    // 绘制文字元素
    for (const element of sortedElements) {
      if (element.type !== 'media') {
        this.renderTextElement(element as TextLayoutElement, schedule);
      }
    }
    
    // 标记文字层已绘制
    this.needsTextRedraw = false;
    
    // 将文字画布内容绘制到主画布
    this.ctx.drawImage(this.textCanvas!, 0, 0);
  }
  
  /**
   * 渲染文字元素
   * @param element 文字元素
   * @param schedule 日程
   */
  private renderTextElement(element: TextLayoutElement, schedule: any): void {
    if (!this.textCtx) return;
    
    // 根据元素类型获取文本内容
    let text = '';
    let labelBackground = this.currentLayout?.labelBackground || '';
    
    switch (element.type) {
      case 'host-label':
        text = this.currentLayout?.surgeonLabelDisplayName || '术者';
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
        text = this.currentLayout?.surgeryLabelDisplayName || '术式';
        break;
      case 'subject-info':
        if (schedule.type === 'surgery' && schedule.surgeryInfo) {
          text = schedule.surgeryInfo.procedure;
        } else if (schedule.type === 'lecture' && schedule.lectureInfo) {
          text = schedule.lectureInfo.topic;
        }
        break;
      case 'guest-label':
        text = this.currentLayout?.guestLabelDisplayName || '互动嘉宾';
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
    
    // 设置文字样式
    this.textCtx.save();
    this.textCtx.font = `${element.fontStyle.fontWeight} ${element.fontStyle.fontSize}px Arial`;
    this.textCtx.fillStyle = element.fontStyle.fontColor || this.currentLayout?.textColor || '#ffffff';
    this.textCtx.textAlign = 'center';
    this.textCtx.textBaseline = 'middle';
    
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
    
    this.textCtx.restore();
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
    console.log('[canvasRenderer.ts 画布渲染器] 调整画布大小', {
      originalWidth: width,
      originalHeight: height,
      canvasElement: this.canvas
    });
    
    // 保持16:9比例
    const aspectRatio = 16 / 9;
    
    if (width / height > aspectRatio) {
      // 宽度过大，以高度为基准
      width = height * aspectRatio;
    } else {
      // 高度过大，以宽度为基准
      height = width / aspectRatio;
    }
    
    // 确保宽高至少为1px，避免画布不可见
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    
    console.log('[canvasRenderer.ts 画布渲染器] 调整后的画布大小', {
      width,
      height
    });
    
    // 更新画布尺寸样式
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // 标记所有层需要重绘
    this.needsBackgroundRedraw = true;
    this.needsForegroundRedraw = true;
    this.needsTextRedraw = true;
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
    // 标记所有层需要重绘
    this.needsBackgroundRedraw = true;
    this.needsForegroundRedraw = true;
    this.needsTextRedraw = true;
    
    // 清除之前的图像缓存
    this.backgroundImage = null;
    this.foregroundImage = null;
    
    // 更新布局更新时间戳
    this.layoutUpdateTime = performance.now();
    
    // 强制立即渲染一帧
    this.render();
  }
}

/**
 * 创建Canvas渲染器
 * @param canvas 画布元素
 * @returns Canvas渲染器实例
 */
export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  return new CanvasRenderer(canvas);
} 