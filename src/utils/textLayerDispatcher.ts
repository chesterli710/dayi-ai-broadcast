/**
 * 文字图层调度器
 * 负责管理文字图层的渲染和缓存
 * 为canvasRenderer提供统一的文字图层访问接口
 */
import type { Layout, Schedule } from '../types/broadcast';
import { TextLayerRenderer } from './textLayerRenderer';
import { usePlanStore } from '../stores/planStore';
import { LayoutElementType } from '../types/broadcast';

/**
 * 文字图层调度器
 * 集中管理文字图层的渲染、缓存和分发
 * 按照scheduleid_layoutId命名缓存
 */
export class TextLayerDispatcher {
  // 单例模式
  private static instance: TextLayerDispatcher;
  
  // 文字渲染器
  private renderer: TextLayerRenderer | null = null;
  
  // 渲染缓存，键为"scheduleid_layoutId"，值为渲染后的ImageBitmap
  private renderCache: Map<string, ImageBitmap> = new Map();
  
  // 计划存储
  private planStore = usePlanStore();
  
  // 标记正在进行的渲染请求，避免重复渲染
  private pendingRenders: Set<string> = new Set();
  
  // 等待队列，存储等待相同缓存键渲染完成的回调函数
  private waitQueue: Map<string, Array<(bitmap: ImageBitmap | null) => void>> = new Map();
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    try {
      // 创建渲染器实例
      this.renderer = new TextLayerRenderer();
      
      console.log('[textLayerDispatcher.ts] 文字图层调度器初始化完成');
    } catch (error) {
      console.error('[textLayerDispatcher.ts] 文字图层调度器初始化失败:', error);
    }
  }
  
  /**
   * 获取单例实例
   * @returns TextLayerDispatcher实例
   */
  public static getInstance(): TextLayerDispatcher {
    try {
      if (!TextLayerDispatcher.instance) {
        console.log('[textLayerDispatcher.ts] 创建文字图层调度器单例实例');
        TextLayerDispatcher.instance = new TextLayerDispatcher();
      }
      return TextLayerDispatcher.instance;
    } catch (error) {
      console.error('[textLayerDispatcher.ts] 创建调度器实例失败:', error);
      // 失败时尝试重新创建
      if (!TextLayerDispatcher.instance) {
        try {
          TextLayerDispatcher.instance = new TextLayerDispatcher();
        } catch (e) {
          console.error('[textLayerDispatcher.ts] 第二次尝试创建调度器实例也失败:', e);
        }
      }
      return TextLayerDispatcher.instance;
    }
  }
  
  /**
   * 生成缓存键
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 缓存键
   */
  private generateCacheKey(scheduleId: string, layoutId: string): string {
    return `${scheduleId}_${layoutId}`;
  }
  
  /**
   * 获取文字图层
   * @param mode 渲染模式
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @param forceRender 是否强制重新渲染
   * @returns 渲染后的图像位图，如果无法渲染则返回null
   */
  public async getTextLayer(
    mode: 'preview' | 'live',
    scheduleId: string | null = null,
    layoutId: string | null = null,
    forceRender: boolean = false
  ): Promise<ImageBitmap | null> {
    try {
      // 获取日程ID和布局ID
      scheduleId = scheduleId || this.getDefaultScheduleId(mode);
      if (!scheduleId) {
        console.warn(`[textLayerDispatcher.ts] 没有有效的日程ID，无法渲染文字图层`);
        return null;
      }
  
      if (!layoutId) {
        console.warn(`[textLayerDispatcher.ts] 没有布局ID，无法渲染文字图层`);
        return null;
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(scheduleId, layoutId);
      
      // 如果不强制渲染，并且存在缓存，使用缓存
      if (!forceRender && this.renderCache.has(cacheKey)) {
        const cachedLayer = this.renderCache.get(cacheKey);
        console.log(`[textLayerDispatcher.ts] 使用缓存的文字图层, cacheKey=${cacheKey}`);
        return cachedLayer || null;
      }
      
      console.log(`[textLayerDispatcher.ts] 开始渲染文字图层, scheduleId=${scheduleId}, layoutId=${layoutId}`);
      
      // 获取布局数据
      const layout = await this.getLayout(scheduleId, parseInt(layoutId));
      if (!layout) {
        console.error(`[textLayerDispatcher.ts] 找不到布局数据，layoutId=${layoutId}`);
        return null;
      }
      
      // 获取日程数据
      const schedule = await this.getSchedule(scheduleId);
      if (!schedule) {
        console.error(`[textLayerDispatcher.ts] 找不到日程数据，scheduleId=${scheduleId}`);
        return null;
      }
      
      // 检查布局是否有文本元素
      const hasTextElements = this.hasTextElements(layout);
      
      // 如果没有文本元素，创建一个空白的ImageBitmap并缓存
      if (!hasTextElements) {
        console.log(`[textLayerDispatcher.ts] 布局无文本元素，创建空白文字图层, cacheKey=${cacheKey}`);
        
        // 创建空白的Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1920;  // 与TextLayerRenderer中的尺寸一致
        canvas.height = 1080;
        
        // 创建空白的ImageBitmap
        const emptyBitmap = await createImageBitmap(canvas);
        
        // 缓存空白图层
        this.renderCache.set(cacheKey, emptyBitmap);
        
        console.log(`[textLayerDispatcher.ts] 空白文字图层已缓存, cacheKey=${cacheKey}`);
        return emptyBitmap;
      }
      
      // 进行多次尝试渲染，提高渲染成功率
      let imageBitmap: ImageBitmap | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!imageBitmap && retryCount < maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`[textLayerDispatcher.ts] 第${retryCount}次尝试渲染文字图层`);
            // 每次重试前等待一段时间，让DOM有时间稳定
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
          }
          
          // 渲染文字图层
          if (this.renderer) {
            imageBitmap = await this.renderer.renderTextLayer(layout, schedule);
          } else {
            console.error(`[textLayerDispatcher.ts] 渲染器实例不存在`);
          }
          
          if (imageBitmap) {
            console.log(`[textLayerDispatcher.ts] 文字图层渲染成功，cacheKey=${cacheKey}`);
            // 缓存渲染结果
            this.renderCache.set(cacheKey, imageBitmap);
          } else if (retryCount < maxRetries - 1) {
            console.warn(`[textLayerDispatcher.ts] 渲染未返回有效结果，将进行重试`);
          }
        } catch (error) {
          console.error(`[textLayerDispatcher.ts] 渲染文字图层出错(尝试${retryCount + 1}/${maxRetries}):`, error);
          // 最后一次尝试失败时，不增加重试计数，直接退出循环
          if (retryCount === maxRetries - 1) break;
        }
        
        retryCount++;
      }
      
      if (!imageBitmap) {
        console.error(`[textLayerDispatcher.ts] 多次尝试后依然无法渲染文字图层`);
      }
      
      return imageBitmap;
    } catch (error) {
      console.error(`[textLayerDispatcher.ts] 获取文字图层过程中出错:`, error);
      return null;
    }
  }
  
  /**
   * 强制重新渲染文字图层
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @param mode 渲染模式，仅用于确定默认日程ID，不影响缓存逻辑
   * @returns 文字图层ImageBitmap
   */
  public async forceRenderTextLayer(scheduleId: string | null, layoutId: string, mode: 'preview' | 'live' = 'preview'): Promise<ImageBitmap | null> {
    // 如果没有传入scheduleId，则使用当前激活的scheduleId
    let effectiveScheduleId = scheduleId;
    if (!effectiveScheduleId) {
      const previewId = this.planStore.previewingSchedule?.id;
      const liveId = this.planStore.liveSchedule?.id;
      
      effectiveScheduleId = mode === 'preview' 
        ? (previewId ? String(previewId) : null)
        : (liveId ? String(liveId) : null);
      
      if (!effectiveScheduleId) {
        console.warn(`[textLayerDispatcher.ts] 强制渲染文字图层失败: 无法确定有效的日程ID`);
        return null;
      }
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(effectiveScheduleId, layoutId);
    
    // 清除现有缓存
    if (this.renderCache.has(cacheKey)) {
      this.renderCache.delete(cacheKey);
      console.log(`[textLayerDispatcher.ts] 清除文字图层缓存: ${cacheKey}`);
    }

    // 渲染新的文字图层
    return this.getTextLayer(mode, effectiveScheduleId, layoutId, true);
  }
  
  /**
   * 清除所有缓存
   */
  public clearAllCache(): void {
    console.log(`[textLayerDispatcher.ts] 清除所有文字图层缓存`);
    
    // 释放所有ImageBitmap资源
    this.renderCache.forEach(bitmap => {
      try {
        bitmap.close();
      } catch (error) {
        console.error(`[textLayerDispatcher.ts] 关闭图像位图时出错:`, error);
      }
    });
    
    // 清空缓存Map
    this.renderCache.clear();
  }
  
  /**
   * 清除指定日程的所有缓存
   * @param scheduleId 日程ID
   */
  public clearScheduleCache(scheduleId: string): void {
    if (!scheduleId) {
      console.warn(`[textLayerDispatcher.ts] 清除日程缓存失败: 日程ID为空`);
      return;
    }

    console.log(`[textLayerDispatcher.ts] 开始清除日程的缓存: ${scheduleId}`);
    
    // 清除以scheduleId开头的所有缓存
    const keysToDelete: string[] = [];
    for (const key of this.renderCache.keys()) {
      if (key.startsWith(`${scheduleId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    // 逐一删除缓存
    for (const key of keysToDelete) {
      this.renderCache.delete(key);
      console.log(`[textLayerDispatcher.ts] 已删除缓存: ${key}`);
    }
    
    console.log(`[textLayerDispatcher.ts] 已清除日程的所有缓存，共 ${keysToDelete.length} 项`);
  }
  
  /**
   * 清除指定布局的所有缓存
   * @param layoutId 布局ID
   */
  public clearLayoutCache(layoutId: string): void {
    if (!layoutId) {
      console.warn(`[textLayerDispatcher.ts] 清除布局缓存失败: 布局ID为空`);
      return;
    }

    console.log(`[textLayerDispatcher.ts] 开始清除布局的缓存: ${layoutId}`);
    
    // 清除以layoutId结尾的所有缓存
    const keysToDelete: string[] = [];
    for (const key of this.renderCache.keys()) {
      if (key.endsWith(`_${layoutId}`)) {
        keysToDelete.push(key);
      }
    }
    
    // 逐一删除缓存
    for (const key of keysToDelete) {
      this.renderCache.delete(key);
      console.log(`[textLayerDispatcher.ts] 已删除缓存: ${key}`);
    }
    
    console.log(`[textLayerDispatcher.ts] 已清除布局的所有缓存，共 ${keysToDelete.length} 项`);
  }
  
  /**
   * 获取指定ID的日程对象
   * @param scheduleId 日程ID
   * @returns 日程对象或null
   * @private
   */
  private getSchedule(scheduleId: string): Schedule | null {
    // 从当前分支中获取日程
    if (!this.planStore.currentBranch) {
      console.error('[TextLayerDispatcher] 获取日程失败：当前分支为空');
      return null;
    }
    
    const schedule = this.planStore.currentBranch.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      console.error(`[TextLayerDispatcher] 未找到ID为${scheduleId}的日程`);
      return null;
    }
    
    return schedule;
  }
  
  /**
   * 获取指定ID的布局对象
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 布局对象或null
   * @private
   */
  private getLayout(scheduleId: string, layoutId: number): Layout | null {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule) return null;
    
    const layout = schedule.layouts.find(l => l.id === layoutId);
    if (!layout) {
      console.error(`[TextLayerDispatcher] 在日程${scheduleId}中未找到ID为${layoutId}的布局`);
      return null;
    }
    
    return layout;
  }
  
  /**
   * 数据变更通知
   * 当日程或布局数据变更时，清除相关缓存
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   */
  public onDataChanged(scheduleId: string, layoutId: string): void {
    if (!scheduleId || !layoutId) {
      console.warn(`[textLayerDispatcher.ts] 数据变更通知失败: 日程ID或布局ID为空`);
      return;
    }

    console.log(`[textLayerDispatcher.ts] 收到数据变更通知: 日程=${scheduleId}, 布局=${layoutId}`);
    
    // 生成特定的缓存键
    const specificCacheKey = this.generateCacheKey(scheduleId, layoutId);
    
    // 清除特定的缓存
    if (this.renderCache.has(specificCacheKey)) {
      this.renderCache.delete(specificCacheKey);
      console.log(`[textLayerDispatcher.ts] 已删除特定缓存: ${specificCacheKey}`);
    } else {
      console.log(`[textLayerDispatcher.ts] 未找到特定缓存: ${specificCacheKey}`);
    }
  }
  
  /**
   * 销毁调度器
   * 释放所有资源
   */
  public destroy(): void {
    console.log(`[textLayerDispatcher.ts] 销毁文字图层调度器`);
    
    // 清除所有缓存
    this.clearAllCache();
    
    // 销毁渲染器
    this.renderer?.destroy();
    
    // 移除单例实例引用
    TextLayerDispatcher.instance = null as any;
  }

  /**
   * 获取默认日程ID
   * @param mode 渲染模式
   * @returns 默认日程ID
   */
  private getDefaultScheduleId(mode: 'preview' | 'live'): string | null {
    if (mode === 'preview') {
      return this.planStore.previewingSchedule?.id ? String(this.planStore.previewingSchedule.id) : null;
    } else {
      return this.planStore.liveSchedule?.id ? String(this.planStore.liveSchedule.id) : null;
    }
  }

  /**
   * 检查布局是否包含文本元素
   * @param layout 布局数据
   * @returns 是否包含文本元素
   * @private
   */
  private hasTextElements(layout: Layout): boolean {
    if (!layout || !layout.elements || !Array.isArray(layout.elements)) {
      return false;
    }
    
    // 检查是否有文本类型的元素
    return layout.elements.some(element => 
      element.type === LayoutElementType.HOST_LABEL ||
      element.type === LayoutElementType.HOST_INFO ||
      element.type === LayoutElementType.SUBJECT_LABEL ||
      element.type === LayoutElementType.SUBJECT_INFO ||
      element.type === LayoutElementType.GUEST_LABEL ||
      element.type === LayoutElementType.GUEST_INFO
    );
  }
}

/**
 * 获取文字图层调度器实例
 * @returns TextLayerDispatcher实例
 */
export function getTextLayerDispatcher(): TextLayerDispatcher {
  try {
    return TextLayerDispatcher.getInstance();
  } catch (error) {
    console.error('[textLayerDispatcher.ts] 获取文字图层调度器实例失败:', error);
    // 创建默认的调度器实例
    // 注意：我们无法直接new TextLayerDispatcher()，因为构造函数是私有的
    // 返回一个可能是null的实例，由调用者处理
    return TextLayerDispatcher.getInstance();
  }
} 