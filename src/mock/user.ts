/**
 * 用户相关 Mock 数据
 */
import Mock from 'mockjs'

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar: string
  email: string
  phone: string
  roles: string[]
  permissions: string[]
}

/**
 * 设置用户相关的 Mock 数据
 */
export function setupUserMock() {
  // 登录接口
  Mock.mock('/api/user/login', 'post', (options) => {
    const { username, password } = JSON.parse(options.body)
    
    // 支持手机号登录
    if ((username === 'admin' || username === '13800138000') && password === '123456') {
      return {
        code: 0,
        data: {
          token: 'mock-token-admin-' + Date.now(),
          // 设置超长有效期（10年）
          expires: 315360000
        },
        message: '登录成功'
      }
    } else if ((username === 'user' || username === '13900139000') && password === '123456') {
      return {
        code: 0,
        data: {
          token: 'mock-token-user-' + Date.now(),
          // 设置超长有效期（10年）
          expires: 315360000
        },
        message: '登录成功'
      }
    } else {
      return {
        code: 1001,
        data: null,
        message: '手机号或密码错误'
      }
    }
  })
  
  // 获取用户信息接口
  Mock.mock('/api/user/info', 'get', () => {
    // 由于Mock.js的限制，无法直接获取请求头
    // 这里简化处理，根据localStorage中的token判断用户身份
    const token = localStorage.getItem('token') || ''
    
    if (token.includes('admin')) {
      return {
        code: 0,
        data: {
          id: '1',
          username: 'admin',
          nickname: '管理员',
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          email: 'admin@example.com',
          phone: '13800138000',
          roles: ['admin'],
          permissions: ['*']
        },
        message: '获取用户信息成功'
      }
    } else if (token.includes('user')) {
      return {
        code: 0,
        data: {
          id: '2',
          username: 'user',
          nickname: '普通用户',
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          email: 'user@example.com',
          phone: '13900139000',
          roles: ['user'],
          permissions: ['read']
        },
        message: '获取用户信息成功'
      }
    } else {
      return {
        code: 401,
        data: null,
        message: '未授权，请重新登录'
      }
    }
  })
  
  // 退出登录接口
  Mock.mock('/api/user/logout', 'post', () => {
    return {
      code: 0,
      data: null,
      message: '退出登录成功'
    }
  })
  
  // 在开发环境中自动填充测试账号（仅用于开发测试）
  if (import.meta.env.DEV) {
    // 在控制台输出测试账号信息，方便开发人员使用
    console.info('开发环境测试账号：\n手机号：13800138000\n密码：123456')
  }
} 