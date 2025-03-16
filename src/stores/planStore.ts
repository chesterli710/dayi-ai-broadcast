/**
 * 计划存储
 * 管理应用的直播计划数据
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Channel, Plan, Branch, Layout, LayoutTemplate, Schedule } from '../types/broadcast'
import { initializeApp } from '../utils/initializeApp'
import planApi from '../api/plan'
import { ElMessage } from 'element-plus'

/**
 * 计划存储
 * 管理应用的直播计划数据
 */
export const usePlanStore = defineStore('plan', () => {
  /**
   * 当前频道
   */
  const currentChannel = ref<Channel | null>(null)
  
  /**
   * 当前计划
   */
  const currentPlan = ref<Plan | null>(null)
  
  /**
   * 当前分支
   */
  const currentBranch = ref<Branch | null>(null)
  
  /**
   * 布局模板列表
   */
  const layoutTemplates = ref<LayoutTemplate[]>([])
  
  /**
   * 布局模板最后更新时间
   */
  const layoutTemplatesLastUpdated = ref<Date | null>(null)
  
  /**
   * 设置当前频道
   * @param channel - 频道数据
   */
  function setCurrentChannel(channel: Channel) {
    currentChannel.value = channel
  }
  
  /**
   * 设置当前计划
   * @param plan - 计划数据
   */
  function setCurrentPlan(plan: Plan) {
    currentPlan.value = plan
  }
  
  /**
   * 设置当前分支
   * @param branch - 分支数据
   */
  function setCurrentBranch(branch: Branch) {
    currentBranch.value = branch
    
    // 初始化应用（音频设备和编码器）
    if (branch.streamConfig) {
      initializeApp(branch.streamConfig).then(result => {
        if (result.success && result.streamConfig) {
          // 更新分支的流配置
          if (currentBranch.value) {
            currentBranch.value.streamConfig = result.streamConfig
          }
        } else {
          console.error('初始化应用失败:', result.error)
        }
      })
    }
  }
  
  /**
   * 设置布局模板列表
   * @param templates - 布局模板列表
   */
  function setLayoutTemplates(templates: LayoutTemplate[]) {
    layoutTemplates.value = templates
    layoutTemplatesLastUpdated.value = new Date()
    
    // 保存到本地存储
    saveLayoutTemplatesToLocalStorage()
  }
  
  /**
   * 从本地存储加载布局模板
   * @returns {boolean} 是否成功加载
   */
  function loadLayoutTemplatesFromLocalStorage(): boolean {
    try {
      const storedData = localStorage.getItem('layoutTemplates')
      const storedDate = localStorage.getItem('layoutTemplatesLastUpdated')
      
      if (storedData && storedDate) {
        layoutTemplates.value = JSON.parse(storedData)
        layoutTemplatesLastUpdated.value = new Date(storedDate)
        return true
      }
      
      return false
    } catch (error) {
      console.error('从本地存储加载布局模板失败:', error)
      return false
    }
  }
  
  /**
   * 保存布局模板到本地存储
   */
  function saveLayoutTemplatesToLocalStorage(): void {
    try {
      localStorage.setItem('layoutTemplates', JSON.stringify(layoutTemplates.value))
      
      if (layoutTemplatesLastUpdated.value) {
        localStorage.setItem('layoutTemplatesLastUpdated', layoutTemplatesLastUpdated.value.toISOString())
      }
    } catch (error) {
      console.error('保存布局模板到本地存储失败:', error)
    }
  }
  
  /**
   * 补全布局信息
   * 根据布局模板补全布局中的元素信息
   * @param layout - 需要补全的布局
   * @returns Layout 补全后的布局
   */
  function completeLayoutInfo(layout: Layout): Layout {
    // 查找对应的布局模板
    const template = layoutTemplates.value.find(t => t.template === layout.template)
    
    if (!template) {
      return layout
    }
    
    // 创建新的布局对象，避免修改原始对象
    const completedLayout: Layout = {
      ...layout
    }
    
    // 如果布局没有指定背景、标签背景或文字颜色，则使用计划中的值
    if (!completedLayout.background && currentPlan.value?.background) {
      completedLayout.background = currentPlan.value.background
    }
    
    if (!completedLayout.labelBackground && currentPlan.value?.labelBackground) {
      completedLayout.labelBackground = currentPlan.value.labelBackground
    }
    
    if (!completedLayout.textColor && currentPlan.value?.textColor) {
      completedLayout.textColor = currentPlan.value.textColor
    }
    
    // 如果布局没有指定术者、术式或嘉宾标签显示名称，则使用计划中的值
    if (!completedLayout.surgeonLabelDisplayName && currentPlan.value?.surgeonLabelDisplayName) {
      completedLayout.surgeonLabelDisplayName = currentPlan.value.surgeonLabelDisplayName
    }
    
    if (!completedLayout.surgeryLabelDisplayName && currentPlan.value?.surgeryLabelDisplayName) {
      completedLayout.surgeryLabelDisplayName = currentPlan.value.surgeryLabelDisplayName
    }
    
    if (!completedLayout.guestLabelDisplayName && currentPlan.value?.guestLabelDisplayName) {
      completedLayout.guestLabelDisplayName = currentPlan.value.guestLabelDisplayName
    }
    
    return completedLayout
  }
  
  /**
   * 计算属性：当前计划的所有布局
   */
  const allLayouts = computed(() => {
    if (!currentBranch.value) return []
    
    const layouts: Layout[] = []
    
    // 收集所有日程中的布局
    currentBranch.value.schedules.forEach(schedule => {
      schedule.layouts.forEach(layout => {
        layouts.push(completeLayoutInfo(layout))
      })
    })
    
    return layouts
  })
  
  /**
   * 计算属性：布局模板是否需要更新
   */
  const needsLayoutTemplateUpdate = computed(() => {
    return !layoutTemplatesLastUpdated.value
  })
  
  /**
   * 创建新日程
   * @param schedule - 日程数据（不包含ID）
   * @returns Promise<boolean> 是否创建成功
   */
  async function createSchedule(schedule: Omit<Schedule, 'id'> & { id?: string }): Promise<boolean> {
    if (!currentBranch.value) {
      ElMessage.error('当前没有选中分支，无法创建日程')
      return false
    }
    
    try {
      // 调用API创建日程
      const response = await planApi.createSchedule(currentBranch.value.id, schedule)
      
      // 从响应中获取日程数据
      const savedSchedule = response.data
      
      // 添加到分支的日程列表中
      currentBranch.value.schedules.push(savedSchedule)
      
      ElMessage.success('日程创建成功')
      return true
    } catch (error) {
      console.error('创建日程失败:', error)
      ElMessage.error('创建日程失败，请稍后重试')
      return false
    }
  }
  
  /**
   * 更新日程
   * @param schedule - 日程数据（包含ID）
   * @returns Promise<boolean> 是否更新成功
   */
  async function updateSchedule(schedule: Schedule): Promise<boolean> {
    if (!currentBranch.value) {
      ElMessage.error('当前没有选中分支，无法更新日程')
      return false
    }
    
    if (!schedule.id) {
      ElMessage.error('日程ID不能为空')
      return false
    }
    
    try {
      // 调用API更新日程
      const response = await planApi.updateSchedule(currentBranch.value.id, schedule)
      
      // 从响应中获取日程数据
      const updatedSchedule = response.data
      
      // 更新本地数据
      const existingIndex = currentBranch.value.schedules.findIndex(s => s.id === updatedSchedule.id)
      
      if (existingIndex >= 0) {
        // 更新现有日程
        currentBranch.value.schedules[existingIndex] = updatedSchedule
      } else {
        console.warn('未找到要更新的日程，将添加为新日程')
        currentBranch.value.schedules.push(updatedSchedule)
      }
      
      ElMessage.success('日程更新成功')
      return true
    } catch (error) {
      console.error('更新日程失败:', error)
      ElMessage.error('更新日程失败，请稍后重试')
      return false
    }
  }
  
  /**
   * 保存日程（兼容旧版本，内部根据ID是否存在决定创建或更新）
   * @param schedule - 日程数据
   * @returns Promise<boolean> 是否保存成功
   */
  async function saveSchedule(schedule: Schedule): Promise<boolean> {
    if (schedule.id) {
      return updateSchedule(schedule)
    } else {
      return createSchedule(schedule)
    }
  }
  
  /**
   * 删除日程
   * @param scheduleId - 日程ID
   * @returns Promise<boolean> 是否删除成功
   */
  async function deleteSchedule(scheduleId: string): Promise<boolean> {
    if (!currentBranch.value) {
      ElMessage.error('当前没有选中分支，无法删除日程')
      return false
    }
    
    try {
      // 调用API删除日程
      await planApi.deleteSchedule(currentBranch.value.id, scheduleId)
      
      // 更新本地数据
      const index = currentBranch.value.schedules.findIndex(s => s.id === scheduleId)
      if (index >= 0) {
        currentBranch.value.schedules.splice(index, 1)
      }
      
      ElMessage.success('日程删除成功')
      return true
    } catch (error) {
      console.error('删除日程失败:', error)
      ElMessage.error('删除日程失败，请稍后重试')
      return false
    }
  }
  
  return {
    currentChannel,
    currentPlan,
    currentBranch,
    layoutTemplates,
    layoutTemplatesLastUpdated,
    allLayouts,
    needsLayoutTemplateUpdate,
    setCurrentChannel,
    setCurrentPlan,
    setCurrentBranch,
    setLayoutTemplates,
    loadLayoutTemplatesFromLocalStorage,
    saveLayoutTemplatesToLocalStorage,
    completeLayoutInfo,
    saveSchedule,
    deleteSchedule,
    createSchedule,
    updateSchedule
  }
}) 