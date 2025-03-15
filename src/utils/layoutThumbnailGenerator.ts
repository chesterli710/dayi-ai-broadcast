/**
 * 布局缩略图生成器
 * 用于生成布局模板的缩略图并本地存储
 */
import type { LayoutTemplate, MediaLayoutElement } from '../types/broadcast';
import { LayoutElementType } from '../types/broadcast';

/**
 * 媒体元素尺寸类型
 */
enum MediaElementSize {
  FULLSCREEN = 'fullscreen',
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small'
}

/**
 * 布局缩略图生成器
 * 用于生成布局模板的缩略图并本地存储
 */
class LayoutThumbnailGenerator {
  // 缩略图尺寸
  private readonly width = 320;
  private readonly height = 180;
  
  // 原始布局尺寸（标准16:9）
  private readonly originalWidth = 1920;
  private readonly originalHeight = 1080;
  
  // 缩略图存储键前缀
  private readonly storageKeyPrefix = 'layout-thumbnail-';
  
  // 版本号，用于强制更新缩略图
  private readonly version = 'v1';
  
  // 原始坐标系中的中线位置
  private readonly centerLineX = 960;
  
  // 最小边距（本地坐标系）
  private readonly minMargin = 20; // 50px在原始坐标系中对应约10px在缩略图中
  
  // 媒体元素尺寸（原始坐标系）
  private readonly elementSizes = {
    small: 400,    // 小号宽度
    medium: 800,   // 中号宽度
    large: 1200,   // 大号宽度
    fullscreen: this.originalWidth  // 全屏宽度
  };
  
  // 颜色配置
  private readonly colors = {
    background: '#E0E0E0',  // 浅灰色背景
    element: '#505050'      // 深灰色元素
  };
  
  /**
   * 获取布局模板缩略图
   * 如果本地已有缓存，则使用缓存；否则生成新的缩略图
   * @param template 布局模板
   * @param forceUpdate 是否强制更新缩略图
   * @returns 缩略图URL
   */
  public async getThumbnail(template: LayoutTemplate, forceUpdate = false): Promise<string> {
    const storageKey = `${this.storageKeyPrefix}${this.version}-${template.template}`;
    
    // 检查本地存储中是否已有该模板的缩略图
    const cachedThumbnail = !forceUpdate ? this.getFromLocalStorage(storageKey) : null;
    if (cachedThumbnail) {
      console.log(`[layoutThumbnailGenerator.ts 缩略图] 使用缓存的缩略图: ${template.template}`);
      return cachedThumbnail;
    }
    
    // 生成新的缩略图
    console.log(`[layoutThumbnailGenerator.ts 缩略图] 生成新的缩略图: ${template.template}`);
    const thumbnail = await this.generateThumbnail(template);
    
    // 保存到本地存储
    if (thumbnail) {
      this.saveToLocalStorage(storageKey, thumbnail);
    }
    
    return thumbnail || '/assets/placeholder-layout.svg';
  }
  
