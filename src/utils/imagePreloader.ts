/**
 * 图片预加载工具类
 * 用于提前加载和缓存背景图、标签背景和前景图等资源，以及布局缩略图
 */
import layoutThumbnailGenerator from './layoutThumbnailGenerator';
import type { LayoutTemplate } from '../types/broadcast';

// 图片缓存映射表
const imageCache: Map<string, HTMLImageElement> = new Map();

// 正在加载的图片Promise映射表
const loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

// 布局缩略图缓存映射表 - 专门用于缓存布局缩略图
const thumbnailCache: Map<string, string> = new Map();

// 记录尝试但加载失败的URL
const failedUrls: Set<string> = new Set();

/**
 * 预加载单个图片
 * @param url 图片URL
 * @param timeout 超时时间（毫秒），默认10秒
 * @returns 加载图片的Promise
 */
export function preloadImage(url: string, timeout = 10000): Promise<HTMLImageElement> {
  // 如果URL为空，返回拒绝的Promise
  if (!url) {
    return Promise.reject(new Error('图片URL为空'));
  }
  
  // 如果是data URL格式，不进行预加载，直接返回成功
  if (isDataUrl(url)) {
    const img = new Image();
    img.src = url;
    return Promise.resolve(img);
  }
  
  // 如果图片已在缓存中，直接返回
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!);
  }
  
  // 如果URL已经尝试过但加载失败，直接返回失败
  if (failedUrls.has(url)) {
    return Promise.reject(new Error(`图片加载之前已失败: ${url}`));
  }
  
  // 如果图片正在加载中，返回现有Promise
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }
  
  // 创建新的加载Promise
  const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // 图片加载成功，添加到缓存
      imageCache.set(url, img);
      loadingPromises.delete(url);
      console.log(`[imagePreloader.ts] 图片预加载成功: ${url}`);
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error(`[imagePreloader.ts] 图片预加载失败: ${url}`, error);
      loadingPromises.delete(url);
      // 记录失败的URL
      failedUrls.add(url);
      reject(error);
    };
    
    // 设置超时处理
    setTimeout(() => {
      if (!img.complete) {
        console.warn(`[imagePreloader.ts] 图片预加载超时: ${url}`);
        loadingPromises.delete(url);
        // 记录失败的URL
        failedUrls.add(url);
        reject(new Error('图片加载超时'));
      }
    }, timeout);
    
    img.src = url;
  });
  
  // 存储加载Promise
  loadingPromises.set(url, loadPromise);
  
  return loadPromise;
}

/**
 * 预加载多个图片
 * @param urls 图片URL数组
 * @returns 所有图片加载完成的Promise
 */
export function preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
  // 过滤掉空URL
  const validUrls = urls.filter(url => !!url);
  
  // 如果没有有效URL，返回空数组
  if (validUrls.length === 0) {
    return Promise.resolve([]);
  }
  
  // 并行加载所有图片
  return Promise.all(validUrls.map(url => preloadImage(url)));
}

/**
 * 从计划中预加载所有图片资源
 * @param plan 计划对象
 * @returns 所有图片加载完成的Promise
 */
export function preloadPlanImages(plan: any): Promise<HTMLImageElement[]> {
  if (!plan) {
    return Promise.resolve([]);
  }
  
  // 收集所有需要预加载的图片URL
  const imageUrls: string[] = [];
  
  // 添加计划级别的图片
  if (plan.background) imageUrls.push(plan.background);
  if (plan.labelBackground) imageUrls.push(plan.labelBackground);
  if (plan.foreground) imageUrls.push(plan.foreground);
  if (plan.cover) imageUrls.push(plan.cover);
  
  // 从localStorage获取布局模板
  try {
    const storedTemplates = localStorage.getItem('layoutTemplates');
    if (storedTemplates) {
      const templates = JSON.parse(storedTemplates);
      // 不再添加布局模板的缩略图，因为它们已经是data URL格式并存储在localStorage中
      // 这些缩略图会在需要时直接从localStorage读取
      console.log(`[imagePreloader.ts] 跳过预加载布局缩略图，它们已经缓存在localStorage中`);
    }
  } catch (error) {
    console.error('[imagePreloader.ts] 从localStorage加载布局模板失败:', error);
  }
  
  // 遍历所有分支
  if (plan.branches && Array.isArray(plan.branches)) {
    plan.branches.forEach((branch: any) => {
      // 遍历所有日程
      if (branch.schedules && Array.isArray(branch.schedules)) {
        branch.schedules.forEach((schedule: any) => {
          // 遍历所有布局
          if (schedule.layouts && Array.isArray(schedule.layouts)) {
            schedule.layouts.forEach((layout: any) => {
              // 添加布局级别的图片
              if (layout.background) imageUrls.push(layout.background);
              if (layout.labelBackground) imageUrls.push(layout.labelBackground);
              if (layout.foreground) imageUrls.push(layout.foreground);
              
              // 不再添加布局缩略图，因为它们已经是data URL格式并存储在localStorage中
            });
          }
        });
      }
    });
  }
  
  // 去重
  const uniqueUrls = [...new Set(imageUrls)];
  
  // 过滤掉data URL格式的图片，因为它们不需要预加载
  const urlsToPreload = uniqueUrls.filter(url => !isDataUrl(url));
  
  console.log(`[imagePreloader.ts] 开始预加载 ${urlsToPreload.length} 张图片，跳过 ${uniqueUrls.length - urlsToPreload.length} 张data URL格式图片`);
  
  // 预加载所有图片
  return preloadImages(urlsToPreload);
}

