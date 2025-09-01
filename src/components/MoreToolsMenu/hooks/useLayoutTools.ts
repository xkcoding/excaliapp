import { useCallback } from 'react'
import { ExcalidrawAPI, ExcalidrawElement, ExcalidrawAppState, LayoutToolsHook } from '../types'
import { layoutService } from '../../../services/layout'
import { LayoutAlgorithm, LayoutDirection } from '../../../types/layout'

/**
 * Hook for layout tools that provide intelligent element arrangement
 * Now powered by the advanced layout service with clustering and flow analysis
 */
export function useLayoutTools(excalidrawAPI: ExcalidrawAPI): LayoutToolsHook {
  // Layout with manual algorithm selection
  const applyLayout = useCallback(async (
    algorithm: LayoutAlgorithm, 
    spacing: { x: number; y: number }, 
    direction?: string
  ) => {
    if (!excalidrawAPI) return

    try {
      const appState = excalidrawAPI.getAppState()
      const elements = excalidrawAPI.getSceneElements()
      const selectedElements = elements.filter((el: ExcalidrawElement) => 
        appState.selectedElementIds[el.id]
      )

      if (selectedElements.length === 0) return

      // Get selected element IDs for connection filtering
      const selectedElementIds = new Set(selectedElements.map(el => el.id))
      
      // Include all elements that should be part of the layout:
      // 1. Selected layoutable elements (rectangles, text, etc.)
      // 2. Connections between selected elements
      const elementsToLayout = [
        ...selectedElements,
        ...elements.filter((el: ExcalidrawElement) => {
          if (el.type !== 'arrow' && el.type !== 'line') return false
          
          const startId = el.startBinding?.elementId
          const endId = el.endBinding?.elementId
          
          // Include connection if both ends are selected elements
          return startId && endId && 
                 selectedElementIds.has(startId) && 
                 selectedElementIds.has(endId)
        })
      ]

      console.log(`🎯 Applying ${algorithm} layout to ${elementsToLayout.length} elements (${selectedElements.length} selected + ${elementsToLayout.length - selectedElements.length} connections)`)
      
      // Create analysis result with user's choice
      const analysis = {
        algorithm,
        direction: direction as LayoutDirection,
        spacing,
        preserveGroups: algorithm === 'box' || algorithm === 'mrtree',
        confidence: 1.0, // User choice = 100% confidence
        reason: `User selected ${algorithm} layout`
      }

      // Extract connections for elkjs - only from the elementsToLayout
      const connections = elementsToLayout
        .filter(el => el.type === 'arrow' || el.type === 'line')
        .map(el => ({
          sourceId: el.startBinding?.elementId || '',
          targetId: el.endBinding?.elementId || '',
          type: el.type as 'arrow' | 'line',
          element: el
        }))
        .filter(conn => conn.sourceId && conn.targetId)

      // Execute layout directly - pass all selected elements except arrows/lines
      const layoutableElements = selectedElements.filter(el => 
        el.type !== 'arrow' && el.type !== 'line'
      )
      const layoutResult = await layoutService.executeLayout(layoutableElements, connections, analysis)

      // Update elements in scene - include both positioned elements and their connections
      const updatedElements = elements.map((element: ExcalidrawElement): ExcalidrawElement => {
        // Update positioned elements from layout result
        const layoutElement = layoutResult.find(el => el.id === element.id)
        if (layoutElement) {
          return { ...element, x: layoutElement.x, y: layoutElement.y }
        }
        
        // Handle bound text elements - move text with their containers
        if (element.type === 'text' && (element as any).containerId) {
          const containerId = (element as any).containerId
          const containerMoved = layoutResult.find(el => el.id === containerId)
          
          if (containerMoved) {
            // Find the original container position
            const originalContainer = selectedElements.find(el => el.id === containerId)
            if (originalContainer) {
              // Calculate the offset of text relative to original container
              const textOffsetX = element.x - originalContainer.x
              const textOffsetY = element.y - originalContainer.y
              
              // Move text to maintain relative position with new container position
              return {
                ...element,
                x: containerMoved.x + textOffsetX,
                y: containerMoved.y + textOffsetY
              }
            }
          }
        }
        
        return element
      })

      // Recalculate arrow positions after layout (based on Obsidian plugin approach)
      const finalElements = updatedElements.map((element: ExcalidrawElement): ExcalidrawElement => {
        if (element.type !== 'arrow' && element.type !== 'line') {
          return element
        }

        const startElementId = element.startBinding?.elementId
        const endElementId = element.endBinding?.elementId
        
        if (!startElementId || !endElementId) {
          return element
        }

        // Find the connected elements
        const startElement = updatedElements.find(el => el.id === startElementId)
        const endElement = updatedElements.find(el => el.id === endElementId)
        
        if (!startElement || !endElement) {
          return element
        }

        // Check if either connected element was moved
        const startMoved = layoutResult.find(el => el.id === startElementId)
        const endMoved = layoutResult.find(el => el.id === endElementId)
        
        if (startMoved || endMoved) {
          // Recalculate arrow start and end points with gap
          const gap = 2 // Minimal gap between arrow and element
          
          // Calculate connection points based on element centers
          const startCenterX = startElement.x + (startElement.width || 0) / 2
          const startCenterY = startElement.y + (startElement.height || 0) / 2
          const endCenterX = endElement.x + (endElement.width || 0) / 2
          const endCenterY = endElement.y + (endElement.height || 0) / 2
          
          // Calculate direction vector
          const dx = endCenterX - startCenterX
          const dy = endCenterY - startCenterY
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance === 0) return element
          
          // Normalize direction
          const unitX = dx / distance
          const unitY = dy / distance
          
          // Calculate start point on edge of start element (use smaller radius for tighter connection)
          const startRadius = Math.min((startElement.width || 0), (startElement.height || 0)) / 2
          const startX = startCenterX + unitX * (startRadius + gap)
          const startY = startCenterY + unitY * (startRadius + gap)
          
          // Calculate end point on edge of end element  
          const endRadius = Math.min((endElement.width || 0), (endElement.height || 0)) / 2
          const endX = endCenterX - unitX * (endRadius + gap)
          const endY = endCenterY - unitY * (endRadius + gap)
          
          // Update arrow with new points
          return {
            ...element,
            x: startX,
            y: startY,
            points: [[0, 0], [endX - startX, endY - startY]],
            // Force binding refresh
            startBinding: {
              ...element.startBinding,
              elementId: startElementId,
              focus: 0.5,
              gap
            },
            endBinding: {
              ...element.endBinding, 
              elementId: endElementId,
              focus: 0.5,
              gap
            },
            versionNonce: (element.versionNonce || 0) + 1
          }
        }
        
        return element
      })

      excalidrawAPI.updateScene({
        elements: finalElements,
        commitToHistory: true
      })
      
      // Center the laid out elements in the viewport
      setTimeout(() => {
        // Get all laid out elements (excluding arrows for bounds calculation)
        const laidOutElements = finalElements.filter(el => 
          layoutResult.some(lr => lr.id === el.id) || 
          (el.type === 'text' && (el as any).containerId && layoutResult.some(lr => lr.id === (el as any).containerId))
        )
        
        if (laidOutElements.length > 0) {
          // Use scrollToContent to center the laid out elements
          excalidrawAPI.scrollToContent(laidOutElements, {
            fitToContent: true,
            animate: true
          })
        }
        
        // Force refresh after centering
        excalidrawAPI.refresh()
      }, 100)

      console.log(`✨ ${algorithm} layout applied to ${layoutResult.length} elements`)
    } catch (error) {
      console.error('Layout failed:', error)
      throw new Error(`Failed to apply ${algorithm} layout`)
    }
  }, [excalidrawAPI])

  // Trigger layout selection dialog
  const autoLayout = useCallback(() => {
    const appState = excalidrawAPI?.getAppState()
    const elements = excalidrawAPI?.getSceneElements()
    const selectedElements = elements?.filter((el: ExcalidrawElement) => 
      appState?.selectedElementIds[el.id]
    ) || []

    if (selectedElements.length === 0) {
      alert('请先选择要布局的元素')
      return
    }

    // Get selected element IDs
    const selectedElementIds = new Set(selectedElements.map(el => el.id))
    
    // Find all connections between selected elements
    const relatedConnections = elements?.filter((el: ExcalidrawElement) => {
      if (el.type !== 'arrow' && el.type !== 'line') return false
      
      const startId = el.startBinding?.elementId
      const endId = el.endBinding?.elementId
      
      // Include connection if both ends are selected elements
      return startId && endId && 
             selectedElementIds.has(startId) && 
             selectedElementIds.has(endId)
    }) || []

    // Total count includes selected elements plus their connections
    const totalElementCount = selectedElements.length + relatedConnections.length

    // Dispatch custom event to open layout selection dialog
    window.dispatchEvent(new CustomEvent('open-layout-selection', {
      detail: { 
        elementCount: totalElementCount,
        onSelect: applyLayout
      }
    }))
  }, [excalidrawAPI, applyLayout])
  
  return {
    autoLayout,
    applyLayout
  }
}