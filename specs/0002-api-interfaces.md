# API 接口定义文档

## 核心类型定义

### 布局相关接口

```typescript
// src/types/layout.ts

export interface LayoutAlgorithm {
  /** 算法唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 算法描述 */
  description: string
  /** 菜单图标名称 */
  icon: string
  /** 是否需要选中元素 */
  requiresSelection: boolean
  /** 最小元素数量要求 */
  minElements: number
  /** 执行算法 */
  apply: (elements: ExcalidrawElement[], options?: LayoutOptions) => Promise<ExcalidrawElement[]>
}

export interface LayoutOptions {
  /** 元素间距 */
  spacing?: number
  /** 对齐方式 */
  alignment?: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  /** 布局方向 */
  direction?: 'vertical' | 'horizontal' | 'auto'
  /** 对齐到网格 */
  snapToGrid?: boolean
  /** 保持原始连线 */
  preserveConnections?: boolean
  /** 动画时长 */
  animationDuration?: number
}

export interface LayoutResult {
  /** 布局后的元素 */
  elements: ExcalidrawElement[]
  /** 是否有变化 */
  hasChanges: boolean
  /** 变化统计 */
  stats: {
    movedElements: number
    totalElements: number
    executionTime: number
  }
}

export interface GridOptions extends LayoutOptions {
  /** 网格大小 */
  gridSize: number
  /** 网格偏移 */
  offset: { x: number; y: number }
}

export interface FlowOptions extends LayoutOptions {
  /** 节点间垂直距离 */
  rankSeparation: number
  /** 同层节点间距离 */
  nodeSeparation: number
  /** 边的类型 */
  edgeType: 'straight' | 'curve' | 'step'
}

export interface GroupOptions extends LayoutOptions {
  /** 分组检测距离阈值 */
  maxDistance: number
  /** 最小分组大小 */
  minGroupSize: number
  /** 分组间距 */
  groupSpacing: number
}
```

### AI 配置相关接口

```typescript
// src/types/ai-config.ts

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
  }
}

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
}

export type ChartType = 
  | 'flowchart' 
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'gantt'

export interface AIError extends Error {
  type: 'network' | 'api' | 'parsing' | 'timeout' | 'quota' | 'auth'
  code?: string
  retryable: boolean
  retryAfter?: number
}
```

## 服务层接口

### 布局算法服务

```typescript
// src/services/layout-algorithms.ts

export interface ILayoutService {
  /** 获取所有可用算法 */
  getAvailableAlgorithms(): LayoutAlgorithm[]
  
  /** 获取特定算法 */
  getAlgorithm(id: string): LayoutAlgorithm | null
  
  /** 执行布局算法 */
  applyLayout(
    algorithmId: string,
    elements: ExcalidrawElement[],
    options?: LayoutOptions
  ): Promise<LayoutResult>
  
  /** 预览布局效果 */
  previewLayout(
    algorithmId: string,
    elements: ExcalidrawElement[],
    options?: LayoutOptions
  ): Promise<LayoutResult>
  
  /** 验证元素是否适用于算法 */
  validateElements(
    algorithmId: string,
    elements: ExcalidrawElement[]
  ): { valid: boolean; reason?: string }
}

/** 网格对齐算法 */
export function gridAlign(
  elements: ExcalidrawElement[],
  options: GridOptions
): Promise<ExcalidrawElement[]>

/** 智能分组算法 */
export function smartGroup(
  elements: ExcalidrawElement[],
  options: GroupOptions
): Promise<ExcalidrawElement[]>

/** 流程图优化算法 */
export function flowOptimize(
  elements: ExcalidrawElement[],
  options: FlowOptions
): Promise<ExcalidrawElement[]>
```

### AI 服务接口

