/**
 * 布局API服务
 * 用于请求布局模板相关数据
 */
import request from './request'
import type { LayoutTemplate } from '../types/broadcast'
import layoutThumbnailGenerator from '../utils/layoutThumbnailGenerator'

/**
 * 布局模板最后更新时间响应
 */
export interface LayoutTemplatesLastUpdatedResponse {
  lastUpdated: string;  // ISO格式的日期字符串
}

/**
 * 布局API类
 * 封装布局相关的API请求
 */
class LayoutApi {
  /**
   * 获取布局模板列表
   * @returns Promise<LayoutTemplate[]> 布局模板列表
   */
  async getLayoutTemplates() {
    try {
      const response = await request.get<any>('/layout/templates');
      
      // 正确处理响应数据结构
      if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.error('布局模板数据格式不正确');
        return [];
      }
    } catch (error) {
      console.error('获取布局模板失败');
      return [];
    }
  }
  
  /**
   * 获取布局模板最后更新时间
   * @returns Promise<LayoutTemplatesLastUpdatedResponse> 最后更新时间
   */
  async getLayoutTemplatesLastUpdated() {
    try {
      const response = await request.get<any>('/layout/templates/last-updated');
      
      if (response && response.data && response.data.data) {
        return {
          data: response.data.data
        };
      } else {
        console.error('获取布局模板最后更新时间响应格式不正确');
        return {
          data: {
            lastUpdated: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('获取布局模板最后更新时间失败');
      return {
        data: {
          lastUpdated: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * 获取布局模板详情
   * @param templateId - 模板ID
   * @returns Promise<LayoutTemplate> 布局模板详情
   */
  async getLayoutTemplateDetail(templateId: string) {
    try {
      const response = await request.get<any>(`/layout/templates/${templateId}`);
      
      if (response && response.data && response.data.data) {
        return {
          data: response.data.data
        };
      } else {
        console.error('获取布局模板详情响应格式不正确');
        return {
          data: null
        };
      }
    } catch (error) {
      console.error('获取布局模板详情失败');
      return {
        data: null
      };
    }
  }

  /**
   * 加载所有布局模板
   * 如果本地存储中有最新的模板数据，则使用本地数据
   * 否则从服务器获取最新数据并更新本地存储
   * @returns Promise<LayoutTemplate[]> 布局模板列表
   */
  async loadAllLayoutTemplates(): Promise<LayoutTemplate[]> {
    try {
      // 尝试从本地存储加载
      const storedData = localStorage.getItem('layoutTemplates')
      const storedDate = localStorage.getItem('layoutTemplatesLastUpdated')
      
      if (storedData && storedDate) {
        // 检查服务器上的最后更新时间
        const serverResponse = await this.getLayoutTemplatesLastUpdated()
        const serverLastUpdated = new Date(serverResponse.data.lastUpdated)
        const localLastUpdated = new Date(storedDate)
        
        // 如果本地数据是最新的，直接返回
        if (localLastUpdated >= serverLastUpdated) {
          const templates = JSON.parse(storedData)
          
          // 为每个模板生成本地缩略图
          for (const template of templates) {
            // 生成并替换缩略图URL
            const thumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template)
            template.thumbnail = thumbnailUrl
          }
          
          return templates
        }
      }
      
      // 从服务器获取最新数据
      const templates = await this.getLayoutTemplates()
      
      // 检查每个模板的结构
      for (const template of templates) {
        // 确保 name 字段存在且格式正确
        if (!template.name || typeof template.name !== 'object') {
          template.name = {
            'zh-CN': template.template,
            'en-US': template.template
          }
        } else if (!template.name['zh-CN'] || !template.name['en-US']) {
          template.name['zh-CN'] = template.name['zh-CN'] || template.template
          template.name['en-US'] = template.name['en-US'] || template.template
        }
        
        // 生成并替换缩略图URL - 强制更新缩略图
        const thumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template, true)
        template.thumbnail = thumbnailUrl
      }
      
      // 保存到本地存储
      localStorage.setItem('layoutTemplates', JSON.stringify(templates))
      localStorage.setItem('layoutTemplatesLastUpdated', new Date().toISOString())
      
      return templates
    } catch (error) {
      console.error('加载布局模板失败')
      
      // 如果有本地数据，返回本地数据作为备用
      const storedData = localStorage.getItem('layoutTemplates')
      if (storedData) {
        const templates = JSON.parse(storedData)
        
        // 为每个模板生成本地缩略图 - 强制更新缩略图
        for (const template of templates) {
          // 生成并替换缩略图URL
          const thumbnailUrl = await layoutThumbnailGenerator.getThumbnail(template, true)
          template.thumbnail = thumbnailUrl
        }
        
        return templates
      }
      
      // 否则返回空数组
      return []
    }
  }
}

// 导出单例实例
export default new LayoutApi() 