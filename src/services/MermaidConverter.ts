/**
 * Mermaid Converter Service
 * Converts Mermaid diagrams to Excalidraw elements using official converter
 */

import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types'
import type { ChartType } from '../types/ai-config'

/**
 * Conversion options
 */
export interface ConvertOptions {
  /** 插入位置 */
  position?: { x: number; y: number }
  /** 缩放比例 */
  scale?: number
  /** 主题样式 */
  theme?: 'default' | 'dark' | 'light'
  /** 字体大小 */
  fontSize?: number
}

/**
 * Conversion result
 */
export interface ConvertResult {
  /** 转换后的元素 */
  elements: ExcalidrawElement[]
  /** 相关文件 */
  files?: any
  /** 转换统计 */
  stats: {
    nodeCount: number
    edgeCount: number
    conversionTime: number
  }
}

/**
 * Validation result
 */
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

/**
 * Mermaid Converter Interface
 */
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

/**
 * Mermaid Converter Implementation
 */
export class MermaidConverter implements IMermaidConverter {
  
  /**
   * Convert Mermaid code to Excalidraw elements
   */
  async convertToExcalidraw(
    mermaidCode: string,
    options: ConvertOptions = {}
  ): Promise<ConvertResult> {
    const startTime = performance.now()
    
    try {
      // Validate syntax first
      const validation = this.validateSyntax(mermaidCode)
      if (!validation.valid) {
        throw new Error(`Invalid Mermaid syntax: ${validation.errors[0]?.message || 'Unknown error'}`)
      }

      // Apply auto-fixes
      const fixedCode = this.autoFixSyntax(mermaidCode)
      
      // Step 1: Parse Mermaid to skeleton elements
      const { elements: skeletonElements, files } = await parseMermaidToExcalidraw(fixedCode, {
        themeVariables: {
          fontSize: `${options.fontSize || 16}px`
        }
      })
      
      console.log('Skeleton elements from parseMermaidToExcalidraw:', skeletonElements)
      
      // Step 2: Convert to full Excalidraw elements  
      const fullElements = convertToExcalidrawElements(skeletonElements)
      
      console.log('Full elements after convertToExcalidrawElements:', 
        fullElements.filter(el => el.type === 'arrow' || el.type === 'line').map(el => ({
          type: el.type,
          strokeStyle: el.strokeStyle,
          startArrowhead: el.startArrowhead,
          endArrowhead: el.endArrowhead,
          label: el.label?.text,
          id: el.id
        }))
      )
      
      // Re-apply stroke styles after conversion (in case they were lost)
      if (mermaidCode.includes('sequenceDiagram')) {
        const lines = fixedCode.split('\n').filter(line => line.trim())
        
        fullElements.forEach(el => {
          if ((el.type === 'arrow' || el.type === 'line') && el.label?.text) {
            // Check if this arrow should be dashed or solid based on source
            const isFromDashedArrow = lines.some(line => 
              line.includes('-->>') && line.includes(el.label.text)
            )
            const isFromSolidArrow = lines.some(line => 
              line.includes('->>') && !line.includes('-->>') && line.includes(el.label.text)
            )
            
            if (isFromDashedArrow) {
              el.strokeStyle = 'dotted'  // Use 'dotted' instead of 'dashed' for Excalidraw
              el.endArrowhead = 'triangle' // Triangle arrowhead for dashed lines
              el.startArrowhead = null
              console.log(`Post-conversion: Set dotted style and triangle arrowhead for "${el.label.text}"`)
            } else if (isFromSolidArrow) {
              el.strokeStyle = 'solid'
              el.endArrowhead = 'arrow' // Standard arrow for solid lines
              el.startArrowhead = null
              console.log(`Post-conversion: Set solid style and arrow arrowhead for "${el.label.text}"`)
            }
          }
        })
      }
      
      // Fix stroke styles for sequence diagrams based on source syntax
      if (mermaidCode.includes('sequenceDiagram')) {
        // Parse the source code to identify arrow types by line
        const lines = fixedCode.split('\n').filter(line => line.trim())
        const arrowMessages: { text: string, style: string }[] = []
        
        lines.forEach(line => {
          const trimmed = line.trim()
          console.log('Processing line:', trimmed)
          
          // Extract message text and determine style (check -->> first, then ->> but not if preceded by -)
          if (trimmed.includes('-->>')) {
            // Match dashed arrow: Participant-->>Participant: message
            const match = trimmed.match(/(\w+)\s*-->>.*?:\s*(.+)$/)
            if (match) {
              const [, participant, messageText] = match
              arrowMessages.push({ 
                text: `${participant}: ${messageText.trim()}`, 
                style: 'dotted' 
              })
              console.log(`Found dashed arrow: ${participant}: ${messageText}`)
            }
          } else if (trimmed.includes('->>')) {
            // Match solid arrow: Participant->>Participant: message (only if not preceded by -)
            const match = trimmed.match(/(\w+)\s*->>.*?:\s*(.+)$/)
            if (match) {
              const [, participant, messageText] = match
              arrowMessages.push({ 
                text: `${participant}: ${messageText.trim()}`, 
                style: 'solid' 
              })
              console.log(`Found solid arrow: ${participant}: ${messageText}`)
            }
          }
        })
        
        console.log('Parsed arrow messages from source:', arrowMessages)
        
        // Apply correct stroke styles to skeleton elements based on label text
        skeletonElements.forEach(el => {
          if ((el.type === 'arrow' || el.type === 'line') && el.label?.text) {
            const matchingMessage = arrowMessages.find(msg => msg.text === el.label.text)
            if (matchingMessage) {
              el.strokeStyle = matchingMessage.style
              
              // Also apply arrowhead style to match the line style
              if (el.type === 'arrow' || (el.type === 'line' && (el.endArrowhead || el.endArrowhead !== null))) {
                // Different arrowhead styles for different line styles
                if (matchingMessage.style === 'dotted') {
                  el.endArrowhead = 'triangle' // Triangle arrowhead for dashed lines
                  el.startArrowhead = null // No start arrow for sequence diagrams
                } else {
                  el.endArrowhead = 'arrow' // Standard arrow for solid lines
                  el.startArrowhead = null // No start arrow for sequence diagrams
                }
              }
              
              console.log(`Fixed stroke style for "${el.label.text}": ${matchingMessage.style}, arrowhead: ${el.endArrowhead}`)
            }
          }
        })
      }
      
      console.log('Full elements after restoring stroke styles:', fullElements)
      
      // Debug stroke styles for sequence diagrams
      if (mermaidCode.includes('sequenceDiagram')) {
        console.log('Sequence diagram detected, final arrow details:', 
          fullElements.filter(el => el.type === 'arrow' || el.type === 'line').map(el => ({
            type: el.type,
            strokeStyle: el.strokeStyle,
            startArrowhead: el.startArrowhead,
            endArrowhead: el.endArrowhead,
            label: el.label?.text,
            id: el.id
          }))
        )
      }
      
      // Use the properly converted elements
      let processedElements = fullElements
      
      // Apply position offset if specified
      if (options.position) {
        processedElements = this.offsetElements(processedElements as ExcalidrawElement[], options.position)
      }

      // Apply scaling if specified
      if (options.scale && options.scale !== 1) {
        processedElements = this.scaleElements(processedElements as ExcalidrawElement[], options.scale)
      }

      const endTime = performance.now()
      const conversionTime = endTime - startTime

      // Calculate stats
      const nodeCount = processedElements.filter(el => 
        el.type !== 'arrow' && el.type !== 'line'
      ).length
      const edgeCount = processedElements.filter(el => 
        el.type === 'arrow' || el.type === 'line'
      ).length

      return {
        elements: processedElements,
        files,
        stats: {
          nodeCount,
          edgeCount,
          conversionTime
        }
      }

    } catch (error) {
      throw new Error(`Mermaid conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate Mermaid syntax
   */
  validateSyntax(mermaidCode: string): ValidationResult {
    const errors: ValidationResult['errors'] = []
    const lines = mermaidCode.split('\n')
    
    try {
      // Basic syntax validation
      if (!mermaidCode.trim()) {
        errors.push({
          line: 1,
          column: 1,
          message: 'Empty Mermaid code',
          severity: 'error'
        })
      }

      // Check for chart type declaration
      const firstLine = lines[0]?.trim() || ''
      const validChartTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'mindmap']
      
      const hasValidChartType = validChartTypes.some(type => 
        firstLine.startsWith(type) || firstLine.includes(type)
      )
      
      if (!hasValidChartType) {
        errors.push({
          line: 1,
          column: 1,
          message: 'Missing or invalid chart type declaration',
          severity: 'warning'
        })
      }

      // Check for common syntax errors
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return

        // Check for unmatched brackets (excluding method definitions)
        // Skip bracket validation for class diagram method definitions
        const isMethodDefinition = /^[\s]*[+\-#~]\s*[\u4e00-\u9fff\w\s]*\(\)[\s]*$/.test(trimmed)
        const isClassBlock = /^[\s]*class\s+[\u4e00-\u9fff\w\s]+\s*\{[\s]*$/.test(trimmed)
        const isBlockEnd = /^[\s]*\}[\s]*$/.test(trimmed)
        
        if (!isMethodDefinition && !isClassBlock && !isBlockEnd) {
          const openBrackets = (trimmed.match(/[\[{]/g) || []).length
          const closeBrackets = (trimmed.match(/[\]}]/g) || []).length
          
          if (openBrackets !== closeBrackets) {
            errors.push({
              line: index + 1,
              column: 1,
              message: 'Unmatched brackets',
              severity: 'warning' // Downgrade to warning for better compatibility
            })
          }
        }

        // Check for invalid arrow syntax
        if (trimmed.includes('->') && !trimmed.includes('-->')) {
          errors.push({
            line: index + 1,
            column: trimmed.indexOf('->') + 1,
            message: 'Use "-->" for arrows, not "->"',
            severity: 'warning'
          })
        }
      })

      return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors
      }

    } catch (error) {
      return {
        valid: false,
        errors: [{
          line: 1,
          column: 1,
          message: error instanceof Error ? error.message : 'Validation failed',
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Get supported chart types
   */
  getSupportedTypes(): ChartType[] {
    return ['flowchart', 'sequenceDiagram', 'classDiagram']
  }

  /**
   * Auto-fix common Mermaid syntax errors
   */
  autoFixSyntax(mermaidCode: string): string {
    let fixed = mermaidCode
    
    console.log('Original mermaid code:', fixed)

    // Fix common arrow syntax ONLY for flowcharts, not sequence diagrams
    if (!fixed.includes('sequenceDiagram')) {
      fixed = fixed.replace(/(?<!\-)\->(?!\-)/g, '-->')
      console.log('After arrow fix:', fixed)
    }
    
    // Fix missing semicolons in flowcharts
    if (fixed.includes('graph') || fixed.includes('flowchart')) {
      fixed = fixed.replace(/([A-Za-z0-9\]}\)]+)\s*$/gm, '$1;')
    }

    // Remove duplicate semicolons
    fixed = fixed.replace(/;;+/g, ';')
    
    // Trim empty lines
    fixed = fixed.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')

    // Ensure chart type is on first line
    const lines = fixed.split('\n')
    const validChartTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'mindmap']
    
    const hasChartType = validChartTypes.some(type => 
      lines[0] && lines[0].includes(type)
    )
    
    if (!hasChartType && lines.length > 0) {
      // Try to detect chart type from content
      if (lines.some(line => line.includes('participant') || line.includes('->>') || line.includes('-->'))) {
        fixed = 'sequenceDiagram\n' + fixed
      } else if (lines.some(line => line.includes('class ') || line.includes(': +'))) {
        fixed = 'classDiagram\n' + fixed
      } else {
        fixed = 'flowchart TD\n' + fixed
      }
    }

    return fixed
  }

  /**
   * Offset elements by specified position
   */
  private offsetElements(elements: ExcalidrawElement[], offset: { x: number; y: number }): ExcalidrawElement[] {
    // Ensure offset values are valid numbers
    const safeOffsetX = isNaN(offset.x) ? 0 : offset.x
    const safeOffsetY = isNaN(offset.y) ? 0 : offset.y
    
    return elements.map(element => {
      const currentX = isNaN(element.x) ? 0 : (element.x || 0)
      const currentY = isNaN(element.y) ? 0 : (element.y || 0)
      
      return {
        ...element,
        x: currentX + safeOffsetX,
        y: currentY + safeOffsetY
      }
    })
  }

  /**
   * Clean up elements and convert mermaid format to standard Excalidraw format
   */
  private cleanupElements(elements: ExcalidrawElement[]): ExcalidrawElement[] {
    const cleanedElements: any[] = []
    
    elements.forEach((element, index) => {
      const baseElement: any = {
        ...element,
        id: element.id || `mermaid-element-${Date.now()}-${index}`,
        index: element.index || `a${index}`, // Add proper index for Excalidraw
        x: isNaN(element.x) ? 0 : (element.x ?? 0),
        y: isNaN(element.y) ? 0 : (element.y ?? 0),
        strokeColor: element.strokeColor || '#1971c2',
        backgroundColor: element.backgroundColor || 'transparent', // Use transparent instead of white
        fillStyle: element.fillStyle || 'solid',
        strokeWidth: Math.max(element.strokeWidth ?? 2, 1), // Ensure minimum stroke width
        roughness: element.roughness ?? 1,
        opacity: element.opacity ?? 100,
        groupIds: element.groupIds || [],
        frameId: element.frameId || null,
        roundness: element.type === 'rectangle' ? { type: 3 } : null,
        seed: element.seed ?? Math.floor(Math.random() * 2 ** 31),
        versionNonce: element.versionNonce ?? Math.floor(Math.random() * 2 ** 31),
        isDeleted: element.isDeleted ?? false,
        link: element.link || null,
        locked: element.locked ?? false,
        customData: element.customData || null,
        version: 1 // Fix NaN version
      }

      // Handle different element types
      if (element.type === 'rectangle') {
        baseElement.width = element.width ?? 100
        baseElement.height = element.height ?? 50
        
        // Add the rectangle
        cleanedElements.push(baseElement)
        
        // If rectangle has a label, create a separate text element
        if (element.label && element.label.text) {
          const textElement: any = {
            id: `${element.id}-text`,
            index: `a${index}t`, // Add index for text element
            type: 'text',
            x: baseElement.x + (baseElement.width / 2) - 50,
            y: baseElement.y + (baseElement.height / 2) - 10,
            width: 100,
            height: 25,
            text: element.label.text,
            fontSize: element.label.fontSize ?? 16,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor: element.label.strokeColor || '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: Math.max(1, 1), // Ensure visible stroke
            roughness: 1,
            opacity: 100,
            groupIds: element.label.groupIds || [],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 2 ** 31),
            versionNonce: Math.floor(Math.random() * 2 ** 31),
            isDeleted: false,
            link: null,
            locked: false,
            customData: null,
            version: 1,
            baseline: 18
          }
          cleanedElements.push(textElement)
        }
      } else if (element.type === 'text') {
        baseElement.width = element.width ?? 100
        baseElement.height = element.height ?? 25
        baseElement.fontSize = element.fontSize ?? 16
        baseElement.fontFamily = element.fontFamily ?? 1
        
        // Extract text from label if text is empty
        let textContent = element.text || ''
        if (!textContent && element.label) {
          textContent = typeof element.label === 'string' ? element.label : element.label?.text || ''
        }
        baseElement.text = textContent
        
        baseElement.textAlign = element.textAlign || 'left'
        baseElement.verticalAlign = element.verticalAlign || 'top'
        baseElement.baseline = element.baseline ?? 18
        baseElement.strokeColor = '#000000'
        baseElement.backgroundColor = 'transparent'
        
        cleanedElements.push(baseElement)
      } else if (element.type === 'line' || element.type === 'arrow') {
        baseElement.points = element.points || [[0, 0], [100, 0]]
        baseElement.lastCommittedPoint = element.lastCommittedPoint || null
        baseElement.startBinding = element.startBinding || null
        baseElement.endBinding = element.endBinding || null
        baseElement.startArrowhead = element.startArrowhead || null
        baseElement.endArrowhead = element.endArrowhead || (element.type === 'arrow' ? 'arrow' : null)
        baseElement.strokeColor = element.strokeColor || '#1971c2'
        baseElement.strokeWidth = element.strokeWidth ?? 2
        
        // Determine stroke style based on element properties for sequence diagrams
        let strokeStyle = element.strokeStyle || 'solid'
        
        // For sequence diagrams, map strokeStyle correctly
        if (mermaidCode.includes('sequenceDiagram')) {
          if (element.strokeStyle === 'dotted') {
            // Map Mermaid's 'dotted' to Excalidraw's 'dashed' for better visual distinction
            strokeStyle = 'dashed'
          } else if (element.strokeStyle === 'solid') {
            strokeStyle = 'solid'
          } else {
            // Default: if no specific style, try to infer from CSS classes or other properties
            if (element.class?.includes('dashed') || element.class?.includes('dotted') || element.isDashed) {
              strokeStyle = 'dashed'
            } else {
              strokeStyle = 'solid'
            }
          }
        }
        
        baseElement.strokeStyle = strokeStyle
        
        cleanedElements.push(baseElement)
      } else {
        baseElement.width = element.width ?? 100
        baseElement.height = element.height ?? 50
        cleanedElements.push(baseElement)
      }
    })

    return cleanedElements
  }

  /**
   * Scale elements by specified factor
   */
  private scaleElements(elements: ExcalidrawElement[], scale: number): ExcalidrawElement[] {
    if (scale === 1) return elements

    return elements.map(element => ({
      ...element,
      x: (element.x || 0) * scale,
      y: (element.y || 0) * scale,
      width: element.width ? element.width * scale : element.width,
      height: element.height ? element.height * scale : element.height,
      fontSize: element.fontSize ? element.fontSize * scale : element.fontSize
    }))
  }
}

/**
 * Default converter instance
 */
export const mermaidConverter = new MermaidConverter()

/**
 * Utility functions for direct access
 */
export async function convertMermaidToExcalidraw(
  mermaidCode: string,
  options?: ConvertOptions
): Promise<ConvertResult> {
  return mermaidConverter.convertToExcalidraw(mermaidCode, options)
}

export function validateMermaidSyntax(mermaidCode: string): ValidationResult {
  return mermaidConverter.validateSyntax(mermaidCode)
}

export function fixMermaidSyntax(mermaidCode: string): string {
  return mermaidConverter.autoFixSyntax(mermaidCode)
}