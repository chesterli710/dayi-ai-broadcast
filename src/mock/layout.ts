/**
 * 布局模板相关 Mock 数据
 */
import Mock from 'mockjs'
import type { LayoutTemplate, MediaLayoutElement, TextLayoutElement } from '../types/broadcast'

/**
 * 设置布局模板相关的 Mock 数据
 */
export function setupLayoutMock() {
  // 获取布局模板列表接口
  Mock.mock('/api/layout/templates', 'get', () => {
    return {
      code: 0,
      data: [
        {
          template: 'surgery-single',
          elements: [
            {
              id: 1,
              x: 0,
              y: 0,
              width: 1920,
              height: 1080,
              zIndex: 1,
              sourceId: 'camera-1',
              sourceName: '主摄像头',
              transparentBackground: false
            }
          ]
        },
        {
          template: 'surgery-double',
          elements: [
            {
              id: 1,
              x: 0,
              y: 0,
              width: 1280,
              height: 1080,
              zIndex: 1,
              sourceId: 'camera-1',
              sourceName: '主摄像头',
              transparentBackground: false
            },
            {
              id: 2,
              x: 1280,
              y: 0,
              width: 640,
              height: 540,
              zIndex: 1,
              sourceId: 'camera-2',
              sourceName: '辅助摄像头',
              transparentBackground: false
            }
          ]
        }
      ],
      message: '获取布局模板列表成功'
    }
  })
  
  // 获取布局模板最后更新时间接口
  Mock.mock('/api/layout/templates/last-updated', 'get', () => {
    return {
      code: 0,
      data: {
        lastUpdated: '2023-06-01T12:00:00Z'
      },
      message: '获取布局模板最后更新时间成功'
    }
  })
  
  // 获取布局模板详情接口
  Mock.mock(new RegExp('/api/layout/templates/([^/]+)$'), 'get', (options) => {
    // 解析路径参数
    const templateId = options.url.match(/\/api\/layout\/templates\/([^/]+)$/)?.[1]
    
    if (!templateId) {
      return {
        code: 1001,
        data: null,
        message: '缺少模板ID'
      }
    }
    
    // 查找对应的模板
    let template: LayoutTemplate | null = null
    
    if (templateId === 'surgery-single') {
      template = {
        template: 'surgery-single',
        elements: [
          {
            id: 1,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            zIndex: 1,
            sourceId: 'camera-1',
            sourceName: '主摄像头',
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 2,
            x: 50,
            y: 50,
            width: 200,
            height: 80,
            zIndex: 2,
            sourceId: 'logo',
            sourceName: '医院Logo',
            transparentBackground: true
          } as MediaLayoutElement,
          {
            id: 3,
            x: 50,
            y: 900,
            width: 400,
            height: 50,
            zIndex: 3,
            fontStyle: {
              fontFamily: 'Arial',
              fontSize: 24,
              fontWeight: 'bold',
              fontColor: '#ffffff'
            },
            orientation: 'horizontal'
          } as TextLayoutElement,
          {
            id: 4,
            x: 50,
            y: 950,
            width: 400,
            height: 100,
            zIndex: 3,
            fontStyle: {
              fontFamily: 'Arial',
              fontSize: 20,
              fontWeight: 'regular',
              fontColor: '#ffffff'
            },
            orientation: 'horizontal'
          } as TextLayoutElement
        ]
      }
    } else if (templateId === 'surgery-double') {
      template = {
        template: 'surgery-double',
        elements: [
          {
            id: 1,
            x: 0,
            y: 0,
            width: 1280,
            height: 1080,
            zIndex: 1,
            sourceId: 'camera-1',
            sourceName: '主摄像头',
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 2,
            x: 1280,
            y: 0,
            width: 640,
            height: 540,
            zIndex: 1,
            sourceId: 'camera-2',
            sourceName: '辅助摄像头',
            transparentBackground: false
          } as MediaLayoutElement
        ]
      }
    } else if (templateId === 'lecture-single') {
      template = {
        template: 'lecture-single',
        elements: [
          {
            id: 1,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            zIndex: 1,
            sourceId: 'camera-1',
            sourceName: '主摄像头',
            transparentBackground: false
          } as MediaLayoutElement
        ]
      }
    } else if (templateId === 'lecture-with-slides') {
      template = {
        template: 'lecture-with-slides',
        elements: [
          {
            id: 1,
            x: 0,
            y: 0,
            width: 640,
            height: 540,
            zIndex: 1,
            sourceId: 'camera-1',
            sourceName: '讲者摄像头',
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 2,
            x: 640,
            y: 0,
            width: 1280,
            height: 1080,
            zIndex: 1,
            sourceId: 'slides',
            sourceName: '幻灯片',
            transparentBackground: false
          } as MediaLayoutElement
        ]
      }
    }
    
    if (!template) {
      return {
        code: 1002,
        data: null,
        message: '模板不存在'
      }
    }
    
    return {
      code: 0,
      data: template,
      message: '获取布局模板详情成功'
    }
  })
} 