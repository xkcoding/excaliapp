/**
 * Text to Chart Dialog Component
 * Allows users to generate diagrams from text descriptions using AI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Label from '@radix-ui/react-label'
import { 
  ChartType, 
  ChartGenerationRequest, 
  CHART_TYPE_OPTIONS,
  type TextInputState 
} from '../../types/ai-config'
import { useAIConfig } from '../../store/useAIConfigStore'
import { useTranslation } from '../../store/useI18nStore'
import mermaid from 'mermaid'

/**
 * Props for TextToChartDialog component
 */
export interface TextToChartDialogProps {
  /** 对话框是否打开 */
  isOpen: boolean
  /** 关闭对话框回调 */
  onClose: () => void
  /** 生成图表回调 */
  onGenerate: (request: ChartGenerationRequest) => Promise<{ success: boolean; mermaidCode?: string; error?: string }>
  /** 导入到画布回调 */
  onImportToCanvas: (mermaidCode: string) => Promise<void>
  /** 是否正在加载 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
}

/**
 * Text to Chart Dialog Component
 */
export const TextToChartDialog: React.FC<TextToChartDialogProps> = ({
  isOpen,
  onClose,
  onGenerate,
  onImportToCanvas,
  loading = false,
  error = null
}) => {
  const { config, isValid, validateConfig, estimateTokens } = useAIConfig()
  const { t } = useTranslation()
  
  // Form state
  const [textInput, setTextInput] = useState<TextInputState>({
    value: '',
    wordCount: 0,
    tokenEstimate: 0,
    valid: false,
    errors: []
  })
  
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('flowchart')
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('detailed')
  const [showPreview, setShowPreview] = useState(false)
  const [generatedMermaid, setGeneratedMermaid] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string>('')
  const [mermaidError, setMermaidError] = useState<string>('')
  const mermaidRef = useRef<HTMLDivElement>(null)

  // Update text input analysis
  const updateTextAnalysis = useCallback((text: string) => {
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length
    const tokenEstimate = estimateTokens(text, selectedChartType)
    const valid = text.trim().length >= 10 && wordCount >= 2
    const errors: string[] = []
    
    if (text.trim().length < 10) {
      errors.push(t('ai.textToChart.validationErrors.tooShort'))
    }
    if (wordCount < 2) {
      errors.push(t('ai.textToChart.validationErrors.tooFewWords'))
    }
    if (tokenEstimate > config.maxTokens * 0.8) {
      errors.push(t('ai.textToChart.validationErrors.tooLong'))
    }
    
    setTextInput({
      value: text,
      wordCount,
      tokenEstimate,
      valid,
      errors
    })
  }, [selectedChartType, estimateTokens, config.maxTokens])

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTextAnalysis(e.target.value)
  }

  // Handle chart type change
  const handleChartTypeChange = (newChartType: ChartType) => {
    setSelectedChartType(newChartType)
    updateTextAnalysis(textInput.value)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!textInput.valid) {
      return
    }

    if (!isValid) {
      await validateConfig()
      if (!isValid) {
        return
      }
    }

    const request: ChartGenerationRequest = {
      text: textInput.value,
      chartType: selectedChartType,
      config,
      options: {
        language: 'zh',
        complexity
      }
    }

