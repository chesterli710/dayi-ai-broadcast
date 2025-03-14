/**
 * 计划API服务
 * 用于请求直播计划相关数据
 */
import request from '../utils/request'
import type { Channel, Plan, Branch } from '../types/broadcast'

/**
 * 获取频道列表参数
 */
export interface GetChannelsParams {
  userId?: string;  // 用户ID，不传则获取当前登录用户的频道
}

/**
 * 获取计划列表参数
 */
export interface GetPlansParams {
  channelId: string;  // 频道ID
  status?: 'upcoming' | 'ongoing' | 'completed' | 'all';  // 计划状态，默认为all
}

/**
 * 获取分支列表参数
 */
export interface GetBranchesParams {
  planId: string;  // 计划ID
}

/**
 * 计划API类
 * 封装计划相关的API请求
 */
class PlanApi {
  /**
   * 一次性获取所有频道、计划和分支数据
   * @returns Promise<Channel[]> 包含完整数据的频道列表
   */
  getAllData() {
    return request.get<Channel[]>('/plan/all')
  }

  /**
   * 获取频道列表
   * @param params - 查询参数
   * @returns Promise<Channel[]> 频道列表
   */
  getChannels(params: GetChannelsParams = {}) {
    return request.get<Channel[]>('/plan/channels', params)
  }
  
  /**
   * 获取计划列表
   * @param params - 查询参数
   * @returns Promise<Plan[]> 计划列表
   */
  getPlans(params: GetPlansParams) {
    return request.get<Plan[]>('/plan/plans', params)
  }
  
  /**
   * 获取计划详情
   * @param planId - 计划ID
   * @returns Promise<Plan> 计划详情
   */
  getPlanDetail(planId: string) {
    return request.get<Plan>(`/plan/plans/${planId}`)
  }
  
  /**
   * 获取分支列表
   * @param params - 查询参数
   * @returns Promise<Branch[]> 分支列表
   */
  getBranches(params: GetBranchesParams) {
    return request.get<Branch[]>('/plan/branches', params)
  }
  
  /**
   * 获取分支详情
   * @param branchId - 分支ID
   * @returns Promise<Branch> 分支详情
   */
  getBranchDetail(branchId: string) {
    return request.get<Branch>(`/plan/branches/${branchId}`)
  }
}

// 导出单例实例
export default new PlanApi() 