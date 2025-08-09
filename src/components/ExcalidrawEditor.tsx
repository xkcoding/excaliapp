import { useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
// Type definitions for Excalidraw elements and state
type ExcalidrawElement = any
type ExcalidrawAppState = any
import { useStore } from '../store/useStore'
import { debounce } from '../lib/debounce'
import { setGlobalExcalidrawAPI } from '../hooks/useMenuHandler'

export function ExcalidrawEditor() {
  const { activeFile, fileContent, setIsDirty, markFileAsModified, saveCurrentFile } = useStore()
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const contentRef = useRef<string | null>(null)
  const isLoadingRef = useRef(false)

  console.log('ExcalidrawEditor render - activeFile:', activeFile?.name, 'hasContent:', !!fileContent)

  // Debounced save function with validation
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      console.log('[ExcalidrawEditor] Debounced save triggered')
      
      // Validate content before saving
      try {
        const parsed = JSON.parse(content)
        if (!parsed || typeof parsed !== 'object') {
          console.error('[ExcalidrawEditor] Invalid JSON structure, skipping save')
          return
        }
        
        // Check if there's meaningful content to save
        if (!parsed.elements || !Array.isArray(parsed.elements)) {
          console.error('[ExcalidrawEditor] Missing elements array, skipping save')
          return
        }
        
        console.log('[ExcalidrawEditor] Content valid, saving...')
        await saveCurrentFile(content)
      } catch (error) {
        console.error('[ExcalidrawEditor] Failed to validate content:', error)
      }
    }, 1000)
  ).current

  // Load file content into Excalidraw
  useEffect(() => {
    if (!excalidrawAPI || !fileContent || !activeFile) {
      console.log('Skipping load - missing:', { api: !!excalidrawAPI, content: !!fileContent, file: !!activeFile })
      return
    }

    try {
      isLoadingRef.current = true
      console.log('Loading file content into Excalidraw:', activeFile.name)
      const data = JSON.parse(fileContent)
      
      excalidrawAPI.updateScene({
        elements: data.elements || [],
        appState: data.appState || {},
        collaborators: data.collaborators || [],
      })
      
      contentRef.current = fileContent
      
      // Reset after loading to avoid triggering onChange
      setTimeout(() => {
        isLoadingRef.current = false
      }, 100)
    } catch (error) {
      console.error('Failed to parse Excalidraw file:', error, 'Content:', fileContent?.substring(0, 100))
      isLoadingRef.current = false
    }
  }, [fileContent, activeFile, excalidrawAPI])

  const handleChange = (
    elements: readonly ExcalidrawElement[],
    appState: ExcalidrawAppState,
    files: any
  ) => {
    // Skip if we're loading content
    if (isLoadingRef.current || !activeFile) {
      console.log('[ExcalidrawEditor.handleChange] Skipping - loading or no active file')
      return
    }

    const newContent = JSON.stringify(
      {
        type: 'excalidraw',
        version: 2,
        source: 'ExcaliApp',
        elements,
        appState: {
          gridSize: appState.gridSize,
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          currentItemFontSize: appState.currentItemFontSize,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
          currentItemFillStyle: appState.currentItemFillStyle,
          currentItemStrokeWidth: appState.currentItemStrokeWidth,
          currentItemRoughness: appState.currentItemRoughness,
          currentItemOpacity: appState.currentItemOpacity,
          currentItemTextAlign: appState.currentItemTextAlign,
        },
        files,
      },
      null,
      2
    )

    // Check if content actually changed
    if (newContent !== contentRef.current) {
      console.log('[ExcalidrawEditor.handleChange] Content changed, marking dirty')
      
      // Don't mark as dirty if it's just an empty file
      const hasRealChanges = elements && elements.length > 0
      
      contentRef.current = newContent
      
      if (hasRealChanges || contentRef.current !== fileContent) {
        setIsDirty(true)
        markFileAsModified(activeFile.path, true)
        debouncedSave(newContent)
      } else {
        console.log('[ExcalidrawEditor.handleChange] No real changes, skipping save')
      }
    }
  }

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Select a file from the sidebar to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          console.log('Excalidraw API initialized:', !!api)
          setExcalidrawAPI(api)
          setGlobalExcalidrawAPI(api)
        }}
        onChange={handleChange}
        name={activeFile.name}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: true,
            export: {
              saveFileToDisk: true,
            },
          },
        }}
      />
    </div>
  )
}