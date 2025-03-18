/**
 * 文字图层渲染器
 * 用于高性能绘制文字图层并提供缓存支持
 * 文字图层使用透明背景绘制，渲染一次后缓存
 * 仅在信息发生变化时重新渲染
 */
import type { Layout, TextLayoutElement, Schedule } from '../types/broadcast';
import { LayoutElementType, ScheduleType } from '../types/broadcast';
import { usePlanStore } from '../stores/planStore';
import { getFontFamily, isFontReady, FontLoadStatus } from './fontLoader';
import { getCachedImage, preloadImage } from './imagePreloader';

/**
 * 文字缓存的键值对定义
 */
interface TextCacheKey {
  layoutId: number;
  scheduleId: string | number;  // 日程ID可能是字符串或数字
  textElementIds: string;  // 文本元素ID列表的哈希值
  timestamp: number;       // 用于判断缓存是否过期
  labelBackground: string; // 标签背景图URL
}

/**
 * 文本行接口，定义一行文本的基本属性和渲染方法
 */
interface TextLine {
  text: string;          // 行文本内容
  fontSize: number;      // 字体大小
  fontWeight: string;    // 字体粗细
  fontColor: string;     // 字体颜色
  lineHeight: number;    // 行高
}

/**
 * 人员信息接口，用于统一处理术者/讲者信息
 */
interface PersonInfo {
  name: string;          // 姓名
  title?: string;        // 职称
  organization: string;  // 组织/单位
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
  
  // 字体名称
  private fontFamily: string = 'Source Han Sans CN';
  
  // 字体加载重试次数
  private fontLoadRetries: number = 0;
  private maxFontLoadRetries: number = 5;
  
  // 图片缓存
  private imageCache: Map<string, HTMLImageElement> = new Map();
  
  // 当前布局和日程
  private currentLayout: Layout | null = null;
  
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
   * 加载图片
   * @param url 图片URL
   * @returns 图片加载Promise
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    // 如果URL为空，返回拒绝的Promise
    if (!url) {
      console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 尝试加载空URL`);
      return Promise.reject(new Error('图片URL为空'));
    }
    
    // 首先尝试从全局缓存中获取图片
    const cachedImage = getCachedImage(url);
    if (cachedImage) {
      // 将图片添加到本地缓存
      this.imageCache.set(url, cachedImage);
      return Promise.resolve(cachedImage);
    }
    
    // 如果图片已经在本地缓存中，直接返回
    if (this.imageCache.has(url)) {
      return Promise.resolve(this.imageCache.get(url)!);
    }
    
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 开始加载图片:`, url);
    
    // 使用imagePreloader加载图片
    return preloadImage(url)
      .then(img => {
        // 将加载的图片添加到本地缓存
        this.imageCache.set(url, img);
        return img;
      });
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
    const textElementIds = textElements.map(el => {
      // 为每个元素创建一个唯一标识，包含ID、类型和样式信息
      return `${el.id}-${el.type}-${el.fontStyle.fontSize}-${el.fontStyle.fontWeight}-${el.fontStyle.fontColor}-${el.orientation || 'horizontal'}`;
    }).join('|');
    
