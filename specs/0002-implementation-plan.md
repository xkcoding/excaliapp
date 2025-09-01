# ExcaliApp 自动格式化功能实现计划

## Phase 1: 基础布局功能 (1-2周)

### 任务分解

#### 1.1 环境准备和依赖管理
- [ ] **安装布局算法依赖**
  - 研究和选择适合的图形布局库（如 dagre, cytoscape 等）
  - 更新 package.json 依赖配置

#### 1.2 核心类型定义
- [ ] **创建布局相关类型** (`src/types/layout.ts`)
  ```typescript
  export interface LayoutAlgorithm {
    id: string
    name: string
    description: string
    icon: string
    apply: (elements: ExcalidrawElement[]) => ExcalidrawElement[]
  }

  export interface LayoutOptions {
    spacing?: number
    alignment?: 'left' | 'center' | 'right'
    direction?: 'vertical' | 'horizontal'
    snapToGrid?: boolean
  }
  ```

#### 1.3 布局算法实现
- [ ] **网格对齐算法** (`src/services/layout-algorithms.ts`)
  ```typescript
  export function gridAlign(
    elements: ExcalidrawElement[], 
    options: { spacing: number; snapToGrid: boolean }
  ): ExcalidrawElement[]
  ```
  - 计算元素边界框
  - 按网格规则重新排列位置
  - 保持相对关系不变

#### 1.4 More Tools 菜单集成
- [ ] **创建 MoreToolsMenu 组件** (`src/components/MoreToolsMenu.tsx`)
  - 研究 Excalidraw 自定义菜单扩展方法
  - 实现下拉菜单 UI
  - 处理菜单项点击事件

#### 1.5 主应用集成
- [ ] **修改 App.tsx**
  - 集成 MoreToolsMenu 到 Excalidraw 组件
  - 处理元素选择状态
  - 实现布局算法调用

#### 1.6 错误处理和用户反馈
- [ ] **扩展 CustomDialog**
  - 添加加载状态显示
  - 实现操作确认对话框
  - 错误信息展示

### 技术要点

#### Excalidraw API 集成
```typescript
// 获取选中元素
const selectedElements = excalidrawAPI.getSceneElements()
  .filter(el => appState.selectedElementIds.has(el.id))

// 应用布局算法
const layoutedElements = gridAlign(selectedElements, { spacing: 20, snapToGrid: true })

// 更新场景
excalidrawAPI.updateScene({
  elements: excalidrawAPI.getSceneElements().map(el => 
    selectedElementIds.has(el.id) 
      ? layoutedElements.find(le => le.id === el.id) || el
      : el
  )
})
```

#### 性能优化策略
- 元素数量超过100个时显示确认对话框
- 大量元素时使用 Web Worker 进行布局计算
- 实现操作撤销/重做支持

## Phase 2: 智能布局扩展 (1-2周)

### 任务分解

#### 2.1 智能分组算法
- [ ] **群体检测算法** (`src/services/clustering.ts`)
  ```typescript
  export function detectGroups(
    elements: ExcalidrawElement[],
    options: { maxDistance: number; minGroupSize: number }
  ): ExcalidrawElement[][]
  ```
  - 使用K-means或DBSCAN算法
  - 基于元素距离和类型进行聚类

#### 2.2 流程图优化算法
- [ ] **有向图布局** (`src/services/flow-layout.ts`)
  ```typescript
  export function flowOptimize(
    elements: ExcalidrawElement[],
    options: { direction: 'vertical' | 'horizontal'; spacing: number }
  ): ExcalidrawElement[]
  ```
  - 识别箭头连接关系
  - 应用分层布局算法（如 Sugiyama）
  - 优化连线长度和交叉

#### 2.3 用户配置选项
- [ ] **布局配置面板** (`src/components/LayoutConfigPanel.tsx`)
  - 间距调整滑块
  - 对齐方式选择
  - 实时预览功能

#### 2.4 高级功能
- [ ] **布局预览模式**
  - 显示布局前后对比
  - 提供取消/确认选项
- [ ] **自定义布局模板**
  - 保存常用布局配置
  - 快速应用预设

### 算法复杂度考虑
- 网格对齐：O(n) - 线性复杂度
- 智能分组：O(n²) - 需要计算距离矩阵
- 流程优化：O(n log n) - 图算法复杂度

## Phase 3: AI图表生成 (2-3周)

### 任务分解

#### 3.1 AI配置管理
- [ ] **AI配置类型定义** (`src/types/ai-config.ts`)
  ```typescript
  export interface AIConfig {
    baseUrl: string
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    timeout: number
  }
  ```

