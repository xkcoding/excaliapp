/**
 * AI Service
 * Handles AI API calls for chart generation with support for multiple providers
 */

import { 
  AIConfig, 
  ChartGenerationRequest, 
  ChartGenerationResponse, 
  AIError, 
  ChartType,
  CHART_TYPE_OPTIONS
} from '../types/ai-config'

/**
 * AI Service Interface
 */
export interface IAIService {
  /** 生成图表 */
  generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResponse>
  
  /** 流式生成图表 */
  generateChartStream(
    request: ChartGenerationRequest, 
    onProgress: (chunk: string) => void
  ): Promise<ChartGenerationResponse>
  
  /** 验证API配置 */
  validateConfig(config: AIConfig): Promise<boolean>
  
  /** 估算token使用量 */
  estimateTokens(text: string, chartType: ChartType): number
  
  /** 取消正在进行的请求 */
  cancelRequest(requestId: string): void
}

/**
 * OpenAI Compatible AI Service Implementation
 */
export class OpenAICompatibleService implements IAIService {
  private abortControllers = new Map<string, AbortController>()

  constructor(private config: AIConfig) {}

  /**
   * Generate chart from text description
   */
  async generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResponse> {
    const requestId = this.generateRequestId()
    const startTime = performance.now()
    
    try {
      // Create abort controller for cancellation support
      const abortController = new AbortController()
      this.abortControllers.set(requestId, abortController)

      // Get chart type configuration
      const chartTypeConfig = CHART_TYPE_OPTIONS.find(opt => opt.value === request.chartType)
      if (!chartTypeConfig) {
        throw this.createAIError('parsing', `Unsupported chart type: ${request.chartType}`)
      }

      // Build prompt
      const prompt = this.buildPrompt(request.text, request.chartType, chartTypeConfig, request.options)
      
      // Make API call
      const response = await this.makeAPICall(prompt, request.config, abortController.signal)
      
      // Parse response
      const mermaidCode = this.extractMermaidCode(response.content)
      
      const endTime = performance.now()
      const generationTime = endTime - startTime

      // Cleanup
      this.abortControllers.delete(requestId)

      return {
        mermaidCode,
        explanation: response.explanation,
        confidence: response.confidence,
        tokensUsed: response.usage?.total_tokens || this.estimateTokens(request.text, request.chartType),
        generationTime,
        requestId
      }

    } catch (error) {
      this.abortControllers.delete(requestId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createAIError('timeout', 'Request was cancelled')
      }
      
      throw this.handleAPIError(error)
    }
  }

  /**
   * Generate chart with streaming support
   */
  async generateChartStream(
    request: ChartGenerationRequest, 
    onProgress: (chunk: string) => void
  ): Promise<ChartGenerationResponse> {
    const requestId = this.generateRequestId()
    const startTime = performance.now()
    
    try {
      // Create abort controller for cancellation support
      const abortController = new AbortController()
      this.abortControllers.set(requestId, abortController)

      // Get chart type configuration
      const chartTypeConfig = CHART_TYPE_OPTIONS.find(opt => opt.value === request.chartType)
      if (!chartTypeConfig) {
        throw this.createAIError('parsing', `Unsupported chart type: ${request.chartType}`)
      }

      // Build prompt
      const prompt = this.buildPrompt(request.text, request.chartType, chartTypeConfig, request.options)
      
      // Make streaming API call
      const response = await this.makeStreamingAPICall(prompt, request.config, abortController.signal, onProgress)
      
      // Parse final response
      const mermaidCode = this.extractMermaidCode(response.content)
      
      const endTime = performance.now()
      const generationTime = endTime - startTime

      // Cleanup
      this.abortControllers.delete(requestId)

      return {
        mermaidCode,
        explanation: response.explanation,
        confidence: response.confidence,
        tokensUsed: response.usage?.total_tokens || this.estimateTokens(request.text, request.chartType),
        generationTime,
        requestId
      }

    } catch (error) {
      this.abortControllers.delete(requestId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createAIError('timeout', 'Request was cancelled')
      }
      
      throw this.handleAPIError(error)
    }
  }

