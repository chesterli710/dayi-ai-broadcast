/**
 * 画布渲染器
 * 用于高性能绘制预览和直播画面
 */
import type { Layout, LayoutElement, MediaLayoutElement, TextLayoutElement, Schedule } from '../types/broadcast';
import { LayoutElementType, ScheduleType } from '../types/broadcast';
import { useVideoStore } from '../stores/videoStore';
import { usePlanStore } from '../stores/planStore';
import { getCachedImage, preloadImage, isDataUrl } from './imagePreloader';
import { getTextLayerDispatcher } from './textLayerDispatcher';
import type { VideoDevice } from '../types/video';
import { VideoSourceType } from '../types/video';

// 渲染器类型
export enum RendererType {
  PREVIEW = 'preview',
  LIVE = 'live'
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
  
  // 文字图层缓存，null值表示正在加载中
  private textLayerCache: Map<string, ImageBitmap | ImageData | null> = new Map();
  
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
  
  // 缓存元素坐标转换结果
  private mediaElementsCache: Map<string, {
    original: { x: number, y: number, width: number, height: number },
    scaled: { x: number, y: number, width: number, height: number },
    scale: { scaleX: number, scaleY: number },
    canvasSize: { width: number, height: number }
  }> = new Map();
  
  // 本地Map管理视频元素
  private videoElements: Map<string, HTMLVideoElement> | null = null;
  
  // 设备加载缓冲机制
  private pendingDevices: Set<string> = new Set();
  private deviceWarningLastShown: Map<string, number> = new Map();
  private deviceWarningThrottleTime: number = 5000; // 5 seconds
  private deviceInitialized: Map<string, boolean> = new Map();
  
  // 文字图层调度器
  private textLayerDispatcher = getTextLayerDispatcher();
  
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
    
    this.initCanvas();
    this.initOffscreenCanvas();
    
