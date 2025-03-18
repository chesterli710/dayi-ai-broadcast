/**
 * 文字图层渲染器
 * 用于高性能绘制文字图层并提供缓存支持
 * 文字图层使用透明背景绘制，渲染一次后缓存
 * 仅在信息发生变化时重新渲染
 */
import type { Layout, TextLayoutElement, Schedule } from '../types/broadcast';
import { LayoutElementType, ScheduleType } from '../types/broadcast';
import { usePlanStore } from '../stores/planStore';

/**
 * 文字缓存的键值对定义
 */
interface TextCacheKey {
  layoutId: number;
  scheduleId: string | number;  // 日程ID可能是字符串或数字
  textElementIds: string;  // 文本元素ID列表的哈希值
  timestamp: number;       // 用于判断缓存是否过期
}

/**
 * 文字图层渲染类
 * 负责将文字绘制到透明的离屏画布上并缓存结果
 */
export class TextLayerRenderer {
  // 标准渲染尺寸
  private standardWidth: number = 1920;
  private standardHeight: number = 1080;
  
  // 当前渲染尺寸
  private width: number = 1920;
  private height: number = 1080;
  
  // 文字图层离屏画布
  private textCanvas: OffscreenCanvas | null = null;
  private textCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  // 后备画布(如果浏览器不支持OffscreenCanvas)
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackCtx: CanvasRenderingContext2D | null = null;
  
  // 缓存的文字图层ImageBitmap数据
  private cachedTextLayer: ImageBitmap | null = null;
  
  // 缓存键值(用于判断是否需要重新渲染)
  private cacheKey: TextCacheKey | null = null;
  
  // 计划存储
  private planStore = usePlanStore();
  
  // 渲染器类型（预览或直播）
  private rendererType: 'preview' | 'live' = 'preview';
  
