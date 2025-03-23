/**
 * 画布渲染器工具类
 * 用于渲染PreviewCanvas和LiveCanvas的内容
 * 支持多层次渲染：背景图层、视频图层、前景图层、文字图层
 */
import { usePlanStore } from '../stores/planStore';
import mediaSourceManager from './mediaSourceManager';
import imagePreloader from './imagePreloader';
import textLayerCacheManager from './textLayerCacheManager';
import type { MediaLayoutElement, Layout, Schedule } from '../types/broadcast';

/**
 * 渲染上下文类
 * 用于管理渲染过程中的上下文和资源
 */
class RenderContext {
  /**
   * 画布元素
   */
  public canvas: HTMLCanvasElement;
  
  /**
   * 画布上下文
   */
  public ctx: CanvasRenderingContext2D | null;
  
  /**
   * 背景图层离屏画布
   */
  public backgroundCanvas: HTMLCanvasElement;
  
  /**
   * 背景图层上下文
   */
  public backgroundCtx: CanvasRenderingContext2D | null;
  
  /**
   * 前景图层离屏画布
   */
  public foregroundCanvas: HTMLCanvasElement;
  
  /**
   * 前景图层上下文
   */
  public foregroundCtx: CanvasRenderingContext2D | null;
  
  /**
   * 文字图层离屏画布
   */
  public textLayerCanvas: HTMLCanvasElement | null = null;
  
  /**
   * 日程ID
   */
  public scheduleId: string;
  
  /**
   * 布局ID
   */
  public layoutId: number;
  
  /**
   * 布局数据
   */
  public layout: Layout | null = null;
  
  /**
   * 日程数据
   */
  public schedule: Schedule | null = null;
  
  /**
   * 资源是否已加载完成
   */
  public resourcesLoaded: boolean = false;
  
  /**
   * 资源加载错误
   */
  public loadError: string | null = null;
  
  /**
   * 背景图像
   */
  public backgroundImage: HTMLImageElement | null = null;
  
  /**
   * 前景图像
   */
  public foregroundImage: HTMLImageElement | null = null;
  
  /**
   * 视频元素列表
   * 键为sourceId，值为视频元素和对应的媒体布局元素
   */
  public videoElements: Map<string, {
    videoElement: HTMLVideoElement,
    layoutElement: MediaLayoutElement,
    isPlaying: boolean,
    sourceId: string
  }> = new Map();
  
  /**
   * 动画帧请求ID
   */
  public animationFrameId: number | null = null;
  
  /**
   * 帧计数器
   */
  public frameCount: number = 0;
  
  /**
   * 构造函数
   * @param canvas 画布元素
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   */
  constructor(canvas: HTMLCanvasElement, scheduleId: string, layoutId: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scheduleId = scheduleId;
    this.layoutId = layoutId;
    
    // 创建背景图层离屏画布
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = 1920;
    this.backgroundCanvas.height = 1080;
    this.backgroundCtx = this.backgroundCanvas.getContext('2d');
    
    // 创建前景图层离屏画布
    this.foregroundCanvas = document.createElement('canvas');
    this.foregroundCanvas.width = 1920;
    this.foregroundCanvas.height = 1080;
    this.foregroundCtx = this.foregroundCanvas.getContext('2d');
    
    // 设置画布尺寸
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    
    // 启用硬件加速
    if (this.ctx) {
      // 对于2D上下文，可以通过设置imageSmoothingEnabled和imageSmoothingQuality来优化渲染
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    // 取消渲染循环
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 停止并释放所有视频元素
    this.videoElements.forEach((item, uniqueKey) => {
      const videoElement = item.videoElement;
      const sourceId = item.sourceId; // 使用保存的原始sourceId
      
      try {
        // 暂停视频播放
        if (videoElement.srcObject) {
          videoElement.pause();
          
          // 标记为未播放状态
          item.isPlaying = false;
          
          // 停止所有音轨和视频轨道
          const mediaStream = videoElement.srcObject as MediaStream;
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
              track.stop();
            });
          }
          
          // 清除视频源
          videoElement.srcObject = null;
        }
        
        // 释放媒体源管理器中的流
        mediaSourceManager.releaseStream(sourceId);
        
        console.log(`[canvasRenderer.ts 画布渲染器] 已释放视频资源: ${sourceId}, 唯一标识: ${uniqueKey}`);
      } catch (error) {
        console.error(`[canvasRenderer.ts 画布渲染器] 释放视频资源时出错: ${sourceId}`, error);
      }
    });
    
    // 清空视频元素集合
    this.videoElements.clear();
    
    // 其他资源清理
    this.backgroundImage = null;
    this.foregroundImage = null;
    this.textLayerCanvas = null;
    this.layout = null;
    this.schedule = null;
    
    // 清空画布
    if (this.ctx) {
      this.ctx.clearRect(0, 0, 1920, 1080);
    }
    
    console.log('[canvasRenderer.ts 画布渲染器] 已清理渲染上下文资源');
  }
}

