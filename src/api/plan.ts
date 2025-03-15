/**
 * 计划API服务
 * 用于请求直播计划相关数据
 */
import request from '../utils/request'
import type { Channel, Plan, Branch, Schedule } from '../types/broadcast'

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
  
  /**
   * 创建新日程
   * @param branchId - 分支ID
   * @param schedule - 日程数据（不包含ID）
   * @returns Promise<Schedule> 创建后的日程数据
   */
  createSchedule(branchId: string, schedule: Omit<Schedule, 'id'> & { id?: string }) {
    return request.post<Schedule>(`/plan/branches/${branchId}/schedules`, schedule)
  }
  
  /**
   * 更新日程
   * @param branchId - 分支ID
   * @param schedule - 日程数据（包含ID）
   * @returns Promise<Schedule> 更新后的日程数据
   */
  updateSchedule(branchId: string, schedule: Schedule) {
    return request.put<Schedule>(`/plan/branches/${branchId}/schedules/${schedule.id}`, schedule)
  }
  
  /**
   * 保存日程（兼容旧版本，内部根据ID是否存在决定创建或更新）
   * @param branchId - 分支ID
   * @param schedule - 日程数据
   * @returns Promise<Schedule> 保存后的日程数据
   */
  saveSchedule(branchId: string, schedule: Schedule) {
    if (schedule.id && 
        schedule.id.toString().length > 5 && 
        !schedule.id.startsWith('schedule-') && 
        !schedule.id.toString().match(/^\d{13,}$/)) {
      // 更新现有日程
      return this.updateSchedule(branchId, schedule)
    } else {
      // 创建新日程
      return this.createSchedule(branchId, schedule)
    }
  }
  
  /**
   * 删除日程
   * @param branchId - 分支ID
   * @param scheduleId - 日程ID
   * @returns Promise<void>
   */
  deleteSchedule(branchId: string, scheduleId: string) {
    return request.delete<void>(`/plan/branches/${branchId}/schedules/${scheduleId}`)
  }
}

// 导出单例实例
export default new PlanApi() 