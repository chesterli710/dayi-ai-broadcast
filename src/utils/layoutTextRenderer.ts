/**
 * 布局文字图层渲染工具类
 * 用于使用html2canvas绘制布局的文字图层
 */
import html2canvas from 'html2canvas';
import { usePlanStore } from '../stores/planStore';
import { LayoutElementType, type TextLayoutElement, type Layout, type Schedule } from '../types/broadcast';
import fontLoader, { FontLoadStatus } from './fontLoader';

/**
 * 布局文字图层渲染器类
 */
class LayoutTextRenderer {
  /**
   * 画布宽度
   */
  private readonly canvasWidth: number = 1920;
  
  /**
   * 画布高度
   */
  private readonly canvasHeight: number = 1080;
  
  /**
   * 渲染区域容器
   */
  private container: HTMLDivElement | null = null;
  
  /**
   * 字体系列名称
   */
  private readonly fontFamily: string = 'Source Han Sans CN';
  
  /**
   * 后备字体
   */
  private readonly fallbackFont: string = 'sans-serif';
  
  /**
   * 构造函数
   * 初始化时加载思源黑体字体
   */
  constructor() {
    // 尝试加载思源黑体字体
    this.loadFont();
  }
  
  /**
   * 加载思源黑体字体
   */
  private async loadFont(): Promise<void> {
    try {
      console.log('[layoutTextRenderer.ts 布局文字渲染器] 开始加载思源黑体字体');
      const status = await fontLoader.initializeNotoSansFont();
      console.log(`[layoutTextRenderer.ts 布局文字渲染器] 思源黑体字体加载状态: ${status}`);
    } catch (error) {
      console.error('[layoutTextRenderer.ts 布局文字渲染器] 思源黑体字体加载失败:', error);
    }
  }
  
  /**
   * 获取字体系列名称
   * 如果思源黑体字体已加载，则使用思源黑体字体，否则使用后备字体
   * @returns 字体系列名称
   */
  private getFontFamilyString(): string {
    return fontLoader.isFontReady(this.fontFamily) 
      ? `'${this.fontFamily}', ${this.fallbackFont}`
      : this.fallbackFont;
  }
  
  /**
   * 初始化渲染区域
   */
  private initRenderContainer(): void {
    // 如果已经存在容器，先移除
    if (this.container) {
      document.body.removeChild(this.container);
    }
    
    // 创建一个新的容器用于渲染
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.left = '-9999px';
    this.container.style.top = '-9999px';
    this.container.style.width = `${this.canvasWidth}px`;
    this.container.style.height = `${this.canvasHeight}px`;
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = 'transparent';
    
    // 设置默认字体，确保基础样式一致
    this.container.style.fontFamily = this.getFontFamilyString();
    
    // 将容器添加到文档中
    document.body.appendChild(this.container);
  }
  
  /**
   * 渲染布局文字图层
   * @param scheduleId 日程ID
   * @param layoutId 布局ID
   * @returns 返回Promise，解析为渲染后的Canvas元素
   */
  public async renderLayoutTextLayers(scheduleId: string, layoutId: number): Promise<HTMLCanvasElement> {
    // 初始化渲染容器
    this.initRenderContainer();
    if (!this.container) {
      throw new Error('[layoutTextRenderer.ts 布局文字渲染器] 无法创建渲染容器');
    }
    
    // 从planStore获取布局信息
    const planStore = usePlanStore();
    if (!planStore.currentBranch) {
      throw new Error('[layoutTextRenderer.ts 布局文字渲染器] 当前没有选中分支');
    }
    
    // 查找指定的日程
    const schedule = planStore.currentBranch.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      throw new Error(`[layoutTextRenderer.ts 布局文字渲染器] 未找到ID为${scheduleId}的日程`);
    }
    
    // 查找指定的布局
    const layout = schedule.layouts.find(l => l.id === layoutId);
    if (!layout) {
      throw new Error(`[layoutTextRenderer.ts 布局文字渲染器] 未找到ID为${layoutId}的布局`);
    }
    
    // 清空容器
    this.container.innerHTML = '';
    
    // 创建一个固定尺寸的div作为绘制区域
    const renderArea = document.createElement('div');
    renderArea.style.position = 'relative';
    renderArea.style.width = `${this.canvasWidth}px`;
    renderArea.style.height = `${this.canvasHeight}px`;
    renderArea.style.overflow = 'hidden';
    renderArea.style.fontFamily = this.getFontFamilyString();
    
