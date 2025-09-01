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

export interface TextToChartDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (request: ChartGenerationRequest) => Promise<{ success: boolean; mermaidCode?: string; error?: string }>
  onImportToCanvas: (mermaidCode: string) => Promise<void>
  loading?: boolean
  error?: string | null
}

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
  const [generatedMermaid, setGeneratedMermaid] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string>('')
  const [mermaidError, setMermaidError] = useState<string>('')
  const mermaidRef = useRef<HTMLDivElement>(null)

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

  // Update text input analysis
  const updateTextAnalysis = useCallback((text: string) => {
    // Better Chinese word counting: Chinese characters + whitespace-separated words
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').trim().split(/\s+/).filter(word => word.length > 0).length
    const wordCount = chineseChars + englishWords
    
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
  }, [selectedChartType, estimateTokens, config.maxTokens, t])

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
    
    if (!textInput.valid || !isValid) return

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
      console.log('Starting import to canvas...')
      console.log('Mermaid code:', generatedMermaid)
      
      await onImportToCanvas(generatedMermaid)
      
      console.log('Import successful, resetting form...')
      // Reset form and close dialog
      setTextInput({
        value: '',
        wordCount: 0,
        tokenEstimate: 0,
        valid: false,
        errors: []
      })
      setGeneratedMermaid('')
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
      setGenerationError(error instanceof Error ? error.message : 'Import failed')
    }
  }

  const selectedChartConfig = CHART_TYPE_OPTIONS.find(opt => opt.value === selectedChartType)

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 z-50 max-h-[90vh] overflow-auto w-full max-w-6xl">
          <Dialog.Title className="text-xl font-semibold mb-4">
            🤖 {t('ai.textToChart.title')}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {t('ai.textToChart.description')}
          </Dialog.Description>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Form */}
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Chart Type Selection */}
                <div className="space-y-2">
                  <Label.Root className="text-sm font-medium">
                    {t('ai.textToChart.chartType')}
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
                              <Select.ItemText className="font-medium">
                                {option.label}
                              </Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <Label.Root className="text-sm font-medium">
                    {t('ai.textToChart.inputLabel')}
                  </Label.Root>
                  <textarea
                    value={textInput.value || ''}
                    onChange={handleTextChange}
                    placeholder={t('ai.textToChart.inputPlaceholder')}
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
                    {t('ai.textToChart.complexity')}
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
                      {t('ai.textToChart.simple')}
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
                      {t('ai.textToChart.detailed')}
                    </button>
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
                          window.dispatchEvent(new CustomEvent('open-ai-settings', { 
                            detail: { returnTo: 'textToChart' } 
                          }))
                        }}
                        className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        立即配置
                      </button>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!textInput.valid || !isValid || isGenerating}
                    className="w-full px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </div>

            {/* Right: Preview Area */}
            <div className="space-y-4">
              <h3 className="font-semibold">{t('ai.textToChart.preview.chartPreview')}</h3>
              
              {!generatedMermaid ? (
                <div className="border border-gray-200 rounded-md p-8 min-h-96 bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <div>生成后在此预览图表</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mermaid Code */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-600">Mermaid 代码:</div>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(generatedMermaid)
                          } catch (error) {
                            console.error('Failed to copy to clipboard:', error)
                          }
                        }}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1"
                        title="复制代码"
                      >
                        📋 复制
                      </button>
                    </div>
                    <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                      <code>{generatedMermaid}</code>
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setGenerationError('')
                        
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
                      className="flex-1 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded text-sm disabled:opacity-50"
                      disabled={isGenerating}
                    >
                      {isGenerating ? '重新生成中...' : '🔄 重新生成'}
                    </button>
                    
                    <button
                      onClick={handleImportToCanvas}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                      📥 导入画布
                    </button>
                  </div>
                  
                  {/* Preview */}
                  <div className="border border-gray-200 rounded-md p-4 min-h-64 bg-white overflow-auto">
                    <div ref={mermaidRef} className="mermaid-preview w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        渲染中...
                      </div>
                    </div>
                    {mermaidError && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        预览错误: {mermaidError}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Generation Error */}
              {generationError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-sm text-red-800">
                    <strong>{t('common.error')}：</strong> {generationError}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default TextToChartDialog