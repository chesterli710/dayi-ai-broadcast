/**
 * 画布渲染器
 * 用于高性能绘制预览和直播画面
 */
import type { Layout, LayoutElement, MediaLayoutElement, TextLayoutElement, Schedule } from '../types/broadcast';
import { LayoutElementType, ScheduleType } from '../types/broadcast';
import { useVideoStore } from '../stores/videoStore';
import { usePlanStore } from '../stores/planStore';
import { getCachedImage, preloadImage, isDataUrl } from './imagePreloader';
import { TextLayerRenderer } from './textLayerRenderer';

// 扩展VideoDevice接口，添加videoElement属性
declare module '../types/video' {
  interface VideoDevice {
    videoElement?: HTMLVideoElement;
  }
}

/**
 * 画布渲染器类
 * 负责使用WebGL高性能绘制预览和直播画面
 */
export class CanvasRenderer {
  // 画布元素
  private canvas: HTMLCanvasElement;
  
  // 渲染上下文
  private ctx: CanvasRenderingContext2D | null = null;
  
  // 离屏画布（用于优化性能）
  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  // 当前布局
  private currentLayout: Layout | null = null;
  
  // 渲染尺寸固定为1920*1080
  private readonly width: number = 1920;
  private readonly height: number = 1080;
  
  // 视频存储
  private videoStore = useVideoStore();
  
  // 计划存储
  private planStore = usePlanStore();
  
  // 动画帧请求ID
  private animationFrameId: number | null = null;
  
  // 图像缓存
  private imageCache: Map<string, HTMLImageElement> = new Map();
  
  // 文字图层缓存
  private textLayerCache: Map<string, ImageBitmap | ImageData> = new Map();
  
  // 背景图层是否需要重绘
  private backgroundNeedsRedraw: boolean = true;
  
  // 前景图层是否需要重绘
  private foregroundNeedsRedraw: boolean = true;
  
  // 文字图层是否需要重绘
  private textLayerNeedsRedraw: boolean = true;
  
  // 渲染器类型（预览或直播）
  private rendererType: 'preview' | 'live' = 'preview';
  
  // 帧计数
  private frameCount: number = 0;
  
  // 文字图层渲染器
  private textLayerRenderer: TextLayerRenderer;
  
  // 缓存元素坐标转换结果
  private mediaElementsCache: Map<string, {
    original: { x: number, y: number, width: number, height: number },
    scaled: { x: number, y: number, width: number, height: number },
    scale: { scaleX: number, scaleY: number },
    canvasSize: { width: number, height: number }
  }> = new Map();
  