```typescript
// src/services/ai-service.ts

export interface IAIService {
  /** 生成图表 */
  generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResponse>
  
  /** 验证API配置 */
  validateConfig(config: AIConfig): Promise<boolean>
  
  /** 获取支持的供应商 */
  getSupportedProviders(): AIProvider[]
  
  /** 估算token使用量 */
  estimateTokens(text: string, chartType: ChartType): number
  
  /** 取消正在进行的请求 */
  cancelRequest(requestId: string): void
}

export class OpenAICompatibleService implements IAIService {
  constructor(private config: AIConfig) {}
  
  async generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResponse> {
    // 实现OpenAI兼容API调用
  }
  
  async validateConfig(config: AIConfig): Promise<boolean> {
    // 验证API密钥和配置
  }
  
  // ... 其他方法实现
}
```

### Mermaid 转换服务

```typescript
// src/services/mermaid-converter.ts

export interface IMermaidConverter {
  /** 转换Mermaid代码为Excalidraw元素 */
  convertToExcalidraw(
    mermaidCode: string,
    options?: ConvertOptions
  ): Promise<ConvertResult>
  
  /** 验证Mermaid语法 */
  validateSyntax(mermaidCode: string): ValidationResult
  
  /** 获取支持的图表类型 */
  getSupportedTypes(): ChartType[]
  
  /** 修复常见语法错误 */
  autoFixSyntax(mermaidCode: string): string
}

export interface ConvertOptions {
  /** 插入位置 */
  position?: { x: number; y: number }
  /** 缩放比例 */
  scale?: number
  /** 主题样式 */
  theme?: 'default' | 'dark' | 'light'
  /** 字体设置 */
  fontSize?: number
}

export interface ConvertResult {
  /** 转换后的元素 */
  elements: ExcalidrawElement[]
  /** 相关文件 */
  files?: BinaryFiles
  /** 转换统计 */
  stats: {
    nodeCount: number
    edgeCount: number
    conversionTime: number
  }
}

export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息 */
  errors: Array<{
    line: number
    column: number
    message: string
    severity: 'error' | 'warning'
  }>
  /** 建议修复 */
  suggestions?: string[]
}
```

## 组件接口定义

### More Tools 菜单组件

```typescript
// src/components/MoreToolsMenu.tsx

export interface MoreToolsMenuProps {
  /** Excalidraw API 引用 */
  excalidrawAPI: ExcalidrawImperativeAPI
  /** 当前应用状态 */
  appState: AppState
  /** 选中元素变化回调 */
  onSelectionChange?: (elements: ExcalidrawElement[]) => void
  /** 菜单位置 */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface ToolMenuItem {
  id: string
  label: string
  icon: React.ComponentType
  disabled?: boolean
  visible?: boolean
  onClick: () => void
  shortcut?: string
  description?: string
}

export interface ToolMenuGroup {
  id: string
  label: string
  items: ToolMenuItem[]
  collapsed?: boolean
}
```

### 文本生成图表对话框

```typescript
// src/components/TextToChartDialog.tsx

export interface TextToChartDialogProps {
  /** 对话框是否打开 */
  isOpen: boolean
  /** 关闭对话框回调 */
  onClose: () => void
  /** 生成图表回调 */
  onGenerate: (request: ChartGenerationRequest) => void
  /** 当前AI配置 */
  aiConfig?: AIConfig
  /** 是否正在加载 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
}

export interface ChartTypeOption {
  value: ChartType
  label: string
  description: string
  icon: React.ComponentType
  example?: string
}

export interface TextInputState {
  value: string
  wordCount: number
  tokenEstimate: number
  valid: boolean
  errors: string[]
}
```

### 布局配置面板

```typescript
// src/components/LayoutConfigPanel.tsx

export interface LayoutConfigPanelProps {
  /** 当前选择的算法 */
  algorithm: LayoutAlgorithm
  /** 当前配置 */
  options: LayoutOptions
  /** 配置变化回调 */
  onOptionsChange: (options: LayoutOptions) => void
  /** 预览布局回调 */
  onPreview?: () => void
  /** 应用布局回调 */
  onApply: () => void
  /** 重置配置回调 */
  onReset: () => void
}

export interface ConfigControl {
  key: keyof LayoutOptions
  type: 'slider' | 'select' | 'checkbox' | 'input'
  label: string
  min?: number
  max?: number
  step?: number
  options?: Array<{ value: any; label: string }>
  description?: string
}
```

