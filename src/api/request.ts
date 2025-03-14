/**
 * 请求工具
 * 封装axios请求库，统一处理请求和响应
 */
import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * 响应数据结构
 */
export interface ResponseData<T = any> {
  code: number;
  data: T;
  message: string;
}

/**
 * 创建axios实例
 */
const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * 请求拦截器
 */
service.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    
    // 如果有token，添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 */
service.interceptors.response.use(
  (response: AxiosResponse<ResponseData>) => {
    const res = response.data
    
    // 如果响应码不为0，表示请求出错
    if (res.code !== 0) {
      console.error('响应错误:', res.message)
      
      // 如果是401，表示未登录或token过期
      if (res.code === 401) {
        // 清除token
        localStorage.removeItem('token')
        
        // 跳转到登录页
        window.location.href = '/login'
      }
      
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    
    return res.data
  },
  (error) => {
    console.error('响应错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 请求类
 * 封装常用的请求方法
 */
class Request {
  /**
   * GET请求
   * @param url - 请求地址
   * @param params - 请求参数
   * @param config - 请求配置
   * @returns Promise
   */
  get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config })
  }
  
  /**
   * POST请求
   * @param url - 请求地址
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns Promise
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  }
  
  /**
   * PUT请求
   * @param url - 请求地址
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns Promise
   */
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  }
  
  /**
   * DELETE请求
   * @param url - 请求地址
   * @param config - 请求配置
   * @returns Promise
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config)
  }
}

// 导出单例实例
export default new Request() 