    // 设置透明背景
    renderArea.style.backgroundColor = 'transparent';
    
    // 标记是否包含文字元素
    let hasTextElements = false;
    
    // 渲染各类文字图层
    if (layout.elements) {
      for (const element of layout.elements) {
        // 只处理文字类图层
        if (element.type && Object.values(LayoutElementType).includes(element.type as LayoutElementType) 
            && element.type !== LayoutElementType.MEDIA) {
          hasTextElements = true;
          const textElement = element as TextLayoutElement;
          
          switch (textElement.type) {
            case LayoutElementType.SUBJECT_LABEL:
              this.renderSubjectLabel(renderArea, textElement, layout, schedule);
              break;
            case LayoutElementType.SUBJECT_INFO:
              this.renderSubjectInfo(renderArea, textElement, layout, schedule);
              break;
            case LayoutElementType.HOST_LABEL:
              this.renderHostLabel(renderArea, textElement, layout, schedule);
              break;
            case LayoutElementType.HOST_INFO:
              this.renderHostInfo(renderArea, textElement, layout, schedule);
              break;
            case LayoutElementType.GUEST_LABEL:
              this.renderGuestLabel(renderArea, textElement, layout, schedule);
              break;
            case LayoutElementType.GUEST_INFO:
              this.renderGuestInfo(renderArea, textElement, layout, schedule);
              break;
          }
        }
      }
    }
    
    // 将绘制区域添加到容器中
    this.container.appendChild(renderArea);
    
    // 如果没有文字元素，直接返回一个空的透明画布
    if (!hasTextElements) {
      console.log('[layoutTextRenderer.ts 布局文字渲染器] 该布局没有文字元素，返回空画布');
      const emptyCanvas = document.createElement('canvas');
      emptyCanvas.width = this.canvasWidth;
      emptyCanvas.height = this.canvasHeight;
      const ctx = emptyCanvas.getContext('2d');
      if (ctx) {
        // 确保画布是透明的
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
      
      // 清理渲染容器
      if (this.container) {
        document.body.removeChild(this.container);
        this.container = null;
      }
      
      return emptyCanvas;
    }
    
    // 在开始渲染前确保字体已加载
    if (!fontLoader.isFontReady(this.fontFamily)) {
      console.log('[layoutTextRenderer.ts 布局文字渲染器] 思源黑体字体尚未加载完成，尝试重新加载');
      try {
        await fontLoader.initializeNotoSansFont();
      } catch (error) {
        console.warn('[layoutTextRenderer.ts 布局文字渲染器] 思源黑体字体加载失败，将使用后备字体:', error);
      }
    }
    
    // 使用html2canvas渲染为canvas
    try {
      console.log('[layoutTextRenderer.ts 布局文字渲染器] 开始渲染布局文字图层');
      const canvas = await html2canvas(renderArea, {
        width: this.canvasWidth,
        height: this.canvasHeight,
        backgroundColor: null, // 确保背景是透明的
        scale: 1,
        logging: false,
        allowTaint: true,
        useCORS: true,
        // 确保html2canvas正确使用加载的字体
        onclone: (document, element) => {
          // 在克隆的文档中添加字体样式
          const style = document.createElement('style');
          style.textContent = `
            * {
              font-family: ${this.getFontFamilyString()};
              background-color: transparent !important; /* 强制所有元素背景透明 */
            }
          `;
          document.head.appendChild(style);
        }
      });
      
      console.log('[layoutTextRenderer.ts 布局文字渲染器] 布局文字图层渲染完成');
      return canvas;
    } catch (error) {
      console.error('[layoutTextRenderer.ts 布局文字渲染器] 渲染布局文字图层失败:', error);
      throw error;
    } finally {
      // 清理渲染容器
      if (this.container) {
        document.body.removeChild(this.container);
        this.container = null;
      }
    }
  }
  
