/**
 * 布局模板相关 Mock 数据
 */
import Mock from 'mockjs'
import type { LayoutTemplate, MediaLayoutElement, TextLayoutElement } from '../types/broadcast'
import { LayoutElementType } from '../types/broadcast'

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
          template: "1s1b",
          name: {
            "zh-CN": "一小一大",
            "en-US": "One Small One Big"
          },
          thumbnail: "https://example.com/thumbnails/1s1b_200x113.png",
          elements: [
            {
              id: 1,
              x: 12,
              y: 132,
              width: 402,
              height: 227,
              zIndex: 1,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement,
            {
              id: 2,
              x: 424,
              y: 132,
              width: 1486,
              height: 836,
              zIndex: 2,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement,
            {
              id: 3,
              x: 12,
              y: 370,
              width: 402,
              height: 137,
              zIndex: 10001,
              type: LayoutElementType.HOST_INFO,
              fontStyle: {
                fontSize: 30,
                fontWeight: "medium",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement,
            {
              id: 4,
              x: 12,
              y: 515,
              width: 402,
              height: 155,
              zIndex: 10002,
              type: LayoutElementType.SUBJECT_INFO,
              fontStyle: {
                fontSize: 32,
                fontWeight: "bold",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement,
            {
              id: 5,
              x: 12,
              y: 680,
              width: 402,
              height: 40,
              zIndex: 10003,
              type: LayoutElementType.GUEST_LABEL,
              fontStyle: {
                fontSize: 24,
                fontWeight: "bold",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement,
            {
              id: 6,
              x: 12,
              y: 735,
              width: 402,
              height: 260,
              zIndex: 10004,
              type: LayoutElementType.GUEST_INFO,
              fontStyle: {
                fontSize: 26,
                fontWeight: "regular",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement
          ]
        },
        {
          template: "2s1b",
          name: {
            "zh-CN": "二小一大",
            "en-US": "Two Small One Big"
          },
          thumbnail: "https://example.com/thumbnails/2s1b_200x113.png",
          elements: [
            {
              id: 1,
              x: 12,
              y: 132,
              width: 402,
              height: 227,
              zIndex: 1,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement,
            {
              id: 2,
              x: 424,
              y: 132,
              width: 1486,
              height: 836,
              zIndex: 2,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement,
            {
              id: 3,
              x: 12,
              y: 579,
              width: 402,
              height: 227,
              zIndex: 3,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement,
            {
              id: 4,
              x: 12,
              y: 370,
              width: 402,
              height: 40,
              zIndex: 10003,
              type: LayoutElementType.HOST_LABEL,
              fontStyle: {
                fontSize: 24,
                fontWeight: "bold",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement,
            {
              id: 5,
              x: 12,
              y: 420,
              width: 402,
              height: 120,
              zIndex: 10001,
              type: LayoutElementType.HOST_INFO,
              fontStyle: {
                fontSize: 30,
                fontWeight: "medium",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement,
            {
              id: 6,
              x: 424,
              y: 968,
              width: 1486,
              height: 112,
              zIndex: 10002,
              type: LayoutElementType.SUBJECT_INFO,
              fontStyle: {
                fontSize: 46,
                fontWeight: "bold",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement,
            {
              id: 7,
              x: 12,
              y: 805,
              width: 402,
              height: 260,
              zIndex: 10004,
              type: LayoutElementType.GUEST_INFO,
              fontStyle: {
                fontSize: 26,
                fontWeight: "regular",
                fontColor: "#FFFFFF"
              },
              orientation: "vertical"
            } as TextLayoutElement
          ]
        },
        {
          template: "fullscreen",
          name: {
            "zh-CN": "全屏",
            "en-US": "Fullscreen"
          },
          thumbnail: "https://example.com/thumbnails/fullscreen_200x113.png",
          elements: [
            {
              id: 1,
              x: 0,
              y: 0,
              width: 1920,
              height: 1080,
              zIndex: 1,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement
          ]
        },
        {
          template: "2es",
          name: {
            "zh-CN": "二等分",
            "en-US": "Two Equal Split"
          },
          thumbnail: "https://example.com/thumbnails/2es_200x113.png",
          elements: [
            {
              id: 1,
              x: 10,
              y: 284,
              width: 945,
              height: 532,
              zIndex: 1,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement,
            {
              id: 2,
              x: 967,
              y: 284,
              width: 945,
              height: 532,
              zIndex: 2,
              type: LayoutElementType.MEDIA,
              transparentBackground: false
            } as MediaLayoutElement
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
        lastUpdated: '2025-06-01T12:00:00Z'
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
        name: {
          "zh-CN": "单画面手术",
          "en-US": "Single View Surgery"
        },
        thumbnail: "https://example.com/thumbnails/surgery-single_200x113.png",
        elements: [
          {
            id: 1,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            zIndex: 1,
            type: LayoutElementType.MEDIA,
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
            type: LayoutElementType.MEDIA,
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
            type: LayoutElementType.HOST_LABEL,
            fontStyle: {
              fontSize: 24,
              fontWeight: "bold",
              fontColor: "#ffffff"
            },
            orientation: "horizontal"
          } as TextLayoutElement,
          {
            id: 4,
            x: 50,
            y: 950,
            width: 400,
            height: 100,
            zIndex: 3,
            type: LayoutElementType.HOST_INFO,
            fontStyle: {
              fontSize: 20,
              fontWeight: "regular",
              fontColor: "#ffffff"
            },
            orientation: "horizontal"
          } as TextLayoutElement
        ]
      }
    } else if (templateId === '1s1b') {
      template = {
        template: "1s1b",
        name: {
          "zh-CN": "一小一大",
          "en-US": "One Small One Big"
        },
        thumbnail: "https://example.com/thumbnails/1s1b_200x113.png",
        elements: [
          {
            id: 1,
            x: 12,
            y: 132,
            width: 402,
            height: 227,
            zIndex: 1,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 2,
            x: 424,
            y: 132,
            width: 1486,
            height: 836,
            zIndex: 2,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 3,
            x: 12,
            y: 370,
            width: 402,
            height: 117,
            zIndex: 10001,
            type: LayoutElementType.HOST_INFO,
            fontStyle: {
              fontSize: 30,
              fontWeight: "medium",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement,
          {
            id: 4,
            x: 12,
            y: 495,
            width: 402,
            height: 175,
            zIndex: 10002,
            type: LayoutElementType.SUBJECT_INFO,
            fontStyle: {
              fontSize: 32,
              fontWeight: "bold",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement,
          {
            id: 5,
            x: 12,
            y: 680,
            width: 402,
            height: 40,
            zIndex: 10003,
            type: LayoutElementType.GUEST_LABEL,
            fontStyle: {
              fontSize: 24,
              fontWeight: "bold",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement,
          {
            id: 6,
            x: 12,
            y: 735,
            width: 402,
            height: 233,
            zIndex: 10004,
            type: LayoutElementType.GUEST_INFO,
            fontStyle: {
              fontSize: 26,
              fontWeight: "regular",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement
        ]
      }
    } else if (templateId === '2s1b') {
      template = {
        template: "2s1b",
        name: {
          "zh-CN": "二小一大",
          "en-US": "Two Small One Big"
        },
        thumbnail: "https://example.com/thumbnails/2s1b_200x113.png",
        elements: [
          {
            id: 1,
            x: 12,
            y: 132,
            width: 402,
            height: 227,
            zIndex: 1,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 2,
            x: 424,
            y: 132,
            width: 1486,
            height: 836,
            zIndex: 2,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 3,
            x: 12,
            y: 579,
            width: 402,
            height: 227,
            zIndex: 3,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 4,
            x: 12,
            y: 370,
            width: 402,
            height: 40,
            zIndex: 10003,
            type: LayoutElementType.HOST_LABEL,
            fontStyle: {
              fontSize: 24,
              fontWeight: "bold",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement,
          {
            id: 5,
            x: 12,
            y: 420,
            width: 402,
            height: 117,
            zIndex: 10001,
            type: LayoutElementType.HOST_INFO,
            fontStyle: {
              fontSize: 30,
              fontWeight: "medium",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement,
          {
            id: 6,
            x: 424,
            y: 968,
            width: 1486,
            height: 112,
            zIndex: 10002,
            type: LayoutElementType.SUBJECT_INFO,
            fontStyle: {
              fontSize: 46,
              fontWeight: "bold",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement,
          {
            id: 7,
            x: 12,
            y: 755,
            width: 402,
            height: 233,
            zIndex: 10004,
            type: LayoutElementType.GUEST_INFO,
            fontStyle: {
              fontSize: 26,
              fontWeight: "regular",
              fontColor: "#FFFFFF"
            },
            orientation: "vertical"
          } as TextLayoutElement
        ]
      }
    } else if (templateId === 'fullscreen') {
      template = {
        template: "fullscreen",
        name: {
          "zh-CN": "全屏",
          "en-US": "Fullscreen"
        },
        thumbnail: "https://example.com/thumbnails/fullscreen_200x113.png",
        elements: [
          {
            id: 1,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            zIndex: 1,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement
        ]
      }
    } else if (templateId === '2es') {
      template = {
        template: "2es",
        name: {
          "zh-CN": "二等分",
          "en-US": "Two Equal Split"
        },
        thumbnail: "https://example.com/thumbnails/2es_200x113.png",
        elements: [
          {
            id: 1,
            x: 10,
            y: 284,
            width: 945,
            height: 532,
            zIndex: 1,
            type: LayoutElementType.MEDIA,
            transparentBackground: false
          } as MediaLayoutElement,
          {
            id: 2,
            x: 967,
            y: 284,
            width: 945,
            height: 532,
            zIndex: 2,
            type: LayoutElementType.MEDIA,
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