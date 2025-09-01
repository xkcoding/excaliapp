/**
 * Layout Analysis and Algorithm Types
 * Defines interfaces for intelligent auto-layout functionality
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types'

/**
 * Available layout algorithms from elkjs
 */
export type LayoutAlgorithmType = 'box' | 'layered' | 'mrtree' | 'stress' | 'grid'

/**
 * Algorithm configuration interface
 */
export interface LayoutAlgorithm {
  id: string
  name: string
  description: string
  icon: string
  requiresSelection: boolean
  minElements: number
  defaultOptions: Record<string, any>
  configSchema: any[]
  apply: (elements: any, options: any) => Promise<any>
  validate: () => { valid: boolean; message?: string }
  estimateTime: () => number
}

/**
 * Layout direction for directional algorithms
 */
export type LayoutDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

/**
 * Layout analysis result with algorithm selection
 */
export interface LayoutAnalysisResult {
  /** Selected algorithm */
  algorithm: LayoutAlgorithmType
  /** Direction for layered algorithms */
  direction?: LayoutDirection
  /** Spacing configuration */
  spacing: { x: number; y: number }
  /** Whether to preserve existing groups */
  preserveGroups: boolean
  /** Confidence score (0-1) */
  confidence: number
  /** Human-readable reason for selection */
  reason: string
}

/**
 * Connection between elements
 */
export interface Connection {
  /** Source element ID */
  sourceId: string
  /** Target element ID */
  targetId: string
  /** Connection type */
  type: 'arrow' | 'line'
  /** Arrow element reference */
  element: ExcalidrawElement
}

/**
 * Element analysis for pattern detection
 */
export interface ElementAnalysis {
  /** Total element count */
  totalElements: number
  /** Rectangle/box count */
  rectangleCount: number
  /** Text element count */
  textCount: number
  /** Arrow/line count */
  connectionCount: number
  /** Box to arrow ratio */
  boxToArrowRatio: number
  /** Connection density */
  connectionDensity: number
  /** Has decision-like elements */
  hasDecisionNodes: boolean
  /** Has linear flow pattern */
  hasLinearFlow: boolean
  /** Has horizontal actors (sequence diagram) */
  hasHorizontalActors: boolean
  /** Has vertical messages */
  hasVerticalMessages: boolean
  /** Has class-like structure */
  hasClassStructure: boolean
  /** Has inheritance connections */
  hasInheritanceConnections: boolean
}

/**
 * Layout execution result
 */
export interface LayoutResult {
  /** Whether layout succeeded */
  success: boolean
  /** Selected algorithm used */
  algorithm: string
  /** Direction used (if applicable) */
  direction?: string
  /** Updated elements with new positions */
  elements: Array<{
    id: string
    x: number
    y: number
  }>
  /** Execution metadata */
  metadata: {
    executionTime: number
    transformations: number
    confidence: number
  }
  /** Human-readable reason for algorithm selection */
  reason?: string
  /** Error message if failed */
  message?: string
  /** Layout statistics */
  stats?: any
  /** Error object if failed */
  error?: any
}

/**
 * elkjs layout options
 */
export interface ElkLayoutOptions {
  'elk.algorithm': string
  'elk.direction'?: string
  'elk.spacing.nodeNode'?: number
  'elk.spacing.edgeNode'?: number
  'elk.layered.spacing.nodeNodeBetweenLayers'?: number
  'elk.layered.spacing.edgeNodeBetweenLayers'?: number
  'elk.box.spacing'?: number
  'elk.stress.spacing'?: number
}

/**
 * elkjs node structure
 */
export interface ElkNode {
  id: string
  x?: number
  y?: number
  width: number
  height: number
  children?: ElkNode[]
  edges?: ElkEdge[]
  layoutOptions?: ElkLayoutOptions
}

/**
 * elkjs edge structure
 */
export interface ElkEdge {
  id: string
  sources: string[]
  targets: string[]
  sections?: Array<{
    startPoint: { x: number; y: number }
    endPoint: { x: number; y: number }
    bendPoints?: Array<{ x: number; y: number }>
  }>
}

/**
 * elkjs layout result
 */
export interface ElkLayoutResult {
  children: ElkNode[]
  edges: ElkEdge[]
}