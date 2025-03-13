/**
 * 主题类型
 */
export type ThemeType = 'default' | 'dark' | 'custom';

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  // 主色调
  primary: string;
  // 成功色
  success: string;
  // 警告色
  warning: string;
  // 危险色
  danger: string;
  // 信息色
  info: string;
}

/**
 * 主题管理类
 * 负责管理应用的主题配置和切换
 */
class ThemeManager {
  /**
   * 当前主题
   */
  private currentTheme: ThemeType = 'default';
  
  /**
   * 默认主题配置
   */
  private defaultTheme: ThemeConfig = {
    primary: '#409eff',
    success: '#67c23a',
    warning: '#e6a23c',
    danger: '#f56c6c',
    info: '#909399'
  };
  
  /**
   * 自定义主题配置
   */
  private customTheme: ThemeConfig = {
    primary: '#409eff',
    success: '#67c23a',
    warning: '#e6a23c',
    danger: '#f56c6c',
    info: '#909399'
  };
  
  /**
   * 初始化主题
   */
  public init(): void {
    // 从本地存储加载主题设置
    const savedTheme = localStorage.getItem('theme');
    const savedCustomTheme = localStorage.getItem('customTheme');
    
    if (savedTheme) {
      this.currentTheme = savedTheme as ThemeType;
    }
    
    if (savedCustomTheme) {
      try {
        this.customTheme = JSON.parse(savedCustomTheme);
      } catch (e) {
        console.error('解析自定义主题配置失败', e);
      }
    }
    
    // 应用主题
    this.applyTheme();
  }
  
  /**
   * 切换主题
   * @param theme - 主题类型
   */
  public switchTheme(theme: ThemeType): void {
    this.currentTheme = theme;
    // 保存到本地存储
    localStorage.setItem('theme', theme);
    // 应用主题
    this.applyTheme();
  }
  
  /**
   * 设置自定义主题
   * @param config - 主题配置
   */
  public setCustomTheme(config: Partial<ThemeConfig>): void {
    this.customTheme = { ...this.customTheme, ...config };
    // 保存到本地存储
    localStorage.setItem('customTheme', JSON.stringify(this.customTheme));
    // 如果当前是自定义主题，则应用
    if (this.currentTheme === 'custom') {
      this.applyTheme();
    }
  }
  
  /**
   * 获取当前主题
   * @returns 当前主题类型
   */
  public getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }
  
  /**
   * 获取自定义主题配置
   * @returns 自定义主题配置
   */
  public getCustomTheme(): ThemeConfig {
    return { ...this.customTheme };
  }
  
  /**
   * 应用主题
   */
  private applyTheme(): void {
    const html = document.documentElement;
    
    // 移除所有主题相关的类
    html.classList.remove('dark');
    html.classList.remove('custom');
    
    // 应用当前主题
    switch (this.currentTheme) {
      case 'dark':
        html.classList.add('dark');
        break;
      case 'custom':
        html.classList.add('custom');
        this.applyCustomTheme();
        break;
      default:
        // 默认主题不需要添加类
        break;
    }
  }
  
  /**
   * 应用自定义主题
   */
  private applyCustomTheme(): void {
    const style = document.documentElement.style;
    
    // 设置主色调
    style.setProperty('--el-color-primary', this.customTheme.primary);
    // 生成主色调的不同亮度
    this.generatePrimaryColors(this.customTheme.primary);
    
    // 设置其他颜色
    style.setProperty('--el-color-success', this.customTheme.success);
    style.setProperty('--el-color-warning', this.customTheme.warning);
    style.setProperty('--el-color-danger', this.customTheme.danger);
    style.setProperty('--el-color-info', this.customTheme.info);
  }
  
  /**
   * 生成主色调的不同亮度
   * @param primary - 主色调
   */
  private generatePrimaryColors(primary: string): void {
    const style = document.documentElement.style;
    
    // 将十六进制颜色转换为 RGB
    const rgb = this.hexToRgb(primary);
    if (!rgb) return;
    
    // 设置不同亮度的主色调
    style.setProperty('--el-color-primary-light-3', this.lighten(rgb, 0.2));
    style.setProperty('--el-color-primary-light-5', this.lighten(rgb, 0.3));
    style.setProperty('--el-color-primary-light-7', this.lighten(rgb, 0.5));
    style.setProperty('--el-color-primary-light-8', this.lighten(rgb, 0.6));
    style.setProperty('--el-color-primary-light-9', this.lighten(rgb, 0.8));
    style.setProperty('--el-color-primary-dark-2', this.darken(rgb, 0.1));
  }
  
  /**
   * 将十六进制颜色转换为 RGB
   * @param hex - 十六进制颜色
   * @returns RGB 颜色对象
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // 移除 # 号
    hex = hex.replace(/^#/, '');
    
    // 解析十六进制颜色
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    
    return { r, g, b };
  }
  
  /**
   * 使颜色变亮
   * @param rgb - RGB 颜色对象
   * @param amount - 变亮的程度 (0-1)
   * @returns 变亮后的颜色
   */
  private lighten(rgb: { r: number; g: number; b: number }, amount: number): string {
    const { r, g, b } = rgb;
    const lightenColor = {
      r: Math.round(r + (255 - r) * amount),
      g: Math.round(g + (255 - g) * amount),
      b: Math.round(b + (255 - b) * amount)
    };
    
    return `rgb(${lightenColor.r}, ${lightenColor.g}, ${lightenColor.b})`;
  }
  
  /**
   * 使颜色变暗
   * @param rgb - RGB 颜色对象
   * @param amount - 变暗的程度 (0-1)
   * @returns 变暗后的颜色
   */
  private darken(rgb: { r: number; g: number; b: number }, amount: number): string {
    const { r, g, b } = rgb;
    const darkenColor = {
      r: Math.round(r * (1 - amount)),
      g: Math.round(g * (1 - amount)),
      b: Math.round(b * (1 - amount))
    };
    
    return `rgb(${darkenColor.r}, ${darkenColor.g}, ${darkenColor.b})`;
  }
}

// 导出主题管理实例
export default new ThemeManager(); 