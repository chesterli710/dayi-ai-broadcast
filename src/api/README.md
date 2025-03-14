# 大医AI导播系统 API 模块

本目录包含大医AI导播系统的所有API服务模块，用于与后端服务进行通信。

## 目录结构

- `request.ts` - 请求工具，封装axios请求库，统一处理请求和响应
- `plan.ts` - 计划API服务，用于请求直播计划相关数据
- `layout.ts` - 布局API服务，用于请求布局模板相关数据

## API文档

详细的API文档请参考：[API文档](/PRD/API文档.md)

## 使用示例

### 基本使用

```typescript
// 导入API服务
import planApi from './plan'
import layoutApi from './layout'

// 获取频道列表
planApi.getChannels().then(channels => {
  console.log('频道列表:', channels)
})

// 获取计划列表
planApi.getPlans({ channelId: 'channel-1' }).then(plans => {
  console.log('计划列表:', plans)
})

// 获取布局模板列表
layoutApi.getLayoutTemplates().then(templates => {
  console.log('布局模板列表:', templates)
})
```

### 带参数的请求示例

```typescript
// 获取特定用户的频道列表
planApi.getChannels({ userId: 'user-1' }).then(channels => {
  console.log('用户频道列表:', channels)
})

// 获取特定状态的计划列表
planApi.getPlans({ 
  channelId: 'channel-1', 
  status: 'upcoming' 
}).then(plans => {
  console.log('即将开始的计划列表:', plans)
})

// 获取计划详情
planApi.getPlanDetail('plan-1').then(plan => {
  console.log('计划详情:', plan)
})

// 获取分支列表
planApi.getBranches({ planId: 'plan-1' }).then(branches => {
  console.log('分支列表:', branches)
})

// 获取分支详情
planApi.getBranchDetail('branch-1').then(branch => {
  console.log('分支详情:', branch)
})

// 获取布局模板详情
layoutApi.getLayoutTemplateDetail('surgery-single').then(template => {
  console.log('布局模板详情:', template)
})
```

## 错误处理

所有API请求都会统一处理错误，如果响应码不为0，会抛出一个包含错误信息的Promise.reject。

```typescript
planApi.getPlans({ channelId: 'invalid-id' })
  .then(plans => {
    console.log('计划列表:', plans)
  })
  .catch(error => {
    console.error('获取计划列表失败:', error.message)
  })
```

### 使用 async/await 处理错误

```typescript
async function fetchPlans() {
  try {
    const plans = await planApi.getPlans({ channelId: 'channel-1' })
    console.log('计划列表:', plans)
    
    // 获取第一个计划的详情
    if (plans.length > 0) {
      const planDetail = await planApi.getPlanDetail(plans[0].id)
      console.log('计划详情:', planDetail)
    }
  } catch (error) {
    console.error('获取数据失败:', error.message)
  }
}

fetchPlans()
```

## Mock数据

在开发环境中，系统会自动启用Mock数据服务，模拟后端API响应。Mock数据定义在`src/mock`目录下。

### 开发环境与生产环境

- 开发环境：自动使用Mock数据
- 生产环境：连接实际后端API

系统会根据环境变量自动切换数据源，无需修改代码。 