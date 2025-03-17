/**
 * 图片预加载工具类
 * 用于提前加载和缓存背景图、标签背景和前景图等资源
 */

// 图片缓存映射表
const imageCache: Map<string, HTMLImageElement> = new Map();

// 正在加载的图片Promise映射表
const loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

/**
 * 预加载单个图片
 * @param url 图片URL
 * @returns 加载图片的Promise
 */
export function preloadImage(url: string): Promise<HTMLImageElement> {
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
      reject(error);
    };
    
    // 设置超时处理
    setTimeout(() => {
      if (!img.complete) {
        console.warn(`[imagePreloader.ts] 图片预加载超时: ${url}`);
        loadingPromises.delete(url);
        reject(new Error('图片加载超时'));
      }
    }, 10000);
    
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
  } else {
    imageCache.clear();
    loadingPromises.clear();
  }
}

/**
 * 获取缓存状态
 * @returns 缓存状态对象
 */
export function getCacheStatus(): { cached: number, loading: number } {
  return {
    cached: imageCache.size,
    loading: loadingPromises.size
  };
}

export default {
  preloadImage,
  preloadImages,
  preloadPlanImages,
  getCachedImage,
  clearImageCache,
  getCacheStatus
}; 