/**
 * 画布渲染器类
 */
class CanvasRenderer {
  /**
   * 当前活动的渲染上下文
   */
  private previewContext: RenderContext | null = null;
  
  /**
   * 直播画布的渲染上下文
   */
  private liveContext: RenderContext | null = null;
  
  /**
   * 加载布局和日程数据
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 布局和日程数据
   */
  private loadLayoutAndSchedule(scheduleId: string, layoutId: number): { layout: Layout | null, schedule: Schedule | null } {
    const planStore = usePlanStore();
    if (!planStore.currentBranch) {
      console.error('[canvasRenderer.ts 画布渲染器] 当前没有选中分支');
      return { layout: null, schedule: null };
    }
    
    // 查找指定的日程
    const schedule = planStore.currentBranch.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      console.error(`[canvasRenderer.ts 画布渲染器] 未找到ID为${scheduleId}的日程`);
      return { layout: null, schedule: null };
    }
    
    // 查找指定的布局
    const layout = schedule.layouts.find(l => l.id === layoutId);
    if (!layout) {
      console.error(`[canvasRenderer.ts 画布渲染器] 未找到ID为${layoutId}的布局`);
      return { layout: null, schedule: null };
    }
    
    return { layout, schedule };
  }
  
  /**
   * 加载资源
   * @param context 渲染上下文
   * @returns 资源加载Promise
   */
  private async loadResources(context: RenderContext): Promise<void> {
    try {
      // 重置加载状态
      context.resourcesLoaded = false;
      context.loadError = null;
      
      // 加载数据
      const { layout, schedule } = this.loadLayoutAndSchedule(context.scheduleId, context.layoutId);
      if (!layout || !schedule) {
        throw new Error(`无法加载布局或日程: scheduleId=${context.scheduleId}, layoutId=${context.layoutId}`);
      }
      
      // 保存布局和日程数据
      context.layout = layout;
      context.schedule = schedule;
      
      // 创建Promise数组，用于并行加载静态资源
      const staticLoadPromises: Promise<void>[] = [];
      
      // 获取planStore实例
      const planStore = usePlanStore();
      
      // 1. 加载背景图
      const backgroundUrl = layout.background || (planStore.currentPlan?.background || null);
      if (backgroundUrl) {
        const bgPromise = imagePreloader.preloadImage(backgroundUrl)
          .then(img => {
            context.backgroundImage = img;
            // 在离屏画布上绘制背景图
            if (context.backgroundCtx) {
              context.backgroundCtx.clearRect(0, 0, 1920, 1080);
              context.backgroundCtx.drawImage(img, 0, 0, 1920, 1080);
            }
          })
          .catch(error => {
            console.error(`[canvasRenderer.ts 画布渲染器] 加载背景图失败: ${backgroundUrl}`, error);
          });
        
        staticLoadPromises.push(bgPromise);
      }
      
      // 2. 加载前景图
      const foregroundUrl = layout.foreground;
      if (foregroundUrl) {
        const fgPromise = imagePreloader.preloadImage(foregroundUrl)
          .then(img => {
            context.foregroundImage = img;
            // 在离屏画布上绘制前景图
            if (context.foregroundCtx) {
              context.foregroundCtx.clearRect(0, 0, 1920, 1080);
              context.foregroundCtx.drawImage(img, 0, 0, 1920, 1080);
            }
          })
          .catch(error => {
            console.error(`[canvasRenderer.ts 画布渲染器] 加载前景图失败: ${foregroundUrl}`, error);
          });
        
        staticLoadPromises.push(fgPromise);
      }
      
      // 3. 加载文字图层
      const textLayerPromise = textLayerCacheManager.getTextLayerCache(context.scheduleId, context.layoutId)
        .then(canvas => {
          context.textLayerCanvas = canvas;
        })
        .catch(error => {
          console.error(`[canvasRenderer.ts 画布渲染器] 加载文字图层失败`, error);
        });
      
      staticLoadPromises.push(textLayerPromise);
      
      // 等待所有静态资源加载完成
      await Promise.all(staticLoadPromises);
      
      console.log(`[canvasRenderer.ts 画布渲染器] 静态资源加载完成: scheduleId=${context.scheduleId}, layoutId=${context.layoutId}`);
      
      // 第二阶段：加载视频流
      if (layout.elements) {
        // 获取所有媒体元素
        const mediaElements = layout.elements.filter(
          element => element.type === 'media'
        ) as MediaLayoutElement[];
        
        // 对媒体元素按zIndex排序
        mediaElements.sort((a, b) => {
          const zIndexA = a.zIndex !== undefined ? a.zIndex : 0;
          const zIndexB = b.zIndex !== undefined ? b.zIndex : 0;
          return zIndexA - zIndexB;
        });
        
        // 依次加载每个媒体元素的视频流（改为顺序加载，避免并行加载导致的竞争问题）
        for (const mediaElement of mediaElements) {
          if (mediaElement.sourceType && mediaElement.sourceId) {
            try {
              await this.loadVideoStream(context, mediaElement);
            } catch (error) {
              console.error(`[canvasRenderer.ts 画布渲染器] 加载视频流失败: sourceId=${mediaElement.sourceId}`, error);
              // 继续加载下一个视频，不中断整个过程
            }
          }
        }
      }
      
      // 标记资源加载完成
      context.resourcesLoaded = true;
      
      console.log(`[canvasRenderer.ts 画布渲染器] 所有资源加载完成: scheduleId=${context.scheduleId}, layoutId=${context.layoutId}`);
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 加载资源失败', error);
      context.loadError = error instanceof Error ? error.message : String(error);
      context.resourcesLoaded = false;
      throw error;
    }
  }
  
  /**
   * 加载视频流
   * @param context 渲染上下文
   * @param mediaElement 媒体布局元素
   * @returns 加载Promise
   */
  private async loadVideoStream(context: RenderContext, mediaElement: MediaLayoutElement): Promise<void> {
    try {
      const sourceId = mediaElement.sourceId!;
      const sourceType = mediaElement.sourceType!;
      
      console.log(`[canvasRenderer.ts 画布渲染器] 加载视频流: sourceId=${sourceId}, sourceType=${sourceType}`);
      
      // 检查是否已存在相同的视频元素
      // 如果相同的sourceId已经在列表中，我们需要为它创建一个唯一标识符
      const uniqueKey = `${sourceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 捕获媒体源
      const result = await mediaSourceManager.captureSource(sourceId);
      
      if (!result.success || !result.stream) {
        throw new Error(`捕获媒体源失败: ${result.error || '未知错误'}`);
      }
      
      // 创建视频元素
      const videoElement = document.createElement('video');
      
      // 设置视频属性，但不立即播放
      videoElement.autoplay = false; // 修改为false，不自动播放
      videoElement.muted = true;     // 默认静音
      videoElement.playsInline = true;
      videoElement.srcObject = result.stream; // 这里使用的是mediaSourceManager返回的克隆流
      
      // 添加视频加载错误处理
      videoElement.onerror = (event) => {
        console.error(`[canvasRenderer.ts 画布渲染器] 视频元素加载错误: ${sourceId}`, event);
      };
      
      // 等待视频元数据加载，以确保视频尺寸可用
      await new Promise<void>((resolve, reject) => {
        const onMetadataLoaded = () => {
          videoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
          
          // 检查视频尺寸是否有效
          if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            console.warn(`[canvasRenderer.ts 画布渲染器] 视频尺寸无效: ${sourceId}, width=${videoElement.videoWidth}, height=${videoElement.videoHeight}`);
          }
          
          resolve();
        };
        
        // 设置超时，避免无限等待
        const timeoutId = setTimeout(() => {
          videoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
          console.warn(`[canvasRenderer.ts 画布渲染器] 视频元数据加载超时: ${sourceId}`);
          resolve(); // 超时也继续，不要中断整个过程
        }, 5000); // 5秒超时
        
        videoElement.addEventListener('loadedmetadata', () => {
          clearTimeout(timeoutId);
          onMetadataLoaded();
        });
        
        // 如果视频已经加载了元数据，直接解析
        if (videoElement.readyState >= 1) {
          clearTimeout(timeoutId);
          onMetadataLoaded();
        }
      });
      
      // 输出视频尺寸信息
      console.log(`[canvasRenderer.ts 画布渲染器] 视频元数据已加载: ${sourceId}, 尺寸: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      
      // 存储到上下文中，使用唯一标识符作为键，但不立即播放
      context.videoElements.set(uniqueKey, {
        videoElement,
        layoutElement: mediaElement,
        isPlaying: false, // 添加播放状态标记
        sourceId  // 保存原始sourceId以便于释放资源
      });
      
      console.log(`[canvasRenderer.ts 画布渲染器] 视频流准备就绪: ${sourceId}, 唯一标识: ${uniqueKey}`);
    } catch (error) {
      console.error(`[canvasRenderer.ts 画布渲染器] 加载视频流失败: sourceId=${mediaElement.sourceId}`, error);
      throw error;
    }
  }
  
  /**
   * 播放所有加载好的视频
   * @param context 渲染上下文
   */
  private async playVideoElements(context: RenderContext): Promise<void> {
    // 检查是否有需要播放的视频
    let hasVideosToPlay = false;
    context.videoElements.forEach((item) => {
      if (!item.isPlaying) {
        hasVideosToPlay = true;
      }
    });
    
    // 如果没有需要播放的视频，直接返回
    if (!hasVideosToPlay) {
      return;
    }
    
    console.log(`[canvasRenderer.ts 画布渲染器] 开始播放 ${context.videoElements.size} 个视频元素`);
    
    const playPromises: Promise<void>[] = [];
    
    // 遍历所有视频元素并播放
    context.videoElements.forEach((item, uniqueKey) => {
      if (!item.isPlaying) {
        const videoElement = item.videoElement;
        const sourceId = item.sourceId;
        
        const playPromise = videoElement.play()
          .then(() => {
            item.isPlaying = true;
            console.log(`[canvasRenderer.ts 画布渲染器] 视频开始播放: ${sourceId}, 唯一标识: ${uniqueKey}`);
          })
          .catch((error) => {
            console.error(`[canvasRenderer.ts 画布渲染器] 播放视频失败: ${sourceId}, 唯一标识: ${uniqueKey}`, error);
          });
        
        playPromises.push(playPromise);
      }
    });
    
    await Promise.all(playPromises);
  }
  
  /**
   * 渲染画布内容
   * @param context 渲染上下文
   */
  private renderCanvas(context: RenderContext): void {
    // 如果上下文或上下文的画布为空，则返回
    if (!context || !context.ctx) return;
    
    // 如果资源未加载完成，显示加载中状态
    if (!context.resourcesLoaded) {
      this.renderLoadingState(context);
      return;
    }
    
    // 确保视频正在播放（只会尝试播放未播放的视频）
    if (context.videoElements.size > 0) {
      this.playVideoElements(context).catch(error => {
        console.error('[canvasRenderer.ts 画布渲染器] 播放视频时出错', error);
      });
    }
    
    // 帧计数器，用于限制调试信息输出频率
    context.frameCount = (context.frameCount || 0) + 1;
    
    // 只在首帧和每120帧输出一次调试信息（约2秒一次，假设60fps）
    const shouldOutputDebugInfo = context.frameCount === 1 || context.frameCount % 120 === 0;
    
    // 清空画布
    context.ctx.clearRect(0, 0, 1920, 1080);
    
    // 1. 绘制背景图层
    if (context.backgroundImage) {
      context.ctx.drawImage(context.backgroundCanvas, 0, 0, 1920, 1080);
    } else {
      // 如果没有背景图，绘制默认背景
      context.ctx.fillStyle = '#000000';
      context.ctx.fillRect(0, 0, 1920, 1080);
    }
    
    // 2. 绘制视频图层
    // 将视频元素转换为数组并按zIndex排序
    const sortedVideoElements: Array<{
      uniqueKey: string,
      sourceId: string,
      videoElement: HTMLVideoElement,
      layoutElement: MediaLayoutElement,
      isPlaying: boolean
    }> = [];
    
    context.videoElements.forEach((item, uniqueKey) => {
      sortedVideoElements.push({
        uniqueKey,
        sourceId: item.sourceId,
        videoElement: item.videoElement,
        layoutElement: item.layoutElement,
        isPlaying: item.isPlaying
      });
    });
    
    // 按zIndex从低到高排序
    sortedVideoElements.sort((a, b) => {
      const zIndexA = a.layoutElement.zIndex !== undefined ? a.layoutElement.zIndex : 0;
      const zIndexB = b.layoutElement.zIndex !== undefined ? b.layoutElement.zIndex : 0;
      return zIndexA - zIndexB;
    });
    
    // 记录视频渲染信息，用于调试
    const videoRenderInfo: Array<{
      uniqueKey: string,
      sourceId: string,
      zIndex: number,
      x: number,
      y: number,
      width: number,
      height: number,
      readyState: number,
      videoWidth: number,
      videoHeight: number,
      transparentBackground: boolean
    }> = [];
    
    // 渲染排序后的视频元素
    sortedVideoElements.forEach((item) => {
      const mediaElement = item.layoutElement;
      const videoElement = item.videoElement;
      const sourceId = item.sourceId;
      const uniqueKey = item.uniqueKey;
      
      // 记录视频信息用于调试
      if (shouldOutputDebugInfo) {
        videoRenderInfo.push({
          uniqueKey,
          sourceId,
          zIndex: mediaElement.zIndex !== undefined ? mediaElement.zIndex : 0,
          x: mediaElement.x,
          y: mediaElement.y,
          width: mediaElement.width,
          height: mediaElement.height,
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          transparentBackground: mediaElement.transparentBackground === true
        });
      }
      
      // 如果视频已准备好播放
      if (videoElement.readyState >= 2) {
        // 保存当前上下文状态
        context.ctx!.save();
        
        // 创建视频区域的剪裁路径，确保视频只在其区域内绘制
        context.ctx!.beginPath();
        context.ctx!.rect(mediaElement.x, mediaElement.y, mediaElement.width, mediaElement.height);
        context.ctx!.clip();
        
        // 如果需要透明背景，首先在视频区域绘制黑色背景
        if (mediaElement.transparentBackground !== true) {
          context.ctx!.fillStyle = '#000000';
          context.ctx!.fillRect(mediaElement.x, mediaElement.y, mediaElement.width, mediaElement.height);
        }
        
        // 计算视频绘制参数
        const drawParams = this.calculateVideoDimensions(videoElement, mediaElement);
        
        // 设置全局透明度为1，确保视频完全不透明
        context.ctx!.globalAlpha = 1.0;
        
        // 绘制视频
        context.ctx!.drawImage(
          videoElement,
          drawParams.sx, drawParams.sy, drawParams.sw, drawParams.sh,
          drawParams.dx, drawParams.dy, drawParams.dw, drawParams.dh
        );
        
        // 添加视频区域调试边框（仅在调试模式下显示）
        const debugMode = false; // 设置为true开启调试模式
        if (debugMode) {
          context.ctx!.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          context.ctx!.lineWidth = 2;
          context.ctx!.strokeRect(mediaElement.x, mediaElement.y, mediaElement.width, mediaElement.height);
          
          // 在视频区域绘制信息，便于调试
          context.ctx!.fillStyle = 'rgba(255, 255, 255, 0.8)';
          context.ctx!.font = '14px Arial';
          context.ctx!.fillText(`ID: ${sourceId}`, mediaElement.x + 5, mediaElement.y + 20);
          context.ctx!.fillText(`Z: ${mediaElement.zIndex || 0}`, mediaElement.x + 5, mediaElement.y + 40);
          context.ctx!.fillText(`Trans: ${mediaElement.transparentBackground ? 'T' : 'F'}`, mediaElement.x + 5, mediaElement.y + 60);
        }
        
        // 恢复上下文状态
        context.ctx!.restore();
      }
    });
    
    // 输出视频渲染信息到控制台，便于调试
    if (shouldOutputDebugInfo && videoRenderInfo.length > 0) {
      console.log(`[canvasRenderer.ts 画布渲染器] 视频渲染信息 (帧 ${context.frameCount}):`, JSON.stringify(videoRenderInfo));
    }
    
    // 3. 绘制文字图层
    if (context.textLayerCanvas) {
      context.ctx.drawImage(context.textLayerCanvas, 0, 0, 1920, 1080);
    }
    
    // 4. 绘制前景图层
    if (context.foregroundImage) {
      context.ctx.drawImage(context.foregroundCanvas, 0, 0, 1920, 1080);
    }
  }
  
  /**
   * 计算视频绘制尺寸和位置
   * @param videoElement 视频元素
   * @param mediaElement 媒体布局元素
   * @returns 视频绘制参数
   */
  private calculateVideoDimensions(videoElement: HTMLVideoElement, mediaElement: MediaLayoutElement): {
    sx: number; sy: number; sw: number; sh: number;  // 源视频裁剪参数
    dx: number; dy: number; dw: number; dh: number;  // 目标画布绘制参数
  } {
    // 视频源尺寸
    const videoWidth = videoElement.videoWidth || 1280; // 防止视频宽度为0
    const videoHeight = videoElement.videoHeight || 720; // 防止视频高度为0
    
    // 目标位置和尺寸
    const targetX = mediaElement.x || 0;
    const targetY = mediaElement.y || 0;
    const targetWidth = mediaElement.width || videoWidth;
    const targetHeight = mediaElement.height || videoHeight;
    
    // 默认绘制整个视频
    let sx = 0;
    let sy = 0;
    let sw = videoWidth;
    let sh = videoHeight;
    
    // 目标区域
    const dx = targetX;
    const dy = targetY;
    const dw = targetWidth;
    const dh = targetHeight;
    
    // 获取视频的拉伸方式
    const scaleMode = mediaElement.scaleMode || 'fit';
    
    // 计算纵横比
    const srcRatio = videoWidth / videoHeight;
    const destRatio = targetWidth / targetHeight;
    
    // 基于缩放模式处理视频渲染参数
    let result: {sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number};
    
    switch (scaleMode) {
      case 'fill':
        // 填充模式：保持比例填满整个区域，可能裁剪部分内容
        if (srcRatio > destRatio) {
          // 视频宽高比大于目标区域，需要裁剪两侧
          sw = Math.floor(videoHeight * destRatio);
          sx = Math.floor((videoWidth - sw) / 2);
        } else {
          // 视频宽高比小于目标区域，需要裁剪上下
          sh = Math.floor(videoWidth / destRatio);
          sy = Math.floor((videoHeight - sh) / 2);
        }
        result = {sx, sy, sw, sh, dx, dy, dw, dh};
        break;
        
      case 'fit':
        // 适应模式：保持比例填充区域，不裁剪，可能有黑边
        if (srcRatio > destRatio) {
          // 视频宽高比大于目标区域，上下有黑边
          const newHeight = Math.floor(targetWidth / srcRatio);
          const offsetY = Math.floor((targetHeight - newHeight) / 2);
          result = {
            sx: 0, sy: 0, sw: videoWidth, sh: videoHeight,
            dx: targetX, dy: targetY + offsetY, dw: targetWidth, dh: newHeight
          };
        } else {
          // 视频宽高比小于目标区域，左右有黑边
          const newWidth = Math.floor(targetHeight * srcRatio);
          const offsetX = Math.floor((targetWidth - newWidth) / 2);
          result = {
            sx: 0, sy: 0, sw: videoWidth, sh: videoHeight,
            dx: targetX + offsetX, dy: targetY, dw: newWidth, dh: targetHeight
          };
        }
        break;
        
      case 'stretch':
        // 拉伸模式：强制拉伸填满整个区域，不保持比例
        result = {sx: 0, sy: 0, sw: videoWidth, sh: videoHeight, dx, dy, dw, dh};
        break;
        
      case 'center':
        // 居中模式：原始尺寸居中显示，不缩放
        if (videoWidth < targetWidth && videoHeight < targetHeight) {
          // 视频小于目标区域，居中显示
          const offsetX = Math.floor((targetWidth - videoWidth) / 2);
          const offsetY = Math.floor((targetHeight - videoHeight) / 2);
          result = {
            sx: 0, sy: 0, sw: videoWidth, sh: videoHeight,
            dx: targetX + offsetX, dy: targetY + offsetY, dw: videoWidth, dh: videoHeight
          };
        } else {
          // 视频大于目标区域，使用原始尺寸，可能会裁剪
          result = {sx: 0, sy: 0, sw: videoWidth, sh: videoHeight, dx, dy, dw, dh};
        }
        break;
        
      default:
        // 默认使用适应模式
        result = {sx, sy, sw, sh, dx, dy, dw, dh};
    }
    
    return result;
  }
  
  /**
   * 渲染加载中状态
   * @param context 渲染上下文
   */
  private renderLoadingState(context: RenderContext): void {
    if (!context.ctx) return;
    
    // 清空画布
    context.ctx.clearRect(0, 0, 1920, 1080);
    
    // 绘制纯黑色背景
    context.ctx.fillStyle = '#000000';
    context.ctx.fillRect(0, 0, 1920, 1080);
    
    // 不再显示加载提示文本
  }
  
  /**
   * 清理未使用的媒体源
   */
  private cleanupUnusedMediaSources(): void {
    try {
      // 跳过未初始化的情况 - 检查当前上下文中的视频元素
      const hasPreviewVideos = this.previewContext && this.previewContext.videoElements && this.previewContext.videoElements.size > 0;
      const hasLiveVideos = this.liveContext && this.liveContext.videoElements && this.liveContext.videoElements.size > 0;
      
      if (!hasPreviewVideos && !hasLiveVideos) {
        console.log('[canvasRenderer.ts] 没有活跃的视频元素，跳过清理媒体源');
        return;
      }

      // 尝试获取媒体源管理器，如果它不可用或未初始化则跳过清理
      try {
        // 简单检查媒体源管理器可用性
        if (!mediaSourceManager) {
          console.log('[canvasRenderer.ts] 媒体源管理器不可用，跳过清理');
          return;
        }
      } catch (e) {
        console.log('[canvasRenderer.ts] 获取媒体源管理器时出错，跳过清理:', e);
        return;
      }

      console.log('[canvasRenderer.ts] 开始清理未使用的媒体源');
      
      // 收集当前处于活跃状态的媒体源ID（从预览和直播上下文中）
      const activeSourceIds = new Set<string>();
      
      // 收集预览上下文中的媒体源
      if (this.previewContext && this.previewContext.videoElements) {
        this.previewContext.videoElements.forEach((item) => {
          if (item && item.sourceId) {
            activeSourceIds.add(item.sourceId);
          }
        });
      }
      
      // 收集直播上下文中的媒体源
      if (this.liveContext && this.liveContext.videoElements) {
        this.liveContext.videoElements.forEach((item) => {
          if (item && item.sourceId) {
            activeSourceIds.add(item.sourceId);
          }
        });
      }
      
      console.log(`[canvasRenderer.ts] 当前活跃媒体源: ${Array.from(activeSourceIds).join(', ') || '无'}`);
      console.log('[canvasRenderer.ts] 完成清理未使用的媒体源');
    } catch (error) {
      console.error('[canvasRenderer.ts] 清理未使用的媒体源时出错:', error);
    }
  }
  
  /**
   * 开始渲染循环
   * @param context 渲染上下文
   */
  private startRenderLoop(context: RenderContext): void {
    // 如果已有渲染循环，先取消
    if (context.animationFrameId !== null) {
      cancelAnimationFrame(context.animationFrameId);
      context.animationFrameId = null;
    }
    
    // 标志是否是首帧
    let isFirstFrame = true;
    
    // 渲染函数
    const render = () => {
      this.renderCanvas(context);
      context.animationFrameId = requestAnimationFrame(render);
      
      // 首帧渲染完成后，清理不再使用的媒体源
      if (isFirstFrame) {
        isFirstFrame = false;
        // 延迟清理，确保视频已开始渲染
        setTimeout(() => {
          this.cleanupUnusedMediaSources();
        }, 1000); // 延迟1秒，确保资源已加载并渲染
      }
    };
    
    // 开始渲染
    context.animationFrameId = requestAnimationFrame(render);
  }
  
  /**
   * 渲染预览画布
   * @param canvas 预览画布元素
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   */
  public async renderPreviewCanvas(canvas: HTMLCanvasElement, scheduleId: string, layoutId: number): Promise<void> {
    // 清理现有上下文
    if (this.previewContext) {
      this.previewContext.dispose();
    }
    
    // 创建新的渲染上下文
    this.previewContext = new RenderContext(canvas, scheduleId, layoutId);
    
    try {
      // 加载资源
      await this.loadResources(this.previewContext);
      
      // 开始渲染循环
      this.startRenderLoop(this.previewContext);
    } catch (error) {
      console.error(`[canvasRenderer.ts 画布渲染器] 渲染预览画布失败: scheduleId=${scheduleId}, layoutId=${layoutId}`, error);
      // 显示错误状态
      this.renderLoadingState(this.previewContext);
    }
  }
  
  /**
   * 渲染直播画布
   * @param canvas 直播画布元素
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   */
  public async renderLiveCanvas(canvas: HTMLCanvasElement, scheduleId: string, layoutId: number): Promise<void> {
    // 清理现有上下文
    if (this.liveContext) {
      this.liveContext.dispose();
    }
    
    // 创建新的渲染上下文
    this.liveContext = new RenderContext(canvas, scheduleId, layoutId);
    
    try {
      // 加载资源
      await this.loadResources(this.liveContext);
      
      // 开始渲染循环
      this.startRenderLoop(this.liveContext);
    } catch (error) {
      console.error(`[canvasRenderer.ts 画布渲染器] 渲染直播画布失败: scheduleId=${scheduleId}, layoutId=${layoutId}`, error);
      // 显示错误状态
      this.renderLoadingState(this.liveContext);
    }
  }
  
  /**
   * 刷新预览画布（重新加载资源）
   */
  public async refreshPreviewCanvas(): Promise<void> {
    if (!this.previewContext) {
      console.warn('[canvasRenderer.ts 画布渲染器] 无法刷新预览画布：上下文不存在');
      return;
    }
    
    // 重新加载资源
    try {
      await this.loadResources(this.previewContext);
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 刷新预览画布失败', error);
    }
  }
  
  /**
   * 刷新直播画布（重新加载资源）
   */
  public async refreshLiveCanvas(): Promise<void> {
    if (!this.liveContext) {
      console.warn('[canvasRenderer.ts 画布渲染器] 无法刷新直播画布：上下文不存在');
      return;
    }
    
    // 重新加载资源
    try {
      await this.loadResources(this.liveContext);
    } catch (error) {
      console.error('[canvasRenderer.ts 画布渲染器] 刷新直播画布失败', error);
    }
  }
  
  /**
   * 停止预览画布渲染
   */
  public stopPreviewRender(): void {
    if (this.previewContext) {
      this.previewContext.dispose();
      this.previewContext = null;
    }
  }
  
  /**
   * 停止直播画布渲染
   */
  public stopLiveRender(): void {
    if (this.liveContext) {
      this.liveContext.dispose();
      this.liveContext = null;
    }
  }
}

// 创建单例实例
const canvasRenderer = new CanvasRenderer();

export default canvasRenderer; 