  /**
   * 构造函数
   * @param canvas 画布元素
   * @param type 渲染器类型
   */
  constructor(canvas: HTMLCanvasElement, type: 'preview' | 'live' = 'preview') {
    this.canvas = canvas;
    this.rendererType = type;
    
    console.log(`[canvasRenderer.ts ${this.rendererType === 'preview' ? '预览' : '直播'}画布渲染器] 初始化渲染器`, {
      canvasElement: canvas,
      width: canvas.width,
      height: canvas.height,
      type: this.rendererType
    });
    
    // 初始化文字图层渲染器
    this.textLayerRenderer = new TextLayerRenderer(this.rendererType);
    
    this.initCanvas();
    this.initOffscreenCanvas();
    
    // 监听布局编辑事件
    if (this.rendererType === 'preview') {
      // 使用 watch API 监听 previewLayoutEditedEvent 变化
      const unwatch = this.planStore.$subscribe((mutation, state) => {
        if (mutation.storeId === 'plan' && state.previewLayoutEditedEvent > 0) {
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 检测到预览布局编辑事件，标记文字图层需要重绘`);
          this.textLayerNeedsRedraw = true;
          
          // 通知文字渲染器布局已变更
          if (this.textLayerRenderer) {
            this.onLayoutOrSizeChanged();
          }
          
          // 启动渲染循环确保立即渲染
          this.startRenderLoop();
        }
      });
    } else if (this.rendererType === 'live') {
      // 使用 watch API 监听 liveLayoutEditedEvent 变化
      const unwatch = this.planStore.$subscribe((mutation, state) => {
        if (mutation.storeId === 'plan' && state.liveLayoutEditedEvent > 0) {
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 检测到直播布局编辑事件，标记文字图层需要重绘`);
          this.textLayerNeedsRedraw = true;
          
          // 通知文字渲染器布局已变更
          if (this.textLayerRenderer) {
            this.onLayoutOrSizeChanged();
          }
          
          // 启动渲染循环确保立即渲染
          this.startRenderLoop();
        }
      });
    }
  }
  
  /**
   * 初始化画布
   */
  private initCanvas(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 开始初始化画布');
    
    try {
      // 设置画布尺寸固定为1920*1080
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      
      // 设置初始样式尺寸
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.maxWidth = '100%';
      this.canvas.style.maxHeight = '100%';
      this.canvas.style.objectFit = 'contain';
      
      // 获取2D渲染上下文
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      
      if (!this.ctx) {
        console.error('[canvasRenderer.ts 画布渲染器] 无法获取2D渲染上下文');
        return;
      }
      
      console.log('[canvasRenderer.ts 画布渲染器] 画布初始化完成');
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 初始化画布时出错:', error);
    }
  }
  
  /**
   * 初始化离屏画布
   */
  private initOffscreenCanvas(): void {
    try {
      // 创建离屏画布，尺寸固定为1920*1080
      this.offscreenCanvas = new OffscreenCanvas(this.width, this.height);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
      
      if (!this.offscreenCtx) {
        console.error('[canvasRenderer.ts 画布渲染器] 无法获取离屏画布2D渲染上下文');
        return;
      }
      
      console.log('[canvasRenderer.ts 画布渲染器] 离屏画布初始化完成');
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 初始化离屏画布时出错:', error);
      // 如果不支持OffscreenCanvas，则不使用离屏渲染
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  }
  
  /**
   * 设置布局
   * @param layout 布局数据
   */
  public setLayout(layout: Layout | null): void {
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 设置布局:`, layout?.id);
    
    // 如果布局发生变化，标记所有图层需要重绘
    if (this.currentLayout?.id !== layout?.id) {
      this.backgroundNeedsRedraw = true;
      this.foregroundNeedsRedraw = true;
      this.textLayerNeedsRedraw = true;
      
      // 清除媒体元素坐标缓存
      this.onLayoutOrSizeChanged();
      
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局已变更，标记所有图层需要重绘`);
      
      // 启动渲染循环确保立即渲染
      this.startRenderLoop();
    } else if (layout && this.currentLayout) {
      // 检查布局内容是否发生变化
      const oldElements = this.currentLayout.elements || [];
      const newElements = layout.elements || [];
      
      // 检查元素数量是否变化
      if (oldElements.length !== newElements.length) {
        this.backgroundNeedsRedraw = true;
        this.foregroundNeedsRedraw = true;
        this.textLayerNeedsRedraw = true;
        
        // 清除媒体元素坐标缓存
        this.onLayoutOrSizeChanged();
        
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局元素数量变化，标记所有图层需要重绘`);
        
        // 启动渲染循环确保立即渲染
        this.startRenderLoop();
      } else {
        // 检查元素内容是否变化
        let elementsChanged = false;
        let mediaElementsChanged = false;
        
        for (let i = 0; i < newElements.length; i++) {
          const oldElement = oldElements[i];
          const newElement = newElements[i];
          
          // 检查元素类型是否变化
          if (oldElement.type !== newElement.type) {
            elementsChanged = true;
            
            // 如果是媒体元素变化，标记媒体元素变化
            if (oldElement.type === LayoutElementType.MEDIA || newElement.type === LayoutElementType.MEDIA) {
              mediaElementsChanged = true;
            }
            
            break;
          }
          
          // 检查元素属性是否变化
          if (JSON.stringify(oldElement) !== JSON.stringify(newElement)) {
            elementsChanged = true;
            
            // 如果是媒体元素变化，标记媒体元素变化
            if (oldElement.type === LayoutElementType.MEDIA || newElement.type === LayoutElementType.MEDIA) {
              mediaElementsChanged = true;
            }
            
            break;
          }
        }
        
        // 如果元素发生变化，标记需要重绘
        if (elementsChanged) {
          this.backgroundNeedsRedraw = true;
          this.foregroundNeedsRedraw = true;
          this.textLayerNeedsRedraw = true;
          
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局元素内容变化，标记所有图层需要重绘`);
          
          // 如果媒体元素变化，清除媒体元素坐标缓存
          if (mediaElementsChanged) {
            this.onLayoutOrSizeChanged();
          }
          
          // 启动渲染循环确保立即渲染
          this.startRenderLoop();
        }
      }
    }
    
    // 更新当前布局
    this.currentLayout = layout;
    
    // 使用新布局初始化文字渲染器
    if (this.textLayerRenderer) {
      // 如果布局变化，传递给文字渲染器，触发文字重新排版
      this.textLayerRenderer.setLayout(layout);
    }
  }
  
  /**
   * 加载图片
   * @param url 图片URL
   * @returns 图片加载Promise
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    // 如果URL为空，返回拒绝的Promise
    if (!url) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 尝试加载空URL`);
      return Promise.reject(new Error('图片URL为空'));
    }
    
    // 首先尝试从imagePreloader的缓存中获取图片
    const cachedImage = getCachedImage(url);
    if (cachedImage) {
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 从全局缓存中获取图片:`, url);
      // 将图片添加到本地缓存
      this.imageCache.set(url, cachedImage);
      return Promise.resolve(cachedImage);
    }
    
    // 如果图片已经在本地缓存中，直接返回
    if (this.imageCache.has(url)) {
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 图片已在本地缓存中:`, url);
      return Promise.resolve(this.imageCache.get(url)!);
    }
    
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 开始加载图片:`, url);
    
    // 使用imagePreloader加载图片
    return preloadImage(url)
      .then(img => {
        // 将加载的图片添加到本地缓存
        this.imageCache.set(url, img);
        return img;
      });
  }
  
  /**
   * 清除画布
   */
  private clearCanvas(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    if (this.offscreenCtx) {
      this.offscreenCtx.clearRect(0, 0, this.width, this.height);
    }
  }
  
  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    // 如果已经有渲染循环在运行，则不重复启动
    if (this.animationFrameId !== null) {
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染循环已在运行中，不重复启动`);
      return;
    }
    
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 启动渲染循环`, {
      layoutId: this.currentLayout?.id,
      backgroundNeedsRedraw: this.backgroundNeedsRedraw,
      foregroundNeedsRedraw: this.foregroundNeedsRedraw,
      textLayerNeedsRedraw: this.textLayerNeedsRedraw
    });
    
    // 记录启动时间
    const startTime = Date.now();
    let frameCount = 0;
    let lastFpsUpdate = startTime;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    const renderFrame = () => {
      try {
        // 执行渲染
        this.render();
        
        // 重置连续错误计数
        if (consecutiveErrors > 0) {
          consecutiveErrors = 0;
        }
        
        // 更新帧计数
        frameCount++;
        
        // 每秒更新一次FPS
        const now = Date.now();
        if (now - lastFpsUpdate >= 1000) {
          const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
          // console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] FPS: ${fps}`);
          
          // 如果FPS过低，记录警告
          if (fps < 30) {
            console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 警告: FPS过低 (${fps})`);
          }
          
          frameCount = 0;
          lastFpsUpdate = now;
        }
        
        // 请求下一帧
        this.animationFrameId = requestAnimationFrame(renderFrame);
      } catch (error) {
        console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染帧时发生错误:`, error);
        
        // 增加连续错误计数
        consecutiveErrors++;
        
        // 如果连续错误次数过多，尝试恢复
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 连续错误次数过多 (${consecutiveErrors})，尝试恢复渲染`);
          
          // 尝试清除画布并显示错误状态
          try {
            this.renderErrorState(error);
          } catch (e) {
            console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染错误状态时也出错:`, e);
          }
          
          // 重置连续错误计数
          consecutiveErrors = 0;
        }
        
        // 即使发生错误，也继续渲染循环
        this.animationFrameId = requestAnimationFrame(renderFrame);
      }
    };
    
    // 启动渲染循环
    this.animationFrameId = requestAnimationFrame(renderFrame);
  }
  
  /**
   * 停止渲染循环
   */
  private stopRenderLoop(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 停止渲染循环');
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * 渲染画面
   */
  public render(): void {
    // 记录渲染开始时间
    const startTime = performance.now();
    
    // 如果没有上下文，直接返回
    if (!this.ctx) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 无法渲染：上下文不存在`);
      return;
    }
    
    // 清除画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 如果没有布局，渲染空状态
    if (!this.currentLayout) {
      this.renderEmptyState();
      return;
    }
    
    // 每隔一段时间检查并恢复视频设备
    if (this.frameCount % 60 === 0) { // 每60帧检查一次
      this.checkAndRecoverVideoDevices();
    }
    
    // 记录各图层渲染时间
    const layerTimes: Record<string, number> = {};
    let layersRendered = 0;
    
    // 渲染各图层
    try {
      const bgStart = performance.now();
      this.renderBackgroundLayer(this.ctx);
      layerTimes.background = performance.now() - bgStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染背景图层时出错:`, e);
    }
    
    try {
      const videoStart = performance.now();
      this.renderVideoLayers(this.ctx);
      layerTimes.video = performance.now() - videoStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染视频图层时出错:`, e);
    }
    
    try {
      const fgStart = performance.now();
      this.renderForegroundLayer(this.ctx);
      layerTimes.foreground = performance.now() - fgStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染前景图层时出错:`, e);
    }
    
    try {
      const textStart = performance.now();
      this.renderTextLayer(this.ctx);
      layerTimes.text = performance.now() - textStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染文字图层时出错:`, e);
    }
    
    // 如果没有任何图层被渲染，显示调试信息
    if (layersRendered === 0) {
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 警告：没有任何图层被渲染`);
      this.renderDebugInfo();
    }
    
    // 计算总渲染时间
    const totalTime = performance.now() - startTime;
    
    // // 每10帧记录一次渲染性能
    // if (this.frameCount % 10 === 0) {
    //   console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染性能:`, {
    //     total: totalTime.toFixed(2) + 'ms',
    //     background: layerTimes.background?.toFixed(2) + 'ms',
    //     video: layerTimes.video?.toFixed(2) + 'ms',
    //     foreground: layerTimes.foreground?.toFixed(2) + 'ms',
    //     text: layerTimes.text?.toFixed(2) + 'ms',
    //     layersRendered
    //   });
    // }
    
    // 增加帧计数
    this.frameCount++;
  }
  
  /**
   * 渲染背景图层
   * @param targetCtx 可选的目标渲染上下文，用于直接渲染到指定上下文
   */
  private renderBackgroundLayer(targetCtx?: CanvasRenderingContext2D): void {
    if (!this.currentLayout) {
      return;
    }
    
    const ctx = targetCtx || this.offscreenCtx || this.ctx;
    if (!ctx) return;
    
    // 如果没有背景图，直接返回
    if (!this.currentLayout.background) {
      return;
    }
    
    // 如果背景不需要重绘，则跳过
    if (!this.backgroundNeedsRedraw && !targetCtx) {
      return;
    }
    
    // 获取背景图片
    const backgroundImage = this.imageCache.get(this.currentLayout.background) || getCachedImage(this.currentLayout.background);
    if (backgroundImage) {
      // 检查图片是否已完全加载
      if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
        ctx.drawImage(backgroundImage, 0, 0, this.width, this.height);
        this.backgroundNeedsRedraw = false;
        // console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 背景图层已渲染:`, this.currentLayout.background);
      } else {
        console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 背景图片尚未完全加载:`, this.currentLayout.background);
      }
    } else {
      // 尝试加载背景图片
      this.loadImage(this.currentLayout.background)
        .then(() => {
          // 图片加载成功后，标记背景需要重绘
          this.backgroundNeedsRedraw = true;
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 背景图片加载成功:`, this.currentLayout?.background);
              })
              .catch(error => {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 背景图片加载失败:`, error);
              });
          }
        }
  
  /**
   * 渲染视频图层
   * @param targetCtx 可选的目标渲染上下文，用于直接渲染到指定上下文
   */
  private renderVideoLayers(targetCtx?: CanvasRenderingContext2D): void {
    if (!this.currentLayout || !this.currentLayout.elements) {
      return;
    }
    
    const ctx = targetCtx || this.offscreenCtx || this.ctx;
    if (!ctx) return;
    
    // 获取所有媒体元素
    const mediaElements = this.currentLayout.elements
      .filter(element => element.type === LayoutElementType.MEDIA) as MediaLayoutElement[];
    
    // 如果没有媒体元素，直接返回
    if (mediaElements.length === 0) {
      return;
    }
    
    // 按zIndex排序（从小到大）
    mediaElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    // console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染 ${mediaElements.length} 个媒体元素`);
    
    // 渲染每个媒体元素
    for (const element of mediaElements) {
      this.renderMediaElement(element, ctx);
    }
  }
  
  /**
   * 渲染前景图层
   * @param targetCtx 可选的目标渲染上下文，用于直接渲染到指定上下文
   */
  private renderForegroundLayer(targetCtx?: CanvasRenderingContext2D): void {
    if (!this.currentLayout) {
      return;
    }
    
    const ctx = targetCtx || this.offscreenCtx || this.ctx;
    if (!ctx) return;
    
    // 如果没有前景图，直接返回
    if (!this.currentLayout.foreground) {
      return;
    }
    
    // 如果前景不需要重绘，则跳过
    if (!this.foregroundNeedsRedraw && !targetCtx) {
      return;
    }
    
    // 获取前景图片
    const foregroundImage = this.imageCache.get(this.currentLayout.foreground) || getCachedImage(this.currentLayout.foreground);
    if (foregroundImage) {
      // 检查图片是否已完全加载
      if (foregroundImage.complete && foregroundImage.naturalWidth > 0) {
        ctx.drawImage(foregroundImage, 0, 0, this.width, this.height);
        this.foregroundNeedsRedraw = false;
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 前景图层已渲染:`, this.currentLayout.foreground);
      } else {
        console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 前景图片尚未完全加载:`, this.currentLayout.foreground);
      }
    } else {
      // 尝试加载前景图片
      this.loadImage(this.currentLayout.foreground)
        .then(() => {
          // 图片加载成功后，标记前景需要重绘
          this.foregroundNeedsRedraw = true;
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 前景图片加载成功:`, this.currentLayout?.foreground);
              })
              .catch(error => {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 前景图片加载失败:`, error);
      });
    }
  }
  
  /**
   * 渲染文字图层
   * @param targetCtx 可选的目标渲染上下文，用于直接渲染到指定上下文
   */
  private renderTextLayer(targetCtx?: CanvasRenderingContext2D): void {
    if (!this.currentLayout || !this.currentLayout.elements) {
      return;
    }
    
    const ctx = targetCtx || this.offscreenCtx || this.ctx;
    if (!ctx) return;
    
    // 检查是否已有缓存的文字图层
    const cacheKey = `${this.currentLayout.id}_${this.planStore.previewingSchedule?.id || this.planStore.liveSchedule?.id}`;
    const cachedLayer = this.textLayerCache.get(cacheKey);
    
    if (cachedLayer && !this.textLayerNeedsRedraw) {
      // 如果有缓存且不需要重绘，直接使用缓存
      if (cachedLayer instanceof ImageBitmap) {
        ctx.drawImage(cachedLayer, 0, 0, this.width, this.height);
        return;
      } else if (cachedLayer instanceof ImageData) {
        ctx.putImageData(cachedLayer, 0, 0);
        return;
      }
    }
    
    // 如果需要重绘或没有缓存，使用文字图层渲染器渲染文字
    this.textLayerRenderer.renderTextLayer(this.currentLayout)
      .then(imageBitmap => {
        if (imageBitmap) {
          // 将渲染后的文字图层绘制到画布上
          ctx.drawImage(imageBitmap, 0, 0, this.width, this.height);
          
          // 缓存渲染结果
          this.textLayerCache.set(cacheKey, imageBitmap);
          
          // 标记文字图层不再需要重绘
          this.textLayerNeedsRedraw = false;
          
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 文字图层已渲染并缓存`);
        }
      })
      .catch(error => {
        console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染文字图层时出错:`, error);
      });
  }

  
  /**
   * 调整画布大小
   * 注意：此方法不再改变画布的实际渲染尺寸(1920x1080)，而是通过CSS缩放来适应显示
   * @param width 显示宽度
   * @param height 显示高度
   */
  public resize(width: number, height: number): void {
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 调整画布显示尺寸:`, width, height);
    
    // 仅调整CSS样式，不改变画布实际尺寸
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // 以下逻辑不再执行
    // 不再调整实际画布尺寸
    // 不再调整离屏画布尺寸
    // 不再调整文字图层渲染器尺寸
    
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 画布显示尺寸调整完成，实际渲染尺寸保持1920x1080不变`);
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 销毁渲染器');
    
    // 停止渲染循环
    this.stopRenderLoop();
    
    // 清除画布
    this.clearCanvas();
    
    // 清除图像缓存
    this.imageCache.clear();
    
    // 清除文字图层缓存
    this.textLayerCache.clear();
    
    // 销毁文字图层渲染器
    this.textLayerRenderer.destroy();
    
    // 移除引用
    this.currentLayout = null;
  }
  
  /**
   * 布局编辑通知
   * 当布局被编辑时调用此方法，强制重新渲染所有图层
   */
  public onLayoutEdited(): void {
    console.log(`[canvasRenderer.ts ${this.rendererType === 'preview' ? '预览' : '直播'}画布渲染器] 布局已编辑，强制重新渲染`);
    
    // 标记所有图层需要重绘
    this.backgroundNeedsRedraw = true;
    this.foregroundNeedsRedraw = true;
    this.textLayerNeedsRedraw = true;
    
    // 通知文字图层渲染器布局已变更
    this.textLayerRenderer.onLayoutOrScheduleChanged();
    
    // 如果当前有布局，重新设置布局触发渲染
    if (this.currentLayout) {
      this.setLayout(this.currentLayout);
    }
  }
  
  /**
   * 更新布局中的元素
   * @param elements 布局元素列表
   */
  public updateLayoutElements(elements: LayoutElement[]): void {
    if (!this.currentLayout) {
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 当前没有布局，无法更新元素`);
      return;
    }
    
    // 检查是否有媒体元素位置/尺寸变化
    let mediaElementsChanged = false;
    
    // 检查原有元素
    const oldElements = this.currentLayout.elements || [];
    
    // 将新元素与原有元素进行比较
    for (const newElement of elements) {
      if (newElement.type === LayoutElementType.MEDIA) {
        const oldElement = oldElements.find(e => e.id === newElement.id) as MediaLayoutElement | undefined;
        
        if (oldElement && oldElement.type === LayoutElementType.MEDIA) {
          // 检查媒体元素位置或尺寸是否变化
          if (
            oldElement.x !== newElement.x ||
            oldElement.y !== newElement.y ||
            oldElement.width !== newElement.width ||
            oldElement.height !== newElement.height ||
            oldElement.sourceId !== (newElement as MediaLayoutElement).sourceId
          ) {
            mediaElementsChanged = true;
            break;
          }
        } else {
          // 新增媒体元素
          mediaElementsChanged = true;
          break;
        }
      }
    }
    
    // 如果媒体元素位置或尺寸变化，清除坐标缓存
    if (mediaElementsChanged) {
      this.onLayoutOrSizeChanged();
    }
    
    // 更新布局元素
    this.currentLayout.elements = elements;
    
    // 标记文字图层需要重绘
    this.textLayerNeedsRedraw = true;
  }
  
  /**
   * 渲染空状态
   */
  private renderEmptyState(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 生成媒体元素缓存键
   * @param element 媒体元素
   * @returns 缓存键
   */
  private generateMediaElementCacheKey(element: MediaLayoutElement): string {
    return `${element.id}-${element.sourceId}-${element.x}-${element.y}-${element.width}-${element.height}-${this.width}-${this.height}`;
  }

  /**
   * 清除媒体元素坐标转换缓存
   */
  public clearMediaElementCache(): void {
    this.mediaElementsCache.clear();
  }

  /**
   * 渲染媒体元素
   * @param element 媒体元素
   * @param ctx 渲染上下文
   */
  private renderMediaElement(element: MediaLayoutElement, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    // 如果没有sourceId，直接返回，不绘制任何内容
    if (!element.sourceId) {
      return;
    }
    
    // 获取视频元素
    const videoElement = this.getVideoElement(element.sourceId);
    if (!videoElement) {
      return;
    }
    
    // 检查视频元素是否已准备好
    if (videoElement.readyState < 2) { // HAVE_CURRENT_DATA = 2
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素尚未准备好: ${element.sourceId}, readyState=${videoElement.readyState}`);
      return;
    }

    // 生成元素唯一缓存键
    const cacheKey = this.generateMediaElementCacheKey(element);
    
    // 检查缓存中是否已有坐标数据
    let coords;
    if (this.mediaElementsCache.has(cacheKey)) {
      // 使用缓存的坐标数据
      coords = this.mediaElementsCache.get(cacheKey)!;
    } else {
      // 直接使用元素在1920x1080坐标系中的位置和尺寸，无需转换
      coords = {
        original: { x: element.x, y: element.y, width: element.width, height: element.height },
        scaled: { x: element.x, y: element.y, width: element.width, height: element.height },
        scale: { scaleX: 1, scaleY: 1 },
        canvasSize: { width: this.width, height: this.height }
      };
      
      // 将计算结果存入缓存
      this.mediaElementsCache.set(cacheKey, coords);
      
      // 仅在首次计算或缓存未命中时输出日志
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 媒体元素坐标:`, coords);
    }
    
    // 绘制视频帧
    try {
      ctx.drawImage(
        videoElement,
        coords.scaled.x,
        coords.scaled.y,
        coords.scaled.width,
        coords.scaled.height
      );
    } catch (error) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 绘制视频帧时出错:`, error);
    }
  }
  
  /**
   * 获取视频元素
   * @param sourceId 视频源ID
   * @returns 视频元素
   */
  private getVideoElement(sourceId: string): HTMLVideoElement | null {
    // 从视频存储中获取视频设备
    const device = this.videoStore.activeDevices.find(device => device.id === sourceId);
    if (!device) {
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 未找到ID为 ${sourceId} 的视频设备`);
      return null;
    }
    
    // 检查设备是否有视频流
    if (!device.stream || !device.stream.active) {
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 设备 ${sourceId} 没有活跃的视频流`);
      
      // 尝试重新激活设备
      if (this.videoStore.autoRecoverStreams) {
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 尝试重新激活设备 ${sourceId}`);
        this.videoStore.activateDevice(sourceId, device.type);
      }
      
      return null;
    }
    
    // 如果设备没有videoElement属性，创建一个
    if (!device.videoElement) {
      try {
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 为设备 ${sourceId} 创建视频元素`);
        const videoElement = document.createElement('video');
        videoElement.srcObject = device.stream;
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        // 设置视频元素属性
        device.videoElement = videoElement;
        
        // 监听视频元素错误事件
        videoElement.onerror = (error) => {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素错误:`, error);
        };
        
        // 确保视频元素开始播放
        videoElement.play().catch(error => {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 无法播放视频:`, error);
        });
    } catch (error) {
        console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 创建视频元素时出错:`, error);
        return null;
      }
    }
    
    return device.videoElement;
  }

  /**
   * 渲染调试信息
   */
  private renderDebugInfo(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, this.width, this.height);
    
    // 绘制黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 绘制调试信息
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 标题
    ctx.fillText(
      `${this.rendererType === 'preview' ? '预览' : '直播'}画布 - 调试信息`,
      this.width / 2,
      this.height / 2 - 60
    );
    
    // 画布尺寸
    ctx.font = '16px Arial';
    ctx.fillText(
      `画布尺寸: ${this.width}x${this.height}`,
      this.width / 2,
      this.height / 2 - 30
    );
    
    // 布局信息
    ctx.fillText(
      `布局ID: ${this.currentLayout?.id || '无'}`,
      this.width / 2,
      this.height / 2
    );
    
    // 元素数量
    const elementCount = this.currentLayout?.elements?.length || 0;
    ctx.fillText(
      `元素数量: ${elementCount}`,
      this.width / 2,
      this.height / 2 + 30
    );
    
    // 渲染模式
    ctx.fillText(
      `渲染模式: ${this.offscreenCanvas ? '离屏渲染' : '直接渲染'}`,
      this.width / 2,
      this.height / 2 + 60
    );
    
    // 时间戳
    ctx.font = '14px Arial';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(
      `时间: ${new Date().toLocaleTimeString()}`,
      this.width / 2,
      this.height / 2 + 90
    );
  }
  
  /**
   * 渲染错误状态
   * @param error 错误对象
   */
  private renderErrorState(error: any): void {
    const ctx = this.ctx;
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, this.width, this.height);
    
    // 绘制黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 绘制错误信息
    ctx.fillStyle = '#FF0000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 错误标题
    ctx.fillText(
      `${this.rendererType === 'preview' ? '预览' : '直播'}画布渲染错误`,
      this.width / 2,
      this.height / 2 - 30
    );
    
    // 错误详情
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      `错误信息: ${error?.message || '未知错误'}`,
      this.width / 2,
      this.height / 2
    );
    
    // 时间戳
    ctx.font = '14px Arial';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(
      `时间: ${new Date().toLocaleTimeString()}`,
      this.width / 2,
      this.height / 2 + 30
    );
    
    // 记录错误日志
    console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染错误:`, error);
  }
  
  /**
   * 检查并恢复所有视频设备
   * 确保所有需要的视频设备都处于活跃状态
   */
  private checkAndRecoverVideoDevices(): void {
    if (!this.currentLayout || !this.currentLayout.elements) {
      return;
    }
    
    // 获取所有媒体元素
    const mediaElements = this.currentLayout.elements
      .filter(element => element.type === LayoutElementType.MEDIA) as MediaLayoutElement[];
    
    // 如果没有媒体元素，直接返回
    if (mediaElements.length === 0) {
      return;
    }
    
    // 检查每个媒体元素的视频设备
    for (const element of mediaElements) {
      if (!element.sourceId) continue;
      
      // 检查设备是否在活跃设备列表中
      const isActive = this.videoStore.activeDevices.some(device => 
        device.id === element.sourceId && device.stream && device.stream.active
      );
      
      // 如果设备不活跃，尝试激活
      if (!isActive) {
        // 查找设备类型
        const device = [
          ...this.videoStore.cameraDevices,
          ...this.videoStore.windowDevices,
          ...this.videoStore.displayDevices
        ].find(d => d.id === element.sourceId);
        
        if (device) {
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 尝试恢复设备 ${element.sourceId} (类型: ${device.type})`);
          this.videoStore.activateDevice(element.sourceId, device.type);
        }
      }
    }
  }

  /**
   * 直接在主画布上渲染
   * 当离屏渲染失败时使用此方法作为备选方案
   */
  private renderDirectlyOnMainCanvas(): void {
    console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 离屏渲染失败，切换到直接渲染模式`);
    
    if (!this.ctx) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 无法直接渲染：上下文不存在`);
      return;
    }
    
    // 清除主画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 如果没有布局，渲染空状态
    if (!this.currentLayout) {
      this.renderEmptyState();
      return;
    }
    
    // 直接在主画布上渲染各图层
    try { this.renderBackgroundLayer(this.ctx); } catch (e) { console.error(e); }
    try { this.renderVideoLayers(this.ctx); } catch (e) { console.error(e); }
    try { this.renderForegroundLayer(this.ctx); } catch (e) { console.error(e); }
    try { this.renderTextLayer(this.ctx); } catch (e) { console.error(e); }
    
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 直接渲染完成`);
  }

  /**
   * 当布局或画布尺寸变化时调用
   * 用于清除坐标转换缓存
   */
  public onLayoutOrSizeChanged(): void {
    // 清除所有坐标缓存
    this.clearMediaElementCache();
    
    // 标记文字图层需要重绘
    this.textLayerNeedsRedraw = true;
    
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局或尺寸变化，已清除坐标缓存`);
  }
}

/**
 * 创建预览画布渲染器
 * @param canvas 画布元素
 * @returns 画布渲染器实例
 */
export function createPreviewCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  return new CanvasRenderer(canvas, 'preview');
}

/**
 * 创建直播画布渲染器
 * @param canvas 画布元素
 * @returns 画布渲染器实例
 */
export function createLiveCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  return new CanvasRenderer(canvas, 'live');
}

/**
 * 创建画布渲染器（通用方法，向后兼容）
 * @param canvas 画布元素
 * @returns 画布渲染器实例
 */
export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  return new CanvasRenderer(canvas);
}
