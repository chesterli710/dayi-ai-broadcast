# 大医AI导播系统 API 文档

本文档详细描述了大医AI导播系统的所有API接口，包括请求方式、参数说明和返回值格式。

## 目录

- [通用说明](#通用说明)
- [认证相关](#认证相关)
- [计划相关](#计划相关)
- [布局相关](#布局相关)

## 通用说明

### 基础URL

所有API请求的基础URL为：`/api`

### API 整合说明

为了提高性能和简化前端逻辑，我们对部分 API 进行了整合：

- **推荐使用** `/plan/all` 接口一次性获取所有频道、计划和分支数据，替代多个分散的接口调用
- 原有的分散接口（`/plan/channels`、`/plan/plans`、`/plan/branches` 等）仍然保留，但建议在新开发中使用整合后的接口

### 请求格式

除非特别说明，所有请求均使用JSON格式传递数据。

### 响应格式

所有API响应均使用统一的JSON格式：

```json
{
  "code": 0,        // 响应码，0表示成功，非0表示失败
  "data": {},       // 响应数据，具体格式根据接口不同而不同
  "message": "成功" // 响应消息，用于描述请求结果
}
```

### 错误码说明

| 错误码 | 说明 |
| ----- | ---- |
| 0     | 成功 |
| 401   | 未登录或token过期 |
| 403   | 无权限 |
| 404   | 资源不存在 |
| 500   | 服务器内部错误 |
| 1001  | 参数错误 |
| 1002  | 资源不存在 |

## 认证相关

### 用户登录

用于用户登录系统，获取访问令牌。

- **URL**: `/auth/login`
- **方法**: `POST`
- **请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码 |

- **请求示例**:

```json
{
  "phone": "13800138000",
  "password": "password123"
}
```

- **响应示例**:

```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": "2023-09-15T00:00:00Z",
    "user": {
      "id": "user-1",
      "name": "张三",
      "phone": "13800138000"
    }
  },
  "message": "登录成功"
}
```

### 退出登录

用于用户退出登录。

- **URL**: `/auth/logout`
- **方法**: `POST`
- **请求参数**: 无
- **响应示例**:

```json
{
  "code": 0,
  "data": null,
  "message": "退出成功"
}
```

## 计划相关

### 获取所有数据

> **✅ 推荐使用** - 一次性获取所有频道、计划和分支数据，减少请求次数，提高性能。

- **URL**: `/plan/all`
- **方法**: `GET`
- **请求参数**: 无
- **请求示例**:

```
GET /api/plan/all
```

- **响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "channel-1",
      "name": "医学频道",
      "url": "https://example.com/channel/1",
      "plans": [
        {
          "id": "plan-1",
          "name": "肝胆外科手术直播",
          "plannedStartDateTime": "2023-06-15T09:00:00",
          "plannedEndDateTime": "2023-06-15T12:00:00",
          "cover": "https://example.com/covers/surgery.jpg",
          "background": "https://example.com/backgrounds/blue.jpg",
          "labelBackground": "https://example.com/backgrounds/label-blue.png",
          "textColor": "#ffffff",
          "branches": [
            {
              "id": "branch-1",
              "name": "主会场",
              "schedules": [
                {
                  "id": "schedule-1-1",
                  "type": "SURGERY",
                  "plannedStartDateTime": "2023-06-15T09:00:00",
                  "plannedDuration": 120,
                  "plannedEndDateTime": "2023-06-15T11:00:00",
                  "layouts": [
                    {
                      "id": 1,
                      "template": "surgery-single",
                      "description": "适用于单摄像头手术直播",
                      "background": "https://example.com/backgrounds/surgery-bg.jpg"
                    }
                  ],
                  "surgeryInfo": {
                    "procedure": "肝胆管结石手术",
                    "surgeons": [
                      {
                        "name": "张医生",
                        "title": "主任医师",
                        "organization": "北京协和医院"
                      }
                    ]
                  }
                },
                {
                  "id": "schedule-1-2",
                  "type": "LECTURE",
                  "plannedStartDateTime": "2023-06-15T11:00:00",
                  "plannedDuration": 60,
                  "plannedEndDateTime": "2023-06-15T12:00:00",
                  "layouts": [
                    {
                      "id": 1,
                      "template": "lecture-single",
                      "description": "适用于单摄像头讲课直播",
                      "background": "https://example.com/backgrounds/lecture-bg.jpg"
                    }
                  ],
                  "lectureInfo": {
                    "topic": "肝胆管结石手术后的护理",
                    "speaker": {
                      "name": "王教授",
                      "title": "教授",
                      "organization": "北京协和医院"
                    }
                  }
                }
              ],
              "streamConfig": {
                "bitrate": 3000,
                "resolution": "1920x1080",
                "fps": 30,
                "codec": "h264_nvenc",
                "preset": "zerolatency",
                "streamUrl": "rtmp://live.example.com/channel1",
                "streamSecret": "live_secret_key_123"
              }
            }
          ]
        }
      ]
    }
  ],
  "message": "获取所有数据成功"
}
```

### 获取频道列表

> **⚠️ 不推荐使用** - 建议使用 `/plan/all` 接口替代

获取当前用户可访问的频道列表。

- **URL**: `/plan/channels`
- **方法**: `GET`
- **请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| userId | string | 否 | 用户ID，不传则获取当前登录用户的频道 |

- **请求示例**:

```
GET /api/plan/channels?userId=user-1
```

- **响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "channel-1",
      "name": "医学频道",
      "url": "https://example.com/channel/1",
      "plans": []
    },
    {
      "id": "channel-2",
      "name": "教育频道",
      "url": "https://example.com/channel/2",
      "plans": []
    }
  ],
  "message": "获取频道列表成功"
}
```

### 获取计划列表

> **⚠️ 不推荐使用** - 建议使用 `/plan/all` 接口替代

获取指定频道下的计划列表。

- **URL**: `/plan/plans`
- **方法**: `GET`
- **请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| channelId | string | 是 | 频道ID |
| status | string | 否 | 计划状态，可选值：upcoming(即将开始)、ongoing(进行中)、completed(已完成)、all(全部)，默认为all |

- **请求示例**:

```
GET /api/plan/plans?channelId=channel-1&status=upcoming
```

- **响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "plan-1",
      "name": "肝胆外科手术直播",
      "plannedStartDateTime": "2023-06-15T09:00:00",
      "plannedEndDateTime": "2023-06-15T12:00:00",
      "cover": "https://example.com/covers/surgery.jpg",
      "background": "https://example.com/backgrounds/blue.jpg",
      "labelBackground": "https://example.com/backgrounds/label-blue.png",
      "textColor": "#ffffff"
    },
    {
      "id": "plan-2",
      "name": "心脏外科手术直播",
      "plannedStartDateTime": "2023-06-20T10:00:00",
      "plannedEndDateTime": "2023-06-20T14:00:00",
      "cover": "https://example.com/covers/heart-surgery.jpg"
    }
  ],
  "message": "获取计划列表成功"
}
```

### 获取计划详情

> **⚠️ 不推荐使用** - 建议使用 `/plan/all` 接口替代

获取指定计划的详细信息。

- **URL**: `/plan/plans/{planId}`
- **方法**: `GET`
- **请求参数**: 无
- **请求示例**:

```
GET /api/plan/plans/plan-1
```

- **响应示例**:

```json
{
  "code": 0,
  "data": {
    "id": "plan-1",
    "name": "肝胆外科手术直播",
    "plannedStartDateTime": "2023-06-15T09:00:00",
    "plannedEndDateTime": "2023-06-15T12:00:00",
    "cover": "https://example.com/covers/surgery.jpg",
    "background": "https://example.com/backgrounds/blue.jpg",
    "labelBackground": "https://example.com/backgrounds/label-blue.png",
    "textColor": "#ffffff",
    "branches": [
      {
        "id": "branch-1",
        "name": "主会场",
        "schedules": [],
        "streamConfig": {
          "bitrate": 3000,
          "resolution": "1920x1080",
          "fps": 30,
          "codec": "h264_nvenc",
          "preset": "zerolatency",
          "streamUrl": "rtmp://live.example.com/channel1",
          "streamSecret": "live_secret_key_123"
        }
      }
    ]
  },
  "message": "获取计划详情成功"
}
```

### 获取分支列表

> **⚠️ 不推荐使用** - 建议使用 `/plan/all` 接口替代

获取指定计划下的分支列表。

- **URL**: `/plan/branches`
- **方法**: `GET`
- **请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| planId | string | 是 | 计划ID |

- **请求示例**:

```
GET /api/plan/branches?planId=plan-1
```

- **响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "branch-1",
      "name": "主会场",
      "schedules": [
        {
          "id": "schedule-1",
          "type": "surgery",
          "plannedStartDateTime": "2023-06-15T09:00:00",
          "plannedDuration": 180,
          "plannedEndDateTime": "2023-06-15T12:00:00",
          "layouts": [
            {
              "id": 1,
              "template": "surgery-single",
              "description": "适用于单摄像头手术直播",
              "background": "https://example.com/backgrounds/surgery-bg.jpg"
            }
          ],
          "surgeryInfo": {
            "procedure": "肝胆管结石手术",
            "surgeons": [
              {
                "name": "张医生",
                "title": "主任医师",
                "organization": "北京协和医院"
              }
            ]
          }
        }
      ],
      "streamConfig": {
        "bitrate": 3000,
        "resolution": "1920x1080",
        "fps": 30,
        "codec": "h264_nvenc",
        "preset": "zerolatency",
        "streamUrl": "rtmp://live.example.com/channel1",
        "streamSecret": "live_secret_key_123"
      }
    }
  ],
  "message": "获取分支列表成功"
}
```