  /**
   * Validate AI configuration
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    try {
      const testPrompt = "Generate a simple flowchart with 2 nodes"
      const abortController = new AbortController()
      
      // Set shorter timeout for validation
      const validationTimeout = Math.min(config.timeout, 10000)
      setTimeout(() => abortController.abort(), validationTimeout)
      
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 100,
          temperature: 0.1
        }),
        signal: abortController.signal
      })

      if (response.ok) {
        return true
      } else if (response.status === 401) {
        throw this.createAIError('auth', 'Invalid API key')
      } else if (response.status === 429) {
        throw this.createAIError('quota', 'Rate limit exceeded')
      } else {
        throw this.createAIError('api', `API error: ${response.status}`)
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createAIError('timeout', 'Validation timeout')
      }
      throw error
    }
  }

  /**
   * Estimate token usage for request
   */
  estimateTokens(text: string, chartType: ChartType): number {
    // Simple estimation: ~4 characters per token
    const textTokens = Math.ceil(text.length / 4)
    
    // Chart type overhead
    const overhead = {
      flowchart: 200,
      sequenceDiagram: 150,
      classDiagram: 180,
      stateDiagram: 120,
      erDiagram: 160,
      gantt: 140,
      mindmap: 100,
      timeline: 130
    }
    
    return textTokens + (overhead[chartType] || 150)
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(requestId)
    }
  }

  /**
   * Build AI prompt for chart generation
   */
  private buildPrompt(
    text: string, 
    chartType: ChartType, 
    chartConfig: any,
    options?: ChartGenerationRequest['options']
  ): string {
    const language = options?.language || 'zh'
    const complexity = options?.complexity || 'detailed'
    
    // Mermaid 语法规范
    const syntaxRules = language === 'zh' ? 
      `重要语法规范：
- 每个节点连接必须完整：A --> B 或 A -->|标签| B
- 判断节点使用 {} 格式：C{是否条件?}
- 判断分支必须包含起始节点：C -->|是| D 和 C -->|否| E
- 避免悬挂的 |标签| 语法，必须有完整的 起始节点 -->|标签| 目标节点
- 节点ID只能包含字母数字和下划线，避免特殊字符
- 每行只写一个连接关系` :
      `Important syntax rules:
- Each node connection must be complete: A --> B or A -->|label| B  
- Decision nodes use {} format: C{condition?}
- Decision branches must include source node: C -->|yes| D and C -->|no| E
- Avoid hanging |label| syntax, must have complete source -->|label| target
- Node IDs can only contain alphanumeric and underscore, avoid special chars
- Write one connection per line`

    const examples = language === 'zh' ?
      `正确示例：
flowchart TD
    A[开始] --> B[步骤1]
    B --> C{判断条件?}
    C -->|是| D[执行A]
    C -->|否| E[执行B]
    D --> F[结束]
    E --> F` :
      `Correct example:
flowchart TD
    A[Start] --> B[Step1]
    B --> C{Condition?}
    C -->|Yes| D[Action A]
    C -->|No| E[Action B]
    D --> F[End]
    E --> F`
    
    const basePrompt = language === 'zh' ? 
      `你是一个专业的图表设计师。请将以下描述转换为 Mermaid ${chartType} 代码。

${syntaxRules}

${examples}

要求：
1. 代码必须符合 Mermaid 语法规范，避免语法错误
2. ${complexity === 'simple' ? '保持简洁，只包含核心要素' : '详细展示所有重要元素和关系'}
3. 使用清晰的中文标签
4. 确保逻辑流程清晰易懂
5. 每个判断分支都必须完整定义
6. 只返回 Mermaid 代码，不要其他解释

用户描述：
${text}

请生成对应的 Mermaid 代码：` :
      `You are a professional diagram designer. Please convert the following description into Mermaid ${chartType} code.

${syntaxRules}

${examples}

Requirements:
1. Code must follow Mermaid syntax standards to avoid syntax errors
2. ${complexity === 'simple' ? 'Keep it simple, include only core elements' : 'Show all important elements and relationships in detail'}
3. Use clear English labels
4. Ensure logical flow is clear and understandable
5. All decision branches must be completely defined
6. Return only Mermaid code, no other explanations

User description:
${text}

Please generate the corresponding Mermaid code:`

    return basePrompt
  }

  /**
   * Make API call to AI service via Tauri backend
   */
  private async makeAPICall(
    prompt: string, 
    config: AIConfig, 
    signal: AbortSignal
  ): Promise<{
    content: string
    explanation?: string
    confidence?: number
    usage?: { total_tokens: number }
  }> {
    // Use Tauri backend for API calls
    const { invoke } = await import('@tauri-apps/api/core')
    
    const generateRequest = {
      base_url: config.baseUrl,
      api_key: config.apiKey,
      model: config.model,
      prompt: prompt,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: false,
    }
    
    const result = await invoke<{success: boolean, content?: string, error_message?: string, tokens_used?: number}>('call_ai_api', {
      request: generateRequest
    })

    if (!result.success) {
      throw new Error(result.error_message || 'AI API call failed')
    }

    if (!result.content) {
      throw new Error('No content received from AI service')
    }
    
    return {
      content: result.content,
      usage: result.tokens_used ? { total_tokens: result.tokens_used } : undefined
    }
  }

  /**
   * Make streaming API call to AI service via Tauri backend
   */
  private async makeStreamingAPICall(
    prompt: string, 
    config: AIConfig, 
    signal: AbortSignal,
    onProgress: (chunk: string) => void
  ): Promise<{
    content: string
    explanation?: string
    confidence?: number
    usage?: { total_tokens: number }
  }> {
    const { invoke } = await import('@tauri-apps/api/core')
    const { listen } = await import('@tauri-apps/api/event')
    const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    let fullContent = ''
    let streamCompleted = false
    let streamError: string | null = null
    
    // Listen for stream events
    const unlisten = await listen('ai-stream-chunk', (event) => {
      const chunk = event.payload as { request_id: string, content: string, finished: boolean }
      if (chunk.request_id === requestId) {
        fullContent += chunk.content
        onProgress(chunk.content)
      }
    })
    
    const unlistenComplete = await listen('ai-stream-complete', (event) => {
      const data = event.payload as { request_id: string }
      if (data.request_id === requestId) {
        streamCompleted = true
      }
    })
    
    const unlistenError = await listen('ai-stream-error', (event) => {
      const data = event.payload as { request_id: string, error: string }
      if (data.request_id === requestId) {
        streamError = data.error
        streamCompleted = true
      }
    })
    
    try {
      // Start streaming
      const streamRequest = {
        base_url: config.baseUrl,
        api_key: config.apiKey,
        model: config.model,
        prompt: prompt,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        request_id: requestId,
      }
      
      await invoke('call_ai_api_stream', { request: streamRequest })
      
      // Wait for stream to complete
      while (!streamCompleted) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      if (streamError) {
        throw new Error(streamError)
      }
      
      return {
        content: fullContent,
        usage: undefined
      }
    } finally {
      unlisten()
      unlistenComplete()
      unlistenError()
    }
  }

  /**
   * Extract Mermaid code from AI response
   */
  private extractMermaidCode(response: string): string {
    // Try to extract code block first
    const codeBlockMatch = response.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }
    
    // If no code block, return the trimmed response
    return response.trim()
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create standardized AI error
   */
  private createAIError(type: AIError['type'], message: string, code?: string): AIError {
    const error = new Error(message) as AIError
    error.type = type
    error.code = code
    error.retryable = ['network', 'timeout', 'quota'].includes(type)
    
    return error
  }

  /**
   * Handle and categorize API errors
   */
  private handleAPIError(error: unknown): AIError {
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch')) {
        return this.createAIError('network', 'Network connection failed')
      }
      
      // Timeout errors
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return this.createAIError('timeout', 'Request timeout')
      }
      
      // API errors
      if (error.message.includes('401')) {
        return this.createAIError('auth', 'Authentication failed - check API key')
      }
      
      if (error.message.includes('429')) {
        return this.createAIError('quota', 'Rate limit exceeded')
      }
      
      if (error.message.includes('400')) {
        return this.createAIError('api', 'Invalid request format')
      }
    }
    
    // Default error
    return this.createAIError('api', error instanceof Error ? error.message : 'Unknown error')
  }
}

/**
 * Default AI service instance
 */
export let aiService: IAIService | null = null

/**
 * Initialize AI service with configuration
 */
export function initializeAIService(config: AIConfig): IAIService {
  aiService = new OpenAICompatibleService(config)
  return aiService
}

/**
 * Get current AI service instance
 */
export function getAIService(): IAIService {
  if (!aiService) {
    throw new Error('AI service not initialized. Call initializeAIService first.')
  }
  return aiService
}