/**
 * 计划存储
 * 管理应用的直播计划数据
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Channel, Plan, Branch, Layout, LayoutTemplate, Schedule, LayoutElement } from '../types/broadcast'
import { initializeApp } from '../utils/initializeApp'
import planApi from '../api/plan'
import { ElMessage } from 'element-plus'
import { preloadPlanImages } from '../utils/imagePreloader'

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
   * 正在预览的日程
   */
  const previewingSchedule = ref<Schedule | null>(null)
  
  /**
   * 正在预览的布局
   */
  const previewingLayout = ref<Layout | null>(null)
  
  /**
   * 正在直播的日程
   */
  const liveSchedule = ref<Schedule | null>(null)
  
  /**
   * 正在直播的布局
   */
  const liveLayout = ref<Layout | null>(null)
  
  /**
   * 是否正在直播
   */
  const isStreaming = ref<boolean>(false)
  
  /**
   * 布局编辑事件
   */
  const layoutEditedEvent = ref<number>(0)
  
  /**
   * 预览布局编辑事件
   */
  const previewLayoutEditedEvent = ref<number>(0)
  
  /**
   * 直播布局编辑事件
   */
  const liveLayoutEditedEvent = ref<number>(0)
  
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
    
    // 预加载计划中的所有图片资源
    console.log('[planStore.ts 计划存储] 开始预加载计划图片资源')
    preloadPlanImages(plan)
      .then(images => {
        console.log(`[planStore.ts 计划存储] 图片预加载完成，共加载 ${images.length} 张图片`)
      })
      .catch(error => {
        console.error('[planStore.ts 计划存储] 图片预加载失败:', error)
      })
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
    
    // 加载布局模板后，确保所有日程中的布局都是完整的实体
    if (layoutTemplates.value.length > 0) {
      initializeScheduleLayouts(branch)
    }
  }
  
  /**
   * 初始化分支中所有日程的布局
   * 确保每个日程下的布局都是完整的实体对象
   * @param branch - 分支数据
   */
  function initializeScheduleLayouts(branch: Branch): void {
    if (!branch.schedules || !branch.schedules.length) return
    
    console.log('[planStore.ts 计划存储] 开始初始化分支中所有日程的布局')
    
    branch.schedules.forEach(schedule => {
      if (!schedule.layouts) {
        schedule.layouts = []
        return
      }
      
      // 对每个布局进行初始化，确保它们是完整的实体对象
      schedule.layouts = schedule.layouts.map(layout => {
        return completeLayoutInfo(layout, true)
      })
      
      console.log(`[planStore.ts 计划存储] 日程 ${schedule.id} 的布局已初始化，共 ${schedule.layouts.length} 个布局`)
    })
  }
  
  /**
   * 设置布局模板列表
   * @param templates 布局模板列表
   */
  function setLayoutTemplates(templates: LayoutTemplate[]): void {
    layoutTemplates.value = templates;
    layoutTemplatesLastUpdated.value = new Date();
    
    // 保存到本地存储
    try {
      localStorage.setItem('layoutTemplates', JSON.stringify(templates));
      localStorage.setItem('layoutTemplatesLastUpdated', new Date().toISOString());
      console.log('[planStore.ts 计划存储] 布局模板已保存到本地存储', {
        count: templates.length,
        templates: templates.map(t => ({
          template: t.template,
          hasThumbnail: !!t.thumbnail,
          thumbnailType: t.thumbnail ? 
            (t.thumbnail.startsWith('data:') ? '本地生成' : 
             t.thumbnail.startsWith('http') ? '远程URL' : '其他') : '无'
        }))
      });
    } catch (error) {
      console.error('[planStore.ts 计划存储] 保存布局模板到本地存储失败:', error);
    }
    
    // 布局模板加载后，初始化当前分支中所有日程的布局
    if (currentBranch.value) {
      initializeScheduleLayouts(currentBranch.value)
    }
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
        
        // 布局模板加载后，初始化当前分支中所有日程的布局
        if (currentBranch.value) {
          initializeScheduleLayouts(currentBranch.value)
        }
        
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
   * @param createNewInstance - 是否创建新实例而不是修改原对象
   * @returns Layout 补全后的布局
   */
  function completeLayoutInfo(layout: Layout, createNewInstance: boolean = false): Layout {
    // 查找对应的布局模板
    const template = layoutTemplates.value.find(t => t.template === layout.template)
    
    if (!template) {
      return createNewInstance ? JSON.parse(JSON.stringify(layout)) : layout
    }
    
    // 创建新的布局对象，避免修改原始对象
    const completedLayout: Layout = createNewInstance 
      ? JSON.parse(JSON.stringify(layout))
      : { ...layout }
    
    // 从Plan继承属性
    if (currentPlan.value) {
      // 背景相关属性继承
      if (!completedLayout.background && currentPlan.value.background) {
        completedLayout.background = currentPlan.value.background
      }
      
      if (!completedLayout.labelBackground && currentPlan.value.labelBackground) {
        completedLayout.labelBackground = currentPlan.value.labelBackground
      }
      
      if (!completedLayout.textColor && currentPlan.value.textColor) {
        completedLayout.textColor = currentPlan.value.textColor
      }
      
      // 标签显示名称继承
      if (!completedLayout.surgeonLabelDisplayName && currentPlan.value.surgeonLabelDisplayName) {
        completedLayout.surgeonLabelDisplayName = currentPlan.value.surgeonLabelDisplayName
      }
      
      if (!completedLayout.surgeryLabelDisplayName && currentPlan.value.surgeryLabelDisplayName) {
        completedLayout.surgeryLabelDisplayName = currentPlan.value.surgeryLabelDisplayName
      }
      
      if (!completedLayout.guestLabelDisplayName && currentPlan.value.guestLabelDisplayName) {
        completedLayout.guestLabelDisplayName = currentPlan.value.guestLabelDisplayName
      }
    }
    
    // 确保布局元素是完整的实体对象
    if (template.elements && (!completedLayout.elements || createNewInstance)) {
      // 深拷贝模板元素
      const elementsCopy = JSON.parse(JSON.stringify(template.elements))
      
      // 如果已有元素，则保留现有元素的属性
      if (completedLayout.elements && !createNewInstance) {
        // 合并现有元素和模板元素
        const mergedElements = elementsCopy.map((templateElement: LayoutElement) => {
          const existingElement = completedLayout.elements?.find(e => e.id === templateElement.id)
          return existingElement ? { ...templateElement, ...existingElement } : templateElement
        })
        completedLayout.elements = mergedElements
      } else {
        completedLayout.elements = elementsCopy
      }
      
      // 确保elements存在后再访问其length属性
      if (completedLayout.elements) {
        console.log(`[planStore.ts 计划存储] 布局 ${layout.id} 的元素已初始化，共 ${completedLayout.elements.length} 个元素`)
      }
    }
    
    return completedLayout
  }
  
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
      // 确保日程中的布局是完整的实体对象
      if (schedule.layouts) {
        schedule.layouts = schedule.layouts.map(layout => completeLayoutInfo(layout, true))
      }
      
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
      // 确保日程中的布局是完整的实体对象
      if (schedule.layouts) {
        // 这里不创建新实例，因为我们要保持对原始布局对象的引用
        schedule.layouts.forEach(layout => {
          if (!layout.elements) {
            const template = layoutTemplates.value.find(t => t.template === layout.template)
            if (template && template.elements) {
              layout.elements = JSON.parse(JSON.stringify(template.elements))
            }
          }
        })
      }
      
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
  
  /**
   * 设置正在预览的日程和布局
   * @param schedule - 日程数据
   * @param layout - 布局数据
   */
  function setPreviewingScheduleAndLayout(schedule: Schedule, layout: Layout) {
    console.log('[planStore.ts 计划存储] 设置预览日程和布局:', {
      scheduleId: schedule.id,
      scheduleType: schedule.type,
      layoutId: layout.id,
      layoutTemplate: layout.template,
      hasElements: !!(layout as any).elements
    });
    
    // 创建深拷贝，避免引用问题
    const scheduleCopy = JSON.parse(JSON.stringify(schedule)) as Schedule;
    
    // 创建布局的深拷贝
    const layoutCopy = JSON.parse(JSON.stringify(layout));
    
    // 设置预览日程
    previewingSchedule.value = scheduleCopy;
    
    // 设置预览布局
    previewingLayout.value = layoutCopy;
    
    console.log('[planStore.ts 计划存储] 预览布局已设置:', {
      hasElements: !!(previewingLayout.value as any).elements,
      elementsCount: (previewingLayout.value as any).elements?.length || 0,
      scheduleType: previewingSchedule.value?.type || '未知'
    });
  }
  
  /**
   * 清除正在预览的日程和布局
   */
  function clearPreviewingScheduleAndLayout() {
    previewingSchedule.value = null
    previewingLayout.value = null
  }
  
  /**
   * 检查指定的日程和布局是否正在预览
   * @param scheduleId - 日程ID
   * @param layoutId - 布局ID
   * @returns 是否正在预览
   */
  function isPreviewingScheduleAndLayout(scheduleId: string, layoutId: number): boolean {
    return (
      previewingSchedule.value?.id === scheduleId && 
      previewingLayout.value?.id === layoutId
    )
  }
  
  /**
   * 设置正在直播的日程和布局
   * @param schedule - 日程数据
   * @param layout - 布局数据
   */
  function setLiveScheduleAndLayout(schedule: Schedule, layout: Layout) {
    console.log('[planStore.ts 计划存储] 设置直播日程和布局:', {
      scheduleId: schedule.id,
      scheduleType: schedule.type,
      layoutId: layout.id,
      layoutTemplate: layout.template,
      hasElements: !!(layout as any).elements
    });
    
    // 创建深拷贝，避免引用问题
    const scheduleCopy = JSON.parse(JSON.stringify(schedule)) as Schedule;
    
    // 创建布局的深拷贝
    const layoutCopy = JSON.parse(JSON.stringify(layout));
    
    // 设置直播日程
    liveSchedule.value = scheduleCopy;
    
    // 设置直播布局
    liveLayout.value = layoutCopy;
    
    console.log('[planStore.ts 计划存储] 直播布局已设置:', {
      hasElements: !!(liveLayout.value as any).elements,
      elementsCount: (liveLayout.value as any).elements?.length || 0,
      scheduleType: liveSchedule.value?.type || '未知'
    });
  }
  
  /**
   * 清除正在直播的日程和布局
   */
  function clearLiveScheduleAndLayout() {
    liveSchedule.value = null
    liveLayout.value = null
  }
  
  /**
   * 检查指定的日程和布局是否正在直播
   * @param scheduleId - 日程ID
   * @param layoutId - 布局ID
   * @returns 是否正在直播
   */
  function isLiveScheduleAndLayout(scheduleId: string, layoutId: number): boolean {
    return (
      liveSchedule.value?.id === scheduleId && 
      liveLayout.value?.id === layoutId
    )
  }
  
  /**
   * 将预览切换到直播
   * 将当前预览的日程和布局设置为直播的日程和布局
   */
  function switchPreviewToLive() {
    if (previewingSchedule.value && previewingLayout.value) {
      setLiveScheduleAndLayout(previewingSchedule.value, previewingLayout.value)
    }
  }
  
  /**
   * 开始直播
   */
  function startStreaming() {
    // 这里将来会添加实际的推流逻辑
    isStreaming.value = true
  }
  
  /**
   * 停止直播
   */
  function stopStreaming() {
    // 这里将来会添加实际的停止推流逻辑
    isStreaming.value = false
  }
  
  /**
   * 通知预览布局已编辑
   * 用于在布局编辑器中保存布局后通知预览画布更新
   * @param updatedLayout 可选的更新后的布局数据，如果提供则会更新当前预览的布局
   */
  function notifyPreviewLayoutEdited(updatedLayout?: Layout) {
    console.log('[planStore.ts 计划存储] 通知预览布局已编辑')
    
    // 如果提供了更新后的布局数据，则更新当前预览的布局
    if (updatedLayout && previewingLayout.value && updatedLayout.id === previewingLayout.value.id) {
      console.log('[planStore.ts 计划存储] 更新预览布局数据', {
        layoutId: updatedLayout.id,
        elementsCount: updatedLayout.elements?.length || 0
      })
      
      // 创建深拷贝以确保触发响应式更新
      const layoutCopy = JSON.parse(JSON.stringify(updatedLayout))
      
      // 先设置为 null 再设置新值，确保触发监听器
      const oldLayout = previewingLayout.value
      previewingLayout.value = null
      
      // 使用 nextTick 确保视图更新后再设置新布局
      setTimeout(() => {
        previewingLayout.value = layoutCopy
        console.log('[planStore.ts 计划存储] 预览布局已更新', {
          layoutId: layoutCopy.id,
          elementsCount: layoutCopy.elements?.length || 0
        })
      }, 10)
    }
    
    // 触发事件通知
    previewLayoutEditedEvent.value = Date.now()
    layoutEditedEvent.value = Date.now()
  }
  
  /**
   * 通知直播布局已编辑
   * 用于在布局编辑器中保存布局后通知直播画布更新
   * @param updatedLayout 可选的更新后的布局数据，如果提供则会更新当前直播的布局
   */
  function notifyLiveLayoutEdited(updatedLayout?: Layout) {
    console.log('[planStore.ts 计划存储] 通知直播布局已编辑')
    
    // 如果提供了更新后的布局数据，则更新当前直播的布局
    if (updatedLayout && liveLayout.value && updatedLayout.id === liveLayout.value.id) {
      console.log('[planStore.ts 计划存储] 更新直播布局数据', {
        layoutId: updatedLayout.id,
        elementsCount: updatedLayout.elements?.length || 0
      })
      
      // 创建深拷贝以确保触发响应式更新
      const layoutCopy = JSON.parse(JSON.stringify(updatedLayout))
      
      // 先设置为 null 再设置新值，确保触发监听器
      const oldLayout = liveLayout.value
      liveLayout.value = null
      
      // 使用 setTimeout 确保视图更新后再设置新布局
      setTimeout(() => {
        liveLayout.value = layoutCopy
        console.log('[planStore.ts 计划存储] 直播布局已更新', {
          layoutId: layoutCopy.id,
          elementsCount: layoutCopy.elements?.length || 0
        })
      }, 10)
    }
    
    // 触发事件通知
    liveLayoutEditedEvent.value = Date.now()
    layoutEditedEvent.value = Date.now()
  }
  
  /**
   * 更新日程中的布局
   * 在布局编辑器中修改布局后，更新对应日程中的布局
   * @param scheduleId - 日程ID
   * @param updatedLayout - 更新后的布局
   * @returns 是否更新成功
   */
  function updateLayoutInSchedule(scheduleId: string, updatedLayout: Layout): boolean {
    console.log(`[planStore.ts 计划存储] 开始更新日程 ${scheduleId} 中的布局 ${updatedLayout.id}，模板：${updatedLayout.template}`);
    
    if (!currentBranch.value) {
      console.error('[planStore.ts 计划存储] 更新布局失败：当前没有选中分支');
      return false;
    }
    
    // 在当前分支中查找对应的日程
    const scheduleIndex = currentBranch.value.schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) {
      console.error(`[planStore.ts 计划存储] 更新布局失败：未找到日程 ${scheduleId}`);
      return false;
    }
    
    const schedule = currentBranch.value.schedules[scheduleIndex];
    
    // 在日程中查找对应的布局
    const layoutIndex = schedule.layouts.findIndex(l => l.id === updatedLayout.id);
    if (layoutIndex === -1) {
      console.error(`[planStore.ts 计划存储] 更新布局失败：在日程 ${scheduleId} 中未找到布局 ${updatedLayout.id}`);
      return false;
    }
    
    // 更新布局
    schedule.layouts[layoutIndex] = JSON.parse(JSON.stringify(updatedLayout));
    
    // 如果更新的是当前正在预览的布局，同时更新预览布局
    if (previewingSchedule.value?.id === scheduleId && 
        previewingLayout.value?.id === updatedLayout.id) {
      notifyPreviewLayoutEdited(updatedLayout);
    }
    
    // 如果更新的是当前正在直播的布局，同时更新直播布局
    if (liveSchedule.value?.id === scheduleId && 
        liveLayout.value?.id === updatedLayout.id) {
      notifyLiveLayoutEdited(updatedLayout);
    }
    
    console.log(`[planStore.ts 计划存储] 已更新日程 ${scheduleId} 中的布局 ${updatedLayout.id}`);
    return true;
  }
  
  return {
    currentChannel,
    currentPlan,
    currentBranch,
    layoutTemplates,
    layoutTemplatesLastUpdated,
    needsLayoutTemplateUpdate,
    previewingSchedule,
    previewingLayout,
    liveSchedule,
    liveLayout,
    isStreaming,
    layoutEditedEvent,
    previewLayoutEditedEvent,
    liveLayoutEditedEvent,
    setCurrentChannel,
    setCurrentPlan,
    setCurrentBranch,
    setLayoutTemplates,
    loadLayoutTemplatesFromLocalStorage,
    saveLayoutTemplatesToLocalStorage,
    completeLayoutInfo,
    initializeScheduleLayouts,
    saveSchedule,
    deleteSchedule,
    createSchedule,
    updateSchedule,
    setPreviewingScheduleAndLayout,
    clearPreviewingScheduleAndLayout,
    isPreviewingScheduleAndLayout,
    setLiveScheduleAndLayout,
    clearLiveScheduleAndLayout,
    isLiveScheduleAndLayout,
    switchPreviewToLive,
    startStreaming,
    stopStreaming,
    notifyPreviewLayoutEdited,
    notifyLiveLayoutEdited,
    updateLayoutInSchedule
  }
}) 