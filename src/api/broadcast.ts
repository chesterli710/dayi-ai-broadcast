/**
 * 播报相关 API 服务
 */
import request from '../utils/request'
import type { BroadcastItem } from '../mock/broadcast'

/**
 * 播报列表查询参数接口
 */
export interface BroadcastListParams {
  page?: number
  pageSize?: number
  status?: string
  keyword?: string
}

/**
 * 播报列表响应接口
 */
export interface BroadcastListResult {
  list: BroadcastItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 创建播报参数接口
 */
export interface CreateBroadcastParams {
  title: string
  content: string
}

/**
 * 更新播报参数接口
 */
export interface UpdateBroadcastParams {
  title?: string
  content?: string
}

/**
 * 播报 API 类
 * 封装播报相关的 API 请求
 */
class BroadcastApi {
  /**
   * 获取播报列表
   * @param params - 查询参数
   * @returns Promise
   */
  getList(params: BroadcastListParams = {}) {
    return request.get<BroadcastListResult>('/broadcast/list', params)
  }
  
  /**
   * 获取播报详情
   * @param id - 播报 ID
   * @returns Promise
   */
  getDetail(id: string) {
    return request.get<BroadcastItem>(`/broadcast/detail/${id}`)
  }
  
  /**
   * 创建播报
   * @param params - 创建参数
   * @returns Promise
   */
  create(params: CreateBroadcastParams) {
    return request.post<BroadcastItem>('/broadcast/create', params)
  }
  
  /**
   * 更新播报
   * @param id - 播报 ID
   * @param params - 更新参数
   * @returns Promise
   */
  update(id: string, params: UpdateBroadcastParams) {
    return request.put(`/broadcast/update/${id}`, params)
  }
  
  /**
   * 删除播报
   * @param id - 播报 ID
   * @returns Promise
   */
  delete(id: string) {
    return request.delete(`/broadcast/delete/${id}`)
  }
  
  /**
   * 开始播报
   * @param id - 播报 ID
   * @returns Promise
   */
  start(id: string) {
    return request.post(`/broadcast/start/${id}`)
  }
  
  /**
   * 停止播报
   * @param id - 播报 ID
   * @returns Promise
   */
  stop(id: string) {
    return request.post(`/broadcast/stop/${id}`)
  }
}

export default new BroadcastApi() 