/**
 * 检查URL是否为data URL格式
 * @param url 图片URL
 * @returns 是否为data URL
 */
export function isDataUrl(url: string): boolean {
  return Boolean(url && typeof url === 'string' && url.startsWith('data:'));
}

/**
 * 获取已缓存的图片
 * @param url 图片URL
 * @returns 缓存的图片对象，如果不存在则返回null
 */
export function getCachedImage(url: string): HTMLImageElement | null {
  // 如果是data URL，不从缓存中获取
  if (isDataUrl(url)) {
    return null;
  }
  return imageCache.get(url) || null;
}

/**
 * 清除图片缓存
 * @param url 可选，指定要清除的URL，不指定则清除所有缓存
 */
export function clearImageCache(url?: string): void {
  if (url) {
    imageCache.delete(url);
    loadingPromises.delete(url);
    failedUrls.delete(url);
  } else {
    imageCache.clear();
    loadingPromises.clear();
    failedUrls.clear();
  }
}

/**
 * 获取缓存状态
 * @returns 缓存状态对象
 */
export function getCacheStatus(): { cached: number, loading: number, failed: number } {
  return {
    cached: imageCache.size,
    loading: loadingPromises.size,
    failed: failedUrls.size
  };
}

/**
 * 布局缩略图预加载结果
 */
export interface ThumbnailLoadResult {
  url: string;        // 最终使用的缩略图URL
  isRemote: boolean;  // 是否为远程缩略图
  success: boolean;   // 加载是否成功
}

/**
 * 判断URL是否可访问（是否可以成功加载）
 * @param url 要检查的URL
 * @param timeout 超时时间（毫秒），默认5秒
 * @returns 返回Promise<boolean>，true表示可访问，false表示不可访问
 */
export function isUrlAccessible(url: string, timeout = 5000): Promise<boolean> {
  // 如果URL为空或者是data URL，直接返回true
  if (!url || isDataUrl(url)) {
    return Promise.resolve(true);
  }
  
  // 如果已经在失败集合中，直接返回false
  if (failedUrls.has(url)) {
    return Promise.resolve(false);
  }
  
  // 如果已经在缓存中，直接返回true
  if (imageCache.has(url)) {
    return Promise.resolve(true);
  }
  
  // 创建一个Promise来检查URL是否可访问
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // 设置加载成功的处理函数
    img.onload = () => {
      // 加载成功，URL可访问
      resolve(true);
    };
    
    // 设置加载失败的处理函数
    img.onerror = () => {
      // 加载失败，URL不可访问
      failedUrls.add(url); // 添加到失败集合
      resolve(false);
    };
    
    // 设置超时处理
    const timeoutId = setTimeout(() => {
      // 超时，视为URL不可访问
      failedUrls.add(url); // 添加到失败集合
      resolve(false);
    }, timeout);
    
    // 开始加载图片
    img.src = url;
    
    // 如果图片已经加载完成（例如，从缓存中加载），清除定时器
    if (img.complete) {
      clearTimeout(timeoutId);
      resolve(true);
    }
  });
}

/**
 * 预加载并缓存布局缩略图
 * 如果从API传递的缩略图可访问，则使用远程缩略图
 * 否则使用本地生成的缩略图
 * @param templates 布局模板数组
 * @returns 所有缩略图加载结果的Promise
 */
