/**
 * Type declarations for ExcalidrawElement
 * This file provides type definitions to resolve import issues
 */

declare module '@excalidraw/excalidraw/dist/types/excalidraw/element/types' {
  export interface ExcalidrawElement {
    id: string
    x: number
    y: number
    width?: number
    height?: number
    type: string
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
    boundElements?: any[] | null
    updated?: number
    link?: string | null
    locked?: boolean
    [key: string]: any
  }
}