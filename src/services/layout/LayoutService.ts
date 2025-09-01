/**
 * Intelligent Layout Analysis Service
 * Analyzes diagram patterns and selects optimal layout algorithms
 */

import ELK from 'elkjs'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types'
import type {
  ElkNode as ElkJsNode,
  ElkExtendedEdge,
  LayoutOptions as ElkJsLayoutOptions
} from 'elkjs'
import type { 
  LayoutAnalysisResult, 
  LayoutResult, 
  ElementAnalysis, 
  Connection,
  ElkNode,
  ElkEdge,
  ElkLayoutOptions,
  LayoutAlgorithmType,
  LayoutDirection
} from '../../types/layout'

/**
 * Layout Service - Main intelligence service for auto-layout
 */
export class LayoutService {
  private elk: InstanceType<typeof ELK>

  constructor() {
    this.elk = new ELK()
  }

  /**
   * Smart layout optimization - one-shot strategy
   * Analyzes selected elements and applies the best layout algorithm
   */
  async optimizeLayout(elements: ExcalidrawElement[]): Promise<LayoutResult> {
    const startTime = performance.now()
    
    try {
      // Step 1: Extract connections from elements
      const connections = this.extractConnections(elements)
      
      // Step 2: Analyze pattern and select algorithm
      const analysis = this.analyzeLayoutPattern(elements, connections)
      
      // Step 3: Execute layout with selected algorithm
      const layoutResult = await this.executeLayout(elements, connections, analysis)
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      return {
        success: true,
        algorithm: analysis.algorithm,
        direction: analysis.direction,
        elements: layoutResult,
        metadata: {
          executionTime,
          transformations: layoutResult.length,
          confidence: analysis.confidence
        },
        reason: analysis.reason
      }
      
    } catch (error) {
      const endTime = performance.now()
      return {
        success: false,
        algorithm: 'unknown',
        elements: [],
        metadata: {
          executionTime: endTime - startTime,
          transformations: 0,
          confidence: 0
        },
        message: error instanceof Error ? error.message : 'Layout failed'
      }
    }
  }

  /**
   * Intelligent pattern analysis and algorithm selection
   * Based on element types, connections, and user role patterns
   */
  private analyzeLayoutPattern(
    elements: ExcalidrawElement[], 
    connections: Connection[]
  ): LayoutAnalysisResult {
    const analysis = this.analyzeElements(elements, connections)
    
    console.log('🔍 Layout Analysis:', {
      totalElements: analysis.totalElements,
      rectangleCount: analysis.rectangleCount,
      textCount: analysis.textCount,
      connectionCount: analysis.connectionCount,
      boxToArrowRatio: analysis.boxToArrowRatio,
      connectionDensity: analysis.connectionDensity,
      hasHorizontalActors: analysis.hasHorizontalActors,
      hasVerticalMessages: analysis.hasVerticalMessages,
      hasDecisionNodes: analysis.hasDecisionNodes,
      hasLinearFlow: analysis.hasLinearFlow
    })
    
    // Sequence diagrams: Strong pattern detection
    if (analysis.hasHorizontalActors && analysis.hasVerticalMessages) {
      return {
        algorithm: 'layered',
        direction: 'DOWN',
        spacing: { x: 150, y: 80 },
        preserveGroups: false,
        confidence: 0.95,
        reason: 'Detected sequence diagram: horizontal actors with vertical message flow'
      }
    }
    
    // Sequence diagrams: Alternative detection - lifeline pattern
    // Check for paired elements (actors at top/bottom) with vertical connections
    if (analysis.textCount >= 2 && analysis.rectangleCount >= 2 && analysis.connectionCount > 0) {
      const hasLifelinePattern = this.hasLifelinePattern(elements)
      if (hasLifelinePattern) {
        return {
          algorithm: 'layered',
          direction: 'DOWN',
          spacing: { x: 150, y: 80 },
          preserveGroups: false,
          confidence: 0.9,
          reason: 'Detected sequence diagram: lifeline pattern with actors'
        }
      }
    }
    
    // Sequence diagrams: Text-heavy with many connections (typical sequence diagram)
    if (analysis.textCount >= 2 && analysis.connectionCount >= 3 && 
        analysis.connectionCount >= analysis.textCount * 0.5) {
      return {
        algorithm: 'layered',
        direction: 'DOWN',
        spacing: { x: 150, y: 80 },
        preserveGroups: false,
        confidence: 0.85,
        reason: 'Detected sequence diagram: multiple actors with rich message flow'
      }
    }
    
    // Architecture diagrams: Many boxes, few arrows (exclude sequence diagrams)
    if (analysis.boxToArrowRatio > 3 && analysis.rectangleCount > 5 && 
        !analysis.hasHorizontalActors && analysis.connectionDensity < 1) {
      return {
        algorithm: 'box',
        spacing: { x: 120, y: 100 },
        preserveGroups: true,
        confidence: 0.9,
        reason: 'Detected architecture diagram: many components, few connections'
      }
    }
    
    // Class diagrams: Inheritance hierarchy
    if (analysis.hasClassStructure && analysis.hasInheritanceConnections) {
      return {
        algorithm: 'mrtree',
        direction: 'DOWN',
        spacing: { x: 100, y: 120 },
        preserveGroups: true,
        confidence: 0.8,
        reason: 'Detected class diagram: hierarchical inheritance structure'
      }
    }
    
    // Complex network diagrams: High connection density
    if (analysis.connectionDensity > 2) {
      return {
        algorithm: 'stress',
        spacing: { x: 100, y: 100 },
        preserveGroups: false,
        confidence: 0.75,
        reason: 'Detected complex network: high connection density'
      }
    }
    
    // Business flowcharts: Decision nodes and linear flow
    if (analysis.hasDecisionNodes && analysis.hasLinearFlow) {
      return {
        algorithm: 'layered',
        direction: 'DOWN',
        spacing: { x: 100, y: 60 },
        preserveGroups: true,
        confidence: 0.7,
        reason: 'Detected business flowchart: decision nodes with linear flow'
      }
    }
    
    // Default: Smart grid layout
    return {
      algorithm: 'grid',
      spacing: { x: 80, y: 80 },
      preserveGroups: true,
      confidence: 0.6,
      reason: 'Default smart grid: no specific pattern detected'
    }
  }

