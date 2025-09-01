import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
// Type definitions for Excalidraw elements and state
type ExcalidrawElement = any
type ExcalidrawAppState = any
import { useStore } from '../store/useStore'
import { setGlobalExcalidrawAPI } from '../hooks/useMenuHandler'
import { TIMING } from '../constants'
import { EmptyState } from './EmptyState'
import { useLayoutTools } from './MoreToolsMenu/hooks/useLayoutTools'
import { TextToChartDialog } from './TextToChartDialog/SimpleLayout'
import { LayoutSelectionDialog } from './LayoutSelectionDialog'

import { OpenAICompatibleService } from '../services/AIService'
import { useAIConfig } from '../store/useAIConfigStore'
import { useTranslation } from '../store/useI18nStore'
import { MermaidConverter } from '../services/MermaidConverter'
import { ChartGenerationRequest } from '../types/ai-config'

export function ExcalidrawEditor() {
  const activeFile = useStore(state => state.activeFile)
  const fileContent = useStore(state => state.fileContent)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const lastSavedContentRef = useRef<string>('')
  const lastSavedElementsRef = useRef<string>('')
  const isUserChangeRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousFilePathRef = useRef<string | null>(null)
  const initialLoadCompleteRef = useRef(false)
  
  // Layout tools hook
  const layoutTools = useLayoutTools(excalidrawAPI)
  
  // Translation hook
  const { t, language } = useTranslation()
  
  // AI Config hook
  const { config: aiConfig } = useAIConfig()
  
  // AI Tools dialog state
  const [isTextToChartOpen, setIsTextToChartOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const elementsToImportRef = useRef<any[] | null>(null)
  
  // Layout selection dialog state
  const [isLayoutSelectionOpen, setIsLayoutSelectionOpen] = useState(false)
  const [layoutElementCount, setLayoutElementCount] = useState(0)


  // Parse initial data from fileContent
  const initialData = useMemo(() => {
    if (!fileContent || !activeFile) return null
    
    // Check if we're switching files
    if (activeFile.path !== previousFilePathRef.current) {
      previousFilePathRef.current = activeFile.path
      setIsLoading(true)
      // Disable user change detection during initial load
      isUserChangeRef.current = false
      initialLoadCompleteRef.current = false
    }
    
    try {
      const data = JSON.parse(fileContent)
      // Store this as our baseline for change detection
      lastSavedContentRef.current = fileContent
      lastSavedElementsRef.current = JSON.stringify(data.elements || [])
      
      
      return {
        elements: data.elements || [],
        appState: {
          ...data.appState,
          zoom: { value: 1 },
          scrollX: 0,
          scrollY: 0,
        },
        files: data.files,
      }
    } catch (error) {
      setIsLoading(false)
      return null
    }
  }, [activeFile?.path]) // Only re-parse when switching files, not on content changes

  // Center content and re-enable user change detection after initial load
  useEffect(() => {
    if (excalidrawAPI && initialData && isLoading && activeFile) {
      // Store the current file path to check later
      const currentFilePath = activeFile.path
      
      // Give Excalidraw time to process the initial data
      const timer = setTimeout(() => {
        // Center the content if there are elements
        if (initialData.elements && initialData.elements.length > 0) {
          excalidrawAPI.scrollToContent(initialData.elements, {
            fitToContent: true,
          })
        }
        
        // Hide loading and enable user change detection
        setTimeout(() => {
          setIsLoading(false)
          initialLoadCompleteRef.current = true
          
          // Wait a bit more before enabling user change detection
          // to ensure all initial onChange events have fired
          setTimeout(() => {
            isUserChangeRef.current = true
          }, TIMING.USER_CHANGE_ENABLE_DELAY)
          
          // Only mark file as clean if we're still on the same file
          const store = useStore.getState()
          if (store.activeFile?.path === currentFilePath) {
            store.setIsDirty(false)
            store.markFileAsModified(currentFilePath, false)
            store.markTreeNodeAsModified(currentFilePath, false)
          }
        }, TIMING.LOADING_HIDE_DELAY)
      }, TIMING.FILE_LOAD_DELAY)
      
      return () => clearTimeout(timer)
    }
  }, [excalidrawAPI, initialData, isLoading, activeFile?.path])


  // Handle changes with debouncing
  const handleChange = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: ExcalidrawAppState,
    files: any
  ) => {
    // Skip if no active file
    if (!activeFile) {
      return
    }

    // Skip if this is not a user change (initial load or programmatic update)
    if (!isUserChangeRef.current || !initialLoadCompleteRef.current) {
      // Still update our baseline during initial load
      const currentElements = JSON.stringify(elements || [])
      lastSavedElementsRef.current = currentElements
      return
    }

    // Compare only elements to detect actual changes
    const currentElements = JSON.stringify(elements || [])
    
    // If elements haven't changed from our saved baseline, skip
    if (currentElements === lastSavedElementsRef.current) {
      return
    }

    // Update our baseline
    lastSavedElementsRef.current = currentElements

    // Immediately mark as dirty so file switch detection works
    const store = useStore.getState()
    if (!store.isDirty) {
      store.setIsDirty(true)
      store.markFileAsModified(activeFile.path, true)
      store.markTreeNodeAsModified(activeFile.path, true)
    }

    // Build the new content
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

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce only the content update to avoid rapid re-renders
    debounceTimerRef.current = setTimeout(() => {
      const freshStore = useStore.getState()
      
      // Only update content if we're still on the same file
      if (freshStore.activeFile?.path === activeFile.path) {
        freshStore.setFileContent(newContent)
      }
    }, TIMING.DEBOUNCE_SAVE) // Debounce save operations
  }, [activeFile])

  // Handle save - update our reference
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state, prevState) => {
      // When file is saved (isDirty becomes false)
      if (prevState.isDirty && !state.isDirty && state.fileContent) {
        lastSavedContentRef.current = state.fileContent
        try {
          const data = JSON.parse(state.fileContent)
          lastSavedElementsRef.current = JSON.stringify(data.elements || [])
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // When switching files (activeFile changes)
      if (state.activeFile?.path !== prevState.activeFile?.path) {
        // Disable user change detection for file switch
        isUserChangeRef.current = false
      }
    })

    return unsubscribe
  }, [])

  // Handle return from AI settings to text-to-chart dialog
  useEffect(() => {
    const handleReopenTextToChart = () => {
      setIsTextToChartOpen(true)
    }
    
    window.addEventListener('reopen-text-to-chart', handleReopenTextToChart)
    
    return () => {
      window.removeEventListener('reopen-text-to-chart', handleReopenTextToChart)
    }
  }, [])

  // Handle layout selection dialog
  useEffect(() => {
    const handleOpenLayoutSelection = (event: any) => {
      const { elementCount } = event.detail
      setLayoutElementCount(elementCount)
      setIsLayoutSelectionOpen(true)
    }
    
    window.addEventListener('open-layout-selection', handleOpenLayoutSelection)
    
    return () => {
      window.removeEventListener('open-layout-selection', handleOpenLayoutSelection)
    }
  }, [])

  // Handle elements import after remount
  useEffect(() => {
    if (excalidrawAPI && elementsToImportRef.current) {
      console.log('Excalidraw remounted, importing stored elements...')
      const elementsToImport = elementsToImportRef.current
      elementsToImportRef.current = null // Clear after use
      
      // Import elements to fresh instance
      setTimeout(() => {
        excalidrawAPI.updateScene({
          elements: elementsToImport,
          appState: {
            zoom: { value: 1 },
            scrollX: 0,
            scrollY: 0,
            viewBackgroundColor: '#ffffff'
          },
          commitToHistory: true
        })
        
        console.log('Elements imported to fresh instance')
        
        // Center on content
        setTimeout(() => {
          try {
            excalidrawAPI.scrollToContent(elementsToImport, {
              fitToContent: true
            })
            console.log('Successfully centered on imported content')
          } catch (error) {
            console.error('Failed to center:', error)
          }
        }, 300)
      }, 200)
    }
  }, [excalidrawAPI, resetKey])

  // Cleanup debounce timer on unmount or file change
  useEffect(() => {
    return () => {
      // If there's a pending content update, flush it immediately before cleanup
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [activeFile?.path])

  // Keyboard shortcut listener for auto-layout
  useEffect(() => {
    const handleKeydown = async (event: KeyboardEvent) => {
      // Only check for our specific shortcut, don't log all combinations to avoid interference
      
      // Use Ctrl+Shift+L on all platforms for consistency
      // ONLY handle our specific shortcut combination
      if (event.shiftKey && event.ctrlKey && event.key === 'L') {
        console.log('🎯 Layout shortcut triggered! Platform:', navigator.platform, 'Using Ctrl+Shift+L')
        event.preventDefault()
        event.stopPropagation()
        
        if (layoutTools?.autoLayout) {
          try {
            console.log('🎯 Auto Layout triggered via keyboard shortcut')
            await layoutTools.autoLayout()
            console.log('✨ Auto Layout completed via keyboard shortcut')
          } catch (error) {
            console.error('Auto Layout keyboard shortcut failed:', error)
          }
        }
      }
    }

    // Use capture phase to handle before Excalidraw
    document.addEventListener('keydown', handleKeydown, true)
    
    return () => {
      document.removeEventListener('keydown', handleKeydown, true)
    }
  }, [layoutTools.autoLayout])

  // Listen for direct layout events from menu
  useEffect(() => {
    const handleDirectLayout = (event: CustomEvent) => {
      const { algorithm, spacing, direction } = event.detail
      console.log('🎯 Direct layout triggered:', algorithm)
      
      if (layoutTools.applyLayout) {
        layoutTools.applyLayout(algorithm, spacing, direction)
      }
    }

    window.addEventListener('apply-direct-layout', handleDirectLayout as EventListener)
    
    return () => {
      window.removeEventListener('apply-direct-layout', handleDirectLayout as EventListener)
    }
  }, [layoutTools.applyLayout])


  if (!activeFile) {
    return <EmptyState />
  }

  // Use key prop to force remount when switching files or resetting
  return (
    <div className="flex-1 h-full relative" key={`${activeFile.path}-${resetKey}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-solid border-blue-600 border-r-transparent mb-2"></div>
            <p className="text-sm text-gray-600">{t('status.loading')}</p>
          </div>
        </div>
      )}
      
      {/* Excalidraw component */}
      <div className={`h-full ${isLoading ? 'invisible' : 'visible'}`}>
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={(api) => {
            setExcalidrawAPI(api)
            setGlobalExcalidrawAPI(api)
          }}
          onChange={handleChange}
          langCode={language} // 透传语言设置到 Excalidraw
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
        >
          <MainMenu>
            {/* 原始 Excalidraw 默认功能 */}
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveToActiveFile />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.Help />
            <MainMenu.DefaultItems.Socials />
            
            <MainMenu.Separator />
            
            {/* 布局工具 */}
            <MainMenu.Group title={t('layout.layoutTools')}>
              <MainMenu.Item
                onSelect={async () => {
                  try {
                    console.log('🤖 Auto Layout started')
                    await layoutTools?.autoLayout()
                    console.log('✨ Auto Layout executed')
                  } catch (error) {
                    console.error('Auto Layout failed:', error)
                  }
                }}
                icon={<span>✨</span>}
              >
                {t('layout.autoLayout')}
              </MainMenu.Item>
            </MainMenu.Group>
            
            <MainMenu.Separator />
            
            {/* AI 工具 */}
            <MainMenu.Group title={t('ai.aiTools')}>
              <MainMenu.Item
                onSelect={() => {
                  if (!aiConfig.apiKey || !aiConfig.baseUrl) {
                    window.dispatchEvent(new CustomEvent('open-ai-settings'))
                  } else {
                    setIsTextToChartOpen(true)
                  }
                }}
                icon={<span>🤖</span>}
              >
                {t('ai.textToDiagram')} {!aiConfig.apiKey ? '⚠️' : ''}
              </MainMenu.Item>
              <MainMenu.Item
                onSelect={() => {
                  // Reset Excalidraw to fix corrupted state
                  excalidrawAPI.updateScene({
                    elements: [],
                    appState: {
                      zoom: { value: 1 },
                      scrollX: 0,
                      scrollY: 0,
                      viewBackgroundColor: '#ffffff'
                    },
                    commitToHistory: true
                  })
                  console.log('Canvas reset completed')
                }}
                icon={<span>🔄</span>}
              >
                重置画布
              </MainMenu.Item>
              <MainMenu.Item
                onSelect={() => window.dispatchEvent(new CustomEvent('open-ai-settings'))}
                icon={<span>⚙️</span>}
              >
                {t('ai.aiSettings')}
              </MainMenu.Item>
            </MainMenu.Group>
          </MainMenu>
        </Excalidraw>
      </div>
      
      {/* Text to Chart Dialog */}
      <TextToChartDialog 
        isOpen={isTextToChartOpen}
        onClose={() => setIsTextToChartOpen(false)}
        onGenerate={async (request: ChartGenerationRequest, onStreamProgress?: (chunk: string) => void) => {
          if (!excalidrawAPI) return { success: false, error: 'Excalidraw not ready' }
          
          setIsGenerating(true)
          setGenerationError(null)
          
          try {
            // Create AI service with config from hook
            const aiService = new OpenAICompatibleService(aiConfig)
            
            // 使用流式生成如果提供了回调
            const response = onStreamProgress 
              ? await aiService.generateChartStream(request, onStreamProgress)
              : await aiService.generateChart(request)
            
            // Return mermaid code for preview instead of auto-converting
            return {
              success: true,
              mermaidCode: response.mermaidCode
            }
          } catch (error) {
            setGenerationError(error instanceof Error ? error.message : 'Generation failed')
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Generation failed'
            }
          } finally {
            setIsGenerating(false)
          }
        }}
        onImportToCanvas={async (mermaidCode: string) => {
          if (!excalidrawAPI) {
            console.error('ExcalidrawAPI not ready')
            throw new Error('ExcalidrawAPI not ready')
          }
          
          try {
            console.log('Converting Mermaid to Excalidraw...')
            
            // Check if Excalidraw state is corrupted (NaN values)
            const currentState = excalidrawAPI.getAppState()
            const isStateCorrupted = isNaN(currentState.zoom?.value) || isNaN(currentState.scrollX) || isNaN(currentState.scrollY)
            
            if (isStateCorrupted) {
              console.log('Detected corrupted Excalidraw state, forcing reset...')
              // Force a complete re-initialization by updating with valid state
              excalidrawAPI.updateScene({
                elements: [],
                appState: {
                  zoom: { value: 1 },
                  scrollX: 0,
                  scrollY: 0,
                  viewBackgroundColor: '#ffffff'
                }
              })
              
              // Wait for state to stabilize
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            
            // Convert Mermaid to elements first
            const converter = new MermaidConverter()
            const result = await converter.convertToExcalidraw(mermaidCode)
            
            console.log('Conversion result:', result)
            
            if (result.elements && result.elements.length > 0) {
              console.log(`Generated ${result.elements.length} elements`)
              
              // Use completely raw elements from SDK without any processing
              const elementsToImport = result.elements
              console.log('Using completely raw SDK elements:', elementsToImport)
              
              // Get existing elements to append new ones
              const existingElements = excalidrawAPI.getSceneElements()
              console.log(`Appending ${elementsToImport.length} new elements to ${existingElements.length} existing elements`)
              
              // Combine existing and new elements
              const allElements = [...existingElements, ...elementsToImport]
              
              // Get IDs of newly imported elements for selection
              const newElementIds = elementsToImport.map(el => el.id)
              
              excalidrawAPI.updateScene({
                elements: allElements,
                appState: {
                  zoom: { value: 1 },
                  scrollX: 0,
                  scrollY: 0,
                  viewBackgroundColor: '#ffffff'
                },
                commitToHistory: true
              })
              
              // Auto-select newly imported elements after scene update
              setTimeout(() => {
                try {
                  const elementIdsObject = {}
                  newElementIds.forEach(id => {
                    elementIdsObject[id] = true
                  })
                  excalidrawAPI.updateScene({
                    appState: {
                      selectedElementIds: elementIdsObject
                    }
                  })
                  console.log('Auto-selected imported elements:', newElementIds)
                } catch (error) {
                  console.error('Failed to auto-select elements:', error)
                }
              }, 100)
              
              console.log('Direct import completed')
              
              // Center on content
              setTimeout(() => {
                try {
                  excalidrawAPI.scrollToContent(elementsToImport, {
                    fitToContent: true
                  })
                  console.log('Centered on content')
                } catch (error) {
                  console.error('Failed to center:', error)
                }
              }, 300)
              
              setIsTextToChartOpen(false)
              console.log('Successfully imported via direct method')
            } else {
              throw new Error('No elements generated')
            }
          } catch (error) {
            console.error('Import failed:', error)
            setGenerationError(error instanceof Error ? error.message : 'Failed to import diagram')
            throw error
          }
        }}
        loading={isGenerating}
        error={generationError}
      />

      {/* Layout Selection Dialog */}
      <LayoutSelectionDialog
        isOpen={isLayoutSelectionOpen}
        onClose={() => setIsLayoutSelectionOpen(false)}
        onSelect={async (algorithm, spacing, direction) => {
          if (layoutTools?.applyLayout) {
            try {
              await layoutTools.applyLayout(algorithm as string, spacing, direction)
            } catch (error) {
              console.error('Layout application failed:', error)
            }
          }
        }}
        elementCount={layoutElementCount}
      />

    </div>
  )
}