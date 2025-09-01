import { useCallback } from 'react'
import { ExcalidrawAPI, AIToolsHook } from '../types'

/**
 * Hook for AI-powered tools that generate content based on user input
 */
export function useAITools(excalidrawAPI: ExcalidrawAPI): AIToolsHook {
  // Text to diagram: Generate diagram from text description
  const textToDiagram = useCallback(async () => {
    if (!excalidrawAPI) return

    try {
      // Prompt user for text input
      const textInput = prompt(
        'Enter a description of the diagram you want to create:\n\n' +
        'Examples:\n' +
        '• "Create a flowchart for user login process"\n' +
        '• "Draw a system architecture with database, API, and frontend"\n' +
        '• "Make a simple org chart with CEO, managers, and employees"'
      )

      if (!textInput || textInput.trim() === '') {
        return // User cancelled or entered empty text
      }

      // For now, create a simple placeholder diagram
      // In a real implementation, this would call an AI service
      const elements = generateDiagramFromText(textInput.trim())
      
      if (elements.length === 0) {
        throw new Error('Could not generate diagram from the provided text')
      }

      // Get current elements and add new ones
      const currentElements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()

      // Calculate offset to place new elements away from existing ones
      const bounds = currentElements.reduce((acc: any, el: any) => ({
        maxX: Math.max(acc.maxX || 0, el.x + (el.width || 0)),
        maxY: Math.max(acc.maxY || 0, el.y + (el.height || 0))
      }), { maxX: 0, maxY: 0 })

      const offsetX = bounds.maxX > 0 ? bounds.maxX + 100 : 100
      const offsetY = 100

      // Offset the generated elements
      const offsetElements = elements.map((el: any) => ({
        ...el,
        x: el.x + offsetX,
        y: el.y + offsetY
      }))

      // Add to scene
      const updatedElements = [...currentElements, ...offsetElements]
      const newSelectedIds = offsetElements.reduce((acc: any, el: any) => {
        acc[el.id] = true
        return acc
      }, {})

      excalidrawAPI.updateScene({
        elements: updatedElements,
        appState: {
          ...appState,
          selectedElementIds: newSelectedIds
        }
      })

      // Focus on the new content
      setTimeout(() => {
        excalidrawAPI.scrollToContent(offsetElements, {
          fitToContent: false,
          animate: true
        })
      }, 100)

    } catch (error) {
      console.error('Text to diagram failed:', error)
      alert(`Failed to generate diagram: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [excalidrawAPI])

  return {
    textToDiagram
  }
}

/**
 * Generate a simple diagram based on text input
 * This is a simplified implementation - in production, you'd use an AI service
 */
function generateDiagramFromText(text: string): any[] {
  const lowerText = text.toLowerCase()
  const timestamp = Date.now()
  const elements: any[] = []

  // Detect diagram type and generate appropriate elements
  if (lowerText.includes('flowchart') || lowerText.includes('flow') || lowerText.includes('process')) {
    // Generate a simple flowchart
    elements.push(
      // Start
      createRectangle(`start_${timestamp}`, 0, 0, 120, 60, 'Start', '#10b981', '#dcfce7'),
      // Process 1
      createRectangle(`process1_${timestamp}`, 0, 100, 120, 60, 'Process 1', '#3b82f6', '#dbeafe'),
      // Decision
      createDiamond(`decision_${timestamp}`, 0, 200, 'Decision?', '#f59e0b', '#fef3c7'),
      // End
      createRectangle(`end_${timestamp}`, 0, 320, 120, 60, 'End', '#ef4444', '#fee2e2'),
      // Arrows
      createArrow(`arrow1_${timestamp}`, 60, 60, 60, 100),
      createArrow(`arrow2_${timestamp}`, 60, 160, 60, 200),
      createArrow(`arrow3_${timestamp}`, 60, 260, 60, 320)
    )
  } else if (lowerText.includes('org chart') || lowerText.includes('organizational') || lowerText.includes('hierarchy')) {
    // Generate an organizational chart
    elements.push(
      // CEO
      createRectangle(`ceo_${timestamp}`, 150, 0, 120, 60, 'CEO', '#8b5cf6', '#f3e8ff'),
      // Managers
      createRectangle(`manager1_${timestamp}`, 50, 120, 100, 50, 'Manager 1', '#06b6d4', '#cffafe'),
      createRectangle(`manager2_${timestamp}`, 200, 120, 100, 50, 'Manager 2', '#06b6d4', '#cffafe'),
      // Employees
      createRectangle(`emp1_${timestamp}`, 0, 220, 80, 40, 'Employee 1', '#84cc16', '#ecfccb'),
      createRectangle(`emp2_${timestamp}`, 100, 220, 80, 40, 'Employee 2', '#84cc16', '#ecfccb'),
      createRectangle(`emp3_${timestamp}`, 200, 220, 80, 40, 'Employee 3', '#84cc16', '#ecfccb'),
      createRectangle(`emp4_${timestamp}`, 300, 220, 80, 40, 'Employee 4', '#84cc16', '#ecfccb'),
      // Connection lines
      createLine(`line1_${timestamp}`, 210, 60, 100, 120),
      createLine(`line2_${timestamp}`, 210, 60, 250, 120),
      createLine(`line3_${timestamp}`, 100, 170, 40, 220),
      createLine(`line4_${timestamp}`, 100, 170, 140, 220),
      createLine(`line5_${timestamp}`, 250, 170, 240, 220),
      createLine(`line6_${timestamp}`, 250, 170, 340, 220)
    )
  } else if (lowerText.includes('system') || lowerText.includes('architecture') || lowerText.includes('database')) {
    // Generate a system architecture diagram
    elements.push(
      // Frontend
      createRectangle(`frontend_${timestamp}`, 0, 100, 100, 60, 'Frontend', '#f97316', '#fed7aa'),
      // API
      createRectangle(`api_${timestamp}`, 150, 100, 100, 60, 'API Server', '#3b82f6', '#dbeafe'),
      // Database
      createRectangle(`db_${timestamp}`, 300, 100, 100, 60, 'Database', '#10b981', '#dcfce7'),
      // Connections
      createArrow(`conn1_${timestamp}`, 100, 130, 150, 130),
      createArrow(`conn2_${timestamp}`, 250, 130, 300, 130),
      // Labels
      createText(`label1_${timestamp}`, 110, 115, 'HTTP', '#6b7280'),
      createText(`label2_${timestamp}`, 260, 115, 'SQL', '#6b7280')
    )
  } else {
    // Default: create a simple mind map
    elements.push(
      // Central idea
      createEllipse(`central_${timestamp}`, 150, 100, 100, 60, 'Main Idea', '#8b5cf6', '#f3e8ff'),
      // Branches
      createEllipse(`branch1_${timestamp}`, 50, 50, 80, 40, 'Branch 1', '#06b6d4', '#cffafe'),
      createEllipse(`branch2_${timestamp}`, 250, 50, 80, 40, 'Branch 2', '#06b6d4', '#cffafe'),
      createEllipse(`branch3_${timestamp}`, 50, 180, 80, 40, 'Branch 3', '#06b6d4', '#cffafe'),
      createEllipse(`branch4_${timestamp}`, 250, 180, 80, 40, 'Branch 4', '#06b6d4', '#cffafe'),
      // Connection lines
      createLine(`connection1_${timestamp}`, 150, 120, 90, 70),
      createLine(`connection2_${timestamp}`, 250, 120, 290, 70),
      createLine(`connection3_${timestamp}`, 150, 140, 90, 180),
      createLine(`connection4_${timestamp}`, 250, 140, 290, 180)
    )
  }

  return elements
}

// Helper functions to create different element types
function createRectangle(id: string, x: number, y: number, width: number, height: number, text: string = '', strokeColor: string = '#1e40af', backgroundColor: string = '#f1f5f9') {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 1 },
    seed: Math.floor(Math.random() * 1000000),
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElementIds: text ? [`text_${id}`] : null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...(text && {
      boundElementIds: [`text_${id}`]
    })
  }
}

function createText(id: string, x: number, y: number, text: string, strokeColor: string = '#1f2937') {
  return {
    id,
    type: 'text',
    x,
    y,
    width: text.length * 8,
    height: 20,
    angle: 0,
    strokeColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    text,
    fontSize: 16,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseline: 13,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElementIds: null,
    updated: Date.now(),
    link: null,
    locked: false
  }
}

function createEllipse(id: string, x: number, y: number, width: number, height: number, text: string = '', strokeColor: string = '#1e40af', backgroundColor: string = '#f1f5f9') {
  return {
    id,
    type: 'ellipse',
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElementIds: text ? [`text_${id}`] : null,
    updated: Date.now(),
    link: null,
    locked: false
  }
}

function createDiamond(id: string, x: number, y: number, text: string = '', strokeColor: string = '#1e40af', backgroundColor: string = '#f1f5f9') {
  return {
    id,
    type: 'diamond',
    x,
    y,
    width: 120,
    height: 80,
    angle: 0,
    strokeColor,
    backgroundColor,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElementIds: text ? [`text_${id}`] : null,
    updated: Date.now(),
    link: null,
    locked: false
  }
}

function createArrow(id: string, startX: number, startY: number, endX: number, endY: number) {
  return {
    id,
    type: 'arrow',
    x: startX,
    y: startY,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    angle: 0,
    strokeColor: '#6b7280',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    points: [[0, 0], [endX - startX, endY - startY]],
    lastCommittedPoint: [endX - startX, endY - startY],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow',
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: Math.floor(Math.random() * 1000000),
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElementIds: null,
    updated: Date.now(),
    link: null,
    locked: false
  }
}

function createLine(id: string, startX: number, startY: number, endX: number, endY: number) {
  return {
    id,
    type: 'line',
    x: startX,
    y: startY,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    angle: 0,
    strokeColor: '#6b7280',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    points: [[0, 0], [endX - startX, endY - startY]],
    lastCommittedPoint: [endX - startX, endY - startY],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: Math.floor(Math.random() * 1000000),
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElementIds: null,
    updated: Date.now(),
    link: null,
    locked: false
  }
}