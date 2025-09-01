/**
 * AI Configuration Store
 * Manages AI service configuration, provider selection, and validation state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  AIConfig, 
  AIProvider, 
  AI_PROVIDERS, 
  DEFAULT_AI_CONFIG,
  type ChartType
} from '../types/ai-config'

/**
 * AI Configuration Store State
 */
interface AIConfigState {
  /** 当前配置 */
  config: AIConfig
  /** 可用的供应商 */
  providers: Record<string, AIProvider>
  /** 当前选择的供应商 */
  currentProvider: string
  /** 配置是否有效 */
  isValid: boolean
  /** 是否正在验证 */
  isValidating: boolean
  /** 最后验证时间 */
  lastValidated?: Date
  /** 验证错误信息 */
  validationError?: string
  /** 使用统计 */
  usage: {
    totalRequests: number
    totalTokens: number
    lastUsed?: Date
    requestsToday: number
  }
}

/**
 * AI Configuration Store Actions
 */
interface AIConfigActions {
  /** 更新配置 */
  updateConfig: (config: Partial<AIConfig>) => void
  
  /** 切换供应商 */
  switchProvider: (providerId: string) => void
  
  /** 验证配置 */
  validateConfig: () => Promise<boolean>
  
  /** 重置为默认配置 */
  resetToDefault: () => void
  
  /** 导出配置 */
  exportConfig: () => string
  
  /** 导入配置 */
  importConfig: (configJson: string) => boolean
  
  /** 记录使用情况 */
  recordUsage: (tokensUsed: number) => void
  
  /** 获取token估算 */
  estimateTokens: (text: string, chartType: ChartType) => number
  
  /** 检查今日使用量 */
  getTodayUsage: () => number
  
  /** 重置使用统计 */
  resetUsage: () => void
}

/**
 * Combined store type
 */
export type AIConfigStore = AIConfigState & AIConfigActions

/**
 * Default initial state
 */
const initialState: AIConfigState = {
  config: { ...DEFAULT_AI_CONFIG },
  providers: AI_PROVIDERS,
  currentProvider: 'openai',
  isValid: false,
  isValidating: false,
  lastValidated: undefined,
  validationError: undefined,
  usage: {
    totalRequests: 0,
    totalTokens: 0,
    lastUsed: undefined,
    requestsToday: 0
  }
}

/**
 * AI Configuration Store Implementation
 */
