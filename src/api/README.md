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

# 计划API文档

本文档详细说明了大医AI导播系统中计划相关的API使用方法。

## 导入方式

```typescript
import planApi from '../api/plan';
```

## API方法

### 获取所有数据

一次性获取所有频道、计划和分支数据。

```typescript
planApi.getAllData()
  .then(channels => {
    // 处理返回的频道列表（包含完整的计划和分支数据）
  })
  .catch(error => {
    // 处理错误
  });
```

### 获取频道列表

```typescript
// 获取当前用户的频道
planApi.getChannels()
  .then(channels => {
    // 处理返回的频道列表
  })
  .catch(error => {
    // 处理错误
  });

// 获取指定用户的频道
planApi.getChannels({ userId: 'user123' })
  .then(channels => {
    // 处理返回的频道列表
  })
  .catch(error => {
    // 处理错误
  });
```

### 获取计划列表

```typescript
// 获取指定频道的所有计划
planApi.getPlans({ channelId: 'channel123' })
  .then(plans => {
    // 处理返回的计划列表
  })
  .catch(error => {
    // 处理错误
  });

// 获取指定频道的即将开始的计划
planApi.getPlans({ channelId: 'channel123', status: 'upcoming' })
  .then(plans => {
    // 处理返回的计划列表
  })
  .catch(error => {
    // 处理错误
  });
```

### 获取计划详情

```typescript
planApi.getPlanDetail('plan123')
  .then(plan => {
    // 处理返回的计划详情
  })
  .catch(error => {
    // 处理错误
  });
```

### 获取分支列表

```typescript
planApi.getBranches({ planId: 'plan123' })
  .then(branches => {
    // 处理返回的分支列表
  })
  .catch(error => {
    // 处理错误
  });
```

### 获取分支详情

```typescript
planApi.getBranchDetail('branch123')
  .then(branch => {
    // 处理返回的分支详情
  })
  .catch(error => {
    // 处理错误
  });
```

### 创建新日程

创建一个新的日程，不需要提供ID（如果提供了ID，会被服务器忽略并生成新ID）。

```typescript
const newSchedule = {
  type: ScheduleType.SURGERY,
  plannedStartDateTime: new Date(),
  plannedDuration: 60,
  surgeryInfo: {
    procedure: '腹腔镜胆囊切除术',
    surgeons: [
      { name: '张医生', title: '主任医师', organization: '北京协和医院' }
    ],
    guests: []
  },
  layouts: []
};

planApi.createSchedule('branch123', newSchedule)
  .then(createdSchedule => {
    // 处理返回的创建成功的日程（包含服务器生成的ID）
    console.log('创建的日程ID:', createdSchedule.data.id);
  })
  .catch(error => {
    // 处理错误
  });
```

### 更新日程

更新现有日程，必须提供有效的日程ID。

```typescript
const updatedSchedule = {
  id: 'schedule123', // 必须提供有效的ID
  type: ScheduleType.SURGERY,
  plannedStartDateTime: new Date(),
  plannedDuration: 90, // 更新持续时间
  surgeryInfo: {
    procedure: '腹腔镜胆囊切除术（更新）',
    surgeons: [
      { name: '张医生', title: '主任医师', organization: '北京协和医院' }
    ],
    guests: []
  },
  layouts: []
};

planApi.updateSchedule('branch123', updatedSchedule)
  .then(updatedSchedule => {
    // 处理返回的更新成功的日程
    console.log('更新成功');
  })
  .catch(error => {
    // 处理错误
  });
```

### 保存日程（兼容旧版本）

根据日程是否包含有效ID自动决定创建新日程或更新现有日程。
推荐使用更明确的`createSchedule`和`updateSchedule`方法，此方法主要用于兼容旧代码。

```typescript
const schedule = {
  // 如果id不存在或为临时ID格式，则创建新日程
  // 如果id存在且为有效格式，则更新现有日程
  id: existingId || undefined,
  type: ScheduleType.SURGERY,
  // 其他日程属性...
};

planApi.saveSchedule('branch123', schedule)
  .then(savedSchedule => {
    // 处理返回的保存成功的日程
  })
  .catch(error => {
    // 处理错误
  });
```

### 删除日程

```typescript
planApi.deleteSchedule('branch123', 'schedule123')
  .then(() => {
    // 删除成功
    console.log('日程删除成功');
  })
  .catch(error => {
    // 处理错误
  });
```

## 日程ID规则说明

系统中的日程ID遵循以下规则：

1. **临时ID**：
   - 创建新日程时，前端不需要提供ID
   - 如果提供了ID且格式为`temp-${timestamp}`，服务器会识别为临时ID并生成新ID

2. **有效ID**：
   - 服务器生成的有效ID通常以`schedule-`开头，如`schedule-1621234567890`
   - 有效ID长度大于5个字符
   - 不是纯数字时间戳格式

3. **ID判断逻辑**：
   - 在`saveSchedule`方法中，系统会根据ID是否存在、长度是否大于5、是否以`schedule-`开头以及是否为时间戳格式来判断是创建新日程还是更新现有日程

## 最佳实践

1. 创建新日程时，使用`createSchedule`方法，不提供ID
2. 更新现有日程时，使用`updateSchedule`方法，提供有效的日程ID
3. 避免使用`saveSchedule`方法，除非是为了兼容旧代码 