/**
 * 文字图层缓存管理器
 * 用于调用layoutTextRenderer生成文字图层，并进行缓存管理
 */
import layoutTextRenderer from './layoutTextRenderer';
import { usePlanStore } from '../stores/planStore';

/**
 * 缓存项结构
 */
interface CacheItem {
  canvas: HTMLCanvasElement;
  timestamp: number;
}

/**
 * 文字图层缓存管理器类
 */
class TextLayerCacheManager {
  /**
   * 缓存存储
   * 键格式: "scheduleId-layoutId"
   */
  private cache: Map<string, CacheItem> = new Map();
  
  /**
   * 获取缓存键
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 缓存键
   */
  private getCacheKey(scheduleId: string, layoutId: number): string {
    return `${scheduleId}-${layoutId}`;
  }
  
  /**
   * 生成指定布局的文字图层并缓存
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 文字图层Canvas元素
   */
  public async generateTextLayerCache(scheduleId: string, layoutId: number): Promise<HTMLCanvasElement> {
    try {
      console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 开始生成文字图层缓存: 日程${scheduleId}, 布局${layoutId}`);
      
      // 调用layoutTextRenderer生成文字图层
      const canvas = await layoutTextRenderer.renderLayoutTextLayers(scheduleId, layoutId);
      
      // 存入缓存
      const cacheKey = this.getCacheKey(scheduleId, layoutId);
      this.cache.set(cacheKey, {
        canvas,
        timestamp: Date.now()
      });
      
      console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 文字图层缓存生成完成: ${cacheKey}`);
      
      return canvas;
    } catch (error) {
      console.error(`[textLayerCacheManager.ts 文字图层缓存管理器] 生成文字图层缓存失败: 日程${scheduleId}, 布局${layoutId}`, error);
      throw error;
    }
  }
  
  /**
   * 生成指定日程下所有布局的文字图层缓存
   * @param scheduleId 日程ID
   * @returns 生成的文字图层Canvas元素数组，按布局ID排序
   */
  public async generateAllTextLayersForSchedule(scheduleId: string): Promise<HTMLCanvasElement[]> {
    const planStore = usePlanStore();
    if (!planStore.currentBranch) {
      throw new Error('[textLayerCacheManager.ts 文字图层缓存管理器] 当前没有选中分支');
    }
    
    // 查找指定的日程
    const schedule = planStore.currentBranch.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      throw new Error(`[textLayerCacheManager.ts 文字图层缓存管理器] 未找到ID为${scheduleId}的日程`);
    }
    
    console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 开始生成日程${scheduleId}的所有布局文字图层缓存`);
    
    const promises: Promise<HTMLCanvasElement>[] = [];
    
    // 为日程下的每个布局生成文字图层缓存
    for (const layout of schedule.layouts) {
      promises.push(this.generateTextLayerCache(scheduleId, layout.id));
    }
    
    // 等待所有布局的文字图层缓存生成完成
    const results = await Promise.all(promises);
    
    console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 日程${scheduleId}的所有布局文字图层缓存生成完成，共${results.length}个布局`);
    
    return results;
  }
  
  /**
   * 获取指定布局的文字图层缓存
   * 如果缓存不存在，则先生成缓存
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 文字图层Canvas元素
   */
  public async getTextLayerCache(scheduleId: string, layoutId: number): Promise<HTMLCanvasElement> {
    const cacheKey = this.getCacheKey(scheduleId, layoutId);
    
    // 检查缓存是否存在
    const cachedItem = this.cache.get(cacheKey);
    if (cachedItem) {
      console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 命中缓存: ${cacheKey}`);
      return cachedItem.canvas;
    }
    
    // 缓存不存在，生成新的缓存
    console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 缓存未命中: ${cacheKey}，开始生成缓存`);
    return this.generateTextLayerCache(scheduleId, layoutId);
  }
  
  /**
   * 强制刷新指定布局的文字图层缓存
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 刷新后的文字图层Canvas元素
   */
  public async refreshTextLayerCache(scheduleId: string, layoutId: number): Promise<HTMLCanvasElement> {
    const cacheKey = this.getCacheKey(scheduleId, layoutId);
    
    console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 强制刷新缓存: ${cacheKey}`);
    
    // 从缓存中移除旧的项（如果存在）
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
    }
    
    // 生成新的缓存
    return this.generateTextLayerCache(scheduleId, layoutId);
  }
  
  /**
   * 检查指定布局的缓存是否存在
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 缓存是否存在
   */
  public hasCache(scheduleId: string, layoutId: number): boolean {
    const cacheKey = this.getCacheKey(scheduleId, layoutId);
    return this.cache.has(cacheKey);
  }
  
  /**
   * 清除指定日程的所有布局缓存
   * @param scheduleId 日程ID
   */
  public clearScheduleCache(scheduleId: string): void {
    console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 清除日程${scheduleId}的所有缓存`);
    
    // 遍历缓存，删除指定日程的所有缓存项
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${scheduleId}-`)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 清除所有缓存
   */
  public clearAllCache(): void {
    console.log(`[textLayerCacheManager.ts 文字图层缓存管理器] 清除所有缓存`);
    this.cache.clear();
  }
  
  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  public getCacheStats(): {count: number, keys: string[]} {
    return {
      count: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 创建单例实例
const textLayerCacheManager = new TextLayerCacheManager();

export default textLayerCacheManager; 