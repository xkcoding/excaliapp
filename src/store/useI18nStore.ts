/**
 * 国际化状态管理
 * Internationalization State Management
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  SupportedLanguage, 
  I18nConfig, 
  TranslationKeys, 
  TranslationFunction,
  DEFAULT_I18N_CONFIG,
  SUPPORTED_LANGUAGES
} from '../types/i18n'
import zhCNTranslations from '../locales/zh-CN'
import enUSTranslations from '../locales/en-US'

/**
 * 翻译字典接口
 */
interface TranslationDictionary {
  [key: string]: TranslationKeys
}

/**
 * 国际化状态接口
 */
export interface I18nStore {
  /** 当前配置 */
  config: I18nConfig
  
  /** 翻译字典 */
  translations: TranslationDictionary
  
  /** 当前语言的翻译 */
  currentTranslations: TranslationKeys
  
  /** 是否正在加载翻译 */
  isLoading: boolean
  
  /** 翻译加载错误 */
  error: string | null

  // Actions
  /** 切换语言 */
  switchLanguage: (language: SupportedLanguage) => Promise<void>
  
  /** 更新配置 */
  updateConfig: (config: Partial<I18nConfig>) => void
  
  /** 获取翻译文本 */
  t: TranslationFunction
  
  /** 加载翻译文件 */
  loadTranslations: (language: SupportedLanguage) => Promise<void>
  
  /** 检测系统语言 */
  detectSystemLanguage: () => SupportedLanguage
  
  /** 初始化国际化 */
  initialize: () => Promise<void>
}

/**
 * 获取嵌套对象属性值
 */
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path
}

/**
 * 检测系统语言
 */
function detectSystemLanguage(): SupportedLanguage {
  const browserLang = navigator.language || 'en-US'
  
  // 检查是否支持当前浏览器语言
  const supportedLang = SUPPORTED_LANGUAGES.find(lang => 
    browserLang.startsWith(lang.code.split('-')[0])
  )
  
  return supportedLang?.code || DEFAULT_I18N_CONFIG.fallbackLanguage
}

/**
 * 获取翻译文件
 */
function getTranslations(language: SupportedLanguage): TranslationKeys {
  const translationsMap = {
    'zh-CN': zhCNTranslations,
    'en-US': enUSTranslations
  }
  
  return translationsMap[language] || translationsMap[DEFAULT_I18N_CONFIG.fallbackLanguage]
}

/**
 * 国际化状态管理
 */
export const useI18nStore = create<I18nStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_I18N_CONFIG,
      translations: {},
      currentTranslations: {} as TranslationKeys,
      isLoading: false,
      error: null,

      switchLanguage: async (language: SupportedLanguage) => {
        const { config, loadTranslations } = get()
        
        if (language === config.currentLanguage) {
          return
        }

        try {
          set({ isLoading: true, error: null })
          
          await loadTranslations(language)
          
          const newConfig = {
            ...config,
            currentLanguage: language,
            languageHistory: [
              language,
              ...config.languageHistory.filter(lang => lang !== language)
            ].slice(0, 5) // 保留最近 5 种语言
          }
          
          const loadedTranslations = getTranslations(language)
          
          set({ 
            config: newConfig,
            currentTranslations: loadedTranslations,
            isLoading: false 
          })
          
        } catch (error) {
          set({ 
            error: `Failed to switch to ${language}`, 
            isLoading: false 
          })
        }
      },

      updateConfig: (newConfig: Partial<I18nConfig>) => {
        const current = get().config
        set({ 
          config: { ...current, ...newConfig }
        })
      },

      t: (key: string, params?: Record<string, string | number>) => {
        const { currentTranslations, config } = get()
        
        // 获取当前语言的翻译
        let translation = getNestedValue(currentTranslations, key)
        
        // 如果没找到，尝试备用语言
        if (translation === key && config.currentLanguage !== config.fallbackLanguage) {
          const fallbackTranslations = get().translations[config.fallbackLanguage]
          if (fallbackTranslations) {
            translation = getNestedValue(fallbackTranslations, key)
          }
        }
        
        // 参数替换
        if (params && typeof translation === 'string') {
          return Object.entries(params).reduce(
            (text, [param, value]) => text.replace(`{{${param}}}`, String(value)),
            translation
          )
        }
        
        return translation
      },

      loadTranslations: async (language: SupportedLanguage) => {
        const { translations } = get()
        
        // 如果已经加载过，直接返回
        if (translations[language]) {
          return
        }
        
        try {
          const newTranslations = getTranslations(language)
          
          set({
            translations: {
              ...translations,
              [language]: newTranslations
            }
          })
        } catch (error) {
          console.error(`Failed to load translations for ${language}:`, error)
          throw error
        }
      },

      detectSystemLanguage,

      initialize: async () => {
        console.log('🌐 I18n store initialize called')
        const { config, loadTranslations, switchLanguage } = get()
        
        try {
          set({ isLoading: true, error: null })
          console.log('🔄 I18n loading started, current config:', config)
          
          // 强制使用存储的语言，不自动检测
          let targetLanguage = config.currentLanguage
          console.log('🎯 Target language:', targetLanguage)
          
          // 加载目标语言和备用语言
          console.log('📚 Loading translations...')
          await Promise.all([
            loadTranslations(targetLanguage),
            loadTranslations(config.fallbackLanguage)
          ])
          console.log('✅ Translations loaded successfully')
          
          // 设置当前翻译
          const loadedTranslations = getTranslations(targetLanguage)
          set({ 
            currentTranslations: loadedTranslations,
            isLoading: false 
          })
          console.log('✅ I18n initialization complete')
          
        } catch (error) {
          console.error('❌ I18n initialization failed:', error)
          // 即使失败也要设置基本状态以避免白屏
          const fallbackTranslations = getTranslations('zh-CN')
          set({ 
            currentTranslations: fallbackTranslations,
            error: 'Failed to initialize i18n', 
            isLoading: false 
          })
        }
      }
    }),
    {
      name: 'i18n-store',
      partialize: (state) => ({ 
        config: state.config 
      })
    }
  )
)

/**
 * 翻译 Hook
 */
export function useTranslation() {
  const { t, currentTranslations, config, switchLanguage, isLoading, error } = useI18nStore()
  
  return {
    t,
    translations: currentTranslations,
    language: config.currentLanguage,
    switchLanguage,
    isLoading,
    error,
    supportedLanguages: SUPPORTED_LANGUAGES
  }
}