  /**
   * 渲染主题标签
   * @param container 渲染容器
   * @param element 文字元素配置
   * @param layout 布局配置
   * @param schedule 日程配置
   */
  private renderSubjectLabel(container: HTMLDivElement, element: TextLayoutElement, layout: Layout, schedule: Schedule): void {
    const labelDiv = this.createTextElement(element);
    
    // 获取标签显示文本
    let labelText = '主题';
    if (layout.subjectLabelDisplayName) {
      labelText = layout.subjectLabelDisplayName;
    } else if (schedule.type === 'lecture' && layout.speakerLabelDisplayName) {
      labelText = layout.speakerLabelDisplayName;
    } else if (schedule.type === 'surgery' && layout.surgeryLabelDisplayName) {
      labelText = layout.surgeryLabelDisplayName;
    }
    
    // 设置标签背景（如果有）
    if (layout.labelBackground) {
      labelDiv.style.backgroundImage = `url(${layout.labelBackground})`;
      labelDiv.style.backgroundSize = 'auto'; // 不拉伸
      labelDiv.style.backgroundRepeat = 'no-repeat'; // 不重复
      labelDiv.style.backgroundPosition = 'center center'; // 垂直水平居中
    }
    
    // 确保文本垂直水平居中
    labelDiv.style.display = 'flex';
    labelDiv.style.alignItems = 'center';
    labelDiv.style.justifyContent = 'center';
    labelDiv.style.textAlign = 'center';
    
    labelDiv.textContent = labelText;
    container.appendChild(labelDiv);
  }
  
  /**
   * 渲染主题信息
   * @param container 渲染容器
   * @param element 文字元素配置
   * @param layout 布局配置
   * @param schedule 日程配置
   */
  private renderSubjectInfo(container: HTMLDivElement, element: TextLayoutElement, layout: Layout, schedule: Schedule): void {
    const infoDiv = this.createTextElement(element);
    
    // 修改为flex容器，确保内容垂直居中
    infoDiv.style.display = 'flex';
    infoDiv.style.flexDirection = 'column';
    infoDiv.style.justifyContent = 'center'; // 垂直居中
    infoDiv.style.alignItems = 'center'; // 水平居中
    infoDiv.style.textAlign = 'center'; // 文本居中
    
    // 根据日程类型获取内容
    let content = '';
    if (schedule.type === 'lecture' && schedule.lectureInfo) {
      content = schedule.lectureInfo.topic;
    } else if (schedule.type === 'surgery' && schedule.surgeryInfo) {
      content = schedule.surgeryInfo.procedure;
    }
    
    infoDiv.textContent = content;
    container.appendChild(infoDiv);
  }
  
  /**
   * 渲染主持人标签
   * @param container 渲染容器
   * @param element 文字元素配置
   * @param layout 布局配置
   * @param schedule 日程配置
   */
  private renderHostLabel(container: HTMLDivElement, element: TextLayoutElement, layout: Layout, schedule: Schedule): void {
    const labelDiv = this.createTextElement(element);
    
    // 获取标签显示文本
    let labelText = '讲者';
    if (schedule.type === 'lecture' && layout.speakerLabelDisplayName) {
      labelText = layout.speakerLabelDisplayName;
    } else if (schedule.type === 'surgery' && layout.surgeonLabelDisplayName) {
      labelText = layout.surgeonLabelDisplayName;
    }
    
    // 设置标签背景（如果有）
    if (layout.labelBackground) {
      labelDiv.style.backgroundImage = `url(${layout.labelBackground})`;
      labelDiv.style.backgroundSize = 'auto'; // 不拉伸
      labelDiv.style.backgroundRepeat = 'no-repeat'; // 不重复
      labelDiv.style.backgroundPosition = 'center center'; // 垂直水平居中
    }
    
    // 确保文本垂直水平居中
    labelDiv.style.display = 'flex';
    labelDiv.style.alignItems = 'center';
    labelDiv.style.justifyContent = 'center';
    labelDiv.style.textAlign = 'center';
    
    labelDiv.textContent = labelText;
    container.appendChild(labelDiv);
  }
  
