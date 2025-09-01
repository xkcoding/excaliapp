# 0003 - 智能自动布局功能技术规格

## 概述

为OwnExcaliDesk实现智能自动布局功能，基于用户角色和图表类型智能选择最优布局算法，提供一键式布局优化体验。

## 用户角色分析

### 目标用户群体
- **程序员 (60%)** - 技术图表：系统架构图、数据流图、类图
- **产品经理 (30%)** - 业务流程：用户流程图、业务架构图、概念图  
- **其他角色 (10%)** - 创意表达：思维导图、混合内容

## 功能需求

### 核心特性
1. **智能算法选择** - 基于元素分析自动选择最佳布局算法
2. **仅处理选中元素** - 不影响未选中的画布内容
3. **一次成功策略** - 避免重试导致的布局混乱
4. **快捷键支持** - Cmd/Ctrl+Shift+L 快速布局

### 交互方式
- **主要交互**: 选择元素 → 点击"自动布局"按钮或使用快捷键
- **撤销支持**: 不满意结果可使用Cmd/Ctrl+Z撤销
- **零学习成本**: 无需用户了解算法细节

## 技术架构

### 依赖选择
- **elkjs** - 成熟的图布局引擎，提供6种布局算法
- **复用原则** - 避免重复造轮子，使用业界标准

### 布局算法映射

| 图表类型 | 识别特征 | elkjs算法 | 参数配置 |
|---------|---------|-----------|----------|
| 程序架构图 | 大量框图(>5)，箭头较少(框/箭头比>3) | Box (rectPacking) | spacing: {x:120, y:100} |
| 业务流程图 | 决策节点，线性流程，中等连接 | Layered(DOWN) | spacing: {x:100, y:60} |
| 时序图 | 水平参与者，垂直消息流 | Layered(RIGHT) | spacing: {x:150, y:80} |
| 类图 | 类结构，继承关系 | MrTree | hierarchical layout |
| 复杂网状图 | 高连接密度(>2) | Stress | force-based layout |
| 通用场景 | 无明确模式 | 智能网格 | 均匀分布 |

### 智能识别逻辑

```typescript
interface LayoutAnalysisResult {
  algorithm: 'box' | 'layered' | 'mrtree' | 'stress' | 'grid'
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  spacing: { x: number; y: number }
  preserveGroups: boolean
}

function analyzeLayoutPattern(
  elements: ExcalidrawElement[], 
  connections: Connection[]
): LayoutAnalysisResult {
  const boxCount = elements.filter(el => el.type === 'rectangle').length
  const arrowCount = connections.length
  const boxToArrowRatio = arrowCount > 0 ? boxCount / arrowCount : boxCount
  
  // 程序架构图：大量框图，箭头较少
  if (boxToArrowRatio > 3 && boxCount > 5) {
    return {
      algorithm: 'box',
      spacing: { x: 120, y: 100 },
      preserveGroups: true
    }
  }
  
  // 时序图：参与者水平排列，消息垂直流动
  if (hasHorizontalActors(elements) && hasVerticalMessages(connections)) {
    return {
      algorithm: 'layered',
      direction: 'RIGHT',
      spacing: { x: 150, y: 80 },
      preserveGroups: false
    }
  }
  
  // 类图：继承层次结构
  if (hasClassStructure(elements) && hasInheritanceConnections(connections)) {
    return {
      algorithm: 'mrtree',
      direction: 'DOWN',
      spacing: { x: 100, y: 120 },
      preserveGroups: true
    }
  }
  
  // 复杂网状图：高连接密度
  const connectionDensity = connections.length / elements.length
  if (connectionDensity > 2) {
    return {
      algorithm: 'stress',
      spacing: { x: 100, y: 100 },
      preserveGroups: false
    }
  }
  
  // 业务流程图：决策流程
  if (hasDecisionNodes(elements) && hasLinearFlow(connections)) {
    return {
      algorithm: 'layered',
      direction: 'DOWN',
      spacing: { x: 100, y: 60 },
      preserveGroups: true
    }
  }
  
  // 默认：智能网格布局
  return {
    algorithm: 'grid',
    spacing: { x: 80, y: 80 },
    preserveGroups: true
  }
}
```

## 实现计划

### Phase 1: 基础设施
1. 安装elkjs依赖
2. 创建LayoutService智能分析服务
3. 实现算法选择逻辑

### Phase 2: 核心功能  
1. 替换现有autoLayout实现
2. 集成elkjs布局引擎
3. 实现智能识别算法

### Phase 3: 用户体验
1. 添加快捷键支持 (Cmd/Ctrl+Shift+L)
2. 性能优化 (目标<500ms)
3. 错误处理和用户反馈

## 技术实现

### 目录结构
```
src/services/layout/
├── LayoutService.ts          # 主服务类
├── algorithms/               # 算法实现
│   ├── ArchitectureLayout.ts # 架构图布局
│   ├── FlowchartLayout.ts    # 流程图布局
│   ├── SequenceLayout.ts     # 时序图布局
│   └── SmartGrid.ts          # 智能网格
├── analysis/                 # 智能分析
│   ├── PatternDetector.ts    # 模式识别
│   └── ElementAnalyzer.ts    # 元素分析
└── types/                    # 类型定义
    └── layout.ts             # 布局相关类型
```

### 关键接口

```typescript
interface LayoutService {
  /**
   * 智能布局优化 - 一次成功策略
   */
  optimizeLayout(elements: ExcalidrawElement[]): Promise<LayoutResult>
  
  /**
   * 支持的算法
   */
  getSupportedAlgorithms(): LayoutAlgorithm[]
}

interface LayoutResult {
  success: boolean
  algorithm: string
  elements: Array<{id: string, x: number, y: number}>
  metadata: {
    executionTime: number
    transformations: number
    confidence: number
  }
  message?: string
}
```

## 性能目标

- **执行时间**: <500ms (选中元素<50个)
- **准确率**: >85% 算法选择准确性
- **用户满意度**: >90% 一次布局成功率

## 风险评估

### 技术风险
- **算法准确性** - 可能误判图表类型 
  - 缓解：提高识别算法精度，完善兜底策略
- **性能问题** - 大量元素布局可能耗时
  - 缓解：异步处理，进度提示

### 用户体验风险  
- **布局结果不理想** - 用户期望与算法结果不符
  - 缓解：支持撤销，提高算法准确性
- **学习成本** - 用户需要理解何时使用
  - 缓解：智能化程度高，减少用户决策

## 成功指标

### 技术指标
- 算法识别准确率 ≥85%
- 布局执行时间 ≤500ms  
- 支持元素数量 ≤100个

### 用户指标
- 功能使用频率（月活跃用户使用次数）
- 撤销率 ≤15%（布局结果满意度指标）
- 用户反馈评分 ≥4.5/5

## 参考实现

基于Obsidian Excalidraw插件的Auto Layout功能，采用elkjs作为核心布局引擎，但简化用户交互，提高智能化程度。

### 与参考实现的差异
- **简化交互** - 智能选择 vs 手动选择算法
- **目标用户** - 程序员/产品经理 vs 知识工作者
- **一次成功** - 避免重试机制

---

*文档版本: v1.0*  
*创建日期: 2025-08-31*  
*负责人: Claude Code*