- [ ] **配置存储服务** (`src/stores/ai-config-store.ts`)
  - 使用 Tauri Store API 持久化配置
  - API Key 加密存储
  - 配置校验和默认值

#### 3.2 AI服务实现
- [ ] **OpenAI兼容API客户端** (`src/services/ai-service.ts`)
  ```typescript
  export class AIService {
    async generateMermaidChart(
      text: string,
      chartType: 'flowchart' | 'sequenceDiagram',
      config: AIConfig
    ): Promise<{ mermaidCode: string; explanation?: string }>
    
    async validateApiKey(config: AIConfig): Promise<boolean>
  }
  ```

#### 3.3 Mermaid集成
- [ ] **Mermaid转换服务** (`src/services/mermaid-converter.ts`)
  ```typescript
  import { parseMermaidToExcalidraw, convertToExcalidrawElements } from '@excalidraw/mermaid-to-excalidraw'
  
  export async function convertMermaidToExcalidraw(
    mermaidCode: string
  ): Promise<{ elements: ExcalidrawElement[]; files: BinaryFiles }>
  ```

#### 3.4 文本生成图表弹窗
- [ ] **TextToChartDialog 组件** (`src/components/TextToChartDialog.tsx`)
  - 基于 CustomDialog 扩展
  - 多行文本输入区域
  - 图表类型选择器
  - 实时字数统计
  - AI配置快捷入口

#### 3.5 提示词工程
- [ ] **AI提示词模板** (`src/prompts/chart-generation.ts`)
  ```typescript
  export const FLOWCHART_PROMPT = `
  Convert the following description into a Mermaid flowchart syntax:
  Description: {userInput}
  
  Requirements:
  - Use standard Mermaid flowchart syntax
  - Include proper node shapes and connections
  - Add labels for clarity
  - Keep it simple and readable
  
  Output only the Mermaid code without explanation.
  `
  ```

### AI功能增强
- [ ] **智能错误处理**
  - API调用失败重试机制
  - Mermaid语法错误自动修复
  - 用户友好的错误提示

- [ ] **结果优化**
  - 生成结果的后处理
  - 图表美化建议
  - 一键应用布局算法

## 通用技术考虑

### 代码质量保证
- [ ] **TypeScript严格模式**
  - 启用所有严格检查
  - 完善的类型定义
  - 无any类型使用

- [ ] **错误边界处理**
  ```typescript
  export class LayoutErrorBoundary extends Component {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      console.error('Layout error:', error, errorInfo)
      // 发送错误报告到监控系统
    }
  }
  ```

### 性能优化
- [ ] **懒加载策略**
  - AI服务按需加载
  - 大型布局算法库动态导入
  - Mermaid依赖延迟加载

- [ ] **缓存机制**
  - AI生成结果缓存
  - 布局计算结果缓存
  - 用户配置本地缓存

### 用户体验
- [ ] **国际化支持**
  - 中英文界面切换
  - 错误信息本地化
  - AI提示词多语言

- [ ] **无障碍访问**
  - 键盘快捷键支持
  - 屏幕阅读器兼容
  - 高对比度模式

## 测试策略

### 单元测试
- [ ] 布局算法纯函数测试
- [ ] AI服务API调用测试
- [ ] Mermaid转换功能测试

### 集成测试
- [ ] Excalidraw组件集成测试
- [ ] 用户交互流程测试
- [ ] 错误场景处理测试

### 用户测试
- [ ] 可用性测试方案
- [ ] 性能基准测试
- [ ] 不同用户群体反馈收集

## 部署和发布

### 构建优化
- [ ] **Bundle分析**
  - 识别大型依赖包
  - 按需加载优化
  - Tree shaking配置

### 发布流程
- [ ] **渐进式发布**
  - Feature flags控制新功能
  - A/B测试框架
  - 回滚机制准备

### 监控和日志
- [ ] **用户行为分析**
  - 功能使用频率统计
  - 错误率监控
  - 性能指标收集

## 风险缓解策略

### 技术风险
- **Excalidraw API变更**：锁定版本，关注官方更新
- **AI API限制**：实现多供应商支持，本地fallback
- **性能问题**：分阶段测试，设置合理限制

### 产品风险
- **用户接受度**：早期用户反馈，迭代改进
- **功能复杂度**：MVP优先，逐步增加功能
- **维护成本**：自动化测试，文档完善

## 后续行动

1. **立即开始 Phase 1 开发**
2. **设置开发环境和工具链**
3. **创建项目看板跟踪进度**
4. **建立代码审查流程**
5. **准备用户反馈收集机制**