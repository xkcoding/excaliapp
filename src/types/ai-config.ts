/**
 * AI Configuration Types
 * Defines interfaces for AI service configuration and chart generation
 */

/**
 * AI service configuration
 */
export interface AIConfig {
  /** API 基础URL */
  baseUrl: string
  /** API 密钥 */
  apiKey: string
  /** 使用的模型 */
  model: string
  /** 生成随机性 (0-1) */
  temperature: number
  /** 最大token数 */
  maxTokens: number
  /** 请求超时时间 (ms) */
  timeout: number
  /** 是否启用流式响应 */
  stream: boolean
}

/**
 * AI 服务供应商定义
 */
export interface AIProvider {
  /** 供应商名称 */
  name: string
  /** 显示名称 */
  displayName: string
  /** 默认配置 */
  defaultConfig: Partial<AIConfig>
  /** 支持的模型列表 */
  supportedModels: string[]
  /** 验证配置 */
  validateConfig: (config: AIConfig) => Promise<boolean>
}

/**
 * 支持的图表类型
 */
export type ChartType = 
  | 'flowchart' 
  | 'sequenceDiagram'
  | 'classDiagram'

/**
 * 图表生成请求
 */
export interface ChartGenerationRequest {
  /** 用户输入文本 */
  text: string
  /** 图表类型 */
  chartType: ChartType
  /** AI配置 */
  config: AIConfig
  /** 额外选项 */
  options?: {
    language?: 'zh' | 'en'
    complexity?: 'simple' | 'detailed'
    style?: 'default' | 'flowchart' | 'diagram'
    maxNodes?: number
  }
}

/**
 * 图表生成响应
 */
export interface ChartGenerationResponse {
  /** 生成的Mermaid代码 */
  mermaidCode: string
  /** 解释说明 */
  explanation?: string
  /** 置信度 (0-1) */
  confidence?: number
  /** 使用的token数 */
  tokensUsed?: number
  /** 生成时间 (ms) */
  generationTime?: number
  /** 请求ID */
  requestId: string
}

/**
 * AI 错误类型
 */
export interface AIError extends Error {
  type: 'network' | 'api' | 'parsing' | 'timeout' | 'quota' | 'auth'
  code?: string
  retryable: boolean
  retryAfter?: number
  details?: Record<string, any>
}

/**
 * 图表类型选项定义
 */
export interface ChartTypeOption {
  value: ChartType
  label: string
  description: string
  icon: string // Icon name or emoji
  example?: string
  prompt?: string // AI prompt template for this chart type
}

/**
 * 文本输入状态
 */
export interface TextInputState {
  value: string
  wordCount: number
  tokenEstimate: number
  valid: boolean
  errors: string[]
}

/**
 * 预定义的 AI 供应商配置
 */
export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    defaultConfig: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      stream: false
    },
    supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    validateConfig: async (config: AIConfig) => {
      try {
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          },
          signal: AbortSignal.timeout(10000)
        })
        return response.ok
      } catch (error) {
        console.error('OpenAI validation error:', error)
        return false
      }
    }
  },
  azure: {
    name: 'azure',
    displayName: 'Azure OpenAI',
    defaultConfig: {
      baseUrl: 'https://your-resource.openai.azure.com',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      stream: false
    },
    supportedModels: ['gpt-4', 'gpt-35-turbo'],
    validateConfig: async (config: AIConfig) => {
      // Azure OpenAI validation logic
      return true
    }
  },
  custom: {
    name: 'custom',
    displayName: 'Custom API',
    defaultConfig: {
      baseUrl: '',
      model: '',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      stream: false
    },
    supportedModels: [], // User-defined
    validateConfig: async (config: AIConfig) => {
      // Generic validation logic
      return config.baseUrl.length > 0 && config.apiKey.length > 0
    }
  }
}

/**
 * 图表类型配置
 */
export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  {
    value: 'flowchart',
    label: '流程图',
    description: '显示流程步骤和决策点',
    icon: 'workflow',
    example: 'graph TD; A[开始] --> B{判断}; B -->|是| C[执行]; B -->|否| D[结束];',
    prompt: '将以下描述转换为Mermaid流程图，使用清晰的节点和箭头连接'
  },
  {
    value: 'sequenceDiagram',
    label: '时序图',
    description: '显示对象间的交互序列',
    icon: 'clock',
    example: 'sequenceDiagram; participant A; participant B; A->>B: 请求; B-->>A: 响应;',
    prompt: '将以下交互过程转换为Mermaid时序图，清晰展示参与者和消息流'
  },
  {
    value: 'classDiagram',
    label: '类图',
    description: '显示类结构和关系',
    icon: 'package',
    example: 'classDiagram; class User { +name +email +login() }',
    prompt: '将以下描述转换为Mermaid类图，展示类、属性和方法'
  }
]

/**
 * 默认 AI 配置
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 30000,
  stream: false
}