### 获取分支详情

> **⚠️ 不推荐使用** - 建议使用 `/plan/all` 接口替代

获取指定分支的详细信息。

- **URL**: `/plan/branches/{branchId}`
- **方法**: `GET`
- **请求参数**: 无
- **请求示例**:

```
GET /api/plan/branches/branch-1
```

- **响应示例**:

```json
{
  "code": 0,
  "data": {
    "id": "branch-1",
    "name": "主会场",
    "schedules": [
      {
        "id": "schedule-1",
        "type": "surgery",
        "plannedStartDateTime": "2023-06-15T09:00:00",
        "plannedDuration": 180,
        "plannedEndDateTime": "2023-06-15T12:00:00",
        "layouts": [
          {
            "id": 1,
            "template": "surgery-single",
            "description": "适用于单摄像头手术直播",
            "background": "https://example.com/backgrounds/surgery-bg.jpg"
          }
        ],
        "surgeryInfo": {
          "procedure": "肝胆管结石手术",
          "surgeons": [
            {
              "name": "张医生",
              "title": "主任医师",
              "organization": "北京协和医院"
            }
          ]
        }
      }
    ],
    "streamConfig": {
      "bitrate": 3000,
      "resolution": "1920x1080",
      "fps": 30,
      "codec": "h264_nvenc",
      "preset": "zerolatency",
      "streamUrl": "rtmp://live.example.com/channel1",
      "streamSecret": "live_secret_key_123"
    }
  },
  "message": "获取分支详情成功"
}
```