export async function preloadLayoutThumbnails(templates: LayoutTemplate[]): Promise<ThumbnailLoadResult[]> {
  const results: ThumbnailLoadResult[] = [];
  
  // 处理每个模板的缩略图
  for (const template of templates) {
    try {
      // 如果没有缩略图URL或者是data URL或者是占位图，则使用本地生成的缩略图
      if (!template.thumbnail || 
          isDataUrl(template.thumbnail) || 
          template.thumbnail === '/assets/placeholder-layout.svg') {
        // 从本地生成缩略图
        const localThumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template);
        // 保存到缓存
        thumbnailCache.set(template.template, localThumbnailUrl);
        // 更新模板缩略图
        template.thumbnail = localThumbnailUrl;
        
        results.push({
          url: localThumbnailUrl,
          isRemote: false,
          success: true
        });
        
        console.log(`[imagePreloader.ts] 布局模板 ${template.template} 使用本地生成的缩略图`);
      } else {
        // 检查远程缩略图是否可访问
        const isAccessible = await isUrlAccessible(template.thumbnail);
        
        if (isAccessible) {
          // 远程缩略图可访问，预加载到缓存
          try {
            await preloadImage(template.thumbnail);
            // 将远程缩略图URL保存到缓存
            thumbnailCache.set(template.template, template.thumbnail);
            
            results.push({
              url: template.thumbnail,
              isRemote: true,
              success: true
            });
            
            console.log(`[imagePreloader.ts] 布局模板 ${template.template} 使用远程缩略图: ${template.thumbnail}`);
          } catch (error) {
            // 远程缩略图预加载失败，使用本地生成的
            const localThumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template);
            // 保存到缓存
            thumbnailCache.set(template.template, localThumbnailUrl);
            // 更新模板缩略图
            template.thumbnail = localThumbnailUrl;
            
            results.push({
              url: localThumbnailUrl,
              isRemote: false,
              success: true
            });
            
            console.log(`[imagePreloader.ts] 布局模板 ${template.template} 远程缩略图加载失败，使用本地生成的缩略图`);
          }
        } else {
          // 远程缩略图不可访问，使用本地生成的
          const localThumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template);
          // 保存到缓存
          thumbnailCache.set(template.template, localThumbnailUrl);
          // 更新模板缩略图
          template.thumbnail = localThumbnailUrl;
          
          results.push({
            url: localThumbnailUrl,
            isRemote: false,
            success: true
          });
          
          console.log(`[imagePreloader.ts] 布局模板 ${template.template} 远程缩略图不可访问，使用本地生成的缩略图`);
        }
      }
    } catch (error) {
      console.error(`[imagePreloader.ts] 处理布局模板 ${template.template} 缩略图时出错:`, error);
      
      // 出错时，确保模板有一个默认缩略图
      template.thumbnail = '/assets/placeholder-layout.svg';
      
      results.push({
        url: template.thumbnail,
        isRemote: false,
        success: false
      });
    }
  }
  
  return results;
}

/**
 * 获取布局缩略图
 * 先从缓存中获取，如果缓存中没有，再根据需要从远程或本地生成
 * @param templateId 布局模板ID
 * @param template 可选，布局模板对象
 * @returns 缩略图URL
 */
export async function getLayoutThumbnail(templateId: string, template?: LayoutTemplate): Promise<string> {
  // 首先从缩略图缓存中查找
  if (thumbnailCache.has(templateId)) {
    return thumbnailCache.get(templateId)!;
  }
  
  // 如果没有提供模板对象，无法生成，返回占位图
  if (!template) {
    return '/assets/placeholder-layout.svg';
  }
  
  try {
    // 检查模板是否已有缩略图
    if (template.thumbnail && !isDataUrl(template.thumbnail) && template.thumbnail !== '/assets/placeholder-layout.svg') {
      // 检查远程缩略图是否可访问
      const isAccessible = await isUrlAccessible(template.thumbnail);
      
      if (isAccessible) {
        // 远程缩略图可访问，预加载到缓存
        try {
          await preloadImage(template.thumbnail);
          // 将远程缩略图URL保存到缓存
          thumbnailCache.set(templateId, template.thumbnail);
          return template.thumbnail;
        } catch (error) {
          // 远程缩略图预加载失败，使用本地生成的
          console.warn(`[imagePreloader.ts] 布局模板 ${templateId} 远程缩略图加载失败，将使用本地生成的`);
        }
      } else {
        console.warn(`[imagePreloader.ts] 布局模板 ${templateId} 远程缩略图不可访问，将使用本地生成的`);
      }
    }
    
    // 使用本地生成的缩略图
    const localThumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template);
    // 保存到缓存
    thumbnailCache.set(templateId, localThumbnailUrl);
    return localThumbnailUrl;
  } catch (error) {
    console.error(`[imagePreloader.ts] 获取布局模板 ${templateId} 缩略图失败:`, error);
    return '/assets/placeholder-layout.svg';
  }
}

/**
 * 清除布局缩略图缓存
 * @param templateId 可选，指定要清除的模板ID，不指定则清除所有缓存
 */
export function clearThumbnailCache(templateId?: string): void {
  if (templateId) {
    thumbnailCache.delete(templateId);
  } else {
    thumbnailCache.clear();
  }
}

export default {
  preloadImage,
  preloadImages,
  preloadPlanImages,
  getCachedImage,
  clearImageCache,
  getCacheStatus,
  isUrlAccessible,
  preloadLayoutThumbnails,
  getLayoutThumbnail,
  clearThumbnailCache
}; 