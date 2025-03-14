# 大医AI导播系统 Mock 数据模块

本目录包含大医AI导播系统的所有Mock数据模块，用于在开发环境中模拟后端API响应。

## 目录结构

- `index.ts` - Mock数据入口文件，用于初始化所有Mock数据
- `plan.ts` - 计划相关Mock数据，模拟计划API的响应
- `layout.ts` - 布局相关Mock数据，模拟布局API的响应

## 数据来源

当前Mock数据直接使用API文档中的示例数据，确保前端开发与API文档保持一致。详细的API文档请参考：[API文档](/PRD/API文档.md)

## 使用方法

在开发环境中，系统会自动初始化Mock数据服务。初始化过程在`src/main.ts`中完成：

```typescript
// 在开发环境中初始化Mock数据
if (import.meta.env.DEV) {
  import('./mock').then(({ setupMock }) => {
    setupMock()
  })
}
```

## 自定义Mock数据

如果需要自定义Mock数据，可以修改对应的Mock数据文件：

1. 修改`plan.ts`中的分支和日程数据
2. 修改`layout.ts`中的布局模板数据

## 添加新的Mock数据

如果需要添加新的Mock数据模块，请按照以下步骤操作：

1. 创建新的Mock数据文件，例如`user.ts`
2. 在文件中定义`setupUserMock`函数，用于初始化Mock数据
3. 在`index.ts`中导入并调用该函数

示例：

```typescript
// user.ts
import Mock from 'mockjs'
import type { User } from '../types/user'

export function setupUserMock() {
  // 获取用户信息接口
  Mock.mock('/api/user/info', 'get', () => {
    return {
      code: 0,
      data: {
        id: 'user-1',
        name: '张三',
        phone: '13800138000'
      },
      message: '获取用户信息成功'
    }
  })
}

// index.ts
import { setupPlanMock } from './plan'
import { setupLayoutMock } from './layout'
import { setupUserMock } from './user'

export function setupMock() {
  setupPlanMock()
  setupLayoutMock()
  setupUserMock()
  
  console.log('Mock数据初始化完成')
}
```

## 相关文档

- [API文档](/PRD/API文档.md) - 详细的API接口说明
- [产品需求说明](/PRD/产品需求说明.md) - 产品需求说明文档 