  /**
   * Analyze elements to detect patterns
   */
  private analyzeElements(elements: ExcalidrawElement[], connections: Connection[]): ElementAnalysis {
    const rectangleCount = elements.filter(el => el.type === 'rectangle').length
    const textCount = elements.filter(el => el.type === 'text').length
    const connectionCount = connections.length
    const boxToArrowRatio = connectionCount > 0 ? rectangleCount / connectionCount : rectangleCount
    const connectionDensity = elements.length > 0 ? connectionCount / elements.length : 0
    
    return {
      totalElements: elements.length,
      rectangleCount,
      textCount,
      connectionCount,
      boxToArrowRatio,
      connectionDensity,
      hasDecisionNodes: this.hasDecisionNodes(elements),
      hasLinearFlow: this.hasLinearFlow(connections),
      hasHorizontalActors: this.hasHorizontalActors(elements),
      hasVerticalMessages: this.hasVerticalMessages(connections),
      hasClassStructure: this.hasClassStructure(elements),
      hasInheritanceConnections: this.hasInheritanceConnections(connections)
    }
  }

  /**
   * Extract connections from arrow/line elements
   */
  private extractConnections(elements: ExcalidrawElement[]): Connection[] {
    return elements
      .filter(el => el.type === 'arrow' || el.type === 'line')
      .map(el => ({
        sourceId: el.startBinding?.elementId || '',
        targetId: el.endBinding?.elementId || '',
        type: el.type as 'arrow' | 'line',
        element: el
      }))
      .filter(conn => conn.sourceId && conn.targetId)
  }

  /**
   * Execute layout with selected algorithm using elkjs
   */
  async executeLayout(
    elements: ExcalidrawElement[],
    connections: Connection[],
    analysis: LayoutAnalysisResult
  ): Promise<Array<{ id: string; x: number; y: number }>> {
    
    // Convert elements to elkjs format
    const elkGraph = this.convertToElkFormat(elements, connections, analysis)
    
    // Execute layout with elkjs
    // @ts-ignore: Type compatibility with elkjs
    const layoutResult = await this.elk.layout(elkGraph)
    
    // Convert back to position updates
    // @ts-ignore: Type compatibility with elkjs
    return this.convertFromElkFormat(layoutResult, elements)
  }

