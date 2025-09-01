# ExcaliApp 自动格式化功能技术规格

## 功能概述

为 ExcaliApp 添加三个核心功能来提升用户绘图体验：
1. **一键美化布局** - 自动整理和优化图形元素的排列
2. **文本生成图表** - 通过AI将自然语言转换为可视化图表
3. **国际化支持** - 支持中文/英文界面切换，提供本地化体验

## 目标用户

所有使用 ExcaliApp 进行绘图的用户，包括：
- 初学者：解决图形不整齐的问题
- 专业用户：节省手动调整布局的时间
- 效率用户：快速将想法转化为可视化图表

## 功能规格

### 1. 一键美化布局

#### 功能描述
用户选择画布中的元素后，通过 More Tools 菜单选择布局算法，自动优化元素位置和排列。

#### 支持的布局类型
- **网格对齐**：将元素对齐到网格，消除微小偏差
- **智能分组**：识别相关元素并进行分组排列
- **流程图优化**：
  - 垂直流程：适合上下流向的流程图
  - 水平流程：适合左右流向的流程图

#### 交互流程
1. 用户选择一个或多个元素
2. 点击顶部工具栏 "More Tools" 下拉菜单
3. 选择具体的布局算法
4. 系统自动调整元素位置
5. 如有错误，通过 CustomDialog 组件显示错误信息

### 2. 文本生成图表

#### 功能描述
用户输入自然语言描述，AI自动生成对应的 Mermaid 图表并转换为 Excalidraw 元素。

#### 支持的图表类型（优先级排序）
1. **流程图 (flowchart)** - 最常用，优先实现
2. **序列图 (sequenceDiagram)** - 交互流程展示

#### 交互流程
1. 点击 More Tools → "文本生成图表"
2. 弹出对话框（基于 CustomDialog 扩展）
3. 用户输入文本描述
4. 选择图表类型
5. 点击"生成"按钮
6. AI处理并生成图表元素
7. 在当前画布位置插入新图表

#### AI配置管理
- 配置存储在应用设置中
- 支持 OpenAI 兼容 API
- 配置项：
  - Base URL（默认：https://api.openai.com/v1）
  - API Key
  - 模型选择（gpt-4, gpt-3.5-turbo等）
  - 温度参数（默认：0.7）
  - 超时设置（默认：30秒）
  - 最大Token数（默认：2000）

### 3. 国际化支持

#### 功能描述
提供中文和英文两种界面语言，包括菜单、按钮、提示信息、错误消息等的本地化显示。

#### 支持范围
- **UI界面**：所有菜单项、按钮、标签文字
- **消息提示**：成功、错误、警告等状态消息
- **对话框**：确认对话框、配置对话框的文字内容
- **AI提示词**：根据语言设置调整AI生成图表的提示模板
- **布局算法名称**：算法显示名称的多语言支持

#### 交互流程
1. 在应用设置中提供语言切换选项
2. 支持系统语言自动检测
3. 语言切换后界面实时更新
4. AI生成图表时使用对应语言的提示模板

## 技术架构

### 核心依赖
```json
{
  "@excalidraw/mermaid-to-excalidraw": "^2.0.0",
  "mermaid": "^10.0.0",
  "react-i18next": "^13.0.0",
  "i18next": "^23.0.0",
  "i18next-browser-languagedetector": "^7.0.0"
}
```

### 目录结构
```
src/
├── components/
│   ├── CustomDialog.tsx          # 已存在，复用扩展
│   ├── TextToChartDialog.tsx     # 新增：文本生成图表弹窗
│   └── MoreToolsMenu.tsx         # 新增：More Tools 菜单组件
├── services/
│   ├── layout-algorithms.ts      # 新增：布局算法实现
│   ├── ai-service.ts            # 新增：AI API 调用服务
│   └── mermaid-converter.ts     # 新增：Mermaid转换服务
├── types/
│   ├── ai-config.ts             # 新增：AI配置类型定义
│   └── layout.ts                # 新增：布局相关类型
├── stores/
│   └── ai-config-store.ts       # 新增：AI配置状态管理
├── locales/
│   ├── zh.json                  # 新增：中文语言包
│   ├── en.json                  # 新增：英文语言包
│   └── index.ts                 # 新增：国际化配置
└── i18n/
    └── config.ts                # 新增：i18next配置文件
```

### 关键技术选型