  /**
   * 构造函数
   * @param type 渲染器类型
   * @param width 初始宽度
   * @param height 初始高度
   */
  constructor(type: 'preview' | 'live' = 'preview', width: number = 1920, height: number = 1080) {
    this.rendererType = type;
    this.width = width;
    this.height = height;
    
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 初始化渲染器`, {
      width: this.width,
      height: this.height,
      type: this.rendererType
    });
    
    this.initCanvas();
  }
  
  /**
   * 初始化离屏画布
   */
  private initCanvas(): void {
    try {
      // 创建离屏画布
      this.textCanvas = new OffscreenCanvas(this.width, this.height);
      this.textCtx = this.textCanvas.getContext('2d', { alpha: true });
      
      if (!this.textCtx) {
        throw new Error('无法获取离屏画布2D渲染上下文');
      }
      
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 离屏画布初始化完成`);
    } catch (error) {
      console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 初始化离屏画布时出错:`, error);
      
      // 如果不支持OffscreenCanvas，创建后备画布
      try {
        this.fallbackCanvas = document.createElement('canvas');
        this.fallbackCanvas.width = this.width;
        this.fallbackCanvas.height = this.height;
        this.fallbackCtx = this.fallbackCanvas.getContext('2d', { alpha: true });
        
        if (!this.fallbackCtx) {
          throw new Error('无法获取后备画布2D渲染上下文');
        }
        
        console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 后备画布初始化完成`);
      } catch (fallbackError) {
        console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 初始化后备画布时出错:`, fallbackError);
      }
    }
  }
  
  /**
   * 获取活动上下文
   * @returns 可用的渲染上下文
   */
  private getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
    return this.textCtx || this.fallbackCtx;
  }
  
  /**
   * 获取活动画布
   * @returns 可用的画布
   */
  private getCanvas(): OffscreenCanvas | HTMLCanvasElement | null {
    return this.textCanvas || this.fallbackCanvas;
  }
  
  /**
   * 清除画布
   */
  private clearCanvas(): void {
    const ctx = this.getContext();
    if (ctx) {
      ctx.clearRect(0, 0, this.width, this.height);
    }
  }
  
  /**
   * 生成缓存键
   * @param layout 当前布局
   * @returns 缓存键
   */
  private generateCacheKey(layout: Layout): TextCacheKey | null {
    if (!layout || !layout.elements) {
      return null;
    }
    
    // 获取当前日程
    const schedule = this.planStore.previewingSchedule || this.planStore.liveSchedule;
    if (!schedule) {
      return null;
    }
    
    // 获取所有文本元素
    const textElements = layout.elements.filter(element => 
      element.type === LayoutElementType.HOST_LABEL ||
      element.type === LayoutElementType.HOST_INFO ||
      element.type === LayoutElementType.SUBJECT_LABEL ||
      element.type === LayoutElementType.SUBJECT_INFO ||
      element.type === LayoutElementType.GUEST_LABEL ||
      element.type === LayoutElementType.GUEST_INFO
    ) as TextLayoutElement[];
    
    if (textElements.length === 0) {
      return null;
    }
    
    // 生成文本元素ID列表
    const textElementIds = textElements.map(el => `${el.id}-${el.type}`).join('|');
    
    return {
      layoutId: layout.id,
      scheduleId: schedule.id,
      textElementIds: textElementIds,
      timestamp: Date.now()
    };
  }
  
  /**
   * 比较缓存键是否相同
   * @param key1 缓存键1
   * @param key2 缓存键2
   * @returns 是否相同
   */
  private isSameCacheKey(key1: TextCacheKey | null, key2: TextCacheKey | null): boolean {
    if (!key1 || !key2) {
      return false;
    }
    
    return (
      key1.layoutId === key2.layoutId &&
      key1.scheduleId === key2.scheduleId &&
      key1.textElementIds === key2.textElementIds
    );
  }
  
  /**
   * 渲染文字图层并缓存
   * @param layout 布局数据
   * @returns 渲染后的文字图层ImageBitmap
   */
  public async renderTextLayer(layout: Layout): Promise<ImageBitmap | null> {
    // 生成新的缓存键
    const newCacheKey = this.generateCacheKey(layout);
    
    // 如果没有文本元素，返回null
    if (!newCacheKey) {
      return null;
    }
    
    // 检查缓存是否有效
    if (this.cachedTextLayer && this.cacheKey && this.isSameCacheKey(this.cacheKey, newCacheKey)) {
      // 缓存有效，直接返回缓存的图层
      return this.cachedTextLayer;
    }
    
    // 获取上下文和画布
    const ctx = this.getContext();
    const canvas = this.getCanvas();
    
    if (!ctx || !canvas) {
      console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 渲染文字图层失败: 上下文或画布不存在`);
      return null;
    }
    
    // 清除画布
    ctx.clearRect(0, 0, this.width, this.height);
    
    // 确保layout.elements存在
    if (!layout.elements) {
      return null;
    }
    
    // 获取所有文本元素并按zIndex排序
    const textElements = layout.elements
      .filter(element => 
        element.type === LayoutElementType.HOST_LABEL ||
        element.type === LayoutElementType.HOST_INFO ||
        element.type === LayoutElementType.SUBJECT_LABEL ||
        element.type === LayoutElementType.SUBJECT_INFO ||
        element.type === LayoutElementType.GUEST_LABEL ||
        element.type === LayoutElementType.GUEST_INFO
      ) as TextLayoutElement[];
    
    if (textElements.length === 0) {
      return null;
    }
    
    // 按zIndex排序（从小到大）
    textElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    // 渲染每个文本元素
    for (const element of textElements) {
      this.renderTextElement(element, ctx);
    }
    
    try {
      // 将渲染结果转换为ImageBitmap
      if (this.textCanvas) {
        this.cachedTextLayer = await createImageBitmap(this.textCanvas);
      } else if (this.fallbackCanvas) {
        this.cachedTextLayer = await createImageBitmap(this.fallbackCanvas);
      } else {
        throw new Error('没有可用的画布');
      }
      
      // 更新缓存键
      this.cacheKey = newCacheKey;
      
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 文字图层已渲染并缓存`);
      
      return this.cachedTextLayer;
    } catch (error) {
      console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 创建ImageBitmap时出错:`, error);
      return null;
    }
  }
  
  /**
   * 渲染文本元素
   * @param element 文本元素
   * @param ctx 渲染上下文
   */
  private renderTextElement(element: TextLayoutElement, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    // 根据元素类型获取文本内容
    const text = this.getTextContent(element);
    
    // 计算当前画布与标准尺寸的比例
    const scaleX = this.width / this.standardWidth;
    const scaleY = this.height / this.standardHeight;
    
    // 应用缩放比例计算实际绘制位置和尺寸
    const x = element.x * scaleX;
    const y = element.y * scaleY;
    const width = element.width * scaleX;
    const height = element.height * scaleY;
    
    // 设置字体样式，字体大小也需要缩放
    const fontSize = element.fontStyle.fontSize * scaleY;
    ctx.font = `${element.fontStyle.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px Arial`;
    ctx.fillStyle = element.fontStyle.fontColor || '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // 绘制文本
    if (element.orientation === 'vertical') {
      this.drawVerticalText(text, { ...element, x, y, width, height }, ctx, fontSize);
    } else {
      // 考虑文本过长时的处理
      this.drawHorizontalText(text, { ...element, x, y, width, height }, ctx, fontSize);
    }
  }
  
  /**
   * 绘制水平文本
   * 处理文本过长时的截断或换行
   * @param text 文本内容
   * @param element 文本元素（已缩放）
   * @param ctx 渲染上下文
   * @param fontSize 缩放后的字体大小
   */
  private drawHorizontalText(
    text: string, 
    element: { x: number, y: number, width: number, height: number }, 
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    fontSize: number
  ): void {
    // 检查文本宽度是否超过元素宽度
    const textWidth = ctx.measureText(text).width;
    
    if (textWidth <= element.width) {
      // 文本宽度在元素宽度范围内，直接绘制
      ctx.fillText(text, element.x, element.y, element.width);
    } else {
      // 文本宽度超过元素宽度，需要处理截断或换行
      
      // 计算行高
      const lineHeight = fontSize * 1.2;
      
      // 将文本分割成单词或字符
      // 对于中文，按字符分割更合适
      const chars = text.split('');
      
      let line = '';
      let y = element.y;
      
      // 逐个添加字符并检查是否需要换行
      for (let i = 0; i < chars.length; i++) {
        const testLine = line + chars[i];
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth > element.width && i > 0) {
          // 需要换行
          ctx.fillText(line, element.x, y, element.width);
          line = chars[i];
          y += lineHeight;
          
          // 检查是否超出元素高度
          if (y + lineHeight > element.y + element.height) {
            break;
          }
        } else {
          line = testLine;
        }
      }
      
      // 绘制最后一行
      if (line && y < element.y + element.height) {
        ctx.fillText(line, element.x, y, element.width);
      }
    }
  }
  
  /**
   * 绘制垂直文本
   * @param text 文本内容
   * @param element 文本元素（已缩放）
   * @param ctx 渲染上下文
   * @param fontSize 缩放后的字体大小
   */
  private drawVerticalText(
    text: string, 
    element: { x: number, y: number, width: number, height: number }, 
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    fontSize: number
  ): void {
    const chars = text.split('');
    const lineHeight = fontSize * 1.2;
    let y = element.y;
    
    for (const char of chars) {
      ctx.fillText(char, element.x, y);
      y += lineHeight;
      
      // 如果超出元素高度，则停止绘制
      if (y > element.y + element.height) {
        break;
      }
    }
  }
  
  /**
   * 获取文本内容
   * @param element 文本元素
   * @returns 文本内容
   */
  private getTextContent(element: TextLayoutElement): string {
    // 获取当前日程
    const schedule = this.planStore.previewingSchedule || this.planStore.liveSchedule;
    if (!schedule) {
      return '测试文本';
    }
    
    // 根据元素类型返回相应的文本内容
    switch (element.type) {
      case LayoutElementType.HOST_LABEL:
        return '主持人';
      case LayoutElementType.HOST_INFO:
        return this.getHostName(schedule) || '测试主持人';
      case LayoutElementType.SUBJECT_LABEL:
        return '主题';
      case LayoutElementType.SUBJECT_INFO:
        return this.getSubjectTitle(schedule) || '测试主题';
      case LayoutElementType.GUEST_LABEL:
        return '嘉宾';
      case LayoutElementType.GUEST_INFO:
        return this.getGuestNames(schedule) || '测试嘉宾';
      default:
        return '测试文本';
    }
  }
  
  /**
   * 获取主持人名称
   * @param schedule 日程
   * @returns 主持人名称
   */
  private getHostName(schedule: Schedule): string {
    if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo) {
      return schedule.surgeryInfo.surgeons.map(surgeon => surgeon.name).join(', ');
    } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
      return schedule.lectureInfo.speakers.map(speaker => speaker.name).join(', ');
    }
    return '';
  }
  
  /**
   * 获取主题标题
   * @param schedule 日程
   * @returns 主题标题
   */
  private getSubjectTitle(schedule: Schedule): string {
    if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo) {
      return schedule.surgeryInfo.procedure;
    } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
      return schedule.lectureInfo.topic;
    }
    return '';
  }
  
  /**
   * 获取嘉宾名称
   * @param schedule 日程
   * @returns 嘉宾名称
   */
  private getGuestNames(schedule: Schedule): string {
    if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo && schedule.surgeryInfo.guests) {
      return schedule.surgeryInfo.guests.map(guest => guest.name).join(', ');
    } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo && schedule.lectureInfo.guests) {
      return schedule.lectureInfo.guests.map(guest => guest.name).join(', ');
    }
    return '';
  }
  
  /**
   * 调整画布大小
   * @param width 宽度
   * @param height 高度
   */
  public resize(width: number, height: number): void {
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 调整画布大小:`, width, height);
    
    // 如果尺寸没有变化，则不执行任何操作
    if (this.width === width && this.height === height) {
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 画布尺寸未变化，跳过调整`);
      return;
    }
    
    // 更新渲染尺寸
    this.width = width;
    this.height = height;
    
    try {
      // 重新创建离屏画布
      if (this.textCanvas) {
        this.textCanvas = new OffscreenCanvas(width, height);
        this.textCtx = this.textCanvas.getContext('2d', { alpha: true });
      }
      
      // 调整后备画布尺寸
      if (this.fallbackCanvas) {
        this.fallbackCanvas.width = width;
        this.fallbackCanvas.height = height;
        this.fallbackCtx = this.fallbackCanvas.getContext('2d', { alpha: true });
      }
      
      // 清除缓存
      this.invalidateCache();
      
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 画布尺寸调整完成`);
    } catch (error) {
      console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 调整画布尺寸时出错:`, error);
    }
  }
  
  /**
   * 使缓存失效
   * 当需要强制重新渲染时调用
   */
  public invalidateCache(): void {
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 清除文字图层缓存`);
    
    // 释放ImageBitmap资源
    if (this.cachedTextLayer) {
      this.cachedTextLayer.close();
      this.cachedTextLayer = null;
    }
    
    // 重置缓存键
    this.cacheKey = null;
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 销毁渲染器`);
    
    // 清除缓存
    this.invalidateCache();
    
    // 移除引用
    this.textCanvas = null;
    this.textCtx = null;
    this.fallbackCanvas = null;
    this.fallbackCtx = null;
  }
  
  /**
   * 布局或日程变更通知
   * 当布局或日程变更时调用此方法，强制重新渲染文字图层
   */
  public onLayoutOrScheduleChanged(): void {
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 布局或日程已变更，强制重新渲染`);
    
    // 清除缓存
    this.invalidateCache();
  }
}

/**
 * 创建预览文字图层渲染器
 * @param width 宽度
 * @param height 高度
 * @returns 文字图层渲染器实例
 */
export function createPreviewTextLayerRenderer(width: number = 1920, height: number = 1080): TextLayerRenderer {
  return new TextLayerRenderer('preview', width, height);
}

/**
 * 创建直播文字图层渲染器
 * @param width 宽度
 * @param height 高度
 * @returns 文字图层渲染器实例
 */
export function createLiveTextLayerRenderer(width: number = 1920, height: number = 1080): TextLayerRenderer {
  return new TextLayerRenderer('live', width, height);
} 