  /**
   * Convert Excalidraw elements to elkjs graph format
   */
  private convertToElkFormat(
    elements: ExcalidrawElement[],
    connections: Connection[],
    analysis: LayoutAnalysisResult
  ): ElkNode {
    const layoutOptions: ElkLayoutOptions = {
      'elk.algorithm': this.getElkAlgorithmName(analysis.algorithm),
      'elk.spacing.nodeNode': analysis.spacing.x,
      'elk.spacing.edgeNode': analysis.spacing.y
    }

    if (analysis.direction) {
      layoutOptions['elk.direction'] = analysis.direction
    }

    // Add algorithm-specific options
    if (analysis.algorithm === 'layered') {
      layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = analysis.spacing.y
      layoutOptions['elk.layered.spacing.edgeNodeBetweenLayers'] = analysis.spacing.x
      // Improve symmetry for branching nodes
      layoutOptions['elk.layered.crossingMinimization.strategy'] = 'LAYER_SWEEP'
      layoutOptions['elk.layered.nodePlacement.strategy'] = 'BRANDES_KOEPF'
      layoutOptions['elk.layered.crossingMinimization.semiInteractive'] = true
      // Additional symmetry options
      layoutOptions['elk.layered.layering.strategy'] = 'LONGEST_PATH'
      layoutOptions['elk.layered.nodePlacement.favorStraightEdges'] = true
      layoutOptions['elk.layered.spacing.baseValue'] = 20
      layoutOptions['elk.layered.considerModelOrder.strategy'] = 'NODES_AND_EDGES'
    } else if (analysis.algorithm === 'box') {
      layoutOptions['elk.box.spacing'] = Math.min(analysis.spacing.x, analysis.spacing.y)
    } else if (analysis.algorithm === 'stress') {
      layoutOptions['elk.stress.spacing'] = Math.min(analysis.spacing.x, analysis.spacing.y)
    }

    // Convert elements to elkjs nodes (only layoutable elements)
    const children: ElkNode[] = elements
      .filter(el => el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond' || el.type === 'text')
      .map(el => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width || 100,
        height: el.height || 50
      }))

    // Convert connections to elkjs edges
    const edges: ElkEdge[] = connections.map((conn, index) => ({
      id: `edge-${index}`,
      sources: [conn.sourceId],
      targets: [conn.targetId]
    }))

