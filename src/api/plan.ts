/**
 * 计划API服务
 * 用于请求直播计划相关数据
 * 注意：所有接口都需要鉴权，请求时会自动携带Authorization头
 */
import request from '../utils/request'
import type { Channel, Plan, Branch, Schedule } from '../types/broadcast'

/**
 * 计划API类
 * 封装计划相关的API请求
 * 所有接口都需要鉴权，会自动携带用户的Authorization令牌
 */
class PlanApi {
  /**
   * 一次性获取当前登录用户可操作的所有频道、计划和分支数据
   * 该接口会自动携带用户的鉴权信息，只返回用户有权限访问的数据
   * @returns Promise<Channel[]> 包含完整数据的频道列表
   * @requires 鉴权
   */
  getAllData() {
    // request工具会自动添加Authorization头，确保请求包含鉴权信息
    return request.get<Channel[]>('/plan/all')
  }
  
  /**
   * 创建新日程
   * @param branchId - 分支ID
   * @param schedule - 日程数据（不包含ID）
   * @returns Promise<Schedule> 创建后的日程数据
   * @requires 鉴权
   */
  createSchedule(branchId: string, schedule: Omit<Schedule, 'id'> & { id?: string }) {
    // request工具会自动添加Authorization头，确保请求包含鉴权信息
    return request.post<Schedule>(`/plan/branches/${branchId}/schedules`, schedule)
  }
  
  /**
   * 更新日程
   * @param branchId - 分支ID
   * @param schedule - 日程数据（包含ID）
   * @returns Promise<Schedule> 更新后的日程数据
   * @requires 鉴权
   */
  updateSchedule(branchId: string, schedule: Schedule) {
    // request工具会自动添加Authorization头，确保请求包含鉴权信息
    return request.put<Schedule>(`/plan/branches/${branchId}/schedules/${schedule.id}`, schedule)
  }
  
  /**
   * 保存日程（兼容旧版本，内部根据ID是否存在决定创建或更新）
   * @param branchId - 分支ID
   * @param schedule - 日程数据
   * @returns Promise<Schedule> 保存后的日程数据
   * @requires 鉴权
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
   * @requires 鉴权
   */
  deleteSchedule(branchId: string, scheduleId: string) {
    // request工具会自动添加Authorization头，确保请求包含鉴权信息
    return request.delete<void>(`/plan/branches/${branchId}/schedules/${scheduleId}`)
  }
}

// 导出单例实例
export default new PlanApi() 