    // 将labelBackground也添加到缓存键中，这样当背景图变化时也会重新渲染
    return {
      layoutId: layout.id,
      scheduleId: schedule.id,
      textElementIds: textElementIds,
      timestamp: Date.now(),
      labelBackground: layout.labelBackground || ''
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
      key1.textElementIds === key2.textElementIds &&
      key1.labelBackground === key2.labelBackground
    );
  }
  
  /**
   * 获取字体粗细对应的CSS值
   * @param fontWeight 字体粗细枚举值
   * @returns CSS字体粗细值
   */
  private getFontWeight(fontWeight: "regular" | "medium" | "bold"): string {
    switch (fontWeight) {
      case "bold":
        return "700";
      case "medium":
        return "500";
      case "regular":
      default:
        return "400";
    }
  }

  /**
   * 降级字体粗细
   * @param fontWeight 字体粗细
   * @returns 降级后的字体粗细
   */
  private reduceWeight(fontWeight: string): string {
    // 根据当前字重降级
    switch (fontWeight) {
      case '700': // bold
        return '500'; // medium
      case '500': // medium
        return '400'; // regular
      case '400': // regular
      default:
        return '400'; // 最低为regular
    }
  }

  /**
   * 格式化人员姓名和称谓
   * @param person 人员信息
   * @param nameFontSize 姓名字号
   * @param nameFontWeight 姓名字重
   * @param fontColor 字体颜色
   * @param titleFontSize 称谓字号
   * @param titleFontWeight 称谓字重
   * @returns 格式化后的文本
   */
  private formatPersonNameAndTitle(
    person: PersonInfo,
    nameFontSize: number,
    nameFontWeight: string,
    fontColor: string,
    titleFontSize: number,
    titleFontWeight: string
  ): string {
    // 格式化中文姓名（如果是两个字，中间添加全角空格）
    const formattedName = this.formatChineseName(person.name);
    
    // 如果有称谓，添加称谓
    if (person.title) {
      return `${formattedName} ${person.title}`;
    }
    
    return formattedName;
  }
  
  /**
   * 格式化中文姓名，如果是两个字，中间添加全角空格
   * @param name 姓名
   * @returns 格式化后的姓名
   */
  private formatChineseName(name: string): string {
    // 检查是否是两个中文字符
    if (name.length === 2 && /^[\u4e00-\u9fa5]{2}$/.test(name)) {
      // 两个中文字符之间添加全角空格
      return `${name[0]}　${name[1]}`;
    }
    return name;
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
        return schedule.type === ScheduleType.SURGERY 
          ? (this.planStore.currentPlan?.surgeonLabelDisplayName || '术者')
          : (this.planStore.currentPlan?.speakerLabelDisplayName || '讲者');
      case LayoutElementType.HOST_INFO:
        return this.getHostName(schedule) || '测试主持人';
      case LayoutElementType.SUBJECT_LABEL:
        return schedule.type === ScheduleType.SURGERY 
          ? (this.planStore.currentPlan?.surgeryLabelDisplayName || '术式')
          : (this.planStore.currentPlan?.subjectLabelDisplayName || '主题');
      case LayoutElementType.SUBJECT_INFO:
        return this.getSubjectTitle(schedule) || '测试主题';
      case LayoutElementType.GUEST_LABEL:
        return this.planStore.currentPlan?.guestLabelDisplayName || '嘉宾';
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
      return schedule.surgeryInfo.surgeons.map(surgeon => 
        surgeon.title ? `${surgeon.name} ${surgeon.title}` : surgeon.name
      ).join('\n');
    } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
      return schedule.lectureInfo.speakers.map(speaker => 
        speaker.title ? `${speaker.name} ${speaker.title}` : speaker.name
      ).join('\n');
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
      return schedule.surgeryInfo.guests.map(guest => 
        guest.title ? `${guest.name} ${guest.title}` : guest.name
      ).join('\n');
    } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo && schedule.lectureInfo.guests) {
      return schedule.lectureInfo.guests.map(guest => 
        guest.title ? `${guest.name} ${guest.title}` : guest.name
      ).join('\n');
    }
    return '';
  }

  /**
   * 绘制居中图片
   * @param ctx 渲染上下文
   * @param image 图片对象
   * @param x X坐标
   * @param y Y坐标
   * @param width 目标宽度
   * @param height 目标高度
   */
  private drawImageCentered(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;
    
    // 计算等比例缩放后的尺寸
    let drawWidth = width;
    let drawHeight = (imgHeight / imgWidth) * width;
    
    // 如果缩放后高度超出，则按高度等比例缩放
    if (drawHeight > height) {
      drawHeight = height;
      drawWidth = (imgWidth / imgHeight) * height;
    }
    
    // 计算居中绘制的坐标
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    
    // 绘制图片
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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
    
    // 以下是缓存无效的情况，需要重新渲染
    
    // 如果字体尚未加载完成，等待字体加载
    if (!isFontReady(this.fontFamily)) {
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 等待思源黑体字体加载完成...`);
      
      // 等待最多3秒
      for (let i = 0; i < 30 && !isFontReady(this.fontFamily); i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!isFontReady(this.fontFamily)) {
        this.fontLoadRetries++;
        console.warn(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 字体加载超时，尝试使用系统字体渲染 (重试 ${this.fontLoadRetries}/${this.maxFontLoadRetries})`);
        
        // 如果多次加载失败且超过最大重试次数，使用系统字体
        if (this.fontLoadRetries >= this.maxFontLoadRetries) {
          console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 字体加载多次失败，切换到系统字体`);
          this.fontFamily = 'system-ui';
        }
      } else {
        console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 字体加载状态: 已就绪`);
      }
    }
    
    // 预加载标签背景图（仅记录日志一次，避免频繁输出）
    if (layout.labelBackground && (!this.imageCache.has(layout.labelBackground) && !getCachedImage(layout.labelBackground))) {
      try {
        await this.loadImage(layout.labelBackground);
        // 仅在第一次加载成功时输出日志
        console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 标签背景图已加载: ${layout.labelBackground}`);
      } catch (error) {
        console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 标签背景图加载失败: ${layout.labelBackground}`, error);
      }
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
      await this.renderTextElement(element, ctx, layout);
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
      
      // 避免频繁输出日志
      if (!this.cacheKey) {
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 文字图层已渲染并缓存`);
      }
      
      return this.cachedTextLayer;
    } catch (error) {
      console.error(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 创建ImageBitmap时出错:`, error);
      return null;
    }
  }
  
  /**
   * 渲染单个文本元素
   * @param element 文本布局元素
   * @param ctx 绘图上下文
   * @param layout 全局布局
   */
  private async renderTextElement(
    element: TextLayoutElement,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    layout: Layout
  ): Promise<void> {
    // 计算当前画布与标准尺寸的比例
    const scaleX = this.width / this.standardWidth;
    const scaleY = this.height / this.standardHeight;
    
    // 应用缩放比例计算实际绘制位置和尺寸
    const x = element.x * scaleX;
    const y = element.y * scaleY;
    const width = element.width * scaleX;
    const height = element.height * scaleY;
    
    // 确保元素的值存在
    if (!element) {
      return;
    }

    // 获取文本元素的基本属性
    const fontSize = element.fontStyle.fontSize * scaleY;
    const fontWeight = this.getFontWeight(element.fontStyle.fontWeight);
    const fontColor = element.fontStyle.fontColor || '#ffffff';
    
    // 设置默认字体样式
    ctx.font = `${fontWeight} ${fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = fontColor;
    ctx.textBaseline = 'middle';

    // 渲染不同类型的文本元素
    switch (element.type) {
      case LayoutElementType.HOST_LABEL:
      case LayoutElementType.SUBJECT_LABEL:
      case LayoutElementType.GUEST_LABEL:
        await this.renderLabelElement(element, ctx, layout, { x, y, width, height }, fontSize, fontWeight, fontColor);
        break;
      case LayoutElementType.HOST_INFO:
        await this.renderHostInfoElement(element, ctx, { x, y, width, height }, fontSize, fontWeight, fontColor);
        break;
      case LayoutElementType.SUBJECT_INFO:
        await this.renderSubjectInfoElement(element, ctx, { x, y, width, height }, fontSize, fontWeight, fontColor);
        break;
      case LayoutElementType.GUEST_INFO:
        await this.renderGuestInfoElement(element, ctx, { x, y, width, height }, fontSize, fontWeight, fontColor);
        break;
      default:
        this.renderDefaultTextElement(element, ctx, { x, y, width, height }, fontSize, fontWeight, fontColor);
        break;
    }
  }
  
  /**
   * 渲染标签类元素（主持人标签、主题标签、嘉宾标签）
   * @param element 标签元素
   * @param ctx 绘图上下文
   * @param layout 全局布局
   * @param rect 渲染区域
   * @param fontSize 字体大小
   * @param fontWeight 字体粗细
   * @param fontColor 字体颜色
   */
  private async renderLabelElement(
    element: TextLayoutElement,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    layout: Layout,
    rect: { x: number, y: number, width: number, height: number },
    fontSize: number,
    fontWeight: string,
    fontColor: string
  ): Promise<void> {
    try {
      // 获取文本内容
      const text = this.getTextContent(element);
      if (!text) return;

      // 如果有标签背景图，则绘制背景图
      if (layout.labelBackground) {
        // 检查缓存中是否已有此图片
        let backgroundImage = this.imageCache.get(layout.labelBackground) || 
                            getCachedImage(layout.labelBackground);
        
        // 如果缓存中没有，则加载图片（通常只在第一次调用时执行）
        if (!backgroundImage) {
          try {
            backgroundImage = await this.loadImage(layout.labelBackground);
          } catch (error) {
            // 加载失败时仅记录错误，不中断渲染流程
            console.error(`标签背景图加载失败: ${layout.labelBackground}`, error);
          }
        }

        // 如果成功获取到背景图，则绘制背景
        if (backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth > 0) {
          // 使用合适的方法绘制背景图（居中）
          this.drawImageCentered(ctx, backgroundImage, rect.x, rect.y, rect.width, rect.height);
        }
      }

      // 绘制文字（居中对齐）
      ctx.textAlign = 'center';
      ctx.fillStyle = fontColor;
      
      // 计算文字垂直居中的Y坐标
      const textY = rect.y + rect.height / 2;
      
      // 计算文字水平居中的X坐标
      const textX = rect.x + rect.width / 2;
      
      // 渲染文字
      ctx.fillText(text, textX, textY, rect.width);
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 渲染${element.type}标签元素失败:`, error);
    }
  }

  /**
   * 渲染主持人信息元素
   * @param element 主持人信息元素
   * @param ctx 绘图上下文
   * @param rect 渲染区域
   * @param fontSize 字体大小
   * @param fontWeight 字体粗细
   * @param fontColor 字体颜色
   */
  private async renderHostInfoElement(
    element: TextLayoutElement,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rect: { x: number, y: number, width: number, height: number },
    fontSize: number,
    fontWeight: string,
    fontColor: string
  ): Promise<void> {
    try {
      const schedule = this.planStore.previewingSchedule || this.planStore.liveSchedule;
      if (!schedule) return;
      
      // 获取人员列表
      let persons: PersonInfo[] = [];
      if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo) {
        persons = schedule.surgeryInfo.surgeons;
      } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
        persons = schedule.lectureInfo.speakers;
      }
      
      if (persons.length === 0) return;
      
      // 设置文本对齐方式
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 计算文本位置
      const centerX = rect.x + rect.width / 2;
      let currentY = rect.y;
      
      // 生成渲染行列表
      const lines: TextLine[] = [];
      const reducedFontSize = Math.max(fontSize - 4, 12); // 字号减4，最小为12
      const reducedFontWeight = this.reduceWeight(fontWeight); // 降级字重
      const lineHeight = fontSize * 1.2; // 行高为字号的1.2倍
      
      // 根据人员数量生成不同的布局
      if (persons.length === 1) {
        // 单人布局：姓名+称谓一行，单位一行
        const person = persons[0];
        const nameWithTitle = this.formatPersonNameAndTitle(person, fontSize, fontWeight, fontColor, reducedFontSize, reducedFontWeight);
        
        lines.push({
          text: nameWithTitle,
          fontSize,
          fontWeight,
          fontColor,
          lineHeight
        });
        
        // 添加单位行
        if (person.organization) {
          lines.push({
            text: person.organization,
            fontSize: reducedFontSize,
            fontWeight: reducedFontWeight,
            fontColor,
            lineHeight: reducedFontSize * 1.2
          });
        }
      } else if (persons.length >= 2) {
        // 多人布局：姓名+称谓一行，单位一行
        for (let i = 0; i < Math.min(persons.length, 3); i++) {
          const person = persons[i];
          const nameWithTitle = this.formatPersonNameAndTitle(person, fontSize, fontWeight, fontColor, reducedFontSize, reducedFontWeight);
          
          lines.push({
            text: nameWithTitle,
            fontSize,
            fontWeight,
            fontColor,
            lineHeight
          });
        }
        
        // 添加第一个人的单位行
        if (persons[0]?.organization) {
          lines.push({
            text: persons[0].organization,
            fontSize: reducedFontSize,
            fontWeight: reducedFontWeight,
            fontColor,
            lineHeight: reducedFontSize * 1.2
          });
        }
      }
      
      // 计算总行高
      let totalHeight = 0;
      for (const line of lines) {
        totalHeight += line.lineHeight;
      }
      
      // 计算起始Y坐标，实现垂直居中
      currentY = rect.y + (rect.height - totalHeight) / 2;
      
      // 渲染每一行
      for (const line of lines) {
        // 设置当前行的字体样式
        ctx.font = `${line.fontWeight} ${line.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = line.fontColor;
        
        // 在水平居中位置绘制文本
        ctx.fillText(line.text, centerX, currentY, rect.width);
        
        // 移动到下一行的起始位置
        currentY += line.lineHeight;
      }
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 渲染主持人信息元素失败:`, error);
    }
  }
  
  /**
   * 渲染主题信息元素（术式/讲课主题）
   * @param element 主题信息元素
   * @param ctx 绘图上下文
   * @param rect 渲染区域
   * @param fontSize 字体大小
   * @param fontWeight 字体粗细
   * @param fontColor 字体颜色
   */
  private async renderSubjectInfoElement(
    element: TextLayoutElement,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rect: { x: number, y: number, width: number, height: number },
    fontSize: number,
    fontWeight: string,
    fontColor: string
  ): Promise<void> {
    try {
      // 获取主题文本内容
      const text = this.getTextContent(element);
      if (!text) return;
      
      // 设置文本渲染样式
      ctx.font = `${fontWeight} ${fontSize}px ${this.fontFamily}`;
      ctx.fillStyle = fontColor;
      ctx.textAlign = 'center';

      // 检查是否是垂直布局
      if (element.orientation === 'vertical') {
        // 处理垂直布局下的换行符
        const lines = text.split('\n');
        
        // 计算行高并确保适合容器高度
        const lineCount = lines.length;
        const lineHeight = Math.min(fontSize * 1.2, rect.height / lineCount);
        
        // 计算起始Y坐标以实现垂直居中
        let startY = rect.y + (rect.height - lineHeight * lineCount) / 2;
        
        // 绘制每一行文本
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim()) { // 跳过空行
            const centerY = startY + lineHeight / 2;
            ctx.fillText(line, rect.x + rect.width / 2, centerY, rect.width);
          }
          // 移动到下一行
          startY += lineHeight;
        }
      } else {
        // 水平布局，居中绘制（可能自动换行）
        // 如果文本很长，Canvas会根据最大宽度自动截断但不会自动换行
        // 对于有换行符的内容，先分行处理
        if (text.includes('\n')) {
          const lines = text.split('\n');
          const lineHeight = Math.min(fontSize * 1.2, rect.height / lines.length);
          let startY = rect.y + (rect.height - lineHeight * lines.length) / 2;
          
          for (const line of lines) {
            if (line.trim()) {
              const centerY = startY + lineHeight / 2;
              ctx.fillText(line, rect.x + rect.width / 2, centerY, rect.width);
            }
            startY += lineHeight;
          }
        } else {
          // 无换行符的单行文本，直接居中绘制
          ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width);
        }
      }
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 渲染主题信息元素失败:`, error);
    }
  }
  
  /**
   * 渲染嘉宾信息元素
   * @param element 嘉宾信息元素
   * @param ctx 绘图上下文
   * @param rect 渲染区域
   * @param fontSize 字体大小
   * @param fontWeight 字体粗细
   * @param fontColor 字体颜色
   */
  private async renderGuestInfoElement(
    element: TextLayoutElement,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rect: { x: number, y: number, width: number, height: number },
    fontSize: number,
    fontWeight: string,
    fontColor: string
  ): Promise<void> {
    try {
    // 获取当前日程
    const schedule = this.planStore.previewingSchedule || this.planStore.liveSchedule;
      if (!schedule) return;

      // 获取嘉宾列表
      let guests: PersonInfo[] = [];
      if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo && schedule.surgeryInfo.guests) {
        guests = schedule.surgeryInfo.guests;
      } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo && schedule.lectureInfo.guests) {
        guests = schedule.lectureInfo.guests;
      }

      // 如果没有嘉宾信息，则不渲染
      if (guests.length === 0) return;

      // 设置文本对齐方式
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // 嘉宾名称字体属性
      const guestNameFontSize = fontSize;
      const guestNameFontWeight = fontWeight;
      
      // 嘉宾单位字体属性（字号-4，字重降级）
      const organizationFontSize = Math.max(fontSize - 4, 14); // 最小不低于14px
      const organizationFontWeight = this.reduceWeight(fontWeight);
      
      // 行高计算
      const nameLineHeight = fontSize * 1.3;
      const orgLineHeight = organizationFontSize * 1.3;
      
      // 嘉宾数量少于5名时，使用单栏垂直排列
      if (guests.length < 5) {
        // 单栏垂直排列（1-4名嘉宾）
        this.renderSingleColumnGuests(
          ctx, guests, rect, 
          guestNameFontSize, guestNameFontWeight, 
          organizationFontSize, organizationFontWeight, 
          nameLineHeight, orgLineHeight, fontColor
        );
      } else {
        // 双栏垂直排列（5名及以上嘉宾）
        this.renderDoubleColumnGuests(
          ctx, guests, rect, 
          guestNameFontSize, guestNameFontWeight, 
          nameLineHeight, fontColor
        );
      }
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 渲染嘉宾信息元素失败:`, error);
    }
  }
  
  /**
   * 渲染单栏嘉宾信息（1-4名嘉宾）
   * @param ctx 绘图上下文
   * @param guests 嘉宾列表
   * @param rect 渲染区域
   * @param nameFontSize 姓名字号
   * @param nameFontWeight 姓名字重
   * @param orgFontSize 单位字号
   * @param orgFontWeight 单位字重
   * @param nameLineHeight 姓名行高
   * @param orgLineHeight 单位行高
   * @param fontColor 字体颜色
   */
  private renderSingleColumnGuests(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    guests: PersonInfo[],
    rect: { x: number, y: number, width: number, height: number },
    nameFontSize: number,
    nameFontWeight: string,
    orgFontSize: number,
    orgFontWeight: string,
    nameLineHeight: number,
    orgLineHeight: number,
    fontColor: string
  ): void {
    // 计算一个嘉宾信息（姓名+单位）的总高度
    const guestBlockHeight = nameLineHeight + (orgLineHeight * 0.8); // 单位行稍微压缩一点
    
    // 嘉宾间距 10px
    const guestSpacing = 10;
    
    // 计算所有嘉宾信息的总高度（包含间距）
    const totalContentHeight = (guests.length * guestBlockHeight) + ((guests.length - 1) * guestSpacing);
    
    // 计算垂直居中的起始Y坐标
    let startY = rect.y + (rect.height - totalContentHeight) / 2;
    
    // 水平中心位置
    const centerX = rect.x + rect.width / 2;
    
    // 逐个渲染嘉宾信息
    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      
      // 渲染嘉宾姓名和称谓
      ctx.font = `${nameFontWeight} ${nameFontSize}px ${this.fontFamily}`;
      ctx.fillStyle = fontColor;
      
      // 格式化嘉宾姓名和称谓
      const nameText = this.formatPersonNameAndTitle(
        guest, nameFontSize, nameFontWeight, fontColor, orgFontSize, orgFontWeight
      );
      
      // 计算姓名文本宽度，用于居中渲染
      const nameTextWidth = ctx.measureText(nameText).width;
      const nameX = centerX - nameTextWidth / 2;
      
      // 渲染姓名和称谓
      ctx.fillText(nameText, nameX, startY + nameLineHeight / 2);
      
      // 如果有单位信息，渲染单位
      if (guest.organization) {
        // 设置单位文本样式
        ctx.font = `${orgFontWeight} ${orgFontSize}px ${this.fontFamily}`;
        
        // 计算单位文本宽度，用于居中渲染
        const orgTextWidth = ctx.measureText(guest.organization).width;
        const orgX = centerX - orgTextWidth / 2;
        
        // 渲染单位信息
        ctx.fillText(guest.organization, orgX, startY + nameLineHeight + orgLineHeight / 2);
      }
      
      // 移动到下一个嘉宾的起始位置，增加10px间距
      startY += guestBlockHeight + guestSpacing;
    }
  }

  /**
   * 渲染双栏嘉宾信息（5名及以上嘉宾）
   * @param ctx 绘图上下文
   * @param guests 嘉宾列表
   * @param rect 渲染区域
   * @param fontSize 字号
   * @param fontWeight 字重
   * @param lineHeight 行高
   * @param fontColor 字体颜色
   */
  private renderDoubleColumnGuests(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    guests: PersonInfo[],
    rect: { x: number, y: number, width: number, height: number },
    fontSize: number,
    fontWeight: string,
    lineHeight: number,
    fontColor: string
  ): void {
    // 设置字体样式
    ctx.font = `${fontWeight} ${fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = fontColor;
    
    // 创建双栏式排列的行数据
    const rows: string[] = [];
    
    // 每次处理两名嘉宾，生成一行文本
    for (let i = 0; i < guests.length; i += 2) {
      const guest1 = guests[i];
      
      // 第一个嘉宾的文本
      let guest1Text = this.formatPersonNameAndTitle(
        guest1, fontSize, fontWeight, fontColor, fontSize, fontWeight
      );
      
      // 检查是否有第二个嘉宾
      if (i + 1 < guests.length) {
        const guest2 = guests[i + 1];
        
        // 第二个嘉宾的文本
        const guest2Text = this.formatPersonNameAndTitle(
          guest2, fontSize, fontWeight, fontColor, fontSize, fontWeight
        );
        
        // 将两个嘉宾信息合并为一行，用" / "分隔
        rows.push(`${guest1Text} / ${guest2Text}`);
      } else {
        // 没有配对的嘉宾，直接添加单个嘉宾信息
        rows.push(guest1Text);
      }
    }
    
    // 计算所有行的总高度
    const totalHeight = rows.length * lineHeight;
    
    // 计算垂直居中的起始Y坐标
    let startY = rect.y + (rect.height - totalHeight) / 2;
    const centerX = rect.x + rect.width / 2;
    
    // 渲染每一行文本
    for (let i = 0; i < rows.length; i++) {
      const rowText = rows[i];
      
      // 计算文本宽度，用于居中渲染
      const textWidth = ctx.measureText(rowText).width;
      const textX = centerX - textWidth / 2;
      
      // 渲染当前行
      ctx.fillText(rowText, textX, startY + lineHeight / 2);
      
      // 移动到下一行
      startY += lineHeight;
    }
  }

  /**
   * 渲染默认文本元素
   * @param element 文本元素
   * @param ctx 绘图上下文
   * @param rect 渲染区域
   * @param fontSize 字体大小
   * @param fontWeight 字体粗细
   * @param fontColor 字体颜色
   */
  private renderDefaultTextElement(
    element: TextLayoutElement,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rect: { x: number, y: number, width: number, height: number },
    fontSize: number,
    fontWeight: string,
    fontColor: string
  ): void {
    try {
      // 获取文本内容
      const text = this.getTextContent(element);
      if (!text) return;
      
      // 设置文本对齐（水平居中）
      ctx.textAlign = 'center';
      ctx.fillStyle = fontColor;
      
      // 渲染水平文本（居中）
      ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width);
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 渲染默认文本元素失败:`, error);
    }
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

  /**
   * 设置布局
   * @param layout 布局数据
   */
  public setLayout(layout: Layout | null): void {
    console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 设置布局:`, layout?.id);
    
    // 如果布局发生变化，使当前缓存失效
    if (this.currentLayout?.id !== layout?.id) {
      // 清除文字图层缓存
      this.invalidateCache();
      
      console.log(`[textLayerRenderer.ts ${this.rendererType}文字图层渲染器] 布局已变更，清除文字缓存`);
      
      // 如果新布局有标签背景图，预加载图像
      if (layout?.labelBackground) {
        this.loadImage(layout.labelBackground);
      }
    }
    
    // 更新当前布局
    this.currentLayout = layout;
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