    return {
      id: 'root',
      width: 0,
      height: 0,
      layoutOptions,
      children,
      edges
    }
  }

  /**
   * Convert elkjs result back to position updates
   */
  private convertFromElkFormat(
    layoutResult: ElkNode, 
    originalElements: ExcalidrawElement[]
  ): Array<{ id: string; x: number; y: number }> {
    const updates: Array<{ id: string; x: number; y: number }> = []
    
    if (layoutResult.children) {
      for (const child of layoutResult.children) {
        if (child.x !== undefined && child.y !== undefined) {
          updates.push({
            id: child.id,
            x: child.x,
            y: child.y
          })
        }
      }
    }
    
    return updates
  }

  /**
   * Get elkjs algorithm name from our algorithm enum
   */
  private getElkAlgorithmName(algorithm: LayoutAlgorithm): string {
    const mapping: Record<LayoutAlgorithm, string> = {
      'box': 'rectpacking',
      'layered': 'layered',
      'mrtree': 'mrtree', 
      'stress': 'stress',
      'grid': 'rectpacking' // Use rectpacking for grid-like layouts
    }
    return mapping[algorithm]
  }

  /**
   * Pattern detection methods
   */
  private hasDecisionNodes(elements: ExcalidrawElement[]): boolean {
    return elements.some(el => 
      el.type === 'diamond' || 
      (el.type === 'text' && typeof el.text === 'string' && 
       /(\?|if|else|yes|no|true|false)/i.test(el.text))
    )
  }

  private hasLinearFlow(connections: Connection[]): boolean {
    if (connections.length < 2) return false
    
    // Simple heuristic: most connections should be in a chain
    const nodeConnections = new Map<string, number>()
    connections.forEach(conn => {
      nodeConnections.set(conn.sourceId, (nodeConnections.get(conn.sourceId) || 0) + 1)
      nodeConnections.set(conn.targetId, (nodeConnections.get(conn.targetId) || 0) + 1)
    })
    
    // In a linear flow, most nodes should have 1-2 connections
    const linearNodes = Array.from(nodeConnections.values()).filter(count => count <= 2).length
    return linearNodes / nodeConnections.size > 0.7
  }

  private hasHorizontalActors(elements: ExcalidrawElement[]): boolean {
    const textElements = elements.filter(el => el.type === 'text')
    if (textElements.length < 2) return false
    
    // Check if text elements are arranged horizontally at similar Y positions
    const yPositions = textElements.map(el => el.y)
    const avgY = yPositions.reduce((sum, y) => sum + y, 0) / yPositions.length
    const yVariance = yPositions.reduce((sum, y) => sum + Math.pow(y - avgY, 2), 0) / yPositions.length
    
    // More lenient threshold for hand-drawn elements
    const isHorizontallyAligned = yVariance < 200 // Increased from 50 to 200
    
    // Alternative check: if most text elements are at the top of the canvas
    const sortedByY = yPositions.slice().sort((a, b) => a - b)
    const topThird = sortedByY[Math.floor(sortedByY.length / 3)]
    const topElements = textElements.filter(el => el.y <= topThird + 100)
    const hasTopRow = topElements.length >= Math.ceil(textElements.length * 0.6)
    
    console.log('🔍 Horizontal Actors Analysis:', {
      textElementCount: textElements.length,
      yVariance,
      isHorizontallyAligned,
      topElements: topElements.length,
      hasTopRow,
      result: isHorizontallyAligned || hasTopRow
    })
    
    return isHorizontallyAligned || hasTopRow
  }

  private hasVerticalMessages(connections: Connection[]): boolean {
    if (connections.length === 0) return false
    
    let verticalConnections = 0
    let totalConnections = 0
    
    connections.forEach(conn => {
      const element = conn.element
      if (element.type === 'arrow' && element.points && element.points.length >= 2) {
        const startX = element.points[0]?.[0] || 0
        const startY = element.points[0]?.[1] || 0
        const endX = element.points[element.points.length - 1]?.[0] || 0
        const endY = element.points[element.points.length - 1]?.[1] || 0
        
        const deltaX = Math.abs(endX - startX)
        const deltaY = Math.abs(endY - startY)
        
        totalConnections++
        
        // Consider it vertical if Y movement is significant (even if not > X movement)
        if (deltaY > 30) { // At least 30 pixels vertical movement
          verticalConnections++
        }
      }
    })
    
    const verticalRatio = totalConnections > 0 ? verticalConnections / totalConnections : 0
    
    console.log('🔍 Vertical Messages Analysis:', {
      totalConnections,
      verticalConnections,
      verticalRatio,
      hasVerticalMessages: verticalRatio >= 0.3 // At least 30% of connections have vertical movement
    })
    
    return verticalRatio >= 0.3 // More lenient threshold
  }

  private hasClassStructure(elements: ExcalidrawElement[]): boolean {
    return elements.some(el => 
      el.type === 'rectangle' && 
      el.text && 
      typeof el.text === 'string' && 
      /class|interface|struct|enum/i.test(el.text)
    )
  }

  private hasInheritanceConnections(connections: Connection[]): boolean {
    return connections.some(conn => {
      const element = conn.element
      return element.type === 'arrow' && 
             element.endArrowhead === 'triangle' // Inheritance typically uses triangle arrowheads
    })
  }

  /**
   * Detect lifeline pattern typical in sequence diagrams
   * Looks for paired elements at top/bottom with vertical spacing
   */
  private hasLifelinePattern(elements: ExcalidrawElement[]): boolean {
    const textElements = elements.filter(el => el.type === 'text')
    const rectElements = elements.filter(el => el.type === 'rectangle')
    
    if (textElements.length < 2 || rectElements.length < 2) return false
    
    // Check if text elements are generally at the top and rectangles at bottom
    const avgTextY = textElements.reduce((sum, el) => sum + el.y, 0) / textElements.length
    const avgRectY = rectElements.reduce((sum, el) => sum + el.y, 0) / rectElements.length
    
    // Text should be above rectangles (typical lifeline pattern)
    const hasVerticalSeparation = avgTextY < avgRectY - 50
    
    // Check for horizontal distribution of actors
    const allActors = [...textElements, ...rectElements]
    const xPositions = allActors.map(el => el.x).sort((a, b) => a - b)
    const hasHorizontalSpread = (xPositions[xPositions.length - 1] - xPositions[0]) > 200
    
    console.log('🔍 Lifeline Pattern Analysis:', {
      textCount: textElements.length,
      rectCount: rectElements.length,
      avgTextY,
      avgRectY,
      hasVerticalSeparation,
      hasHorizontalSpread,
      isLifeline: hasVerticalSeparation && hasHorizontalSpread
    })
    
    return hasVerticalSeparation && hasHorizontalSpread
  }

  /**
   * Grid alignment layout
   */
  async gridAlign(elements: ExcalidrawElement[], options: any = {}): Promise<LayoutResult> {
    const { spacing = 20 } = options
    const updatedElements = elements.map((el, index) => ({
      id: el.id,
      x: (index % 10) * spacing,
      y: Math.floor(index / 10) * spacing
    }))
    
    return {
      success: true,
      algorithm: 'grid',
      elements: updatedElements,
      metadata: {
        executionTime: 50,
        transformations: elements.length,
        confidence: 0.9
      }
    }
  }

  /**
   * Smart grouping layout
   */
  async smartGroup(elements: ExcalidrawElement[], options: any = {}): Promise<LayoutResult> {
    return this.applyLayout(elements, 'box', options)
  }

  /**
   * Vertical flow layout
   */
  async verticalFlow(elements: ExcalidrawElement[], options: any = {}): Promise<LayoutResult> {
    return this.applyLayout(elements, 'layered', { ...options, direction: 'DOWN' })
  }

  /**
   * Horizontal flow layout
   */
  async horizontalFlow(elements: ExcalidrawElement[], options: any = {}): Promise<LayoutResult> {
    return this.applyLayout(elements, 'layered', { ...options, direction: 'RIGHT' })
  }

  /**
   * Get list of supported algorithms
   */
  getSupportedAlgorithms(): LayoutAlgorithmType[] {
    return ['box', 'layered', 'mrtree', 'stress', 'grid']
  }
}

/**
 * Default singleton instance
 */
export const layoutService = new LayoutService()