  /**
   * 渲染主持人信息
   * @param container 渲染容器
   * @param element 文字元素配置
   * @param layout 布局配置
   * @param schedule 日程配置
   */
  private renderHostInfo(container: HTMLDivElement, element: TextLayoutElement, layout: Layout, schedule: Schedule): void {
    const infoDiv = this.createTextElement(element);
    
    // 修改为flex容器，确保所有行垂直居中
    infoDiv.style.display = 'flex';
    infoDiv.style.flexDirection = 'column';
    infoDiv.style.justifyContent = 'center'; // 垂直居中
    infoDiv.style.alignItems = 'center'; // 水平居中
    infoDiv.style.textAlign = 'center'; // 文本居中
    
    // 获取字体大小、字重和颜色
    const originalFontSize = element.fontStyle?.fontSize || 24;
    const originalFontWeight = element.fontStyle?.fontWeight || 'normal';
    const fontColor = element.fontStyle?.fontColor || '#ffffff'; // 默认白色
    
    // 计算降级后的字体大小和字重
    const reducedFontSize = Math.max(originalFontSize - 4, 12); // 最小不低于12px
    const reducedFontWeight = this.getReducedFontWeight(originalFontWeight);
    
    // 获取人员信息
    let people: any[] = [];
    if (schedule.type === 'lecture' && schedule.lectureInfo && schedule.lectureInfo.speakers.length > 0) {
      people = schedule.lectureInfo.speakers;
    } else if (schedule.type === 'surgery' && schedule.surgeryInfo && schedule.surgeryInfo.surgeons.length > 0) {
      people = schedule.surgeryInfo.surgeons;
    }
    
    // 如果没有人员信息，直接返回
    if (people.length === 0) {
      container.appendChild(infoDiv);
      return;
    }
    
    // 根据人员数量不同，生成不同的HTML内容
    let htmlContent = '';
    
    if (people.length === 1) {
      // 1名术者/讲者，处理姓名（如果是两个字，则添加全角空格）
      const name = this.formatName(people[0].name);
      
      // 第一行：姓名+称谓
      htmlContent += `<div style="line-height: 1.2; color: ${fontColor};">
        <span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name}</span>`;
      
      // 如果有称谓，添加称谓
      if (people[0].title) {
        htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${people[0].title}</span>`;
      }
      
      htmlContent += `</div>`;
      
      // 第二行：单位（如果有）
      if (people[0].organization) {
        htmlContent += `<div style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; line-height: 1.2; color: ${fontColor};">${people[0].organization}</div>`;
      }
    } else if (people.length === 2) {
      // 2名术者/讲者
      const name1 = this.formatName(people[0].name);
      const name2 = this.formatName(people[1].name);
      
      // 第一行：术者1姓名 术者1称谓 / 术者2姓名 术者2称谓
      htmlContent += `<div style="line-height: 1.2; color: ${fontColor};">`;
      
      // 术者1
      htmlContent += `<span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name1}</span>`;
      if (people[0].title) {
        htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${people[0].title}</span>`;
      }
      
      // 分隔符
      htmlContent += `<span style="font-size: ${originalFontSize}px; color: ${fontColor};"> / </span>`;
      
      // 术者2
      htmlContent += `<span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name2}</span>`;
      if (people[1].title) {
        htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${people[1].title}</span>`;
      }
      
      htmlContent += `</div>`;
      
      // 第二行：术者1单位
      if (people[0].organization) {
        htmlContent += `<div style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; line-height: 1.2; color: ${fontColor};">${people[0].organization}</div>`;
      }
    } else if (people.length >= 3) {
      // 3名术者/讲者
      const name1 = this.formatName(people[0].name);
      const name2 = this.formatName(people[1].name);
      const name3 = this.formatName(people[2].name);
      
      // 第一行：术者1姓名 术者1称谓
      htmlContent += `<div style="line-height: 1.2; color: ${fontColor};">
        <span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name1}</span>`;
      if (people[0].title) {
        htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${people[0].title}</span>`;
      }
      htmlContent += `</div>`;
      
      // 第二行：术者2姓名 术者2称谓
      htmlContent += `<div style="line-height: 1.2; color: ${fontColor};">
        <span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name2}</span>`;
      if (people[1].title) {
        htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${people[1].title}</span>`;
      }
      htmlContent += `</div>`;
      
