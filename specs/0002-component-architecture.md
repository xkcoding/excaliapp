# 组件架构设计

## 总体架构图

```
ExcaliApp
├── Excalidraw 组件
│   ├── More Tools 扩展
│   │   ├── 布局工具菜单
│   │   └── AI 图表生成
│   └── 自定义渲染
├── 布局系统
│   ├── 算法引擎
│   ├── 预览功能
│   └── 配置管理
├── AI 系统
│   ├── 服务适配器
│   ├── 提示词管理
│   └── 结果转换
└── 状态管理
    ├── 布局状态
    ├── AI 配置
    └── 用户设置
```

## 核心组件设计

### 1. MoreToolsMenu 组件

**文件**: `src/components/MoreToolsMenu/index.tsx`

```typescript
interface MoreToolsMenuProps {
  excalidrawAPI: ExcalidrawImperativeAPI
  appState: AppState
  onLayoutApplied?: (result: LayoutResult) => void
  onChartGenerated?: (elements: ExcalidrawElement[]) => void
}

export function MoreToolsMenu({
  excalidrawAPI,
  appState,
  onLayoutApplied,
  onChartGenerated
}: MoreToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  
  const selectedElements = useMemo(() => {
    return excalidrawAPI.getSceneElements()
      .filter(el => appState.selectedElementIds.has(el.id))
  }, [excalidrawAPI, appState.selectedElementIds])

  const layoutTools = useLayoutTools()
  const aiTools = useAITools()

  return (
    <Dropdown isOpen={isOpen} onToggle={setIsOpen}>
      <DropdownTrigger>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
          更多工具
        </Button>
      </DropdownTrigger>
      
      <DropdownContent>
        <ToolGroup title="布局工具">
          {layoutTools.map(tool => (
            <ToolItem
              key={tool.id}
              tool={tool}
              disabled={!tool.canApply(selectedElements)}
              onClick={() => handleLayoutTool(tool)}
            />
          ))}
        </ToolGroup>
        
        <DropdownSeparator />
        
        <ToolGroup title="AI 工具">
          {aiTools.map(tool => (
            <ToolItem
              key={tool.id}
              tool={tool}
              onClick={() => handleAITool(tool)}
            />
          ))}
        </ToolGroup>
      </DropdownContent>
    </Dropdown>
  )
}
```

**子组件结构**:
```
MoreToolsMenu/
├── index.tsx              # 主组件
├── ToolGroup.tsx          # 工具分组
├── ToolItem.tsx           # 工具项
├── hooks/
│   ├── useLayoutTools.ts  # 布局工具逻辑
│   └── useAITools.ts      # AI工具逻辑
└── styles.module.css      # 样式文件
```

### 2. LayoutConfigPanel 组件

**文件**: `src/components/LayoutConfigPanel/index.tsx`

```typescript
interface LayoutConfigPanelProps {
  algorithm: LayoutAlgorithm
  elements: ExcalidrawElement[]
  onApply: (result: LayoutResult) => void
  onCancel: () => void
}

export function LayoutConfigPanel({
  algorithm,
  elements,
  onApply,
  onCancel
}: LayoutConfigPanelProps) {
  const [options, setOptions] = useState<LayoutOptions>(algorithm.defaultOptions)
  const [previewResult, setPreviewResult] = useState<LayoutResult | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const { executeLayout, isExecuting } = useLayoutService()

  const handlePreview = async () => {
    const result = await executeLayout(algorithm.id, elements, {
      ...options,
      preview: true
    })
    setPreviewResult(result)
    setIsPreviewMode(true)
  }

  const handleApply = async () => {
    const result = await executeLayout(algorithm.id, elements, options)
    onApply(result)
  }

  return (
    <Panel className="layout-config-panel">
      <PanelHeader>
        <h3>{algorithm.name}</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </PanelHeader>

      <PanelContent>
        <ConfigSection title="布局选项">
          {algorithm.configSchema.map(config => (
            <ConfigControl
              key={config.key}
              config={config}
              value={options[config.key]}
              onChange={(value) => setOptions(prev => ({
                ...prev,
                [config.key]: value
              }))}
            />
          ))}
        </ConfigSection>

        {previewResult && (
          <PreviewSection>
            <PreviewStats result={previewResult} />
          </PreviewSection>
        )}
      </PanelContent>

      <PanelFooter>
        <Button 
          variant="outline" 
          onClick={handlePreview}
          disabled={isExecuting}
        >
          预览效果
        </Button>
        <Button 
          onClick={handleApply}
          disabled={isExecuting || elements.length === 0}
        >
          {isExecuting ? '应用中...' : '应用布局'}
        </Button>
      </PanelFooter>
    </Panel>
  )
}
```