#### 布局算法实现
```typescript
interface LayoutAlgorithm {
  name: string
  description: string
  apply: (elements: ExcalidrawElement[]) => ExcalidrawElement[]
}

// 网格对齐算法
function gridAlign(elements: ExcalidrawElement[], options: {
  spacing: number
  snapToGrid: boolean
}): ExcalidrawElement[]

// 智能分组算法  
function smartGroup(elements: ExcalidrawElement[], options: {
  groupDistance: number
  alignGroups: boolean
}): ExcalidrawElement[]

// 流程优化算法
function flowOptimize(elements: ExcalidrawElement[], options: {
  direction: "vertical" | "horizontal"
  spacing: number
}): ExcalidrawElement[]
```

#### AI服务架构
```typescript
interface AIService {
  generateMermaidChart(
    text: string, 
    chartType: 'flowchart' | 'sequenceDiagram',
    config: AIConfig
  ): Promise<string>
}

// 错误处理
interface AIError {
  type: 'network' | 'api' | 'parsing' | 'timeout'
  message: string
  retryable: boolean
}
```

#### 国际化技术架构
```typescript
// i18n配置
interface I18nConfig {
  lng: 'zh' | 'en'
  fallbackLng: 'zh'
  detection: {
    order: ['localStorage', 'navigator']
  }
  resources: {
    zh: { translation: zhTranslations }
    en: { translation: enTranslations }
  }
}

// AI提示词国际化
interface LocalizedPrompts {
  flowchart: {
    zh: string
    en: string
  }
  sequenceDiagram: {
    zh: string
    en: string
  }
}
```

#### Excalidraw集成点
- 使用 `getSceneElements()` 获取选中元素
- 使用 `updateScene()` 批量更新元素位置
- 使用 `convertToExcalidrawElements()` 生成新图表元素
- 通过 Excalidraw children components 扩展 More Tools 菜单

## 开发阶段规划

### Phase 1 - 基础布局功能 (1-2周)
**目标**：实现网格对齐和 More Tools 菜单集成
- [ ] 创建 MoreToolsMenu 组件
- [ ] 实现网格对齐算法
- [ ] 集成到 Excalidraw More Tools
- [ ] 错误处理（复用 CustomDialog）
- [ ] 基础测试

### Phase 2 - 智能布局扩展 (1-2周)
**目标**：添加智能分组和流程优化算法
- [ ] 实现智能分组算法
- [ ] 实现流程图优化（垂直/水平）
- [ ] 添加用户配置选项
- [ ] 性能优化（大画布处理）

### Phase 3 - AI图表生成 (2-3周)
**目标**：完整的 Text to Chart 功能
- [ ] 设计 AI 配置管理界面
- [ ] 创建 TextToChartDialog 组件
- [ ] 实现 AI 服务调用
- [ ] 集成 mermaid-to-excalidraw
- [ ] 支持 flowchart 和 sequenceDiagram
- [ ] 加载状态和错误处理

### Phase 4 - 国际化实现 (1周)
**目标**：完整的中英文界面支持
- [ ] 配置 i18next 和相关依赖
- [ ] 创建中英文语言包文件
- [ ] 实现语言切换功能
- [ ] 本地化所有UI组件文字
- [ ] AI提示词多语言适配
- [ ] 系统语言自动检测

## 技术风险评估

### 低风险 ✅
- Excalidraw API 成熟稳定，文档完善
- 布局算法有现成的数学模型可参考
- CustomDialog 组件已经存在，可直接复用

### 中等风险 ⚠️
- More Tools 菜单定制：需要深入研究 Excalidraw 的扩展机制
- AI API 调用的网络稳定性和响应时间
- 大量元素（>100个）的布局性能优化

### 成本估算
- **开发时间**：5-8周（增加国际化阶段）
- **AI API成本**：按使用量付费，可通过配置控制
- **维护成本**：低，主要是算法微调、错误处理和翻译更新

## 关键决策点

1. **布局算法选择优先级**：网格对齐 → 智能分组 → 流程优化
2. **AI集成方案**：通过 Mermaid 中间层实现（降低复杂度）
3. **错误处理策略**：统一使用 CustomDialog，提供重试机制
4. **性能策略**：超过100个元素时显示确认对话框

## 后续行动

规格确认后，将开始详细的技术实现计划，包括：
- 具体的代码架构设计
- API接口定义
- 组件设计稿
- 测试策略
- 部署方案