export const useAIConfigStore = create<AIConfigStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateConfig: (newConfig: Partial<AIConfig>) => {
        set(state => ({
          config: { ...state.config, ...newConfig },
          isValid: false, // Mark as invalid when config changes
          validationError: undefined
        }))
      },

      switchProvider: (providerId: string) => {
        const provider = get().providers[providerId]
        if (!provider) {
          console.error(`Provider ${providerId} not found`)
          return
        }

        set(state => ({
          currentProvider: providerId,
          config: {
            ...state.config,
            ...provider.defaultConfig
          },
          isValid: false,
          validationError: undefined
        }))
      },

      validateConfig: async () => {
        const { config, currentProvider, providers } = get()
        
        set({ isValidating: true, validationError: undefined })
        
        try {
          const provider = providers[currentProvider]
          if (!provider) {
            throw new Error(`Provider ${currentProvider} not found`)
          }

          // Basic validation
          if (!config.apiKey || config.apiKey.length < 10) {
            throw new Error('API Key is required and must be at least 10 characters')
          }

          if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
            throw new Error('Valid base URL is required')
          }

          if (!config.model || config.model.length === 0) {
            throw new Error('Model is required')
          }

          // For now, skip provider-specific validation since it's handled in the dialog's test connection
          // The test connection button already validates the API
          set({
            isValid: true,
            isValidating: false,
            lastValidated: new Date(),
            validationError: undefined
          })
          return true
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Validation failed'
          set({
            isValid: false,
            isValidating: false,
            validationError: errorMessage
          })
          return false
        }
      },

      resetToDefault: () => {
        const provider = get().providers[get().currentProvider]
        if (provider) {
          set({
            config: { ...DEFAULT_AI_CONFIG, ...provider.defaultConfig },
            isValid: false,
            validationError: undefined
          })
        }
      },

      exportConfig: () => {
        const { config, currentProvider } = get()
        const exportData = {
          provider: currentProvider,
          config: {
            ...config,
            apiKey: '***' // Don't export API key for security
          }
        }
        return JSON.stringify(exportData, null, 2)
      },

      importConfig: (configJson: string) => {
        try {
          const importData = JSON.parse(configJson)
          
          if (importData.provider && get().providers[importData.provider]) {
            set({
              currentProvider: importData.provider,
              config: {
                ...get().config,
                ...importData.config,
                apiKey: get().config.apiKey // Keep existing API key
              },
              isValid: false
            })
            return true
          }
          
          return false
        } catch (error) {
          console.error('Failed to import config:', error)
          return false
        }
      },

      recordUsage: (tokensUsed: number) => {
        const now = new Date()
        const today = now.toDateString()
        
        set(state => {
          const lastUsedDate = state.usage.lastUsed ? state.usage.lastUsed.toDateString() : null
          const isNewDay = lastUsedDate !== today
          
          return {
            usage: {
              ...state.usage,
              totalRequests: state.usage.totalRequests + 1,
              totalTokens: state.usage.totalTokens + tokensUsed,
              lastUsed: now,
              requestsToday: isNewDay ? 1 : state.usage.requestsToday + 1
            }
          }
        })
      },

      estimateTokens: (text: string, chartType: ChartType) => {
        // More accurate token estimation for Chinese text
        // Chinese: ~1.5 characters per token (more compact)
        // English: ~4 characters per token
        const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
        const otherCharCount = text.length - chineseCharCount
        
        const chineseTokens = Math.ceil(chineseCharCount / 1.5)
        const otherTokens = Math.ceil(otherCharCount / 4)
        const textTokens = chineseTokens + otherTokens
        
        // Add overhead based on chart type (only SDK-supported types)
        const chartTypeOverhead = {
          flowchart: 200,
          sequenceDiagram: 150,
          classDiagram: 180
        }
        
        return textTokens + (chartTypeOverhead[chartType] || 150)
      },

      getTodayUsage: () => {
        const { usage } = get()
        const today = new Date().toDateString()
        const lastUsedDate = usage.lastUsed ? usage.lastUsed.toDateString() : null
        
        return lastUsedDate === today ? usage.requestsToday : 0
      },

      resetUsage: () => {
        set(state => ({
          usage: {
            totalRequests: 0,
            totalTokens: 0,
            lastUsed: undefined,
            requestsToday: 0
          }
        }))
      }
    }),
    {
      name: 'ai-config-store',
      partialize: (state) => ({
        config: {
          ...state.config,
          apiKey: state.config.apiKey // Persist API key in local storage
        },
        currentProvider: state.currentProvider,
        usage: state.usage,
        isValid: state.isValid, // Persist validation status
        lastValidated: state.lastValidated // Persist last validation time
      })
    }
  )
)

/**
 * Hook for accessing AI configuration
 */
export const useAIConfig = () => {
  const store = useAIConfigStore()
  
  return {
    config: store.config,
    isValid: store.isValid,
    isValidating: store.isValidating,
    validationError: store.validationError,
    currentProvider: store.currentProvider,
    providers: Object.values(store.providers),
    usage: store.usage,
    
    // Actions
    updateConfig: store.updateConfig,
    switchProvider: store.switchProvider,
    validateConfig: store.validateConfig,
    resetToDefault: store.resetToDefault,
    exportConfig: store.exportConfig,
    importConfig: store.importConfig,
    recordUsage: store.recordUsage,
    estimateTokens: store.estimateTokens,
    getTodayUsage: store.getTodayUsage,
    resetUsage: store.resetUsage
  }
}