### 3. TextToChartDialog 组件

**文件**: `src/components/TextToChartDialog/index.tsx`

```typescript
interface TextToChartDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (elements: ExcalidrawElement[]) => void
}

export function TextToChartDialog({
  isOpen,
  onClose,
  onGenerate
}: TextToChartDialogProps) {
  const [text, setText] = useState('')
  const [chartType, setChartType] = useState<ChartType>('flowchart')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { aiConfig } = useAIConfigStore()
  const { generateChart } = useAIService()
  const { convertMermaidToExcalidraw } = useMermaidConverter()

  const handleGenerate = async () => {
    if (!text.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      // 1. 生成 Mermaid 代码
      const aiResponse = await generateChart({
        text,
        chartType,
        config: aiConfig
      })

      // 2. 转换为 Excalidraw 元素
      const convertResult = await convertMermaidToExcalidraw(
        aiResponse.mermaidCode
      )

      // 3. 返回结果
      onGenerate(convertResult.elements)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <DialogTitle>文本生成图表</DialogTitle>
        <DialogDescription>
          描述你想要的图表，AI 将为你生成相应的可视化内容
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <ChartTypeSelector
          value={chartType}
          onChange={setChartType}
          options={SUPPORTED_CHART_TYPES}
        />

        <TextInputArea
          value={text}
          onChange={setText}
          placeholder="请描述你想要生成的图表..."
          maxLength={2000}
        />

        <TokenEstimator text={text} chartType={chartType} />

        {error && (
          <ErrorMessage
            message={error}
            type="error"
            onRetry={() => setError(null)}
          />
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button 
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating || !aiConfig.apiKey}
          loading={isGenerating}
        >
          {isGenerating ? '生成中...' : '生成图表'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
```

**子组件结构**:
```
TextToChartDialog/
├── index.tsx                # 主对话框
├── ChartTypeSelector.tsx    # 图表类型选择
├── TextInputArea.tsx        # 文本输入区域
├── TokenEstimator.tsx       # Token 估算器
├── ErrorMessage.tsx         # 错误信息显示
├── hooks/
│   ├── useAIService.ts     # AI 服务hook
│   └── useMermaidConverter.ts # Mermaid转换hook
└── constants.ts            # 支持的图表类型等
```

### 4. AIConfigPanel 组件

**文件**: `src/components/AIConfigPanel/index.tsx`

