/**
 * 字体加载工具
 * 用于加载和检查字体状态
 */

/**
 * 字体加载状态枚举
 */
export enum FontLoadStatus {
  NOT_LOADED = 'not_loaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

/**
 * 字体加载信息
 */
interface FontLoadInfo {
  status: FontLoadStatus;
  retries: number;
  error?: any;
}

// 存储字体加载状态
const fontStatus: Record<string, FontLoadInfo> = {};

// 最大重试次数
const MAX_RETRIES = 3;

// 存储已加载的字体状态
const loadedFonts: Map<string, FontLoadStatus> = new Map();

/**
 * 字体权重地址映射
 */
interface FontWeightURLMap {
  [weight: string]: string;
}

/**
 * 获取正确的资源URL
 * 在不同环境中处理资源路径
 * @param url 原始URL
 * @returns 处理后的URL
 */
function getAssetUrl(url: string): string {
  // 判断是否为绝对路径
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // 移除开头的斜杠以确保相对路径正确
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  
  // 如果是开发环境，直接使用路径
  // 如果是生产环境，使用相对路径
  if (import.meta.env.DEV) {
    return `/${cleanUrl}`;
  } else {
    // 在Electron打包环境中，使用相对路径
    return `./${cleanUrl}`;
  }
}

/**
 * 加载字体
 * @param fontFamily 字体名称
 * @param weightURLs 字体权重与URL的映射
 * @returns 字体加载状态
 */
export async function loadFont(fontFamily: string, weightURLs: FontWeightURLMap): Promise<FontLoadStatus> {
  console.log(`[fontLoader.ts] 开始加载字体: ${fontFamily}`);
  
  // 如果字体已经加载，直接返回
  if (loadedFonts.get(fontFamily) === FontLoadStatus.LOADED) {
    console.log(`[fontLoader.ts] 字体已加载: ${fontFamily}`);
    return FontLoadStatus.LOADED;
  }
  
  // 设置字体加载状态为加载中
  loadedFonts.set(fontFamily, FontLoadStatus.LOADING);
  
  try {
    // 创建字体加载Promise数组
    const fontPromises: Promise<void>[] = [];
    
    // 遍历每个字体权重
    for (const [weight, url] of Object.entries(weightURLs)) {
      // 处理URL以确保在不同环境下都能正确加载
      const processedUrl = getAssetUrl(url);
      console.log(`[fontLoader.ts] 字体文件URL(权重 ${weight}): ${processedUrl}`);
      
      // 创建新的FontFace对象
      const font = new FontFace(fontFamily, `url(${processedUrl})`, {
        weight,
        style: 'normal',
        display: 'swap'
      });
      
      // 添加到字体加载Promise数组
      fontPromises.push(
        font.load()
          .then((loadedFont) => {
            // 将加载的字体添加到文档中
            document.fonts.add(loadedFont);
            console.log(`[fontLoader.ts] 字体权重 ${weight} 加载成功: ${fontFamily}`);
          })
          .catch(error => {
            console.error(`[fontLoader.ts] 字体权重 ${weight} 加载失败: ${fontFamily}`, error);
            throw error;
          })
      );
    }
    
    // 等待所有字体加载完成
    await Promise.all(fontPromises);
    
    // 更新字体加载状态为已加载
    loadedFonts.set(fontFamily, FontLoadStatus.LOADED);
    console.log(`[fontLoader.ts] 所有字体权重加载完成: ${fontFamily}`);
    
    return FontLoadStatus.LOADED;
  } catch (error) {
    // 更新字体加载状态为错误
    loadedFonts.set(fontFamily, FontLoadStatus.ERROR);
    console.error(`[fontLoader.ts] 字体加载失败: ${fontFamily}`, error);
    return FontLoadStatus.ERROR;
  }
}

/**
 * 检查字体是否已加载
 * @param fontFamily 字体系列名称
 * @returns 字体加载状态
 */
export function getFontStatus(fontFamily: string): FontLoadStatus {
  return fontStatus[fontFamily]?.status || FontLoadStatus.LOADING;
}

/**
 * 检查字体是否可用（已加载或加载失败）
 * @param fontFamily 字体系列名称
 * @returns 是否可用
 */
export function isFontReady(fontFamily: string): boolean {
  const status = loadedFonts.get(fontFamily);
  return status === FontLoadStatus.LOADED;
}

/**
 * 获取适当的字体名称
 * @param fontFamily 首选字体名称
 * @param fallback 后备字体名称
 * @returns 合适的字体名称
 */
export function getFontFamily(fontFamily: string, fallback: string = 'sans-serif'): string {
  const status = getFontStatus(fontFamily);
  return status === FontLoadStatus.LOADED ? `'${fontFamily}', ${fallback}` : fallback;
}

/**
 * 初始化思源黑体字体
 * 应在应用启动时调用
 */
export async function initializeNotoSansFont(): Promise<FontLoadStatus> {
  return loadFont('Source Han Sans CN', {
    '400': 'fonts/SourceHanSansCN-Regular.woff2',
    '500': 'fonts/SourceHanSansCN-Medium.woff2',
    '700': 'fonts/SourceHanSansCN-Bold.woff2'
  });
}

// 导出默认对象
export default {
  loadFont,
  getFontStatus,
  isFontReady,
  getFontFamily,
  initializeNotoSansFont,
  FontLoadStatus
}; 