# 大医AI导播系统 API 文档

本文档详细描述了大医AI导播系统的所有API接口，包括请求方式、参数说明和返回值格式。

## 目录

- [通用说明](#通用说明)
- [认证相关](#认证相关)
- [计划相关](#计划相关)
- [布局相关](#布局相关)
- [日程管理API](#日程管理api)
  - [保存日程](#保存日程)
  - [删除日程](#删除日程)

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

> **重要说明：所有计划相关的接口都需要鉴权，请求时必须在请求头中包含有效的Authorization令牌**

### 获取所有数据

> **✅ 推荐使用** - 一次性获取当前登录用户可操作的所有频道、计划和分支数据，减少请求次数，提高性能。

- **URL**: `/plan/all`
- **方法**: `GET`
- **请求参数**: 无（自动使用当前登录用户的鉴权信息）
- **鉴权要求**: 是（需要在请求头中包含有效的Authorization令牌）
- **请求示例**:

```
GET /api/plan/all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
          "surgeonLabelDisplayName": "手术团队",
          "surgeryLabelDisplayName": "手术名称",
          "guestLabelDisplayName": "特邀嘉宾",
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
                    "speakers": [
                      {
                        "name": "王教授",
                        "title": "教授",
                        "organization": "北京协和医院"
                      }
                    ],
                    "guests": [
                      {
                        "name": "李医生",
                        "title": "副主任医师",
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
          ]
        }
      ]
    }
  ],
  "message": "获取所有数据成功"
}
```

## 日程管理API

### 保存日程

创建新日程或更新现有日程。

- **URL**: `/plan/branches/{branchId}/schedules` 或 `/plan/branches/{branchId}/schedules/{scheduleId}`
- **方法**: `POST`（创建新日程）或 `PUT`（更新现有日程）
- **鉴权要求**: 是（需要在请求头中包含有效的Authorization令牌）
- **请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| branchId | string | 是 | 分支ID（URL路径参数） |
| scheduleId | string | 更新时必填 | 日程ID（URL路径参数，仅更新时需要） |
| schedule | object | 是 | 日程数据（请求体） |

- **请求示例**:

```
POST /api/plan/branches/branch-1/schedules
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "type": "SURGERY",
  "plannedStartDateTime": "2023-06-15T09:00:00",
  "plannedDuration": 120,
  "layouts": [
    {
      "id": 1,
      "template": "surgery-single",
      "description": "适用于单摄像头手术直播"
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
```

### 删除日程

删除指定日程。

- **URL**: `/plan/branches/{branchId}/schedules/{scheduleId}`
- **方法**: `DELETE`
- **鉴权要求**: 是（需要在请求头中包含有效的Authorization令牌）
- **请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| branchId | string | 是 | 分支ID（URL路径参数） |
| scheduleId | string | 是 | 日程ID（URL路径参数） |

- **请求示例**:

```
DELETE /api/plan/branches/branch-1/schedules/schedule-1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
  surgeonLabelDisplayName?: string // "术者"在界面上的显示文字，有可能是"手术团队"等
  surgeryLabelDisplayName?: string // "术式"在界面上的显示文字
  guestLabelDisplayName?: string   // "互动嘉宾"在界面上的显示文字
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
  surgeonLabelDisplayName?: string // "术者"在界面上的显示文字，有可能是"手术团队"等
  surgeryLabelDisplayName?: string // "术式"在界面上的显示文字
  guestLabelDisplayName?: string   // "互动嘉宾"在界面上的显示文字
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