      // 第三行：术者3姓名 术者3称谓
      htmlContent += `<div style="line-height: 1.2; color: ${fontColor};">
        <span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name3}</span>`;
      if (people[2].title) {
        htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${people[2].title}</span>`;
      }
      htmlContent += `</div>`;
      
      // 第四行：术者1单位
      if (people[0].organization) {
        htmlContent += `<div style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; line-height: 1.2; color: ${fontColor};">${people[0].organization}</div>`;
      }
    }
    
    // 设置HTML内容
    infoDiv.innerHTML = htmlContent;
    
    // 添加到容器
    container.appendChild(infoDiv);
  }
  
  /**
   * 获取降级后的字体权重
   * @param originalWeight 原始字体权重
   * @returns 降级后的字体权重
   */
  private getReducedFontWeight(originalWeight: string): string {
    switch (originalWeight) {
      case 'bold':
        return 'medium';
      case 'medium':
        return 'normal';
      default:
        return 'normal';
    }
  }
  
  /**
   * 获取字体权重的CSS值
   * @param weight 字体权重名称
   * @returns CSS字体权重值
   */
  private getFontWeightValue(weight: string): string {
    switch (weight) {
      case 'bold':
        return '700';
      case 'medium':
        return '500';
      default:
        return '400';
    }
  }
  
  /**
   * 格式化姓名，如果是两个汉字则添加全角空格
   * @param name 姓名
   * @returns 格式化后的姓名
   */
  private formatName(name: string): string {
    // 判断是否为两个汉字的中文名
    if (/^[\u4e00-\u9fa5]{2}$/.test(name)) {
      // 在两个汉字中间插入全角空格
      return name.charAt(0) + '　' + name.charAt(1);
    }
    return name;
  }
  
  /**
   * 渲染嘉宾标签
   * @param container 渲染容器
   * @param element 文字元素配置
   * @param layout 布局配置
   * @param schedule 日程配置
   */
  private renderGuestLabel(container: HTMLDivElement, element: TextLayoutElement, layout: Layout, schedule: Schedule): void {
    const labelDiv = this.createTextElement(element);
    
    // 获取标签显示文本
    let labelText = '互动嘉宾';
    if (layout.guestLabelDisplayName) {
      labelText = layout.guestLabelDisplayName;
    }
    
    // 设置标签背景（如果有）
    if (layout.labelBackground) {
      labelDiv.style.backgroundImage = `url(${layout.labelBackground})`;
      labelDiv.style.backgroundSize = 'auto'; // 不拉伸
      labelDiv.style.backgroundRepeat = 'no-repeat'; // 不重复
      labelDiv.style.backgroundPosition = 'center center'; // 垂直水平居中
    }
    
    // 确保文本垂直水平居中
    labelDiv.style.display = 'flex';
    labelDiv.style.alignItems = 'center';
    labelDiv.style.justifyContent = 'center';
    labelDiv.style.textAlign = 'center';
    
    labelDiv.textContent = labelText;
    container.appendChild(labelDiv);
  }
  
  /**
   * 渲染嘉宾信息
   * @param container 渲染容器
   * @param element 文字元素配置
   * @param layout 布局配置
   * @param schedule 日程配置
   */
  private renderGuestInfo(container: HTMLDivElement, element: TextLayoutElement, layout: Layout, schedule: Schedule): void {
    const infoDiv = this.createTextElement(element);
    
    // 修改为flex容器，确保内容垂直居中
    infoDiv.style.display = 'flex';
    infoDiv.style.flexDirection = 'column';
    infoDiv.style.justifyContent = 'center'; // 垂直居中
    infoDiv.style.alignItems = 'center'; // 水平居中（修改为居中）
    infoDiv.style.textAlign = 'center'; // 文本居中
    
    // 获取字体大小、字重和颜色
    const originalFontSize = element.fontStyle?.fontSize || 24;
    const originalFontWeight = element.fontStyle?.fontWeight || 'normal';
    const fontColor = element.fontStyle?.fontColor || '#ffffff'; // 默认白色
    
    // 计算降级后的字体大小和字重
    const reducedFontSize = Math.max(originalFontSize - 4, 12); // 最小不低于12px
    const reducedFontWeight = this.getReducedFontWeight(originalFontWeight);
    
    // 获取嘉宾信息
    let guests: any[] = [];
    if (schedule.type === 'lecture' && schedule.lectureInfo && schedule.lectureInfo.guests) {
      guests = schedule.lectureInfo.guests;
    } else if (schedule.type === 'surgery' && schedule.surgeryInfo && schedule.surgeryInfo.guests) {
      guests = schedule.surgeryInfo.guests;
    }
    
    // 如果没有嘉宾信息，直接返回
    if (guests.length === 0) {
      container.appendChild(infoDiv);
      return;
    }
    
    let htmlContent = '';
    
    // 根据嘉宾数量采用不同的布局
    if (guests.length <= 4) {
      // 1-4名嘉宾：垂直排列，每个嘉宾占两行
      for (const guest of guests) {
        // 格式化嘉宾姓名
        const name = this.formatName(guest.name);
        
        // 第一行：嘉宾姓名 + 称谓
        htmlContent += `<div style="line-height: 1.2; color: ${fontColor}; margin-bottom: 2px; text-align: center;">
          <span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name}</span>`;
        
        // 如果有称谓，添加称谓
        if (guest.title) {
          htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${guest.title}</span>`;
        }
        
        htmlContent += `</div>`;
        
        // 第二行：医院/单位（如果有）
        if (guest.organization) {
          htmlContent += `<div style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; line-height: 1.2; color: ${fontColor}; margin-bottom: 8px; text-align: center;">${guest.organization}</div>`;
        }
      }
    } else {
      // 5名及以上嘉宾：两列式布局
      htmlContent += '<div style="display: grid; grid-template-columns: 1fr 1fr; grid-gap: 10px; width: 100%; text-align: center;">';
      
      for (const guest of guests) {
        // 格式化嘉宾姓名
        const name = this.formatName(guest.name);
        
        // 每个嘉宾一个单元格
        htmlContent += `<div style="line-height: 1.2; margin-bottom: 8px; text-align: center;">
          <div style="color: ${fontColor}; text-align: center;">
            <span style="font-size: ${originalFontSize}px; font-weight: ${this.getFontWeightValue(originalFontWeight)}; color: ${fontColor};">${name}</span>`;
        
        // 如果有称谓，添加称谓
        if (guest.title) {
          htmlContent += `<span style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; color: ${fontColor};">&nbsp;${guest.title}</span>`;
        }
        
        htmlContent += `</div>`;
        
        // 医院/单位（如果有）
        if (guest.organization) {
          htmlContent += `<div style="font-size: ${reducedFontSize}px; font-weight: ${this.getFontWeightValue(reducedFontWeight)}; line-height: 1.2; color: ${fontColor}; text-align: center;">${guest.organization}</div>`;
        }
        
        htmlContent += `</div>`;
      }
      
      htmlContent += '</div>';
    }
    
    // 设置HTML内容
    infoDiv.innerHTML = htmlContent;
    
    // 添加到容器
    container.appendChild(infoDiv);
  }
  
  /**
   * 创建文字元素
   * @param element 文字元素配置
   * @returns 创建的DOM元素
   */
  private createTextElement(element: TextLayoutElement): HTMLDivElement {
    const div = document.createElement('div');
    
    // 设置基本样式
    div.style.position = 'absolute';
    div.style.left = `${element.x}px`;
    div.style.top = `${element.y}px`;
    div.style.width = `${element.width}px`;
    div.style.height = `${element.height}px`;
    
    if (element.zIndex !== undefined) {
      div.style.zIndex = element.zIndex.toString();
    }
    
    // 设置字体系列
    div.style.fontFamily = this.getFontFamilyString();
    
    // 设置行高为字体大小的1.2倍
    div.style.lineHeight = '1.2';
    
    // 设置字体样式
    if (element.fontStyle) {
      div.style.fontSize = `${element.fontStyle.fontSize}px`;
      // 将字体权重映射到思源黑体的可用权重
      switch (element.fontStyle.fontWeight) {
        case 'bold':
          div.style.fontWeight = '700'; // 对应思源黑体的Bold
          break;
        case 'medium':
          div.style.fontWeight = '500'; // 对应思源黑体的Medium
          break;
        default:
          div.style.fontWeight = '400'; // 对应思源黑体的Regular
      }
      div.style.color = element.fontStyle.fontColor;
    }
    
    // 无论orientation设置都使用水平排列
    // 但保留orientation属性以便在特定类型的文字图层中使用
    
    // 文本居中显示
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.textAlign = 'center';
    div.style.overflow = 'hidden';
    
    return div;
  }
}

// 创建单例实例
const layoutTextRenderer = new LayoutTextRenderer();

export default layoutTextRenderer; 