## 布局相关

### 获取布局模板列表

获取所有可用的布局模板列表。

- **URL**: `/layout/templates`
- **方法**: `GET`
- **请求参数**: 无
- **请求示例**:

```
GET /api/layout/templates
```

- **响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "template": "1s1b",
      "name": {
        "zh-CN": "一小一大",
        "en-US": "One Small One Big"
      },
      "thumbnail": "https://example.com/thumbnails/1s1b_200x113.png",
      "elements": [
        {
          "id": 1,
          "x": 12,
          "y": 132,
          "width": 402,
          "height": 227,
          "zIndex": 1,
          "type": "media",
          "transparentBackground": false
        },
        {
          "id": 2,
          "x": 424,
          "y": 132,
          "width": 1486,
          "height": 836,
          "zIndex": 2,
          "type": "media",
          "transparentBackground": false
        },
        {
          "id": 3,
          "x": 12,
          "y": 370,
          "width": 402,
          "height": 117,
          "zIndex": 10001,
          "type": "host-info",
          "fontStyle": {
            "fontSize": 30,
            "fontWeight": "medium",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        },
        {
          "id": 4,
          "x": 12,
          "y": 495,
          "width": 402,
          "height": 175,
          "zIndex": 10002,
          "type": "subject-info",
          "fontStyle": {
            "fontSize": 32,
            "fontWeight": "bold",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        },
        {
          "id": 5,
          "x": 12,
          "y": 680,
          "width": 402,
          "height": 40,
          "zIndex": 10003,
          "type": "guest-label",
          "fontStyle": {
            "fontSize": 24,
            "fontWeight": "bold",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        },
        {
          "id": 6,
          "x": 12,
          "y": 735,
          "width": 402,
          "height": 233,
          "zIndex": 10004,
          "type": "guest-info",
          "fontStyle": {
            "fontSize": 26,
            "fontWeight": "regular",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        }
      ]
    },
    {
      "template": "2s1b",
      "name": {
        "zh-CN": "二小一大",
        "en-US": "Two Small One Big"
      },
      "thumbnail": "https://example.com/thumbnails/2s1b_200x113.png",
      "elements": [
        {
          "id": 1,
          "x": 12,
          "y": 132,
          "width": 402,
          "height": 227,
          "zIndex": 1,
          "type": "media",
          "transparentBackground": false
        },
        {
          "id": 2,
          "x": 424,
          "y": 132,
          "width": 1486,
          "height": 836,
          "zIndex": 2,
          "type": "media",
          "transparentBackground": false
        },
        {
          "id": 3,
          "x": 12,
          "y": 579,
          "width": 402,
          "height": 227,
          "zIndex": 3,
          "type": "media",
          "transparentBackground": false
        },
        {
          "id": 4,
          "x": 12,
          "y": 370,
          "width": 402,
          "height": 40,
          "zIndex": 10003,
          "type": "host-label",
          "fontStyle": {
            "fontSize": 24,
            "fontWeight": "bold",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        },
        {
          "id": 5,
          "x": 12,
          "y": 420,
          "width": 402,
          "height": 117,
          "zIndex": 10001,
          "type": "host-info",
          "fontStyle": {
            "fontSize": 30,
            "fontWeight": "medium",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        },
        {
          "id": 6,
          "x": 424,
          "y": 968,
          "width": 1486,
          "height": 112,
          "zIndex": 10002,
          "type": "subject-info",
          "fontStyle": {
            "fontSize": 46,
            "fontWeight": "bold",
            "fontColor": "#FFFFFF"
          },
          "orientation": "vertical"
        }
      ]
    },
    {
      "template": "fullscreen",
      "name": {
        "zh-CN": "全屏",
        "en-US": "Fullscreen"
      },
      "thumbnail": "https://example.com/thumbnails/fullscreen_200x113.png",
      "elements": [
        {
          "id": 1,
          "x": 0,
          "y": 0,
          "width": 1920,
          "height": 1080,
          "zIndex": 1,
          "type": "media",
          "transparentBackground": false
        }
      ]
    },
    {
      "template": "2es",
      "name": {
        "zh-CN": "二等分",
        "en-US": "Two Equal Split"
      },
      "thumbnail": "https://example.com/thumbnails/2es_200x113.png",
      "elements": [
        {
          "id": 1,
          "x": 10,
          "y": 284,
          "width": 945,
          "height": 532,
          "zIndex": 1,
          "type": "media",
          "transparentBackground": false
        },
        {
          "id": 2,
          "x": 967,
          "y": 284,
          "width": 945,
          "height": 532,
          "zIndex": 2,
          "type": "media",
          "transparentBackground": false
        }
      ]
    }
  ],
  "message": "获取布局模板列表成功"
}
```

### 获取布局模板最后更新时间

获取布局模板的最后更新时间，用于客户端判断是否需要更新本地缓存。

- **URL**: `/layout/templates/last-updated`
- **方法**: `GET`
- **请求参数**: 无
- **请求示例**:

```
GET /api/layout/templates/last-updated
```

- **响应示例**:

```json
{
  "code": 0,
  "data": {
    "lastUpdated": "2023-06-01T12:00:00Z"
  },
  "message": "获取布局模板最后更新时间成功"
}
```

### 获取布局模板详情

获取指定布局模板的详细信息。

- **URL**: `/layout/templates/{templateId}`
- **方法**: `GET`
- **请求参数**: 无
- **请求示例**:

```
GET /api/layout/templates/surgery-single
```

- **响应示例**:

```json
{
  "code": 0,
  "data": {
    "template": "surgery-single",
    "name": {
      "zh-CN": "单画面手术",
      "en-US": "Single View Surgery"
    },
    "thumbnail": "https://example.com/thumbnails/surgery-single_200x113.png",
    "elements": [
      {
        "id": 1,
        "x": 0,
        "y": 0,
        "width": 1920,
        "height": 1080,
        "zIndex": 1,
        "type": "media",
        "sourceId": "camera-1",
        "sourceName": "主摄像头",
        "transparentBackground": false
      },
      {
        "id": 2,
        "x": 50,
        "y": 50,
        "width": 200,
        "height": 80,
        "zIndex": 2,
        "type": "media",
        "sourceId": "logo",
        "sourceName": "医院Logo",
        "transparentBackground": true
      },
      {
        "id": 3,
        "x": 50,
        "y": 900,
        "width": 400,
        "height": 50,
        "zIndex": 3,
        "type": "host-label",
        "fontStyle": {
          "fontSize": 24,
          "fontWeight": "bold",
          "fontColor": "#ffffff"
        },
        "orientation": "horizontal"
      },
      {
        "id": 4,
        "x": 50,
        "y": 950,
        "width": 400,
        "height": 100,
        "zIndex": 3,
        "type": "host-info",
        "fontStyle": {
          "fontSize": 20,
          "fontWeight": "regular",
          "fontColor": "#ffffff"
        },
        "orientation": "horizontal"
      }
    ]
  },
  "message": "获取布局模板详情成功"
}
```

## 数据类型说明

### Channel（频道）

```typescript
interface Channel {
  id: string            // 直播频道的唯一识别ID
  name: string          // 直播频道名称
  url?: string          // 频道链接地址
  plans: Plan[]         // 本频道下有效的直播计划
}
```

### Plan（计划）

```typescript
interface Plan {
  id: string                // 直播计划的ID，来自于API
  cover?: string            // 计划的封面图url
  branches?: Branch[]       // 计划可能包含多个分支，每个分支有唯一id
  name: string              // 计划的名称
  plannedStartDateTime: Date // 预计开始时间
  plannedEndDateTime?: Date  // 预计结束时间
  background?: string       // 计划内所有布局通用的背景图片url，除非layout单独指定该字段
  labelBackground?: string  // 计划内所有布局通用的标签背景图片url，除非layout单独指定该字段
  textColor?: string        // 计划内所有布局通用的文字颜色，除非layout单独指定该字段
}
```

### Branch（分支）

```typescript
interface Branch {
  id: string            // 直播计划分支ID
  name: string          // 分支名称
  schedules: Schedule[] // 本分支包含的日程
  streamConfig?: StreamConfig   // 直播计划分支的推流配置，通过API进行远程预设值
}
```

### Schedule（日程）

```typescript
interface Schedule {
  id: string                    // 日程在计划中的唯一id
  type: ScheduleType            // 日程类型，目前支持手术演示/讲课
  plannedStartDateTime?: Date   // 预计开始时间
  plannedDuration?: number      // 预计持续时间（分钟）
  plannedEndDateTime?: Date     // 预计结束时间（根据前二者计算得到）
  layouts: Layout[]             // 日程重可以包含多个布局（Layout）
  surgeryInfo?: SurgeryInfo     // 手术演示类日程的手术信息
  lectureInfo?: LectureInfo     // 讲课类日程的讲课信息
}
```

### Layout（布局）

```typescript
interface Layout {
  id: number                      // 该布局在当前schedule中的id，多个布局顺序排列不重复即可
  template: string                // 该布局的模板唯一识别ID
  description?: string            // 该布局的用途描述
  background?: string             // 布局背景图url
  foreground?: string             // 布局前景图url
  labelBackground?: string        // 布局的标签背景图片url
  textColor?: string              // 布局内文字颜色
}
```

### LayoutTemplate（布局模板）

```typescript
interface LayoutTemplate {
  template: string                // 布局的唯一识别模式名
  name: {
    "zh-CN": string,              // 布局模板的中文名称
    "en-US": string               // 布局模板的英文名称
  },
  thumbnail?: string              // 布局模板的缩略图url，建议使用16:9比例、200像素宽的图片
  elements?: LayoutElement[]      // 该布局包含的布局元素（一个布局内包含多个布局元素）
}
```