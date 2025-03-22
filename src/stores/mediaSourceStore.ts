/**
 * 媒体源状态存储
 * 管理应用中的媒体源数据和状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MediaSource, MediaSourceType } from '../types/mediaSource'

/**
 * 媒体源状态存储
 * 管理应用中的媒体源数据和状态
 */
export const useMediaSourceStore = defineStore('mediaSource', () => {
  /**
   * 所有媒体源列表
   */
  const sources = ref<MediaSource[]>([])
  
  /**
   * 当前选中的媒体源ID
   */
  const selectedSourceId = ref<string | null>(null)
  
  /**
   * 媒体源是否加载中
   */
  const isLoading = ref<boolean>(false)
  
  /**
   * 已激活的媒体源ID列表
   * 只有激活的媒体源才会实际产生视频流
   */
  const activeSourceIds = ref<Set<string>>(new Set())
  
  /**
   * 加载中的媒体源ID
   */
  const loadingSourceIds = ref<Set<string>>(new Set())
  
  /**
   * 计算属性：当前选中的媒体源
   */
  const selectedSource = computed(() => {
    if (!selectedSourceId.value) return null
    return sources.value.find(source => source.id === selectedSourceId.value) || null
  })
  
  /**
   * 计算属性：通过类型获取媒体源列表
   */
  const getSourcesByType = computed(() => {
    return (type: MediaSourceType) => {
      return sources.value.filter(source => source.type === type)
    }
  })
  
  /**
   * 计算属性：获取所有摄像头媒体源
   */
  const cameraSources = computed(() => {
    return sources.value.filter(source => source.type === 'camera')
  })
  
  /**
   * 计算属性：获取所有窗口媒体源
   */
  const windowSources = computed(() => {
    return sources.value.filter(source => source.type === 'window')
  })
  
  /**
   * 计算属性：获取所有屏幕媒体源
   */
  const screenSources = computed(() => {
    return sources.value.filter(source => source.type === 'screen')
  })
  
  /**
   * 设置媒体源列表
   * @param newSources 新的媒体源列表
   */
  function setSources(newSources: MediaSource[]) {
    sources.value = newSources
  }
  
  /**
   * 添加媒体源
   * @param source 要添加的媒体源
   */
  function addSource(source: MediaSource) {
    // 检查是否已存在相同ID的媒体源
    const existingIndex = sources.value.findIndex(s => s.id === source.id)
    
    if (existingIndex >= 0) {
      // 更新现有媒体源
      sources.value[existingIndex] = {
        ...sources.value[existingIndex],
        ...source
      }
    } else {
      // 添加新的媒体源，初始化引用计数
      source.referenceCount = 0;
      sources.value.push(source)
    }
  }
  
  /**
   * 删除媒体源
   * @param sourceId 要删除的媒体源ID
   */
  function removeSource(sourceId: string) {
    // 停止并释放该媒体源流
    releaseSource(sourceId)
    
    // 从列表中移除
    sources.value = sources.value.filter(source => source.id !== sourceId)
    
    // 如果删除的是当前选中的媒体源，清除选中状态
    if (selectedSourceId.value === sourceId) {
      selectedSourceId.value = null
    }
  }
  
  /**
   * 选择媒体源
   * @param sourceId 要选择的媒体源ID
   */
  function selectSource(sourceId: string | null) {
    selectedSourceId.value = sourceId
  }
  
  /**
   * 激活媒体源
   * 激活媒体源会实际开始捕获视频流
   * @param sourceId 要激活的媒体源ID
   */
  function activateSource(sourceId: string) {
    if (!sources.value.find(s => s.id === sourceId)) {
      console.error(`[mediaSourceStore.ts 媒体源管理] 无法激活不存在的媒体源: ${sourceId}`)
      return
    }
    
    activeSourceIds.value.add(sourceId)
  }
  
  /**
   * 停用媒体源
   * 停用媒体源会停止视频流捕获
   * @param sourceId 要停用的媒体源ID
   */
  function deactivateSource(sourceId: string) {
    // 释放该媒体源的所有资源
    releaseSource(sourceId)
    
    // 从激活列表中移除
    activeSourceIds.value.delete(sourceId)
  }
  
  /**
   * 设置媒体源加载状态
   * @param sourceId 媒体源ID
   * @param isLoading 是否正在加载
   */
  function setSourceLoading(sourceId: string, isLoading: boolean) {
    if (isLoading) {
      loadingSourceIds.value.add(sourceId)
    } else {
      loadingSourceIds.value.delete(sourceId)
    }
  }
  
  /**
   * 增加媒体源流引用计数
   * @param sourceId 媒体源ID
   */
  function incrementStreamReferenceCount(sourceId: string) {
    const source = sources.value.find(s => s.id === sourceId);
    if (source) {
      source.referenceCount = (source.referenceCount || 0) + 1;
      console.log(`[mediaSourceStore.ts 媒体源管理] 媒体源 ${sourceId} 引用计数增加至 ${source.referenceCount}`);
    }
  }
  
  /**
   * 减少媒体源流引用计数
   * @param sourceId 媒体源ID
   * @returns 减少后的引用计数
   */
  function decrementStreamReferenceCount(sourceId: string): number {
    const source = sources.value.find(s => s.id === sourceId);
    if (!source) {
      return 0;
    }
    
    const currentCount = source.referenceCount || 0;
    if (currentCount <= 0) {
      return 0;
    }
    
    source.referenceCount = currentCount - 1;
    console.log(`[mediaSourceStore.ts 媒体源管理] 媒体源 ${sourceId} 引用计数减少至 ${source.referenceCount}`);
    return source.referenceCount;
  }
  
  /**
   * 获取媒体源流引用计数
   * @param sourceId 媒体源ID
   * @returns 引用计数
   */
  function getStreamReferenceCount(sourceId: string): number {
    const source = sources.value.find(s => s.id === sourceId);
    return source?.referenceCount || 0;
  }
  
  /**
   * 释放媒体源的所有资源
   * @param sourceId 媒体源ID
   */
  function releaseSource(sourceId: string) {
    // 从激活列表中移除
    activeSourceIds.value.delete(sourceId)
    
    // 从加载列表中移除
    loadingSourceIds.value.delete(sourceId)
    
    // 查找媒体源
    const source = sources.value.find(s => s.id === sourceId)
    if (!source) return
    
    // 停止并释放视频流
    if (source.stream) {
      source.stream.getTracks().forEach(track => {
        track.stop()
      })
      
      // 清空流
      source.stream = undefined
      source.referenceCount = 0
    }
    
    // 设置为非激活状态
    source.isActive = false
  }
  
  /**
   * 初始化存储
   */
  function initialize() {
    // 清空所有数据
    sources.value = []
    selectedSourceId.value = null
    isLoading.value = false
    activeSourceIds.value.clear()
    loadingSourceIds.value.clear()
  }
  
  /**
   * 清除所有媒体源
   */
  function clearAllSources() {
    // 释放所有媒体源的资源
    sources.value.forEach(source => {
      releaseSource(source.id)
    })
    
    // 清空列表
    sources.value = []
    selectedSourceId.value = null
  }

  /**
   * 获取媒体源
   * @param sourceId 媒体源ID
   * @returns 媒体源对象，不存在则返回null
   */
  function getSourceById(sourceId: string): MediaSource | null {
    return sources.value.find(source => source.id === sourceId) || null;
  }

  return {
    sources,
    selectedSourceId,
    isLoading,
    activeSourceIds,
    loadingSourceIds,
    selectedSource,
    getSourcesByType,
    cameraSources,
    windowSources,
    screenSources,
    setSources,
    addSource,
    removeSource,
    selectSource,
    activateSource,
    deactivateSource,
    setSourceLoading,
    incrementStreamReferenceCount,
    decrementStreamReferenceCount,
    getStreamReferenceCount,
    releaseSource,
    getSourceById,
    clearAllSources,
    initialize
  }
}) 