## Store 接口定义

### AI 配置状态管理

```typescript
// src/stores/ai-config-store.ts

export interface AIConfigState {
  /** 当前配置 */
  config: AIConfig
  /** 可用的供应商 */
  providers: AIProvider[]
  /** 当前选择的供应商 */
  currentProvider: string
  /** 配置是否有效 */
  isValid: boolean
  /** 最后验证时间 */
  lastValidated?: Date
}

export interface AIConfigActions {
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
}

export type AIConfigStore = AIConfigState & AIConfigActions
```

### 布局状态管理

```typescript
// src/stores/layout-store.ts

export interface LayoutState {
  /** 可用算法列表 */
  algorithms: LayoutAlgorithm[]
  /** 当前选择的算法 */
  currentAlgorithm?: string
  /** 当前布局选项 */
  options: LayoutOptions
  /** 是否正在执行布局 */
  isExecuting: boolean
  /** 最后执行结果 */
  lastResult?: LayoutResult
  /** 历史记录 */
  history: Array<{
    timestamp: Date
    algorithmId: string
    options: LayoutOptions
    result: LayoutResult
  }>
}

export interface LayoutActions {
  /** 设置当前算法 */
  setCurrentAlgorithm: (algorithmId: string) => void
  /** 更新布局选项 */
  updateOptions: (options: Partial<LayoutOptions>) => void
  /** 执行布局 */
  executeLayout: (elements: ExcalidrawElement[]) => Promise<LayoutResult>
  /** 撤销上次布局 */
  undoLayout: () => void
  /** 清除历史记录 */
  clearHistory: () => void
}

export type LayoutStore = LayoutState & LayoutActions
```

## 错误处理接口

```typescript
// src/types/errors.ts

export interface AppError extends Error {
  code: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'layout' | 'ai' | 'ui' | 'data' | 'network'
  retryable: boolean
  userMessage: string
  technicalMessage: string
  context?: Record<string, any>
}

export interface ErrorHandler {
  handle: (error: AppError) => void
  canHandle: (error: Error) => boolean
}

export interface ErrorReporter {
  report: (error: AppError, context?: Record<string, any>) => void
}
```

## 事件系统接口

```typescript
// src/types/events.ts

export interface LayoutEvent {
  type: 'layout:start' | 'layout:progress' | 'layout:complete' | 'layout:error'
  payload: {
    algorithmId: string
    elementCount: number
    progress?: number
    result?: LayoutResult
    error?: AppError
  }
  timestamp: Date
}

export interface AIEvent {
  type: 'ai:request' | 'ai:response' | 'ai:error' | 'ai:cancel'
  payload: {
    requestId: string
    chartType?: ChartType
    tokensUsed?: number
    response?: ChartGenerationResponse
    error?: AIError
  }
  timestamp: Date
}

export interface EventBus {
  emit<T extends LayoutEvent | AIEvent>(event: T): void
  on<T extends LayoutEvent | AIEvent>(
    eventType: T['type'], 
    handler: (event: T) => void
  ): () => void
  off(eventType: string, handler: Function): void
}
```

## 配置接口

```typescript
// src/types/config.ts

export interface AppConfig {
  /** 布局相关配置 */
  layout: {
    defaultSpacing: number
    maxElements: number
    enablePreview: boolean
    animationEnabled: boolean
  }
  
  /** AI相关配置 */
  ai: {
    defaultProvider: string
    maxTokens: number
    timeout: number
    enableCaching: boolean
    cacheExpiration: number
  }
  
  /** UI相关配置 */
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: 'zh' | 'en'
    showTooltips: boolean
    confirmDestructiveActions: boolean
  }
  
  /** 性能相关配置 */
  performance: {
    maxUndoSteps: number
    debounceDelay: number
    workerEnabled: boolean
    batchSize: number
  }
}
```