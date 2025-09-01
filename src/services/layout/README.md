# Advanced Layout Service for ExcaliApp

A comprehensive layout algorithm system for intelligent arrangement of Excalidraw elements. This service provides production-ready layout algorithms with advanced features like clustering, flow analysis, and performance optimization.

## Features

### 🎯 Core Algorithms

1. **Grid Alignment** - Snap elements to virtual grid with position optimization
2. **Smart Grouping** - AI-powered clustering using K-means and DBSCAN
3. **Vertical Flow** - Hierarchical layout with arrow connection analysis
4. **Horizontal Flow** - Timeline and process flow arrangement

### 🚀 Advanced Capabilities

- **Graph-based Flow Analysis** - Automatic detection of arrow connections
- **Clustering Algorithms** - K-means and DBSCAN for intelligent grouping
- **Performance Optimization** - O(n log n) complexity with < 1s execution time
- **Edge Case Handling** - Robust error handling and validation
- **Layout Suggestion AI** - Automatic algorithm selection based on element analysis

## Architecture

```
src/services/layout/
├── LayoutService.ts          # Main orchestration service
├── algorithms/               # Core layout algorithms
│   ├── GridAlignAlgorithm.ts
│   ├── SmartGroupAlgorithm.ts
│   ├── VerticalFlowAlgorithm.ts
│   └── HorizontalFlowAlgorithm.ts
├── utils/                    # Mathematical and geometric utilities
│   ├── geometry.ts           # 2D geometry calculations
│   ├── clustering.ts         # K-means and DBSCAN implementations
│   └── graph.ts             # Flow graph analysis
├── types.ts                  # TypeScript interfaces
└── examples.ts              # Usage examples and demos
```

## Quick Start

### Basic Usage

```typescript
import { layoutService } from '@/services/layout'

// Grid alignment
const result = await layoutService.gridAlign(selectedElements, {
  gridSize: 20,
  preserveRelativePositions: true,
  minimizeMovement: true
})

// Smart grouping with clustering
const groupResult = await layoutService.smartGroup(selectedElements, {
  maxDistance: 150,
  algorithm: 'kmeans',
  minClusterSize: 2,
  considerElementTypes: true
})

// Vertical flow for processes
const flowResult = await layoutService.verticalFlow(selectedElements, {
  spacing: 80,
  alignment: 'center',
  preserveFirstElement: true
})
```

### Advanced Features

```typescript
// AI-powered layout suggestion
const suggestion = await layoutService.suggestLayout(elements)
console.log(`Recommended: ${suggestion.primary} (${suggestion.confidence}% confidence)`)

// Multi-algorithm optimization
const optimized = await layoutService.optimizeLayout(elements)
console.log(`Best result from: ${optimized.algorithm}`)

// Performance monitoring
const stats = layoutService.getPerformanceStatistics()
console.log(`Grid align average: ${stats.gridAlign.averageExecutionTime}ms`)
```

## Algorithm Details

### Grid Alignment
- **Complexity**: O(n) - Linear time
- **Features**: Position preservation, movement minimization
- **Use Cases**: Cleaning up scattered elements, alignment to design grids

### Smart Grouping  
- **Complexity**: O(n²) worst case, optimized to O(n log n)
- **Algorithms**: K-means clustering, DBSCAN density-based clustering
- **Features**: Type similarity, spatial density analysis
- **Use Cases**: Organizing related UI components, grouping diagram elements

### Vertical Flow
- **Complexity**: O(n log n) - Graph-based layout
- **Features**: Arrow connection analysis, hierarchical levels, crossing minimization  
- **Use Cases**: Process diagrams, flowcharts, organizational charts

### Horizontal Flow
- **Complexity**: O(n log n) - Timeline optimization
- **Features**: Sequential arrangement, arrow flow analysis
- **Use Cases**: Timelines, pipeline diagrams, workflow visualization

## Performance Targets

- **Startup**: < 1 second initialization
- **Small datasets** (< 20 elements): < 100ms execution
- **Medium datasets** (20-100 elements): < 500ms execution  
- **Large datasets** (100+ elements): < 1000ms execution
- **Memory usage**: < 50MB for typical operations

## Configuration Options

### Grid Alignment Config
```typescript
interface GridAlignConfig {
  gridSize: number                    // Grid spacing (default: 20)
  preserveRelativePositions: boolean  // Maintain element relationships
  minimizeMovement: boolean          // Optimize for minimal displacement
}
```

### Smart Grouping Config
```typescript
interface SmartGroupConfig {
  maxDistance: number              // Maximum clustering distance
  algorithm: 'kmeans' | 'dbscan'  // Clustering algorithm choice
  minClusterSize: number          // Minimum elements per group
  considerElementTypes: boolean   // Factor in element type similarity
}
```

### Flow Config
```typescript
interface FlowConfig {
  spacing: number                           // Element spacing
  alignment: 'start' | 'center' | 'end'   // Cross-axis alignment
  preserveFirstElement: boolean            // Keep reference element fixed
  distributeEvenly: boolean               // Even spacing vs. proportional
}
```

## Error Handling

The service provides comprehensive error handling:

- **Input Validation** - Type checking and boundary validation
- **Graceful Degradation** - Fallback to simpler algorithms when needed
- **Performance Monitoring** - Automatic performance warnings and metrics
- **Detailed Error Messages** - Clear feedback for debugging

## Testing

Comprehensive test suite with 35+ test cases covering:

- Algorithm correctness
- Performance benchmarks  
- Edge case handling
- Error recovery
- Configuration validation

```bash
npm run test -- src/services/layout
```

## Integration with ExcaliApp

The layout service is integrated with the existing ExcaliApp toolbar:

```typescript
// In useLayoutTools hook
import { layoutService } from '@/services/layout'

const gridAlign = useCallback(async () => {
  const result = await layoutService.gridAlign(selectedElements, config)
  if (result.success) {
    excalidrawAPI.updateScene({ elements: result.elements })
  }
}, [selectedElements, excalidrawAPI])
```

## Performance Monitoring

Built-in performance monitoring provides insights:

```typescript
const stats = layoutService.getPerformanceStatistics()
// Returns metrics for each algorithm:
// - totalExecutions, averageExecutionTime
// - successRate, performanceGrade
// - elementCount averages
```

## Future Enhancements

- **Machine Learning** - Pattern recognition for layout suggestions
- **Undo/Redo Integration** - Command pattern for operation history
- **Animation Support** - Smooth transitions during layout changes
- **Custom Algorithms** - Plugin system for user-defined layouts
- **Cloud Processing** - Offload complex operations for large datasets

## Contributing

The layout service follows clean architecture principles:

1. **Algorithms** - Pure functions with clear interfaces
2. **Utilities** - Reusable mathematical operations
3. **Service Layer** - Orchestration and performance monitoring
4. **Type Safety** - Comprehensive TypeScript interfaces

When adding new algorithms:
1. Implement `LayoutAlgorithm` interface
2. Add comprehensive tests
3. Include performance benchmarks
4. Document configuration options
5. Update examples and README