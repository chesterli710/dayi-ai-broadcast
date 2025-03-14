/**
 * 布局API服务
 * 用于请求布局模板相关数据
 */
import request from './request'
import type { LayoutTemplate } from '../types/broadcast'

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
  getLayoutTemplates() {
    return request.get<LayoutTemplate[]>('/layout/templates')
  }
  
  /**
   * 获取布局模板最后更新时间
   * @returns Promise<LayoutTemplatesLastUpdatedResponse> 最后更新时间
   */
  getLayoutTemplatesLastUpdated() {
    return request.get<LayoutTemplatesLastUpdatedResponse>('/layout/templates/last-updated')
  }
  
  /**
   * 获取布局模板详情
   * @param templateId - 模板ID
   * @returns Promise<LayoutTemplate> 布局模板详情
   */
  getLayoutTemplateDetail(templateId: string) {
    return request.get<LayoutTemplate>(`/layout/templates/${templateId}`)
  }
}

// 导出单例实例
export default new LayoutApi() 