```typescript
interface AIConfigPanelProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: AIConfig) => void
}

export function AIConfigPanel({
  isOpen,
  onClose,
  onSave
}: AIConfigPanelProps) {
  const { config, updateConfig, validateConfig } = useAIConfigStore()
  const [localConfig, setLocalConfig] = useState(config)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    message?: string
  } | null>(null)

  const handleValidate = async () => {
    setIsValidating(true)
    try {
      const valid = await validateConfig(localConfig)
      setValidationResult({
        valid,
        message: valid ? '配置验证成功' : '配置验证失败，请检查设置'
      })
    } catch (error) {
      setValidationResult({
        valid: false,
        message: error instanceof Error ? error.message : '验证失败'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = () => {
    updateConfig(localConfig)
    onSave(localConfig)
    onClose()
  }

  return (
    <Sidebar isOpen={isOpen} onClose={onClose} side="right" width={400}>
      <SidebarHeader>
        <h2>AI 配置</h2>
      </SidebarHeader>

      <SidebarContent>
        <ConfigForm
          config={localConfig}
          onChange={setLocalConfig}
          onValidate={handleValidate}
          validating={isValidating}
          validationResult={validationResult}
        />

        <ProviderSelector
          providers={SUPPORTED_PROVIDERS}
          selected={localConfig.provider}
          onSelect={(provider) => 
            setLocalConfig(prev => ({
              ...prev,
              ...provider.defaultConfig
            }))
          }
        />

        <UsageStats />
      </SidebarContent>

      <SidebarFooter>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>
          保存配置
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
```

## 服务层架构

### 1. 布局服务

**文件**: `src/services/LayoutService.ts`

```typescript
export class LayoutService implements ILayoutService {
  private algorithms = new Map<string, LayoutAlgorithm>()

  constructor() {
    this.registerAlgorithms()
  }

  private registerAlgorithms() {
    // 注册所有布局算法
    this.algorithms.set('grid-align', {
      id: 'grid-align',
      name: '网格对齐',
      description: '将元素对齐到网格',
      icon: 'Grid',
      requiresSelection: true,
      minElements: 1,
      apply: gridAlign,
      configSchema: [
        {
          key: 'spacing',
          type: 'slider',
          label: '间距',
          min: 10,
          max: 100,
          step: 5,
          default: 20
        }
      ]
    })
    // ... 其他算法
  }

  async applyLayout(
    algorithmId: string,
    elements: ExcalidrawElement[],
    options?: LayoutOptions
  ): Promise<LayoutResult> {
    const algorithm = this.algorithms.get(algorithmId)
    if (!algorithm) {
      throw new Error(`Unknown algorithm: ${algorithmId}`)
    }

    const startTime = Date.now()
    const layoutedElements = await algorithm.apply(elements, options)
    const executionTime = Date.now() - startTime

    const movedElements = layoutedElements.filter((el, index) => {
      const original = elements[index]
      return el.x !== original.x || el.y !== original.y
    }).length

    return {
      elements: layoutedElements,
      hasChanges: movedElements > 0,
      stats: {
        movedElements,
        totalElements: elements.length,
        executionTime
      }
    }
  }
}
```

### 2. AI 服务

**文件**: `src/services/AIService.ts`

```typescript
export class AIService implements IAIService {
  private provider: AIProvider
  private requestController: AbortController | null = null

  constructor(private config: AIConfig) {
    this.provider = this.getProvider(config.provider)
  }

  async generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResponse> {
    this.requestController = new AbortController()

    const prompt = this.buildPrompt(request.text, request.chartType)
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: this.requestController.signal,
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        })
      })

      const data = await response.json()
      const generationTime = Date.now() - startTime

      return {
        mermaidCode: this.extractMermaidCode(data.choices[0].message.content),
        tokensUsed: data.usage?.total_tokens,
        generationTime
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AIError('Request was cancelled', 'cancel', false)
      }
      throw this.handleError(error)
    }
  }

  private buildPrompt(text: string, chartType: ChartType): string {
    const templates = {
      flowchart: FLOWCHART_PROMPT_TEMPLATE,
      sequenceDiagram: SEQUENCE_DIAGRAM_PROMPT_TEMPLATE
    }

    return templates[chartType]?.replace('{userInput}', text) || 
           `Generate a ${chartType} for: ${text}`
  }

  private extractMermaidCode(response: string): string {
    // 从AI响应中提取Mermaid代码
    const codeBlockMatch = response.match(/```(?:mermaid)?\n?([\s\S]*?)\n?```/)
    return codeBlockMatch?.[1] || response.trim()
  }
}
```

