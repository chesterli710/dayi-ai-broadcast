/**
 * API 请求工具类
 * 封装 axios 实例，统一处理请求和响应
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * 响应数据接口
 */
export interface ResponseData<T = any> {
  code: number
  data: T
  message: string
}

/**
 * HTTP 请求类
 * 封装 axios 实例，提供 get、post 等方法
 */
class HttpRequest {
  /**
   * axios 实例
   */
  private instance: AxiosInstance

  /**
   * 构造函数
   * @param baseURL - API 基础 URL
   */
  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 在发送请求之前做些什么
        // 例如：添加 token
        const token = localStorage.getItem('token')
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        // 对请求错误做些什么
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        // 对响应数据做点什么
        const res = response.data
        
        // 根据业务状态码处理响应
        if (res.code !== 0 && res.code !== 200) {
          // 处理业务错误
          console.error(`API 请求错误: ${res.message}`)
          return Promise.reject(new Error(res.message || '未知错误'))
        }
        
        return res
      },
      (error) => {
        // 对响应错误做点什么
        console.error(`网络请求错误: ${error.message}`)
        return Promise.reject(error)
      }
    )
  }

  /**
   * 发送 GET 请求
   * @param url - 请求 URL
   * @param params - 请求参数
   * @param config - 请求配置
   * @returns Promise
   */
  public get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ResponseData<T>> {
    return this.instance.get(url, { params, ...config })
  }

  /**
   * 发送 POST 请求
   * @param url - 请求 URL
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns Promise
   */
  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ResponseData<T>> {
    return this.instance.post(url, data, config)
  }

  /**
   * 发送 PUT 请求
   * @param url - 请求 URL
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns Promise
   */
  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ResponseData<T>> {
    return this.instance.put(url, data, config)
  }

  /**
   * 发送 DELETE 请求
   * @param url - 请求 URL
   * @param config - 请求配置
   * @returns Promise
   */
  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ResponseData<T>> {
    return this.instance.delete(url, config)
  }
}

// 创建请求实例
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const request = new HttpRequest(baseURL)

export default request 