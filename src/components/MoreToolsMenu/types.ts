/**
 * Type definitions for MoreToolsMenu components
 */

export interface ExcalidrawElement {
  id: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  angle?: number
  strokeColor?: string
  backgroundColor?: string
  fillStyle?: string
  strokeWidth?: number
  strokeStyle?: string
  roughness?: number
  opacity?: number
  groupIds?: string[]
  frameId?: string | null
  roundness?: { type: number } | null
  seed?: number
  versionNonce?: number
  isDeleted?: boolean
  boundElementIds?: string[] | null
  updated?: number
  link?: string | null
  locked?: boolean
  text?: string
  fontSize?: number
  fontFamily?: number
  textAlign?: string
  verticalAlign?: string
  baseline?: number
  points?: number[][]
  lastCommittedPoint?: number[]
  startBinding?: any
  endBinding?: any
  startArrowhead?: string | null
  endArrowhead?: string | null
}

export interface ExcalidrawAppState {
  selectedElementIds: Record<string, boolean>
  gridSize?: number
  zoom?: { value: number }
  scrollX?: number
  scrollY?: number
  currentItemStrokeColor?: string
  currentItemBackgroundColor?: string
  currentItemFillStyle?: string
  currentItemStrokeWidth?: number
  currentItemStrokeStyle?: string
  currentItemRoughness?: number
  currentItemOpacity?: number
  currentItemFontFamily?: number
  currentItemFontSize?: number
  currentItemTextAlign?: string
  viewBackgroundColor?: string
}

export interface ExcalidrawAPI {
  getSceneElements: () => ExcalidrawElement[]
  getAppState: () => ExcalidrawAppState
  updateScene: (opts: {
    elements?: ExcalidrawElement[]
    appState?: Partial<ExcalidrawAppState>
  }) => void
  scrollToContent: (
    elements?: ExcalidrawElement[],
    opts?: {
      fitToContent?: boolean
      animate?: boolean
    }
  ) => void
  refresh: () => void
}

export interface ToolItem {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void | Promise<void>
  disabled?: boolean
  disabledReason?: string
  minElementsRequired?: number
  requiresSelectedElements?: boolean
}

export interface ToolGroup {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: ToolItem[]
}

export interface MoreToolsMenuProps {
  excalidrawAPI: ExcalidrawAPI
  onToolExecuted?: (toolName: string) => void
}

export interface LayoutToolsHook {
  autoLayout: () => Promise<void>
  applyLayout: (algorithm: string, spacing: { x: number; y: number }, direction?: string) => Promise<void>
}

export interface AIToolsHook {
  textToDiagram: () => Promise<void>
}

/**
 * Utility type for element bounds calculation
 */
export interface ElementBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Options for diagram generation
 */
export interface DiagramGenerationOptions {
  offsetX?: number
  offsetY?: number
  spacing?: number
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}