## 状态管理架构

### Zustand Store 设计

**文件**: `src/stores/useLayoutStore.ts`

```typescript
interface LayoutStore extends LayoutState, LayoutActions {}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  // State
  algorithms: [],
  currentAlgorithm: undefined,
  options: DEFAULT_LAYOUT_OPTIONS,
  isExecuting: false,
  lastResult: undefined,
  history: [],

  // Actions
  setCurrentAlgorithm: (algorithmId) => {
    set({ currentAlgorithm: algorithmId })
  },

  updateOptions: (newOptions) => {
    set(state => ({
      options: { ...state.options, ...newOptions }
    }))
  },

  executeLayout: async (elements) => {
    const { currentAlgorithm, options } = get()
    if (!currentAlgorithm) return

    set({ isExecuting: true })

    try {
      const service = new LayoutService()
      const result = await service.applyLayout(currentAlgorithm, elements, options)
      
      set(state => ({
        isExecuting: false,
        lastResult: result,
        history: [
          ...state.history,
          {
            timestamp: new Date(),
            algorithmId: currentAlgorithm,
            options,
            result
          }
        ].slice(-10) // 保持最近10条记录
      }))

      return result
    } catch (error) {
      set({ isExecuting: false })
      throw error
    }
  }
}))
```

## Hook 架构

### 自定义 Hook 设计

**文件**: `src/hooks/useExcalidrawIntegration.ts`

```typescript
export function useExcalidrawIntegration(excalidrawAPI: ExcalidrawImperativeAPI) {
  const [selectedElements, setSelectedElements] = useState<ExcalidrawElement[]>([])

  const updateSelectedElements = useCallback(() => {
    const elements = excalidrawAPI.getSceneElements()
      .filter(el => excalidrawAPI.getAppState().selectedElementIds.has(el.id))
    setSelectedElements(elements)
  }, [excalidrawAPI])

  const applyLayoutToSelection = useCallback(async (
    algorithmId: string,
    options?: LayoutOptions
  ) => {
    const service = new LayoutService()
    const result = await service.applyLayout(algorithmId, selectedElements, options)
    
    // 更新场景
    const allElements = excalidrawAPI.getSceneElements()
    const updatedElements = allElements.map(el => {
      const layouted = result.elements.find(le => le.id === el.id)
      return layouted || el
    })

    excalidrawAPI.updateScene({ elements: updatedElements })
    return result
  }, [excalidrawAPI, selectedElements])

  const insertGeneratedChart = useCallback((elements: ExcalidrawElement[]) => {
    const appState = excalidrawAPI.getAppState()
    const viewportCenter = {
      x: appState.scrollX + appState.width / 2,
      y: appState.scrollY + appState.height / 2
    }

    // 将元素移动到视口中心
    const centeredElements = elements.map(el => ({
      ...el,
      x: el.x + viewportCenter.x,
      y: el.y + viewportCenter.y
    }))

    const allElements = [...excalidrawAPI.getSceneElements(), ...centeredElements]
    excalidrawAPI.updateScene({ elements: allElements })
  }, [excalidrawAPI])

  return {
    selectedElements,
    updateSelectedElements,
    applyLayoutToSelection,
    insertGeneratedChart
  }
}
```

## 错误处理架构

### 错误边界组件

**文件**: `src/components/ErrorBoundary.tsx`

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // 发送错误报告
    if (error instanceof AppError) {
      ErrorReporter.report(error, {
        component: 'ErrorBoundary',
        errorInfo
      })
    }
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback
      return (
        <Fallback 
          error={this.state.error!} 
          resetError={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}
```

这个组件架构设计提供了：

1. **清晰的组件层次结构**
2. **完整的服务层抽象**
3. **强类型的状态管理**
4. **可复用的Hook设计**
5. **健壮的错误处理机制**

所有组件都基于之前定义的接口，确保了类型安全和可维护性。