    try {
      setIsGenerating(true)
      setGenerationError('')
      
      const result = await onGenerate(request)
      
      if (result.success && result.mermaidCode) {
        setGeneratedMermaid(result.mermaidCode)
        setShowPreview(true)
      } else {
        setGenerationError(result.error || 'Generation failed')
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle import to canvas
  const handleImportToCanvas = async () => {
    try {
      await onImportToCanvas(generatedMermaid)
      // Reset form and close dialog
      setTextInput({
        value: '',
        wordCount: 0,
        tokenEstimate: 0,
        valid: false,
        errors: []
      })
      setShowPreview(false)
      setGeneratedMermaid('')
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Import failed')
    }
  }

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    })
  }, [])

  // Render mermaid diagram when code changes
  useEffect(() => {
    if (!generatedMermaid || !mermaidRef.current) return

    const renderMermaid = async () => {
      try {
        setMermaidError('')
        const { svg } = await mermaid.render('mermaid-preview', generatedMermaid)
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg
        }
      } catch (error) {
        setMermaidError(error instanceof Error ? error.message : 'Preview render failed')
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<div class="text-red-500 text-center p-4">预览渲染失败: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
        }
      }
    }

    renderMermaid()
  }, [generatedMermaid])

  // Get selected chart type config
  const selectedChartConfig = CHART_TYPE_OPTIONS.find(opt => opt.value === selectedChartType)

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 z-50 max-h-[90vh] overflow-auto w-full max-w-6xl">
          <Dialog.Title className="text-xl font-semibold mb-4">
            🤖 {t('ai.textToChart.title')}
          </Dialog.Title>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Form */}
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
            {/* Chart Type Selection */}
            <div className="space-y-2">
              <Label.Root className="text-sm font-medium">
                图表类型
              </Label.Root>
              <Select.Root value={selectedChartType} onValueChange={handleChartTypeChange}>
                <Select.Trigger className="w-full p-3 border border-gray-300 rounded-md bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{selectedChartConfig?.icon}</span>
                    <Select.Value />
                  </div>
                  <Select.Icon className="ml-2">▼</Select.Icon>
                </Select.Trigger>
                
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50">
                    <Select.Viewport className="p-1">
                      {CHART_TYPE_OPTIONS.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
                        >
                          <span>{option.icon}</span>
                          <div>
                            <Select.ItemText className="font-medium">
                              {option.label}
                            </Select.ItemText>
                            <div className="text-xs text-gray-500">
                              {option.description}
                            </div>
                          </div>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
              
              {selectedChartConfig && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>示例：</strong> {selectedChartConfig.example}
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <Label.Root className="text-sm font-medium">
                描述内容
              </Label.Root>
              <textarea
                value={textInput.value}
                onChange={handleTextChange}
                placeholder={`请描述您想要创建的${selectedChartConfig?.label || '图表'}...

例如：
- 用户注册流程：用户填写信息 → 验证邮箱 → 创建账户 → 发送欢迎邮件
- 公司组织架构：CEO领导下有技术部、市场部、财务部等部门
- 订单处理流程：接收订单 → 检查库存 → 确认付款 → 发货 → 完成订单`}
                className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] resize-y"
                disabled={loading}
              />
              
              {/* Input Analysis */}
              <div className="flex justify-between text-xs text-gray-500">
                <div className="flex gap-4">
                  <span>词数: {textInput.wordCount}</span>
                  <span>预估Token: {textInput.tokenEstimate}</span>
                </div>
                <div className="flex gap-2">
                  {textInput.valid ? (
                    <span className="text-green-600">✓ 可以生成</span>
                  ) : (
                    <span className="text-red-600">⚠ 描述不够详细</span>
                  )}
                </div>
              </div>
              
              {/* Validation Errors */}
              {textInput.errors.length > 0 && (
                <div className="text-xs text-red-600 space-y-1">
                  {textInput.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Complexity Setting */}
            <div className="space-y-2">
              <Label.Root className="text-sm font-medium">
                生成详细度
              </Label.Root>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setComplexity('simple')}
                  className={`px-3 py-2 rounded text-sm ${
                    complexity === 'simple' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  简洁
                </button>
                <button
                  type="button"
                  onClick={() => setComplexity('detailed')}
                  className={`px-3 py-2 rounded text-sm ${
                    complexity === 'detailed' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  详细
                </button>
              </div>
              <div className="text-xs text-gray-600">
                {complexity === 'simple' ? '生成简洁的图表，只包含核心要素' : '生成详细的图表，包含完整的流程和关系'}
              </div>
            </div>

            {/* AI Configuration Status */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{t('ai.textToChart.configStatus')}</span>
                </div>
                <div className="text-gray-600">
                  {isValid ? t('ai.textToChart.configured') : t('ai.textToChart.needsConfig')}
                </div>
              </div>
              
              {!isValid && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded flex items-center justify-between">
                  <span>请先配置 AI API 密钥和服务地址</span>
                  <button
                    onClick={() => {
                      onClose()
                      window.dispatchEvent(new CustomEvent('open-ai-settings'))
                    }}
                    className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    立即配置
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-sm text-red-800">
                  <strong>生成失败：</strong> {error}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  取消
                </button>
              </Dialog.Close>
              
              <button
                type="submit"
                disabled={!textInput.valid || !isValid || isGenerating}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('ai.textToChart.generating')}
                  </>
                ) : (
                  <>
                    ✨ {t('ai.textToChart.generate')}
                  </>
                )}
              </button>
            </div>
          </form>
          ) : (
            /* Preview View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Mermaid Code */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t('ai.textToChart.preview.mermaidCode')}</h3>
                  <button
                    onClick={() => {
                      setShowPreview(false)
                      setGeneratedMermaid('')
                      setGenerationError('')
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {t('ai.textToChart.preview.backToEdit')}
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="text-sm overflow-auto max-h-96">
                    <code>{generatedMermaid}</code>
                  </pre>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <h3 className="font-semibold">{t('ai.textToChart.preview.chartPreview')}</h3>
                <div className="border border-gray-200 rounded-md p-4 min-h-96 bg-white overflow-auto">
                  <div ref={mermaidRef} className="mermaid-preview w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      {t('ai.textToChart.preview.previewComingSoon')}
                    </div>
                  </div>
                  {mermaidError && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      预览错误: {mermaidError}
                    </div>
                  )}
                </div>
              </div>

              {/* Import Actions */}
              <div className="lg:col-span-2">
                {generationError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <div className="text-sm text-red-800">
                      <strong>{t('common.error')}：</strong> {generationError}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={async () => {
                      setGenerationError('')
                      setGeneratedMermaid('')
                      
                      const request: ChartGenerationRequest = {
                        text: textInput.value,
                        chartType: selectedChartType,
                        config,
                        options: {
                          language: 'zh',
                          complexity
                        }
                      }
                      
                      try {
                        setIsGenerating(true)
                        const result = await onGenerate(request)
                        
                        if (result.success && result.mermaidCode) {
                          setGeneratedMermaid(result.mermaidCode)
                        } else {
                          setGenerationError(result.error || 'Regeneration failed')
                        }
                      } catch (error) {
                        setGenerationError(error instanceof Error ? error.message : 'Regeneration failed')
                      } finally {
                        setIsGenerating(false)
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-600/30 border-t-gray-600 rounded-full animate-spin mr-2 inline-block" />
                        {t('ai.textToChart.generating')}
                      </>
                    ) : (
                      t('ai.textToChart.preview.regenerate')
                    )}
                  </button>
                  
                  <button
                    onClick={handleImportToCanvas}
                    className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                  >
                    {t('ai.textToChart.preview.importToCanvas')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default TextToChartDialog