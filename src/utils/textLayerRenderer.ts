/**
 * 文字图层渲染器
 * 使用html2canvas库将文字内容渲染为图像
 */
import html2canvas from 'html2canvas';
import type { Layout, TextLayoutElement, Schedule, PersonInfo } from '../types/broadcast';
import { LayoutElementType, ScheduleType } from '../types/broadcast';
import { usePlanStore } from '../stores/planStore';

/**
 * 文字图层渲染器
 * 负责将布局中的文字元素渲染为图像，提供高质量文字渲染
 * 注意：渲染尺寸始终为1920*1080，与画布保持一致
 */
export class TextLayerRenderer {
  // 渲染尺寸固定为1920*1080
  private readonly width: number = 1920;
  private readonly height: number = 1080;
  
  // 当前布局
  private currentLayout: Layout | null = null;
  
  // 用于渲染的DOM容器
  private container: HTMLDivElement | null = null;
  
  // 计划存储
  private planStore = usePlanStore();
  
  /**
   * 构造函数
   */
  constructor() {
    console.log(`[textLayerRenderer.ts] 文字渲染器创建完成`);
    
    // 创建渲染容器
    this.createRenderContainer();
  }
  
  /**
   * 创建渲染容器
   * 为html2canvas创建一个隐藏的DOM容器
   */
  private createRenderContainer(): void {
    // 检查是否已经存在容器
    if (this.container) {
      return;
    }
    
    try {
      // 创建一个隐藏的div用于渲染
      this.container = document.createElement('div');
      this.container.id = `text-layer-container`;
      
      // 确保容器完全隐藏且不影响页面布局
      this.container.style.position = 'fixed';
      this.container.style.left = '-10000px';
      this.container.style.top = '-10000px';
      this.container.style.width = `${this.width}px`;
      this.container.style.height = `${this.height}px`;
      this.container.style.overflow = 'hidden';
      this.container.style.visibility = 'hidden';
      this.container.style.pointerEvents = 'none';
      this.container.style.zIndex = '-9999';
      this.container.style.opacity = '0';
      this.container.style.backgroundColor = 'transparent';
      
      // 创建一个隐藏的包装器，进一步确保容器不可见
      const wrapper = document.createElement('div');
      wrapper.id = `text-layer-wrapper`;
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-10000px';
      wrapper.style.top = '-10000px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.visibility = 'hidden';
      wrapper.style.width = '0px';
      wrapper.style.height = '0px';
      wrapper.style.pointerEvents = 'none';
      
      // 将容器添加到包装器，然后将包装器添加到body
      wrapper.appendChild(this.container);
      document.body.appendChild(wrapper);
      
      console.log(`[textLayerRenderer.ts] 渲染容器已创建`, this.container);
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 创建渲染容器时出错:`, error);
    }
  }
  
  /**
   * 设置布局
   * @param layout 布局数据
   */
  public setLayout(layout: Layout | null): void {
    console.log(`[textLayerRenderer.ts] 设置布局:`, layout?.id);
    
    // 更新当前布局
    this.currentLayout = layout;
  }
  
  /**
   * 渲染文字图层
   * @param layout 布局数据
   * @param schedule 日程数据
   * @returns 渲染后的图像位图
   */
  public async renderTextLayer(layout: Layout | null, schedule: Schedule | null): Promise<ImageBitmap | null> {
    // 如果没有布局数据或日程数据，返回null
    if (!layout || !schedule) {
      console.warn(`[textLayerRenderer.ts] 没有布局数据或日程数据，无法渲染文字图层`);
      return null;
    }
    
    // 更新当前布局
    this.setLayout(layout);
    
    // 如果没有文本元素，返回null
    const textElements = this.getTextElements(layout);
    if (textElements.length === 0) {
      console.log(`[textLayerRenderer.ts] 没有文本元素，跳过渲染`);
      return null;
    }
    
    try {
      // 检查document和body是否可用（在某些环境下可能不存在）
      if (typeof document === 'undefined' || !document.body) {
        console.error(`[textLayerRenderer.ts] 无法访问document或body元素`);
        return null;
      }
      
      // 清除可能存在的旧容器
      this.cleanupContainer();
      
      // 确保创建新的容器
      this.createRenderContainer();
      
      // 准备渲染容器
      this.prepareRenderContainer(layout, textElements, schedule);
      
      // 确保DOM更新已完成
      await new Promise(resolve => setTimeout(resolve, 50)); // 延长等待时间确保DOM更新完成
      
      // 检查DOM状态
      if (!this.validateDOMState()) {
        // 如果DOM状态无效，尝试重新创建容器
        console.warn(`[textLayerRenderer.ts] DOM状态无效，尝试重新创建渲染容器`);
        this.cleanupContainer();
        this.createRenderContainer();
        this.prepareRenderContainer(layout, textElements, schedule);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 再次检查DOM状态
        if (!this.validateDOMState()) {
          console.error(`[textLayerRenderer.ts] 无法创建有效的DOM结构，无法渲染文字图层`);
          return null;
        }
      }
      
      // 使用html2canvas渲染容器内容
      console.log(`[textLayerRenderer.ts] 开始使用html2canvas渲染`);
      const canvas = await html2canvas(this.container!, {
        backgroundColor: null, // 透明背景
        scale: 1, // 使用固定缩放因子，不依赖设备像素比
        logging: false, // 关闭日志
        useCORS: true,  // 允许加载跨域资源
        allowTaint: true, // 允许污染画布
        width: this.width,
        height: this.height,
        x: 0,
        y: 0,
        removeContainer: false, // 保留容器以便清理
        imageTimeout: 0, // 不限制图像加载超时
        foreignObjectRendering: false, // 关闭foreignObject渲染
        onclone: (documentClone) => {
          // 在克隆的文档中处理样式，确保文字正确渲染
          const containerClone = documentClone.getElementById(`text-layer-container`);
          if (containerClone) {
            containerClone.style.visibility = 'visible';
            containerClone.style.opacity = '1';
            containerClone.style.left = '0';
            containerClone.style.top = '0';
            
            // 确保所有文本元素在克隆文档中可见
            const textDivs = containerClone.querySelectorAll('div');
            textDivs.forEach(div => {
              div.style.visibility = 'visible';
              div.style.opacity = '1';
              div.style.display = 'block';
            });
          }
          return documentClone;
        }
      });
      
      console.log(`[textLayerRenderer.ts] html2canvas渲染完成，画布尺寸:`, {
        width: canvas.width,
        height: canvas.height
      });
      
      // 将canvas转换为ImageBitmap并立即返回，不进行缓存
      const imageBitmap = await createImageBitmap(canvas);
      
      console.log(`[textLayerRenderer.ts] 渲染完成，返回图像位图`);
      
      // 返回渲染后的图像
      return imageBitmap;
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 渲染文字图层时出错:`, error);
      return null;
    }
  }
  
  /**
   * 验证DOM状态
   * 检查容器是否正确添加到DOM中
   */
  private validateDOMState(): boolean {
    // 检查容器是否存在
    if (!this.container) {
      console.error(`[textLayerRenderer.ts] 容器不存在`);
      return false;
    }
    
    // 检查容器是否有父节点
    if (!this.container.parentNode) {
      console.error(`[textLayerRenderer.ts] 容器没有父节点`);
      return false;
    }
    
    // 检查父节点是否在DOM中
    const wrapper = this.container.parentNode;
    if (!document.body.contains(wrapper as Node)) {
      console.error(`[textLayerRenderer.ts] 容器的父节点不在DOM树中`);
      return false;
    }
    
    // 检查容器是否有内容
    if (this.container.childNodes.length === 0) {
      console.warn(`[textLayerRenderer.ts] 容器没有子节点`);
      // 空容器可能是有效的，只发出警告
    }
    
    return true;
  }
  
  /**
   * 清理容器
   * 安全地从DOM中移除容器
   */
  private cleanupContainer(): void {
    try {
      if (this.container && this.container.parentNode) {
        const wrapper = this.container.parentNode;
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
          console.log(`[textLayerRenderer.ts] 成功清理旧容器`);
        }
      }
    } catch (error) {
      console.error(`[textLayerRenderer.ts] 清理容器时出错:`, error);
    } finally {
      this.container = null;
    }
  }
  
  /**
   * 准备渲染容器
   * 为html2canvas准备DOM结构
   * @param layout 布局数据
   * @param textElements 文本元素列表
   * @param schedule 日程数据
   */
  private prepareRenderContainer(layout: Layout, textElements: TextLayoutElement[], schedule: Schedule): void {
    // 确保容器存在
    if (!this.container) {
      this.createRenderContainer();
    }
    
    // 清空容器
    if (this.container) {
      this.container.innerHTML = '';
      
      // 设置容器样式
      this.container.style.width = `${this.width}px`;
      this.container.style.height = `${this.height}px`;
      this.container.style.position = 'absolute';
      this.container.style.overflow = 'hidden';
      this.container.style.backgroundColor = 'transparent';
      
      console.log(`[textLayerRenderer.ts] 准备渲染 ${textElements.length} 个文本元素`);
      
      // 根据布局创建文本元素
      for (const element of textElements) {
        // 创建文本元素的div
        const div = document.createElement('div');
        
        // 设置div的位置和尺寸
        div.style.position = 'absolute';
        div.style.left = `${element.x}px`;
        div.style.top = `${element.y}px`;
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        div.style.zIndex = (element.zIndex || 0).toString();
        div.style.overflow = 'hidden';
        div.style.boxSizing = 'border-box'; // 确保边框计入尺寸
        
        // 为label类型的元素设置背景图片
        if (
          (element.type === LayoutElementType.HOST_LABEL || 
           element.type === LayoutElementType.SUBJECT_LABEL || 
           element.type === LayoutElementType.GUEST_LABEL) && 
          layout.labelBackground
        ) {
          div.style.backgroundImage = `url(${layout.labelBackground})`;
          div.style.backgroundPosition = 'center center';
          div.style.backgroundRepeat = 'no-repeat';
          div.style.backgroundSize = 'auto';
        }
        
        // 获取基础字体信息
        const baseFontSize = element.fontStyle.fontSize;
        const baseFontWeight = element.fontStyle.fontWeight;
        
        // 处理字体权重
        const fontWeight = (() => {
          switch(baseFontWeight) {
            case 'bold': return 'bold';
            case 'medium': return '500';
            default: return 'normal';
          }
        })();
        
        // 如果是HOST_INFO元素，使用特殊的渲染方法
        if (element.type === LayoutElementType.HOST_INFO) {
          this.renderHostInfoElement(div, element, schedule);
        } else {
          // 对于其他文本元素，使用内部容器居中显示文本
          const innerDiv = document.createElement('div');
          innerDiv.style.position = 'absolute';
          innerDiv.style.top = '50%';
          innerDiv.style.left = '50%';
          innerDiv.style.transform = 'translate(-50%, -50%)';
          innerDiv.style.width = 'auto';
          innerDiv.style.maxWidth = '100%';
          innerDiv.style.textAlign = 'center';
          innerDiv.style.overflow = 'hidden';
          innerDiv.style.textOverflow = 'ellipsis';
          
          // 默认文本样式
          innerDiv.style.display = 'block';
          
          // 设置字体样式
          innerDiv.style.fontFamily = 'Arial, sans-serif';
          innerDiv.style.fontSize = `${baseFontSize}px`;
          innerDiv.style.fontWeight = fontWeight;
          innerDiv.style.color = element.fontStyle.fontColor || '#FFFFFF';
          innerDiv.style.textShadow = '0 0 2px rgba(0,0,0,0.5)'; // 添加文字阴影增强可见性
          
          // 为subject_info设置特殊的文本换行规则
          if (element.type === LayoutElementType.SUBJECT_INFO) {
            innerDiv.style.width = '100%';
            innerDiv.style.whiteSpace = 'normal';
            innerDiv.style.wordBreak = 'break-word';
          } else {
            innerDiv.style.whiteSpace = 'nowrap';
            innerDiv.style.wordBreak = 'normal';
          }
          
          innerDiv.style.lineHeight = '1.2';
          
          // 获取并设置文本内容
          const text = this.getTextContent(element, schedule);
          
          // 如果文本内容为空，不显示该元素
          if (!text) {
            return;
          }
          
          innerDiv.innerText = text;
          
          // 将内部容器添加到div
          div.appendChild(innerDiv);
          
          console.log(`[textLayerRenderer.ts] 渲染文本元素:`, {
            type: element.type,
            position: `${element.x}x${element.y}`,
            size: `${element.width}x${element.height}`,
            text
          });
        }
        
        // 将div添加到容器
        this.container.appendChild(div);
      }
    }
  }
  
  /**
   * 渲染主持人信息元素
   * @param container 容器元素
   * @param element 文本元素
   * @param schedule 日程数据
   */
  private renderHostInfoElement(container: HTMLDivElement, element: TextLayoutElement, schedule: Schedule): void {
    // 获取术者/讲者信息并确保title是字符串
    const persons = this.getHostPersons(schedule);
    if (persons.length === 0) {
      return;
    }
    
    // 对persons数组进行处理，确保title始终为字符串
    const safePerson = persons.map(p => ({
      ...p,
      name: p.name || '',
      title: p.title || '',
      organization: p.organization || ''
    }));
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建内部容器，使用与其他元素相同的定位方式
    const innerDiv = document.createElement('div');
    innerDiv.style.position = 'absolute';
    innerDiv.style.top = '50%';
    innerDiv.style.left = '50%';
    innerDiv.style.transform = 'translate(-50%, -50%)';
    innerDiv.style.width = 'auto';
    innerDiv.style.maxWidth = '100%';
    innerDiv.style.textAlign = 'center';
    innerDiv.style.display = 'block';
    
    // 获取基础字体大小和字重
    const baseFontSize = element.fontStyle.fontSize;
    const baseFontWeight = element.fontStyle.fontWeight;
    const smallerFontSize = Math.max(baseFontSize - 4, 12); // 减小4个像素，但不小于12px
    
    // 处理字体权重
    const getFontWeight = (weight: string): string => {
      switch(weight) {
        case 'bold': return 'bold';
        case 'medium': return '500';
        default: return 'normal';
      }
    };
    
    const baseWeight = getFontWeight(baseFontWeight);
    const reducedWeight = baseFontWeight === 'bold' ? '500' : 'normal';
    
    // 创建内容容器
    const contentContainer = document.createElement('div');
    contentContainer.style.maxWidth = '100%';
    contentContainer.style.maxHeight = '100%';
    contentContainer.style.textAlign = 'center';
    contentContainer.style.lineHeight = '1.2';
    contentContainer.style.padding = '0';
    contentContainer.style.display = 'flex';
    contentContainer.style.flexDirection = 'column';
    contentContainer.style.alignItems = 'center';
    contentContainer.style.justifyContent = 'center';
    
    // 根据人数不同展示方式
    if (safePerson.length === 1) {
      // 1名术者/讲者的情况
      const person = safePerson[0];
      
      // 姓名和称谓容器
      const personDiv = document.createElement('div');
      personDiv.style.whiteSpace = 'nowrap';
      personDiv.style.marginBottom = '0';
      
      // 姓名
      const nameSpan = document.createElement('span');
      nameSpan.style.fontSize = `${baseFontSize}px`;
      nameSpan.style.fontWeight = baseWeight;
      nameSpan.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
      nameSpan.innerText = this.formatName(person.name);
      personDiv.appendChild(nameSpan);
      
      // 空格和职称
      if (person.title) {
        personDiv.appendChild(document.createTextNode(' '));
        
        // 职称
        const titleSpan = document.createElement('span');
        titleSpan.style.fontSize = `${smallerFontSize}px`;
        titleSpan.style.fontWeight = reducedWeight;
        titleSpan.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        titleSpan.innerText = person.title;
        personDiv.appendChild(titleSpan);
      }
      
      contentContainer.appendChild(personDiv);
      
      // 单位
      if (person.organization) {
        const orgDiv = document.createElement('div');
        orgDiv.style.fontSize = `${smallerFontSize}px`;
        orgDiv.style.fontWeight = reducedWeight;
        orgDiv.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        orgDiv.style.whiteSpace = 'nowrap';
        orgDiv.style.textOverflow = 'ellipsis';
        orgDiv.style.overflow = 'hidden';
        orgDiv.style.maxWidth = '100%';
        orgDiv.innerText = person.organization;
        contentContainer.appendChild(orgDiv);
      }
    } else if (safePerson.length === 2) {
      // 2名术者/讲者的情况
      for (let i = 0; i < 2; i++) {
        const person = safePerson[i];
        
        // 姓名和称谓容器
        const personDiv = document.createElement('div');
        personDiv.style.marginBottom = '0';
        personDiv.style.whiteSpace = 'nowrap';
        
        // 姓名
        const nameSpan = document.createElement('span');
        nameSpan.style.fontSize = `${baseFontSize}px`;
        nameSpan.style.fontWeight = baseWeight;
        nameSpan.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        nameSpan.innerText = this.formatName(person.name);
        personDiv.appendChild(nameSpan);
        
        // 空格
        if (person.title) {
          personDiv.appendChild(document.createTextNode(' '));
          
          // 职称
          const titleSpan = document.createElement('span');
          titleSpan.style.fontSize = `${smallerFontSize}px`;
          titleSpan.style.fontWeight = reducedWeight;
          titleSpan.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
          titleSpan.innerText = person.title;
          personDiv.appendChild(titleSpan);
        }
        
        contentContainer.appendChild(personDiv);
      }
      
      // 单位（显示第一个人的单位）
      if (safePerson[0].organization) {
        const orgDiv = document.createElement('div');
        orgDiv.style.fontSize = `${smallerFontSize}px`;
        orgDiv.style.fontWeight = reducedWeight;
        orgDiv.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        orgDiv.style.whiteSpace = 'nowrap';
        orgDiv.style.textOverflow = 'ellipsis';
        orgDiv.style.overflow = 'hidden';
        orgDiv.style.maxWidth = '100%';
        orgDiv.innerText = safePerson[0].organization;
        contentContainer.appendChild(orgDiv);
      }
    } else if (safePerson.length >= 3) {
      // 3名或更多术者/讲者的情况
      // 显示前三名术者
      for (let i = 0; i < Math.min(3, safePerson.length); i++) {
        const person = safePerson[i];
        
        // 姓名和称谓容器
        const personDiv = document.createElement('div');
        personDiv.style.marginBottom = '0';
        personDiv.style.whiteSpace = 'nowrap';
        
        // 姓名
        const nameSpan = document.createElement('span');
        nameSpan.style.fontSize = `${baseFontSize}px`;
        nameSpan.style.fontWeight = baseWeight;
        nameSpan.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        nameSpan.innerText = this.formatName(person.name);
        personDiv.appendChild(nameSpan);
        
        // 空格
        if (person.title) {
          personDiv.appendChild(document.createTextNode(' '));
          
          // 职称
          const titleSpan = document.createElement('span');
          titleSpan.style.fontSize = `${smallerFontSize}px`;
          titleSpan.style.fontWeight = reducedWeight;
          titleSpan.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
          titleSpan.innerText = person.title;
          personDiv.appendChild(titleSpan);
        }
        
        contentContainer.appendChild(personDiv);
      }
      
      // 单位（显示第一个人的单位）
      if (safePerson[0].organization) {
        const orgDiv = document.createElement('div');
        orgDiv.style.fontSize = `${smallerFontSize}px`;
        orgDiv.style.fontWeight = reducedWeight;
        orgDiv.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        orgDiv.style.whiteSpace = 'nowrap';
        orgDiv.style.textOverflow = 'ellipsis';
        orgDiv.style.overflow = 'hidden';
        orgDiv.style.maxWidth = '100%';
        orgDiv.innerText = safePerson[0].organization;
        contentContainer.appendChild(orgDiv);
      }
    }
    
    // 将内容容器添加到内部div
    innerDiv.appendChild(contentContainer);
    
    // 将内部div添加到容器
    container.appendChild(innerDiv);
    
    // 记录调试信息
    console.log(`[textLayerRenderer.ts] 渲染HOST_INFO元素:`, {
      position: `${element.x}x${element.y}`,
      size: `${element.width}x${element.height}`,
      orientation: element.orientation,
      persons: safePerson.length
    });
  }
  
  /**
   * 格式化人名
   * 如果是两个字的中文名，在两个字之间添加全角空格
   * @param name 人名
   * @returns 格式化后的人名
   */
  private formatName(name: string): string {
    // 防止传入undefined
    if (!name) {
      return '';
    }
    
    // 检查是否是两个字的中文名
    if (/^[\u4e00-\u9fa5]{2}$/.test(name)) {
      // 在两个字之间添加全角空格
      return name.charAt(0) + '　' + name.charAt(1);
    }
    return name;
  }
  
  /**
   * 获取文本内容
   * @param element 文本元素
   * @param schedule 日程数据
   * @returns 文本内容
   */
  private getTextContent(element: TextLayoutElement, schedule: Schedule): string {
    // 根据元素类型返回相应的文本内容
    switch (element.type) {
      case LayoutElementType.HOST_LABEL:
        // 根据日程类型返回不同的标签名称
        if (schedule.type === ScheduleType.SURGERY) {
          return this.currentLayout?.surgeonLabelDisplayName || '';
        } else {
          return this.currentLayout?.speakerLabelDisplayName || '';
        }
      case LayoutElementType.HOST_INFO:
        // HOST_INFO元素的内容将由renderHostInfoElement方法处理
        return '';
      case LayoutElementType.SUBJECT_LABEL:
        // 根据日程类型返回不同的标签名称
        if (schedule.type === ScheduleType.SURGERY) {
          return this.currentLayout?.surgeryLabelDisplayName || '';
        } else {
          return this.currentLayout?.subjectLabelDisplayName || '';
        }
      case LayoutElementType.SUBJECT_INFO:
        return this.getSubjectTitle(schedule) || '';
      case LayoutElementType.GUEST_LABEL:
        return this.currentLayout?.guestLabelDisplayName || '';
      case LayoutElementType.GUEST_INFO:
        return this.getGuestNames(schedule) || '';
      default:
        return '';
    }
  }
  
  /**
   * 获取主持人人员信息
   * @param schedule 日程
   * @returns 主持人人员信息数组
   */
  private getHostPersons(schedule: Schedule): PersonInfo[] {
    if (schedule.type === ScheduleType.SURGERY && schedule.surgeryInfo) {
      return schedule.surgeryInfo.surgeons;
    } else if (schedule.type === ScheduleType.LECTURE && schedule.lectureInfo) {
      return schedule.lectureInfo.speakers;
    }
    return [];
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
   * 获取布局中的文本元素
   * @param layout 布局数据
   * @returns 文本元素列表
   */
  private getTextElements(layout: Layout): TextLayoutElement[] {
    if (!layout.elements) {
      return [];
    }
    
    // 过滤出所有文本元素
    const textElements = layout.elements.filter(element => 
      element.type === LayoutElementType.HOST_LABEL ||
      element.type === LayoutElementType.HOST_INFO ||
      element.type === LayoutElementType.SUBJECT_LABEL ||
      element.type === LayoutElementType.SUBJECT_INFO ||
      element.type === LayoutElementType.GUEST_LABEL ||
      element.type === LayoutElementType.GUEST_INFO
    ) as TextLayoutElement[];
    
    // 按zIndex排序（从小到大）
    return textElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    console.log(`[textLayerRenderer.ts] 销毁渲染器`);
    
    // 移除渲染容器
    if (this.container) {
      // 清空容器内容
      this.container.innerHTML = '';
      
      // 找到父元素包装器
      const wrapper = this.container.parentNode;
      if (wrapper && wrapper.parentNode) {
        try {
          wrapper.parentNode.removeChild(wrapper);
          console.log(`[textLayerRenderer.ts] 已移除渲染容器包装器`);
        } catch (error) {
          console.error(`[textLayerRenderer.ts] 移除包装器时出错:`, error);
        }
      } else if (this.container.parentNode) {
        try {
          this.container.parentNode.removeChild(this.container);
          console.log(`[textLayerRenderer.ts] 已移除渲染容器`);
        } catch (error) {
          console.error(`[textLayerRenderer.ts] 移除容器时出错:`, error);
        }
      }
    }
    
    // 重置引用
    this.container = null;
    this.currentLayout = null;
    
    console.log(`[textLayerRenderer.ts] 销毁完成`);
  }
}