    // 监听布局编辑事件
    if (this.rendererType === 'preview') {
      // 使用 watch API 监听 previewLayoutEditedEvent 变化
      const unwatch = this.planStore.$subscribe((mutation, state) => {
        if (mutation.storeId === 'plan' && state.previewLayoutEditedEvent > 0) {
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 检测到预览布局编辑事件，标记文字图层需要重绘`);
          this.textLayerNeedsRedraw = true;
          
          // 布局已变更
          this.onLayoutOrSizeChanged();
          
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
          
          // 布局已变更
          this.onLayoutOrSizeChanged();
          
          // 启动渲染循环确保立即渲染
          this.startRenderLoop();
        }
      });
    }
  }
  
  /**
   * 初始化画布
   * 设置固定渲染尺寸为1920x1080，样式尺寸通过CSS控制
   */
  private initCanvas(): void {
    console.log('[canvasRenderer.ts 画布渲染器] 开始初始化画布');
    
    try {
      // 设置画布渲染尺寸固定为1920*1080
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      
      // 设置初始样式尺寸，通过CSS控制显示大小
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
      
      console.log('[canvasRenderer.ts 画布渲染器] 画布初始化完成，渲染尺寸：1920x1080');
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 初始化画布时出错:', error);
    }
  }
  
  /**
   * 初始化离屏画布
   * 创建与主画布相同尺寸(1920x1080)的离屏画布用于优化性能
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
      
      console.log('[canvasRenderer.ts 画布渲染器] 离屏画布初始化完成，尺寸：1920x1080');
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
    
    // 获取新布局中使用的所有媒体源ID
    const newMediaSourceIds = new Set<string>();
    if (layout && layout.elements) {
      layout.elements.forEach(element => {
        if (element.type === LayoutElementType.MEDIA) {
          const mediaElement = element as MediaLayoutElement;
          if (mediaElement.sourceId) {
            newMediaSourceIds.add(mediaElement.sourceId);
          }
        }
      });
    }
    
    // 清理不再使用的视频元素
    if (this.videoElements) {
      const unusedSourceIds: string[] = [];
      
      this.videoElements.forEach((videoElement, sourceId) => {
        if (!newMediaSourceIds.has(sourceId)) {
          unusedSourceIds.push(sourceId);
          
          try {
            // 停止播放
            if (!videoElement.paused) {
              videoElement.pause();
            }
            
            // 停止媒体轨道并清除媒体源
            if (videoElement.srcObject) {
              const stream = videoElement.srcObject as MediaStream;
              if (stream) {
                stream.getTracks().forEach(track => {
                  try {
                    track.stop();
                  } catch (err) {
                    console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 停止轨道失败:`, err);
                  }
                });
              }
              videoElement.srcObject = null;
            }
          } catch (error) {
            console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 释放视频元素时出错:`, error);
          }
        }
      });
      
      // 从集合中移除不再使用的视频元素
      if (unusedSourceIds.length > 0) {
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 清理 ${unusedSourceIds.length} 个不再使用的视频元素:`, unusedSourceIds);
        unusedSourceIds.forEach(sourceId => {
          this.videoElements?.delete(sourceId);
        });
      }
    }
    
    // 如果布局发生变化，标记所有图层需要重绘
    if (this.currentLayout?.id !== layout?.id) {
      this.backgroundNeedsRedraw = true;
      this.foregroundNeedsRedraw = true;
      this.textLayerNeedsRedraw = true;
      
      // 清除媒体元素坐标缓存和通知布局变更
      this.onLayoutOrSizeChanged();
      
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局ID已变更，标记所有图层需要重绘`);
      
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
        this.clearMediaElementCache();
        
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
            this.clearMediaElementCache();
          }
          
          // 启动渲染循环确保立即渲染
          this.startRenderLoop();
        }
      }
    }
    
    // 更新当前布局
    this.currentLayout = layout;
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
   * 按照流程图:
   * 1. 生成各个1920*1080的图层(背景、视频源、前景、文字)
   * 2. 合并为主画布
   * 3. 主画布通过CSS适应窗口大小
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
    
    // 1. 渲染背景图层 (1920*1080)
    try {
      const bgStart = performance.now();
      this.renderBackgroundLayer(this.ctx);
      layerTimes.background = performance.now() - bgStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染背景图层时出错:`, e);
    }
    
    // 2. 渲染视频图层 (1920*1080)
    try {
      const videoStart = performance.now();
      this.renderVideoLayers(this.ctx);
      layerTimes.video = performance.now() - videoStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染视频图层时出错:`, e);
    }
    
    // 3. 渲染前景图层 (1920*1080)
    try {
      const fgStart = performance.now();
      this.renderForegroundLayer(this.ctx);
      layerTimes.foreground = performance.now() - fgStart;
      layersRendered++;
    } catch (e) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染前景图层时出错:`, e);
    }
    
    // 4. 渲染文字图层 (1920*1080)
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
    if (!this.currentLayout) {
      return;
    }

    const ctx = targetCtx || this.offscreenCtx || this.ctx;
    if (!ctx) return;

    const { elements } = this.currentLayout;
    if (!elements || elements.length === 0) {
      return;
    }

    // 获取当前日程ID
    const scheduleId = this.rendererType === 'preview' 
      ? this.planStore.previewingSchedule?.id 
      : this.planStore.liveSchedule?.id;
    
    if (!scheduleId) {
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 无法渲染文字图层：当前没有活跃的日程安排`);
      return;
    }

    // 流程图实现：首先检查是否有本地缓存
    // 缓存键现在仅依赖scheduleId和layoutId，与渲染模式无关，使预览和直播共享同一份文字图层缓存
    const cacheKey = `${scheduleId}_${this.currentLayout.id}`;
    
    // 1. 检查本地缓存是否有效且不需要重绘
    if (!this.textLayerNeedsRedraw && this.textLayerCache.has(cacheKey)) {
      const cachedLayer = this.textLayerCache.get(cacheKey);
      if (cachedLayer) {
        if (cachedLayer instanceof ImageBitmap) {
          // 2. 如果有缓存，直接使用缓存绘制
          ctx.drawImage(cachedLayer, 0, 0, this.width, this.height);
          if (this.frameCount % 300 === 0) { // 每300帧输出一次日志，避免日志过多
            console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 从本地缓存绘制文字图层 (cacheKey=${cacheKey})`);
          }
          return; // 缓存有效，直接返回
        } else if (cachedLayer instanceof ImageData) {
          ctx.putImageData(cachedLayer, 0, 0);
          if (this.frameCount % 300 === 0) {
            console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 从本地缓存(ImageData)绘制文字图层`);
          }
          return; // 缓存有效，直接返回
        }
      }
    }

    // 3. 如果没有有效缓存或需要重绘，只有在第一次或需要重新渲染时才请求新的图层
    // 使用标志防止重复请求，避免每帧都发起异步调用
    if (this.textLayerNeedsRedraw || !this.textLayerCache.has(cacheKey)) {
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 缓存无效或需要重绘，从调度器获取文字图层 (cacheKey=${cacheKey})`);
      
      // 临时设置标志位，防止下一帧重复请求
      // 在异步请求完成前，这个标志会阻止重复发起请求
      this.textLayerCache.set(cacheKey, null);
      
      // 从调度器获取文字图层（调度器内部会优先使用自己的缓存）
      // 注意：这里使用的scheduleId和layoutId参数与缓存键生成逻辑保持一致
      this.textLayerDispatcher.getTextLayer(
        this.rendererType,
        String(scheduleId), 
        String(this.currentLayout.id)
      )
        .then((imageBitmap: ImageBitmap | null) => {
          if (imageBitmap) {
            // 如果成功获取到图层，立即绘制
            if (ctx) {
              ctx.drawImage(imageBitmap, 0, 0, this.width, this.height);
            }
            
            // 4. 更新缓存
            this.textLayerCache.set(cacheKey, imageBitmap);
            
            // 重置重绘标志
            this.textLayerNeedsRedraw = false;
            
            console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 文字图层已渲染并缓存 (cacheKey=${cacheKey})`);
          } else {
            // 如果没有获取到图层，移除临时null值，允许下一帧重试
            this.textLayerCache.delete(cacheKey);
            console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 未能获取文字图层 (cacheKey=${cacheKey})`);
          }
        })
        .catch((error: Error) => {
          // 出错时移除临时null值，允许下一帧重试
          this.textLayerCache.delete(cacheKey);
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 渲染文字图层时出错:`, error);
        });
    } else if (this.textLayerCache.get(cacheKey) === null) {
      // 如果缓存值为null，表示正在加载中，这一帧不做任何渲染
      if (this.frameCount % 60 === 0) { // 每60帧输出一次日志，避免日志过多
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 文字图层正在加载中... (cacheKey=${cacheKey})`);
      }
    }
    // 如果既不需要重绘，也不是正在加载中，但缓存中没有，说明是首次渲染或者缓存被清除
    // 这种情况在下一帧会通过上面的条件判断请求新的图层
  }
  
  /**
   * 调整画布大小
   * 仅调整CSS样式以适应窗口，不改变画布实际渲染尺寸(1920x1080)
   * 窗口尺寸变更时不会触发图层重新渲染
   * @param width 显示宽度
   * @param height 显示高度
   */
  public resize(width: number, height: number): void {
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 调整画布显示尺寸:`, width, height);
    
    // 仅调整CSS样式，不改变画布实际尺寸
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // 不再标记任何图层需要重绘，因为尺寸变化不影响渲染结果
    // 不再调用onLayoutOrSizeChanged，避免清除缓存和触发重新渲染
    
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 画布显示尺寸调整完成，四个图层不重新渲染`);
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 销毁渲染器`);
    
    // 停止渲染循环
    this.stopRenderLoop();
    
    // 清除画布
    this.clearCanvas();
    
    // 清除图像缓存
    this.imageCache.clear();
    
    // 清除文字图层缓存
    this.textLayerCache.clear();
    
    // 释放视频元素资源
    if (this.videoElements) {
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 释放 ${this.videoElements.size} 个视频元素`);
      this.videoElements.forEach((videoElement, sourceId) => {
        try {
          // 停止播放
          if (!videoElement.paused) {
            videoElement.pause();
          }
          
          // 停止媒体轨道
          if (videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => {
                // 停止轨道
                try {
                  track.stop();
                  console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 已停止视频轨道 ${track.id} ${track.kind}`);
                } catch (err) {
                  console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 停止轨道失败:`, err);
                }
              });
            }
            
            // 清除媒体源
            videoElement.srcObject = null;
          }
        } catch (error) {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 释放视频元素时出错:`, error);
        }
      });
      
      // 清空视频元素集合
      this.videoElements.clear();
      this.videoElements = null;
    }
    
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
    
    // 清除媒体元素坐标缓存
    this.clearMediaElementCache();

    // 如果当前有布局，重新设置布局触发渲染
    if (this.currentLayout) {
      // 创建布局的深拷贝，确保引用变化
      const layoutCopy = JSON.parse(JSON.stringify(this.currentLayout));
      // 重新设置布局
      this.setLayout(layoutCopy);
    }
    
    // 立即启动渲染循环确保变化能被立即渲染
    this.startRenderLoop();
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
    let textElementsChanged = false;
    
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
          }
        } else {
          // 新增媒体元素
          mediaElementsChanged = true;
        }
      } else if (
        newElement.type === LayoutElementType.HOST_LABEL ||
        newElement.type === LayoutElementType.HOST_INFO ||
        newElement.type === LayoutElementType.SUBJECT_LABEL ||
        newElement.type === LayoutElementType.SUBJECT_INFO ||
        newElement.type === LayoutElementType.GUEST_LABEL ||
        newElement.type === LayoutElementType.GUEST_INFO
      ) {
        // 检查文本元素是否有变化
        const oldElement = oldElements.find(e => e.id === newElement.id);
        if (oldElement && JSON.stringify(oldElement) !== JSON.stringify(newElement)) {
          textElementsChanged = true;
        } else if (!oldElement) {
          // 新增文本元素
          textElementsChanged = true;
        }
      }
    }
    
    // 如果媒体元素位置或尺寸变化，清除坐标缓存
    if (mediaElementsChanged) {
      this.clearMediaElementCache();
    }
    
    // 如果文本元素有变化，标记文字图层需要重绘并清除缓存
    if (textElementsChanged) {
      this.textLayerNeedsRedraw = true;
      
      // 获取当前日程ID
      const scheduleId = this.rendererType === 'preview' 
        ? this.planStore.previewingSchedule?.id 
        : this.planStore.liveSchedule?.id;
      
      if (scheduleId) {
        // 生成缓存键，与renderTextLayer保持一致
        const cacheKey = `${scheduleId}_${this.currentLayout.id}`;
        
        // 清除该布局的文字图层缓存
        if (this.textLayerCache.has(cacheKey)) {
          this.textLayerCache.delete(cacheKey);
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 文本元素变化，清除文字图层缓存 (cacheKey=${cacheKey})`);
        }
        
        // 通知文字层调度器数据已变更
        this.textLayerDispatcher.onDataChanged(
          String(scheduleId), 
          String(this.currentLayout.id)
        );
      }
    }
    
    // 更新布局元素
    this.currentLayout.elements = elements;
    
    // 如有任何变化，启动渲染循环确保变化能立即体现
    if (mediaElementsChanged || textElementsChanged) {
      this.startRenderLoop();
    }
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
    let videoElement = this.getVideoElement(element.sourceId);
    
    // 检查视频元素状态，如果有问题则尝试获取新元素
    if (videoElement && !this.isVideoElementReady(videoElement, element.sourceId)) {
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素状态异常，尝试重新创建: ${element.sourceId}`);
      // 移除现有元素
      if (this.videoElements) {
        this.videoElements.delete(element.sourceId);
      }
      // 重新获取视频元素
      videoElement = this.getVideoElement(element.sourceId);
    }
    
    if (!videoElement) {
      return;
    }
    
    // 检查视频元素是否已准备好
    if (videoElement.readyState < 2) { // HAVE_CURRENT_DATA = 2
      console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素尚未准备好: ${element.sourceId}, readyState=${videoElement.readyState}`);
      return;
    }
    
    // 获取视频设备，判断是否为窗口或显示器捕获
    const device = this.videoStore.activeDevices.find(device => device.id === element.sourceId);
    const isWindowOrDisplay = device && (device.type === VideoSourceType.WINDOW || device.type === VideoSourceType.DISPLAY);
    
    // 生成元素唯一缓存键
    const cacheKey = this.generateMediaElementCacheKey(element);
    
    // 检查缓存中是否已有坐标数据
    let coords;
    if (this.mediaElementsCache.has(cacheKey)) {
      // 使用缓存的坐标数据
      coords = this.mediaElementsCache.get(cacheKey)!;
    } else {
      if (isWindowOrDisplay) {
        // 对于窗口和显示器捕获，保持原始宽高比
        coords = this.calculateMaintainAspectRatioCoords(element, videoElement);
      } else {
        // 其他类型媒体元素直接使用元素在1920x1080坐标系中的位置和尺寸，无需转换
        coords = {
          original: { x: element.x, y: element.y, width: element.width, height: element.height },
          scaled: { x: element.x, y: element.y, width: element.width, height: element.height },
          scale: { scaleX: 1, scaleY: 1 },
          canvasSize: { width: this.width, height: this.height }
        };
      }
      
      // 将计算结果存入缓存
      this.mediaElementsCache.set(cacheKey, coords);
      
      // 仅在首次计算或缓存未命中时输出日志
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 媒体元素坐标:`, coords);
    }
    
    // 检查是否需要填充黑色背景（当 transparentBackground 不为 true 时填充）
    if (element.transparentBackground !== true) {
      // 保存当前上下文状态
      ctx.save();
      
      // 设置填充颜色为黑色
      ctx.fillStyle = '#000000';
      
      // 填充整个元素区域
      ctx.fillRect(
        coords.original.x,
        coords.original.y,
        coords.original.width,
        coords.original.height
      );
      
      // 恢复上下文状态
      ctx.restore();
      
      // 添加日志
      if (this.frameCount % 60 === 0) { // 每60帧记录一次日志，避免日志过多
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 媒体元素使用黑色背景: ${element.sourceId}`);
      }
    } else if (this.frameCount % 60 === 0) { // 每60帧记录一次日志，避免日志过多
      // 添加日志
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 媒体元素使用透明背景: ${element.sourceId}`);
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
   * 计算保持原始宽高比的坐标
   * @param element 媒体元素
   * @param videoElement 视频元素
   * @returns 坐标数据
   */
  private calculateMaintainAspectRatioCoords(element: MediaLayoutElement, videoElement: HTMLVideoElement): any {
    const originalX = element.x;
    const originalY = element.y;
    const layoutWidth = element.width;
    const layoutHeight = element.height;
    
    // 获取视频的实际宽高比
    const videoWidth = videoElement.videoWidth || 1280; // 防止为0
    const videoHeight = videoElement.videoHeight || 720; // 防止为0
    const videoAspectRatio = videoWidth / videoHeight;
    
    // 计算布局区域的宽高比
    const layoutAspectRatio = layoutWidth / layoutHeight;
    
    // 计算适应布局区域的宽高
    let scaledWidth = layoutWidth;
    let scaledHeight = layoutHeight;
    let offsetX = 0;
    let offsetY = 0;
    
    // 根据宽高比确定如何缩放
    if (videoAspectRatio > layoutAspectRatio) {
      // 视频比例更宽，以宽度为准，居中显示
      scaledHeight = layoutWidth / videoAspectRatio;
      offsetY = (layoutHeight - scaledHeight) / 2;
    } else {
      // 视频比例更高，以高度为准，居中显示
      scaledWidth = layoutHeight * videoAspectRatio;
      offsetX = (layoutWidth - scaledWidth) / 2;
    }
    
    // 添加日志
    console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频实际比例: ${videoAspectRatio.toFixed(3)}, 布局比例: ${layoutAspectRatio.toFixed(3)}, 调整后尺寸: ${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}`);
    
    // 返回坐标数据
    return {
      original: { x: originalX, y: originalY, width: layoutWidth, height: layoutHeight },
      scaled: { 
        x: originalX + offsetX, 
        y: originalY + offsetY, 
        width: scaledWidth, 
        height: scaledHeight 
      },
      scale: { scaleX: scaledWidth / videoWidth, scaleY: scaledHeight / videoHeight },
      canvasSize: { width: this.width, height: this.height }
    };
  }
  
  /**
   * 检查视频元素是否处于可用状态
   * @param videoElement 视频元素
   * @param sourceId 视频源ID
   * @returns 视频元素是否可用
   */
  private isVideoElementReady(videoElement: HTMLVideoElement, sourceId: string): boolean {
    // 检查视频元素是否有效
    if (!videoElement) {
      return false;
    }
    
    // 检查srcObject是否存在
    if (!videoElement.srcObject) {
      return false;
    }
    
    // 检查媒体流是否有效
    const stream = videoElement.srcObject as MediaStream;
    if (!stream || !stream.active) {
      return false;
    }
    
    // 检查是否有视频轨道
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      return false;
    }
    
    // 检查视频轨道是否有效
    for (const track of videoTracks) {
      if (!track || track.readyState !== 'live') {
        return false;
      }
    }
    
    // 检查元素是否已加载
    if (videoElement.readyState < 1) { // HAVE_METADATA
      return false;
    }
    
    return true;
  }
  
  /**
   * 获取视频元素
   * @param sourceId 视频源ID
   * @returns 视频元素
   */
  private getVideoElement(sourceId: string): HTMLVideoElement | null {
    // 从视频存储中获取视频设备
    const device = this.videoStore.activeDevices.find(device => device.id === sourceId);
    
    // 如果设备不存在
    if (!device) {
      // 检查是否是首次请求该设备，避免重复警告
      if (!this.pendingDevices.has(sourceId)) {
        // 如果不在等待队列中，添加到等待队列
        this.pendingDevices.add(sourceId);
        
        // 定期检查设备是否可用
        this.scheduleDeviceCheck(sourceId);
        
        // 仅在设备首次请求或距上次警告已过指定时间才输出警告
        const now = Date.now();
        const lastWarningTime = this.deviceWarningLastShown.get(sourceId) || 0;
        if (now - lastWarningTime > this.deviceWarningThrottleTime) {
          console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 未找到ID为 ${sourceId} 的视频设备，已加入等待队列`);
          this.deviceWarningLastShown.set(sourceId, now);
        }
      }
      return null;
    }
    
    // 设备已找到，从等待队列中移除
    if (this.pendingDevices.has(sourceId)) {
      this.pendingDevices.delete(sourceId);
      console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 设备 ${sourceId} 已加载，从等待队列中移除`);
    }
    
    // 检查设备是否有视频流
    if (!device.stream || !device.stream.active) {
      // 仅在设备首次请求或距上次警告已过指定时间才输出警告
      const now = Date.now();
      const lastWarningTime = this.deviceWarningLastShown.get(sourceId) || 0;
      if (now - lastWarningTime > this.deviceWarningThrottleTime) {
        console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 设备 ${sourceId} 没有活跃的视频流`);
        this.deviceWarningLastShown.set(sourceId, now);
      }
      
      // 尝试重新激活设备
      if (this.videoStore.autoRecoverStreams) {
        // 避免频繁重试激活设备
        if (now - lastWarningTime > this.deviceWarningThrottleTime) {
          console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 尝试重新激活设备 ${sourceId}`);
          this.videoStore.activateDevice(sourceId, device.type);
        }
      }
      
      return null;
    }
    
    // 使用本地Map管理视频元素，为每个sourceId创建单独的视频元素
    if (!this.videoElements) {
      this.videoElements = new Map<string, HTMLVideoElement>();
    }
    
    // 检查本地是否已有该sourceId的视频元素，并且检查其状态
    const existingElement = this.videoElements.get(sourceId);
    const needNewElement = !existingElement || 
                           !existingElement.srcObject || 
                           !(existingElement.srcObject as MediaStream).active ||
                           existingElement.readyState === 0;
    
    if (needNewElement) {
      try {
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 为设备 ${sourceId} 创建视频元素`);
        // 移除旧元素（如果存在）
        if (existingElement) {
          try {
            if (existingElement.srcObject) {
              existingElement.srcObject = null;
            }
            if (!existingElement.paused) {
              existingElement.pause();
            }
          } catch (err) {
            console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 清理旧视频元素出错:`, err);
          }
        }
        
        // 创建新的视频元素
        const videoElement = document.createElement('video');
        
        // 为视频元素设置流对象
        if (device.stream) {
          try {
            // 尝试克隆流以避免与其他实例共享同一个MediaStream对象
            const streamClone = new MediaStream();
            
            // 尝试克隆轨道，如果不支持则直接使用原轨道
            device.stream.getTracks().forEach(track => {
              try {
                // 尝试克隆轨道
                const clonedTrack = track.clone();
                streamClone.addTrack(clonedTrack);
              } catch (error) {
                // 如果克隆失败，直接使用原始轨道
                console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 轨道克隆失败，使用原始轨道:`, error);
                streamClone.addTrack(track);
              }
            });
            
            videoElement.srcObject = streamClone;
          } catch (error) {
            // 如果上述方法失败，直接使用原始流
            console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 流克隆失败，使用原始流:`, error);
            videoElement.srcObject = device.stream;
          }
        }
        
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        // 存储到本地Map中
        this.videoElements.set(sourceId, videoElement);
        
        // 标记设备已初始化
        this.deviceInitialized.set(sourceId, true);
        
        // 添加额外的调试信息
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素创建完成，分辨率: ${
          device.stream.getVideoTracks()[0]?.getSettings().width || 'unknown'
        }x${
          device.stream.getVideoTracks()[0]?.getSettings().height || 'unknown'
        }`);
        
        // 监听视频元素错误事件
        videoElement.onerror = (error) => {
          console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素错误:`, error);
        };
        
        // 改进视频播放逻辑，使用事件和延迟机制
        const startPlaying = () => {
          // 确保视频元素开始播放，添加重试机制
          const attemptPlay = (retries = 3) => {
            if (retries <= 0) {
              console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频播放失败，已达到最大重试次数`);
              return;
            }
            
            videoElement.play()
              .then(() => {
                console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素播放成功: ${sourceId}`);
              })
              .catch(error => {
                if (error.name === 'AbortError') {
                  console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 播放请求被中断，重试中 (${retries}次): ${error.message}`);
                  // 如果是AbortError，延迟后重试
                  setTimeout(() => attemptPlay(retries - 1), 100);
                } else if (error.name === 'NotAllowedError') {
                  console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 自动播放被浏览器阻止，请设置 muted=true: ${error.message}`);
                  // 确保静音
                  videoElement.muted = true;
                  setTimeout(() => attemptPlay(retries - 1), 100);
                } else {
                  console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频播放错误: ${error.name} - ${error.message}`);
                }
              });
          };
          
          // 开始尝试播放
          attemptPlay();
        };

        // 当元数据加载完成时开始播放
        if (videoElement.readyState >= 1) { // HAVE_METADATA
          // 元数据已加载，可以立即播放
          startPlaying();
        } else {
          // 监听元数据加载事件
          videoElement.addEventListener('loadedmetadata', () => {
            startPlaying();
          }, { once: true });
          
          // 添加超时保护，防止元数据加载事件未触发
          setTimeout(() => {
            if (videoElement.readyState < 1) {
              console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 元数据加载超时，尝试强制播放`);
              startPlaying();
            }
          }, 1000);
        }
      } catch (error) {
        console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 创建视频元素时出错:`, error);
        return null;
      }
    }
    
    return this.videoElements.get(sourceId) || null;
  }
  
  /**
   * 定期检查设备是否可用
   * @param sourceId 设备ID
   */
  private scheduleDeviceCheck(sourceId: string): void {
    // 每500毫秒检查一次设备是否可用，最多检查10次
    let checkCount = 0;
    const maxChecks = 10;
    
    const checkDevice = () => {
      // 如果设备已不在等待队列中，停止检查
      if (!this.pendingDevices.has(sourceId)) {
        return;
      }
      
      // 检查计数递增
      checkCount++;
      
      // 查找设备
      const device = this.videoStore.activeDevices.find(device => device.id === sourceId);
      
      if (device) {
        // 设备已找到，从等待队列中移除
        this.pendingDevices.delete(sourceId);
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 设备 ${sourceId} 现已可用，第 ${checkCount} 次检查`);
        
        // 如果设备有活跃流，标记为初始化完成
        if (device.stream && device.stream.active) {
          this.deviceInitialized.set(sourceId, true);
        }
      } else if (checkCount < maxChecks) {
        // 继续检查
        setTimeout(checkDevice, 500);
      } else {
        // 达到最大检查次数，发出最终警告
        console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 设备 ${sourceId} 在 ${maxChecks} 次检查后仍未找到`);
      }
    };
    
    // 开始检查
    setTimeout(checkDevice, 500);
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
   * 用于清除坐标转换缓存，但不清除文字图层缓存
   */
  public onLayoutOrSizeChanged(): void {
    // 清除媒体元素坐标缓存
    this.clearMediaElementCache();
    
    // 获取当前日程ID
    const scheduleId = this.rendererType === 'preview' 
      ? this.planStore.previewingSchedule?.id 
      : this.planStore.liveSchedule?.id;
      
    // 如果当前有布局和有效的日程
    if (this.currentLayout && scheduleId) {
      // 生成缓存键，与renderTextLayer中保持一致
      const cacheKey = `${scheduleId}_${this.currentLayout.id}`;
      
      // 检查缓存是否存在
      if (this.textLayerCache.has(cacheKey)) {
        // 如果缓存存在，不需要重新渲染
        this.textLayerNeedsRedraw = false;
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局变更，但文字图层缓存已存在，无需重新渲染 (cacheKey=${cacheKey})`);
      } else {
        // 只有在缓存不存在时才标记需要重绘
        this.textLayerNeedsRedraw = true;
        console.log(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 布局变更，文字图层缓存不存在，需要渲染 (cacheKey=${cacheKey})`);
        
        // 仅当需要渲染新的文字图层时通知调度器数据变更
        this.textLayerDispatcher.onDataChanged(
          String(scheduleId), 
          String(this.currentLayout.id)
        );
      }
    } else {
      // 如果没有布局或日程，标记需要重绘（以备将来设置）
      this.textLayerNeedsRedraw = true;
    }
  }

  /**
   * 处理视频源
   * @param sourceId 视频源ID
   * @param x 坐标X
   * @param y 坐标Y
   * @param width 宽度
   * @param height 高度
   */
  private processVideoSource(sourceId: string, x: number, y: number, width: number, height: number): void {
    try {
      // 如果设备在等待队列中，避免处理
      if (this.pendingDevices.has(sourceId)) {
        // 不需要重复记录警告，已在getVideoElement中处理
        return;
      }
      
      const videoElement = this.getVideoElement(sourceId);
      
      if (!videoElement) {
        // 警告已经在getVideoElement方法中处理
        return;
      }
      
      // 检查视频元素的准备情况
      // readyState: 0 = HAVE_NOTHING, 1 = HAVE_METADATA, 2 = HAVE_CURRENT_DATA, 3 = HAVE_FUTURE_DATA, 4 = HAVE_ENOUGH_DATA
      if (videoElement.readyState < 2) { // 至少需要HAVE_CURRENT_DATA才能绘制
        // 视频尚未准备好，但进展中，使用节流减少警告
        const now = Date.now();
        const lastWarningTime = this.deviceWarningLastShown.get(sourceId) || 0;
        if (now - lastWarningTime > this.deviceWarningThrottleTime) {
          console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频元素尚未准备好渲染 (readyState=${videoElement.readyState})`);
          this.deviceWarningLastShown.set(sourceId, now);
        }
        return;
      }
      
      // 视频宽高
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        // 视频尺寸无效，可能还未完全准备好
        const now = Date.now();
        const lastWarningTime = this.deviceWarningLastShown.get(sourceId) || 0;
        if (now - lastWarningTime > this.deviceWarningThrottleTime) {
          console.warn(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 视频尺寸无效: ${videoWidth}x${videoHeight}`);
          this.deviceWarningLastShown.set(sourceId, now);
        }
        return;
      }
      
      // 绘制视频
      if (this.ctx) {
        this.ctx.drawImage(videoElement, x, y, width, height);
      } else {
        console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 画布上下文为空，无法绘制视频`);
      }
    } catch (error) {
      console.error(`[canvasRenderer.ts ${this.rendererType}画布渲染器] 处理视频源出错:`, error);
    }
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
