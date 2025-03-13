/**
 * 用户相关 API 服务
 */
import request from '../utils/request'
import type { UserInfo } from '../mock/user'

/**
 * 登录参数接口
 */
export interface LoginParams {
  username: string // 用作手机号
  password: string
}

/**
 * 登录响应接口
 */
export interface LoginResult {
  token: string
  expires: number
}

/**
 * 用户 API 类
 * 封装用户相关的 API 请求
 */
class UserApi {
  /**
   * 登录
   * @param params - 登录参数
   * @returns Promise
   */
  login(params: LoginParams) {
    return request.post<LoginResult>('/user/login', params)
  }
  
  /**
   * 获取用户信息
   * @returns Promise
   */
  getUserInfo() {
    return request.get<UserInfo>('/user/info')
  }
  
  /**
   * 退出登录
   * @returns Promise
   */
  logout() {
    return request.post('/user/logout')
  }
}

export default new UserApi() 