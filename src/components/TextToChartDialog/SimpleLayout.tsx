import React, { useState, useCallback, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Label from '@radix-ui/react-label'
import { Bot, Copy, Edit3, Eye, RotateCw, Download, X, CheckCircle, AlertCircle, BarChart3, Workflow, Clock, Package } from 'lucide-react'
import { 
  ChartType, 
  ChartGenerationRequest, 
  CHART_TYPE_OPTIONS,
  type TextInputState 
} from '../../types/ai-config'
import { useAIConfig } from '../../store/useAIConfigStore'
import { useTranslation } from '../../store/useI18nStore'
import mermaid from 'mermaid'

// Icon mapping function
const getChartTypeIcon = (iconName: string, size = 16) => {
  const iconProps = { size }
  switch (iconName) {
    case 'workflow':
      return <Workflow {...iconProps} />
    case 'clock':
      return <Clock {...iconProps} />
    case 'package':
      return <Package {...iconProps} />
    default:
      return <BarChart3 {...iconProps} />
  }
}

export interface TextToChartDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (
    request: ChartGenerationRequest, 
    onStreamProgress?: (chunk: string) => void
  ) => Promise<{ success: boolean; mermaidCode?: string; error?: string }>
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
  const { config, validateConfig, estimateTokens } = useAIConfig()
  
  // Check if config is actually complete (real-time validation)
  const isConfigComplete = Boolean(
    config.apiKey && 
    config.baseUrl && 
    config.model && 
    config.apiKey.length >= 10 && 
    config.baseUrl.startsWith('http') &&
    config.model.length > 0
  )
  
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
  const [editableMermaid, setEditableMermaid] = useState<string>('') // 可编辑的代码
  const [streamingMermaid, setStreamingMermaid] = useState<string>('') // 流式输出的实时内容
  const [isEditing, setIsEditing] = useState(false) // 是否处于编辑模式
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
    const codeToRender = editableMermaid || generatedMermaid
    if (!codeToRender || !mermaidRef.current) return

    const renderMermaid = async () => {
      try {
        setMermaidError('')
        const { svg } = await mermaid.render('mermaid-preview', codeToRender)
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
  }, [editableMermaid, generatedMermaid])

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
    
    if (!textInput.valid || !isConfigComplete) return

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
      setStreamingMermaid('') // 清空之前的流式内容
      
      // 流式回调函数
      const handleStreamProgress = (chunk: string) => {
        setStreamingMermaid(prev => prev + chunk)
      }
      
      const result = await onGenerate(request, handleStreamProgress)
      
      if (result.success && result.mermaidCode) {
        setGeneratedMermaid(result.mermaidCode)
        setEditableMermaid(result.mermaidCode) // 同步到可编辑版本
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
      
      await onImportToCanvas(editableMermaid || generatedMermaid)
      
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
      setEditableMermaid('') // 清空编辑代码
      setStreamingMermaid('') // 清空流式内容
      setIsEditing(false) // 退出编辑模式
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
          <Dialog.Title className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bot size={20} />
            {t('ai.textToChart.title')}
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
                        {getChartTypeIcon(selectedChartConfig?.icon || 'workflow')}
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
                              {getChartTypeIcon(option.icon)}
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
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} /> 描述不够详细
                        </span>
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
                      <span className={`w-2 h-2 rounded-full ${isConfigComplete ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{t('ai.textToChart.configStatus')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      {isConfigComplete ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>{isConfigComplete ? t('ai.textToChart.configured') : t('ai.textToChart.needsConfig')}</span>
                    </div>
                  </div>
                  
                  {!isConfigComplete && (
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
                    disabled={!textInput.valid || !isConfigComplete || isGenerating}
                    className="w-full px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-10"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('ai.textToChart.generating')}
                      </>
                    ) : (
                      <>
                        <BarChart3 size={16} /> {t('ai.textToChart.generate')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Preview Area */}
            <div className="space-y-4">
              <h3 className="font-semibold">{t('ai.textToChart.preview.chartPreview')}</h3>
              
              {/* 显示流式输出过程 */}
              {isGenerating ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      <div className="text-sm text-blue-700 font-medium">正在生成 Mermaid 代码...</div>
                    </div>
                    <pre className="text-xs bg-white p-2 rounded border font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                      {streamingMermaid || '等待流式输出...'}
                    </pre>
                  </div>
                </div>
              ) : !generatedMermaid ? (
                <div className="border border-gray-200 rounded-md p-8 min-h-96 bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 size={48} className="mx-auto mb-2 text-gray-400" />
                    <div>生成后在此预览图表</div>
                  </div>
                </div>
              ) : generatedMermaid ? (
                <div className="space-y-4">
                  {/* Mermaid Code */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-600">Mermaid 代码:</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 flex items-center gap-1"
                          title={isEditing ? "预览模式" : "编辑模式"}
                        >
                          {isEditing ? (
                            <><Eye size={12} /> 预览</>
                          ) : (
                            <><Edit3 size={12} /> 编辑</>
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(isEditing ? editableMermaid : generatedMermaid)
                            } catch (error) {
                              console.error('Failed to copy to clipboard:', error)
                            }
                          }}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1"
                          title="复制代码"
                        >
                          <Copy size={12} /> 复制
                        </button>
                      </div>
                    </div>
                    
                    {isEditing ? (
                      <textarea
                        value={editableMermaid}
                        onChange={(e) => setEditableMermaid(e.target.value)}
                        className="w-full text-xs font-mono bg-white p-2 rounded border min-h-32 max-h-64 resize-y"
                        placeholder="在此编辑 Mermaid 代码..."
                      />
                    ) : (
                      <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border font-mono">
                        <code>{editableMermaid || generatedMermaid}</code>
                      </pre>
                    )}
                  </div>

                  {/* 编辑模式下的应用按钮 */}
                  {isEditing && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => {
                          // 触发重新渲染预览
                          setMermaidError('')
                          setIsEditing(false)
                          setTimeout(() => setIsEditing(true), 100) // 重新进入编辑模式以保持状态
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex items-center gap-1"
                      >
                        <CheckCircle size={12} /> 应用修改
                      </button>
                    </div>
                  )}

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
                          setGenerationError('')
                          setStreamingMermaid('') // 清空之前的流式内容
                          
                          // 流式回调函数  
                          const handleStreamProgress = (chunk: string) => {
                            setStreamingMermaid(prev => prev + chunk)
                          }
                          
                          const result = await onGenerate(request, handleStreamProgress)
                          
                          if (result.success && result.mermaidCode) {
                            setGeneratedMermaid(result.mermaidCode)
                            setEditableMermaid(result.mermaidCode) // 同步到可编辑版本
                          } else {
                            setGenerationError(result.error || 'Regeneration failed')
                          }
                        } catch (error) {
                          setGenerationError(error instanceof Error ? error.message : 'Regeneration failed')
                        } finally {
                          setIsGenerating(false)
                        }
                      }}
                      className="flex-1 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2 h-10"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        '重新生成中...'
                      ) : (
                        <><RotateCw size={14} /> 重新生成</>
                      )}
                    </button>
                    
                    <button
                      onClick={handleImportToCanvas}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center justify-center gap-2 h-10"
                    >
                      <Download size={14} /> 导入画布
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
              ) : null}
              
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
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default TextToChartDialog