  /**
   * 生成布局模板缩略图
   * @param template 布局模板
   * @returns 缩略图数据URL
   */
  private async generateThumbnail(template: LayoutTemplate): Promise<string> {
    return new Promise((resolve) => {
      try {
        // 创建Canvas元素
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[layoutThumbnailGenerator.ts 缩略图] 无法获取Canvas上下文');
          resolve('/assets/placeholder-layout.svg');
          return;
        }
        
        // 绘制背景 - 使用浅灰色背景
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 如果没有元素，返回基本背景
        if (!template.elements || template.elements.length === 0) {
          resolve(canvas.toDataURL('image/jpeg', 0.9));
          return;
        }
        
        // 过滤出媒体类型的元素
        const mediaElements = template.elements.filter(
          element => element.type === LayoutElementType.MEDIA
        ) as MediaLayoutElement[];
        
        // 对媒体元素按照Y坐标排序，确保从上到下绘制
        const sortedElements = [...mediaElements].sort((a, b) => a.y - b.y);
        
        // 绘制媒体元素占位符
        sortedElements.forEach(element => {
          // 确定元素尺寸类型
          const sizeType = this.determineElementSize(element);
          
          // 根据尺寸类型绘制对应的矩形
          this.drawElementBySize(ctx, element, sizeType);
        });
        
        // 转换为数据URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (error) {
        console.error('[layoutThumbnailGenerator.ts 缩略图] 生成布局缩略图失败:', error);
        resolve('/assets/placeholder-layout.svg');
      }
    });
  }
  
  /**
   * 确定媒体元素的尺寸类型
   * @param element 媒体元素
   * @returns 尺寸类型
   */
  private determineElementSize(element: MediaLayoutElement): MediaElementSize {
    // 检查是否为全屏元素（宽度或高度接近全屏）
    if (element.width >= this.originalWidth * 0.9 || 
        element.height >= this.originalHeight * 0.9) {
      return MediaElementSize.FULLSCREEN;
    }
    
    // 根据宽度确定尺寸类型
    if (element.width >= 1200) {
      return MediaElementSize.LARGE;
    } else if (element.width >= 900) {
      return MediaElementSize.MEDIUM;
    } else {
      return MediaElementSize.SMALL;
    }
  }
  
  /**
   * 根据尺寸类型绘制媒体元素
   * @param ctx Canvas上下文
   * @param element 媒体元素
   * @param sizeType 尺寸类型
   */
  private drawElementBySize(ctx: CanvasRenderingContext2D, element: MediaLayoutElement, sizeType: MediaElementSize): void {
    // 计算相对Y坐标（保持原始Y轴位置关系）
    const relativeY = (element.y / this.originalHeight) * this.height;
    
    // 确定元素是否超过中线
    const isRightSide = element.x + element.width / 2 > this.centerLineX;
    
    // 根据尺寸类型设置矩形的尺寸（转换为本地坐标）
    let width: number, height: number;
    
    switch (sizeType) {
      case MediaElementSize.FULLSCREEN:
        width = this.width;
        height = this.height;
        break;
        
      case MediaElementSize.LARGE:
        width = (this.elementSizes.large / this.originalWidth) * this.width;
        height = width * 9 / 16; // 保持16:9比例
        break;
        
      case MediaElementSize.MEDIUM:
        width = (this.elementSizes.medium / this.originalWidth) * this.width;
        height = width * 9 / 16; // 保持16:9比例
        break;
        
      case MediaElementSize.SMALL:
      default:
        width = (this.elementSizes.small / this.originalWidth) * this.width;
        height = width * 9 / 16; // 保持16:9比例
        break;
    }
    
    // 根据元素位置和尺寸确定X坐标
    let x: number;
    
    if (sizeType === MediaElementSize.FULLSCREEN) {
      // 全屏元素始终从左上角开始
      x = 0;
    } else if (isRightSide) {
      // 右侧元素：以右上角对齐
      const rightEdgeX = (element.x + element.width) / this.originalWidth * this.width;
      x = rightEdgeX - width;
      
      // 确保右边距不小于最小边距
      if (this.width - (x + width) < this.minMargin) {
        x = this.width - width - this.minMargin;
      }
    } else {
      // 左侧元素：以左上角对齐
      x = (element.x / this.originalWidth) * this.width;
      
      // 确保左边距不小于最小边距
      if (x < this.minMargin) {
        x = this.minMargin;
      }
    }
    
    // 确定Y坐标，确保不超出画布
    let y = relativeY;
    if (y + height > this.height) {
      y = this.height - height;
    }
    
    // 绘制媒体元素填充 - 使用深灰色填充
    ctx.fillStyle = this.colors.element;
    ctx.fillRect(x, y, width, height);
  }
  
  /**
   * 从本地存储获取缩略图
   * @param key 存储键
   * @returns 缩略图数据URL或null
   */
  private getFromLocalStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[layoutThumbnailGenerator.ts 缩略图] 从本地存储获取缩略图失败:', error);
      return null;
    }
  }
  
  /**
   * 保存缩略图到本地存储
   * @param key 存储键
   * @param dataUrl 缩略图数据URL
   */
  private saveToLocalStorage(key: string, dataUrl: string): void {
    try {
      localStorage.setItem(key, dataUrl);
      console.log(`[layoutThumbnailGenerator.ts 缩略图] 缩略图已保存到本地存储: ${key}`);
    } catch (error) {
      console.error('[layoutThumbnailGenerator.ts 缩略图] 保存缩略图到本地存储失败:', error);
    }
  }
  
  /**
   * 清除指定模板的缩略图缓存
   * @param templateId 模板ID
   */
  public clearThumbnailCache(templateId: string): void {
    try {
      // 清除所有版本的缓存
      const keys = Object.keys(localStorage);
      const targetKeys = keys.filter(key => key.includes(`${this.storageKeyPrefix}`) && key.endsWith(templateId));
      
      targetKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`[layoutThumbnailGenerator.ts 缩略图] 已清除缩略图缓存: ${templateId}, 共 ${targetKeys.length} 项`);
    } catch (error) {
      console.error('[layoutThumbnailGenerator.ts 缩略图] 清除缩略图缓存失败:', error);
    }
  }
  
  /**
   * 清除所有缩略图缓存
   */
  public clearAllThumbnailCache(): void {
    try {
      // 获取所有localStorage的键
      const keys = Object.keys(localStorage);
      
      // 过滤出缩略图相关的键
      const thumbnailKeys = keys.filter(key => key.startsWith(this.storageKeyPrefix));
      
      // 删除所有缩略图缓存
      thumbnailKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`[layoutThumbnailGenerator.ts 缩略图] 已清除所有缩略图缓存，共 ${thumbnailKeys.length} 项`);
    } catch (error) {
      console.error('[layoutThumbnailGenerator.ts 缩略图] 清除所有缩略图缓存失败:', error);
    }
  }
}

// 导出单例实例
export default new LayoutThumbnailGenerator(); 