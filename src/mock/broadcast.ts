/**
 * 播报相关 Mock 数据
 */
import Mock from 'mockjs'

/**
 * 播报项目接口
 */
export interface BroadcastItem {
  id: string
  title: string
  content: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createTime: string
  updateTime: string
  duration: number
  audioUrl?: string
}

/**
 * 设置播报相关的 Mock 数据
 */
export function setupBroadcastMock() {
  // 获取播报列表接口
  Mock.mock('/api/broadcast/list', 'get', (options) => {
    const { page = 1, pageSize = 10 } = options.url.match(/page=(\d+)&pageSize=(\d+)/) 
      ? { page: parseInt(RegExp.$1), pageSize: parseInt(RegExp.$2) }
      : { page: 1, pageSize: 10 }
    
    const total = 35
    const list = []
    
    for (let i = 0; i < pageSize; i++) {
      const index = (page - 1) * pageSize + i
      if (index >= total) break
      
      list.push(Mock.mock({
        id: '@guid',
        title: '@ctitle(5, 20)',
        content: '@cparagraph(2, 5)',
        status: '@pick(["pending", "processing", "completed", "failed"])',
        createTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
        updateTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
        duration: '@integer(10, 300)',
        audioUrl: '@pick([null, "https://example.com/audio/demo.mp3"])'
      }))
    }
    
    return {
      code: 0,
      data: {
        list,
        total,
        page,
        pageSize
      },
      message: '获取播报列表成功'
    }
  })
  
  // 获取播报详情接口
  Mock.mock(new RegExp('/api/broadcast/detail/\\w+'), 'get', () => {
    return {
      code: 0,
      data: Mock.mock({
        id: '@guid',
        title: '@ctitle(5, 20)',
        content: '@cparagraph(5, 10)',
        status: '@pick(["pending", "processing", "completed", "failed"])',
        createTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
        updateTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
        duration: '@integer(10, 300)',
        audioUrl: '@pick([null, "https://example.com/audio/demo.mp3"])'
      }),
      message: '获取播报详情成功'
    }
  })
  
  // 创建播报接口
  Mock.mock('/api/broadcast/create', 'post', (options) => {
    const { title, content } = JSON.parse(options.body)
    
    if (!title || !content) {
      return {
        code: 1001,
        data: null,
        message: '标题和内容不能为空'
      }
    }
    
    return {
      code: 0,
      data: {
        id: Mock.Random.guid(),
        title,
        content,
        status: 'pending',
        createTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
        updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
        duration: 0
      },
      message: '创建播报成功'
    }
  })
  
  // 更新播报接口
  Mock.mock(new RegExp('/api/broadcast/update/\\w+'), 'put', (options) => {
    const { title, content } = JSON.parse(options.body)
    
    if (!title && !content) {
      return {
        code: 1001,
        data: null,
        message: '更新内容不能为空'
      }
    }
    
    return {
      code: 0,
      data: null,
      message: '更新播报成功'
    }
  })
  
  // 删除播报接口
  Mock.mock(new RegExp('/api/broadcast/delete/\\w+'), 'delete', () => {
    return {
      code: 0,
      data: null,
      message: '删除播报成功'
    }
  })
  
  // 开始播报接口
  Mock.mock(new RegExp('/api/broadcast/start/\\w+'), 'post', () => {
    return {
      code: 0,
      data: null,
      message: '开始播报成功'
    }
  })
  
  // 停止播报接口
  Mock.mock(new RegExp('/api/broadcast/stop/\\w+'), 'post', () => {
    return {
      code: 0,
      data: null,
      message: '停止播报成功'
    }
  })
} 