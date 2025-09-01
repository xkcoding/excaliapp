/**
 * 布局状态管理存储
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types'
import type {
  LayoutAlgorithm,
  LayoutOptions,
  LayoutResult,
  LayoutEventType,
  LayoutEvent
} from '../types/layout'
import { DEFAULT_LAYOUT_OPTIONS } from '../types/layout'
import { LayoutService } from '../services/layout/LayoutService'

// ===== 状态接口定义 =====

interface LayoutState {
  // 核心状态
  service: LayoutService
  algorithms: LayoutAlgorithm[]
  currentAlgorithm: string | null
  options: LayoutOptions
  
  // 执行状态
  isExecuting: boolean
  executingAlgorithm: string | null
  progress: number
  
  // 结果状态
  lastResult: LayoutResult | null
  history: Array<{
    id: string
    timestamp: Date
    algorithmId: string
    options: LayoutOptions
    result: LayoutResult
    elementCount: number
  }>
  
  // UI状态
  showPreview: boolean
  previewResult: LayoutResult | null
  selectedElements: ExcalidrawElement[]
  
  // 配置状态
  preferences: {
    autoPreview: boolean
    animationsEnabled: boolean
    confirmLargeOperations: boolean
    maxElementsWarning: number
  }
  
  // 事件监听
  eventListeners: Map<LayoutEventType, Set<(event: LayoutEvent) => void>>
}

interface LayoutActions {
  // 算法管理
  setCurrentAlgorithm: (algorithmId: string | null) => void
  getAlgorithm: (algorithmId: string) => LayoutAlgorithm | null
  
  // 选项管理
  updateOptions: (options: Partial<LayoutOptions>) => void
  resetOptions: () => void
  
  // 执行操作
  executeLayout: (
    algorithmId: string,
    elements: ExcalidrawElement[],
    options?: Partial<LayoutOptions>
  ) => Promise<LayoutResult>
  
  // 预览操作
  previewLayout: (
    algorithmId: string,
    elements: ExcalidrawElement[],
    options?: Partial<LayoutOptions>
  ) => Promise<LayoutResult>
  clearPreview: () => void
  
  // 历史管理
  getHistory: () => LayoutState['history']
  clearHistory: () => void
  getHistoryItem: (id: string) => LayoutState['history'][0] | null
  
  // 元素管理
  setSelectedElements: (elements: ExcalidrawElement[]) => void
  getSelectedElements: () => ExcalidrawElement[]
  
  // 配置管理
  updatePreferences: (preferences: Partial<LayoutState['preferences']>) => void
  
  // 事件系统
  addEventListener: (eventType: LayoutEventType, listener: (event: LayoutEvent) => void) => () => void
  removeEventListener: (eventType: LayoutEventType, listener: (event: LayoutEvent) => void) => void
  emitEvent: (event: LayoutEvent) => void
  
  // 工具函数
  validateElements: (algorithmId: string, elements: ExcalidrawElement[]) => {
    valid: boolean
    message?: string
    reasons?: string[]
  }
  getSuggestedAlgorithm: (elements: ExcalidrawElement[]) => {
    algorithmId: string
    confidence: number
    reason: string
  } | null
  
  // 性能和统计
  getPerformanceStats: () => {
    totalExecutions: number
    averageTime: number
    successRate: number
    lastWeekUsage: number
  }
}

type LayoutStore = LayoutState & LayoutActions

// ===== 默认状态 =====

const DEFAULT_PREFERENCES: LayoutState['preferences'] = {
  autoPreview: true,
  animationsEnabled: true,
  confirmLargeOperations: true,
  maxElementsWarning: 100
}

// ===== 存储实现 =====

export const useLayoutStore = create<LayoutStore>()(
  subscribeWithSelector((set, get) => {
    // 初始化布局服务
    const service = new LayoutService()
    
    return {
      // ===== 初始状态 =====
      service,
      algorithms: [
        {
          id: 'grid-align',
          name: '网格对齐',
          description: '将元素对齐到虚拟网格',
          icon: 'grid',
          requiresSelection: true,
          minElements: 1,
          defaultOptions: { spacing: 20, snapToGrid: true },
          configSchema: [],
          apply: async (elements, options) => {
            const result = await service.gridAlign(elements, options)
            return result.elements
          },
          validate: () => ({ valid: true }),
          estimateTime: () => 100
        },
        {
          id: 'smart-group',
          name: '智能分组',
          description: '使用聚类算法智能分组',
          icon: 'group',
          requiresSelection: true,
          minElements: 2,
          defaultOptions: { spacing: 30, groupBy: 'distance' },
          configSchema: [],
          apply: async (elements, options) => {
            const result = await service.smartGroup(elements, options)
            return result.elements
          },
          validate: () => ({ valid: true }),
          estimateTime: () => 200
        },
        {
          id: 'vertical-flow',
          name: '垂直流程',
          description: '创建垂直流程布局',
          icon: 'arrow-down',
          requiresSelection: true,
          minElements: 2,
          defaultOptions: { spacing: 40, direction: 'vertical' },
          configSchema: [],
          apply: async (elements, options) => {
            const result = await service.verticalFlow(elements, options)
            return result.elements
          },
          validate: () => ({ valid: true }),
          estimateTime: () => 300
        },
        {
          id: 'horizontal-flow',
          name: '水平流程',
          description: '创建水平流程布局',
          icon: 'arrow-right',
          requiresSelection: true,
          minElements: 2,
          defaultOptions: { spacing: 40, direction: 'horizontal' },
          configSchema: [],
          apply: async (elements, options) => {
            const result = await service.horizontalFlow(elements, options)
            return result.elements
          },
          validate: () => ({ valid: true }),
          estimateTime: () => 300
        }
      ],
      currentAlgorithm: null,
      options: { ...DEFAULT_LAYOUT_OPTIONS },
      
      isExecuting: false,
      executingAlgorithm: null,
      progress: 0,
      
      lastResult: null,
      history: [],
      
      showPreview: false,
      previewResult: null,
      selectedElements: [],
      
      preferences: { ...DEFAULT_PREFERENCES },
      eventListeners: new Map(),
      
      // ===== 算法管理 =====
      
      setCurrentAlgorithm: (algorithmId) => {
        set({ currentAlgorithm: algorithmId })
        
        // 如果设置了算法，更新默认选项
        if (algorithmId) {
          const algorithm = get().algorithms.find(algo => algo.id === algorithmId)
          if (algorithm) {
            set(state => ({
              options: { ...state.options, ...algorithm.defaultOptions }
            }))
          }
        }
      },
      
      getAlgorithm: (algorithmId) => {
        return get().algorithms.find(algo => algo.id === algorithmId) || null
      },
      
      // ===== 选项管理 =====
      
      updateOptions: (newOptions) => {
        set(state => ({
          options: { ...state.options, ...newOptions }
        }))
      },
      
      resetOptions: () => {
        set({ options: { ...DEFAULT_LAYOUT_OPTIONS } })
      },
      
      // ===== 执行操作 =====
      
      executeLayout: async (algorithmId, elements, options = {}) => {
        const state = get()
        const finalOptions = { ...state.options, ...options }
        
        // 设置执行状态
        set({
          isExecuting: true,
          executingAlgorithm: algorithmId,
          progress: 0
        })
        
        // 发送开始事件
        const startEvent: LayoutEvent = {
          type: 'layout:start',
          payload: {
            algorithmId,
            elementCount: elements.length
          },
          timestamp: new Date(),
          requestId: generateRequestId()
        }
        get().emitEvent(startEvent)
        
        try {
          // 执行布局
          const algorithm = state.algorithms.find(algo => algo.id === algorithmId)
          if (!algorithm) {
            throw new Error(`Algorithm '${algorithmId}' not found`)
          }
          
          const algorithmResult = await algorithm.apply(elements, finalOptions)
          const result: LayoutResult = {
            elements: algorithmResult,
            hasChanges: true,
            stats: {
              movedElements: algorithmResult.length,
              totalElements: elements.length,
              executionTime: 0,
              performanceGrade: 'A'
            },
            algorithm: {
              id: algorithmId,
              name: algorithm.name,
              executionTime: 0
            }
          }
          
          // 生成历史记录
          const historyItem = {
            id: generateRequestId(),
            timestamp: new Date(),
            algorithmId,
            options: finalOptions,
            result,
            elementCount: elements.length
          }
          
          // 更新状态
          set(state => ({
            isExecuting: false,
            executingAlgorithm: null,
            progress: 100,
            lastResult: result,
            history: [historyItem, ...state.history].slice(0, 50), // 保留最近50条记录
            showPreview: false,
            previewResult: null
          }))
          
          // 发送完成事件
          const completeEvent: LayoutEvent = {
            type: 'layout:complete',
            payload: {
              algorithmId,
              elementCount: elements.length,
              result
            },
            timestamp: new Date(),
            requestId: startEvent.requestId
          }
          get().emitEvent(completeEvent)
          
          return result
          
        } catch (error) {
          // 重置执行状态
          set({
            isExecuting: false,
            executingAlgorithm: null,
            progress: 0
          })
          
          // 发送错误事件
          const errorEvent: LayoutEvent = {
            type: 'layout:error',
            payload: {
              algorithmId,
              elementCount: elements.length,
              error: error as Error
            },
            timestamp: new Date(),
            requestId: startEvent.requestId
          }
          get().emitEvent(errorEvent)
          
          throw error
        }
      },
      
      // ===== 预览操作 =====
      
      previewLayout: async (algorithmId, elements, options = {}) => {
        const state = get()
        const finalOptions = { ...state.options, ...options, preview: true }
        
        try {
          const algorithm = state.algorithms.find(algo => algo.id === algorithmId)
          if (!algorithm) {
            throw new Error(`Algorithm '${algorithmId}' not found`)
          }
          
          const algorithmResult = await algorithm.apply(elements, finalOptions)
          const result: LayoutResult = {
            elements: algorithmResult,
            hasChanges: true,
            stats: {
              movedElements: algorithmResult.length,
              totalElements: elements.length,
              executionTime: 0,
              performanceGrade: 'A'
            },
            algorithm: {
              id: algorithmId,
              name: algorithm.name,
              executionTime: 0
            }
          }
          
          set({
            showPreview: true,
            previewResult: result
          })
          
          return result
          
        } catch (error) {
          set({
            showPreview: false,
            previewResult: null
          })
          throw error
        }
      },
      
      clearPreview: () => {
        set({
          showPreview: false,
          previewResult: null
        })
      },
      
      // ===== 历史管理 =====
      
      getHistory: () => get().history,
      
      clearHistory: () => {
        set({ history: [] })
      },
      
      getHistoryItem: (id) => {
        return get().history.find(item => item.id === id) || null
      },
      
      // ===== 元素管理 =====
      
      setSelectedElements: (elements) => {
        set({ selectedElements: elements })
      },
      
      getSelectedElements: () => get().selectedElements,
      
      // ===== 配置管理 =====
      
      updatePreferences: (newPreferences) => {
        set(state => ({
          preferences: { ...state.preferences, ...newPreferences }
        }))
      },
      
      // ===== 事件系统 =====
      
      addEventListener: (eventType, listener) => {
        const state = get()
        if (!state.eventListeners.has(eventType)) {
          state.eventListeners.set(eventType, new Set())
        }
        state.eventListeners.get(eventType)!.add(listener)
        
        // 返回取消监听的函数
        return () => {
          get().removeEventListener(eventType, listener)
        }
      },
      
      removeEventListener: (eventType, listener) => {
        const listeners = get().eventListeners.get(eventType)
        if (listeners) {
          listeners.delete(listener)
        }
      },
      
      emitEvent: (event) => {
        const listeners = get().eventListeners.get(event.type)
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(event)
            } catch (error) {
              console.error('Layout event listener error:', error)
            }
          })
        }
      },
      
      // ===== 工具函数 =====
      
      validateElements: (algorithmId, elements) => {
        const algorithm = get().algorithms.find(algo => algo.id === algorithmId)
        if (!algorithm) {
          return { valid: false, message: `Algorithm '${algorithmId}' not found` }
        }
        return algorithm.validate(elements)
      },
      
      getSuggestedAlgorithm: (elements) => {
        try {
          // Simple algorithm suggestion logic
          if (elements.length <= 10) {
            return { algorithmId: 'grid-align', confidence: 80, reason: 'Small element count, grid alignment works best' }
          } else if (elements.length <= 50) {
            return { algorithmId: 'smart-group', confidence: 75, reason: 'Medium element count, grouping recommended' }
          } else {
            return { algorithmId: 'vertical-flow', confidence: 70, reason: 'Large element count, flow layout recommended' }
          }
        } catch (error) {
          console.warn('Failed to get algorithm suggestion:', error)
          return null
        }
      },
      
      // ===== 性能统计 =====
      
      getPerformanceStats: () => {
        const history = get().history
        
        if (history.length === 0) {
          return {
            totalExecutions: 0,
            averageTime: 0,
            successRate: 0,
            lastWeekUsage: 0
          }
        }
        
        const totalExecutions = history.length
        const totalTime = history.reduce((sum, item) => 
          sum + item.result.stats.executionTime, 0
        )
        const averageTime = totalTime / totalExecutions
        
        const successfulExecutions = history.filter(item => 
          !item.result.error
        ).length
        const successRate = (successfulExecutions / totalExecutions) * 100
        
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const lastWeekUsage = history.filter(item => 
          item.timestamp > weekAgo
        ).length
        
        return {
          totalExecutions,
          averageTime: Math.round(averageTime),
          successRate: Math.round(successRate),
          lastWeekUsage
        }
      }
    }
  })
)

// ===== 工具函数 =====

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ===== 选择器工具 =====

/** 获取当前算法信息 */
export const useCurrentAlgorithm = () => {
  return useLayoutStore(state => {
    const algorithmId = state.currentAlgorithm
    return algorithmId ? state.getAlgorithm(algorithmId) : null
  })
}

/** 获取可用的算法，按优先级排序 */
export const useAvailableAlgorithms = () => {
  return useLayoutStore(state => 
    state.algorithms.sort((a, b) => {
      // 按使用频率和性能排序
      const priority = {
        'grid-align': 1,
        'smart-group': 2,
        'vertical-flow': 3,
        'horizontal-flow': 4
      } as const
      
      return (priority[a.id as keyof typeof priority] || 999) - 
             (priority[b.id as keyof typeof priority] || 999)
    })
  )
}

/** 获取执行状态 */
export const useLayoutExecution = () => {
  return useLayoutStore(state => ({
    isExecuting: state.isExecuting,
    executingAlgorithm: state.executingAlgorithm,
    progress: state.progress,
    lastResult: state.lastResult
  }))
}

/** 获取预览状态 */
export const useLayoutPreview = () => {
  return useLayoutStore(state => ({
    showPreview: state.showPreview,
    previewResult: state.previewResult,
    clearPreview: state.clearPreview
  }))
}

/** 获取性能统计 */
export const useLayoutPerformance = () => {
  return useLayoutStore(state => state.getPerformanceStats())
}