import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
import { Grid, TreePine, Circle, RotateCw, Cog, Bot, Columns } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { invoke } from '@tauri-apps/api/core'
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
import { LibraryImportDialog } from './LibraryImportDialog'

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
  
  // Library state
  const [personalLibraryItems, setPersonalLibraryItems] = useState<any[]>([])
  const [excalidrawLibraryItems, setExcalidrawLibraryItems] = useState<any[]>([])
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  
  // Library import dialog state
  const [libraryImportStatus, setLibraryImportStatus] = useState<'downloading' | 'success' | 'error' | 'empty' | null>(null)
  const [libraryImportCount, setLibraryImportCount] = useState(0)
  const [libraryImportError, setLibraryImportError] = useState<string | null>(null)
  
  // Auto-grouping state
  const previousElementsRef = useRef<ExcalidrawElement[]>([])
  const autoGroupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isImportingRef = useRef(false)


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
        libraryItems: [...personalLibraryItems, ...excalidrawLibraryItems], // Combine both libraries
      }
    } catch (error) {
      setIsLoading(false)
      return null
    }
  }, [activeFile?.path, personalLibraryItems, excalidrawLibraryItems]) // Include both library dependencies

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

    // Auto-grouping logic: detect newly added elements and group them
    const currentElementsArray = Array.from(elements || [])
    const previousElements = previousElementsRef.current
    
    // Find newly added elements (elements that weren't in the previous state)
    const newElements = currentElementsArray.filter(current => 
      !previousElements.some(prev => prev.id === current.id)
    )
    
    // If multiple elements were added at once (likely from library), auto-group them
    if (newElements.length >= 2) {
      // Clear any existing timeout
      if (autoGroupTimeoutRef.current) {
        clearTimeout(autoGroupTimeoutRef.current)
      }
      
      // Delay grouping slightly to ensure all elements are properly added
      autoGroupTimeoutRef.current = setTimeout(() => {
        try {
          // Get the IDs of the new elements
          const newElementIds = newElements.map(el => el.id)
          
          // Group the new elements using Excalidraw's API
          if (excalidrawAPI && newElementIds.length >= 2) {
            console.log(`🎯 Auto-grouping ${newElementIds.length} newly added elements`)
            excalidrawAPI.groupElements(newElementIds)
          }
        } catch (error) {
          console.error('Auto-grouping failed:', error)
        }
      }, 100) // Small delay to ensure elements are fully added
    }
    
    // Update previous elements reference
    previousElementsRef.current = currentElementsArray

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

  // Load saved library items when excalidrawAPI is available
  useEffect(() => {
    const loadLibraryItems = async () => {
      if (excalidrawAPI && !libraryLoaded) {
        try {
          console.log('Loading both personal and Excalidraw library items...')
          
          // Load both libraries separately
          const [personalItems, excalidrawItems] = await Promise.all([
            invoke('load_personal_library_items') as Promise<any[]>,
            invoke('load_excalidraw_library_items') as Promise<any[]>
          ])
          
          console.log('Personal library items:', personalItems.length)
          console.log('Excalidraw library items:', excalidrawItems.length)
          
          setPersonalLibraryItems(personalItems)
          setExcalidrawLibraryItems(excalidrawItems)
          
          // Load combined library items into Excalidraw
          const combinedItems = [...personalItems, ...excalidrawItems]
          if (combinedItems.length > 0) {
            excalidrawAPI.updateLibrary({
              libraryItems: combinedItems,
              merge: false // Initial load, don't merge
            })
            
            console.log('✅ Combined library items loaded successfully')
          } else {
            console.log('No library items found')
          }
          
          setLibraryLoaded(true)
        } catch (error) {
          console.error('Failed to load library items:', error)
          setLibraryLoaded(true) // Mark as attempted even if failed
        }
      }
    }
    
    loadLibraryItems()
  }, [excalidrawAPI, libraryLoaded])

  // Cleanup timers on unmount or file change
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      
      // Clear auto-group timer
      if (autoGroupTimeoutRef.current) {
        clearTimeout(autoGroupTimeoutRef.current)
        autoGroupTimeoutRef.current = null
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

  // Handle external library link clicks
  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest('a[href*="libraries.excalidraw.com"]')
      
      if (link) {
        event.preventDefault()
        event.stopPropagation()
        
        try {
          const originalHref = (link as HTMLAnchorElement).href
          // Modify the URL to include our app as the target for returns
          const url = new URL(originalHref)
          url.searchParams.set('target', '_blank')  // 使用_blank让浏览器打开
          url.searchParams.set('referrer', 'ownexcalidesk://app')  // 使用应用协议
          
          console.log('Opening external library:', url.toString())
          await openUrl(url.toString())
        } catch (error) {
          console.error('Failed to open external library:', error)
        }
      }
    }

    // Listen for clicks on library buttons
    document.addEventListener('click', handleClick, true)
    
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  // Handle deep link imports (when user returns from excalidraw.com)
  useEffect(() => {
    console.log('🔗 Setting up deep link listener, excalidrawAPI:', !!excalidrawAPI)
    
    const setupDeepLink = async () => {
      try {
        console.log('🔗 Registering deep link listener...')
        const unsubscribe = await onOpenUrl(async (urls) => {
          console.log('🔗 深链接触发:', urls.join(', '))
          
          for (const url of urls) {
            if (url.includes('addLibrary=')) {
              try {
                console.log('✅ 开始处理素材库导入...')
                
                // Parse the deep link URL
                const urlParts = url.split('#')
                
                if (urlParts.length > 1) {
                  const params = new URLSearchParams(urlParts[1])
                  const libraryUrl = params.get('addLibrary')
                  
                  if (libraryUrl && excalidrawAPI) {
                    console.log('⬇️ 正在下载素材库...')
                    
                    // Show downloading dialog
                    setLibraryImportStatus('downloading')
                    setLibraryImportError(null)
                    isImportingRef.current = true
                    
                    // Download library file using fetch (works in Tauri context)
                    const response = await fetch(libraryUrl)
                    console.log('📥 Response status:', response.status)
                    
                    const libraryData = await response.json()
                    console.log('📚 Library data received:', libraryData)
                    
                    // Import to Excalidraw (directly update library)
                    if (libraryData.library && libraryData.library.length > 0) {
                      try {
                        // Transform nested array structure to flat LibraryItem format
                        const timestamp = Date.now()
                        const libraryItems = libraryData.library.map((group: any[], index: number) => ({
                          id: `excalidraw_group_${timestamp}_${index}_${Math.random().toString(36).substring(2, 11)}`,
                          status: 'published',
                          created: timestamp,
                          elements: group
                        }))
                        
                        // Debug info for troubleshooting - query backend directly for accurate count
                        const existingExcalidrawItems = await invoke('load_excalidraw_library_items') as any[]
                        const beforeCount = existingExcalidrawItems.length
                        const newCount = libraryItems.length
                        
                        // Save downloaded library items to Excalidraw library (append to existing)
                        await invoke('save_excalidraw_library_items', { itemsJson: JSON.stringify(libraryItems), append: true })
                        
                        // Reload Excalidraw library state from backend to ensure consistency
                        const updatedExcalidrawItems = await invoke('load_excalidraw_library_items') as any[]
                        setExcalidrawLibraryItems(updatedExcalidrawItems)
                        
                        // Debug message with better formatting
                        const afterCount = updatedExcalidrawItems.length
                        const debugMessage = `📊 素材库导入统计信息:

🔸 导入前素材数量: ${beforeCount} 个
🔸 本次新导入数量: ${newCount} 个  
🔸 导入后总数量: ${afterCount} 个
🔸 预期应有数量: ${beforeCount + newCount} 个

${afterCount === beforeCount + newCount ? '✅ 导入成功，数量正确' : '⚠️  数量不匹配，可能存在问题'}

💡 此信息仅在测试时显示，可手动关闭`
                        
                        // Update Excalidraw with combined libraries
                        // Need to reload personal items from backend to ensure we have the latest
                        const currentPersonalItems = await invoke('load_personal_library_items') as any[]
                        const combinedItems = [...currentPersonalItems, ...updatedExcalidrawItems]
                        
                        console.log('Updating Excalidraw with combined items - Personal:', currentPersonalItems.length, 'Excalidraw:', updatedExcalidrawItems.length, 'Total:', combinedItems.length)
                        
                        excalidrawAPI.updateLibrary({
                          libraryItems: combinedItems,
                          merge: false // Replace entirely with combined items
                        })
                        
                        // Show success dialog with debug info
                        setLibraryImportStatus('success')
                        setLibraryImportCount(newCount) // 本次导入的数量
                        setLibraryImportError(debugMessage)
                        isImportingRef.current = false
                        console.log(`✅ 素材库导入成功！添加了 ${libraryData.library.length} 个素材`)
                      } catch (updateError) {
                        console.error('Failed to update library:', updateError)
                        setLibraryImportStatus('error')
                        // Show the full error message in the dialog for debugging
                        const fullError = JSON.stringify(updateError, null, 2)
                        setLibraryImportError(`更新素材库失败: ${fullError}`)
                        isImportingRef.current = false
                      }
                    } else {
                      console.log('❌ 素材库文件中没有找到素材项目')
                      setLibraryImportStatus('empty')
                    }
                  } else {
                    console.log('❌ Missing libraryUrl or excalidrawAPI')
                  }
                } else {
                  console.log('❌ No hash fragment found in URL')
                }
              } catch (error) {
                console.error('❌ Failed to import library from deep link:', error)
                setLibraryImportStatus('error')
                const errorMessage = error instanceof Error ? error.message : 
                                   (typeof error === 'string' ? error : 'Unknown error')
                setLibraryImportError(`素材库导入失败: ${errorMessage}`)
                isImportingRef.current = false
              }
            } else {
              console.log('ℹ️ URL does not contain addLibrary parameter')
            }
          }
        })

        console.log('✅ Deep link listener registered successfully')
        return unsubscribe
      } catch (error) {
        console.error('❌ Failed to setup deep link listener:', error)
        return () => {}
      }
    }

    if (excalidrawAPI) {
      setupDeepLink()
    }
  }, [excalidrawAPI])


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
          onLibraryChange={async (libraryItems) => {
            // 只处理删除和清空操作，避免导入时的干扰
            try {
              console.log('Library changed, total items:', libraryItems.length)
              
              // Check if library was completely cleared
              if (libraryItems.length === 0) {
                console.log('Library was completely cleared - clearing both personal and Excalidraw libraries')
                
                // Clear both libraries in backend
                await Promise.all([
                  invoke('save_personal_library_items', { items: [] }),
                  invoke('clear_excalidraw_library_items')
                ])
                
                // Update local state
                setPersonalLibraryItems([])
                setExcalidrawLibraryItems([])
                return
              }
              
              // Only save if this is a deletion/modification, not an import
              // We can detect import by checking if we're currently importing
              if (isImportingRef.current) {
                console.log('Ignoring library change during import process')
                return
              }
              
              // For library changes, separate personal and Excalidraw items by ID pattern
              // Excalidraw items have IDs starting with 'excalidraw_group_'
              // Personal items have other IDs (generated by Excalidraw itself)
              const personalItems = libraryItems.filter(item => !item.id.startsWith('excalidraw_group_'))
              const excalidrawItems = libraryItems.filter(item => item.id.startsWith('excalidraw_group_'))
              
              console.log('Library change - Personal items:', personalItems.length, 'Excalidraw items:', excalidrawItems.length)
              
              // Save both libraries (replace mode since we have the complete current state)
              await Promise.all([
                invoke('save_personal_library_items', { items: personalItems }),
                invoke('save_excalidraw_library_items', { itemsJson: JSON.stringify(excalidrawItems), append: false })
              ])
              
              // Update local state
              setPersonalLibraryItems(personalItems)
              setExcalidrawLibraryItems(excalidrawItems)
            } catch (error) {
              console.error('Failed to handle library change:', error)
            }
          }}
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
          handleKeyboardGlobally={true}
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
                onSelect={() => {
                  window.dispatchEvent(new CustomEvent('apply-direct-layout', {
                    detail: { algorithm: 'mrtree', spacing: { x: 120, y: 100 }, direction: 'DOWN' }
                  }))
                }}
                icon={<TreePine size={16} />}
              >
                {t('layout.tree')}
              </MainMenu.Item>
              <MainMenu.Item
                onSelect={() => {
                  window.dispatchEvent(new CustomEvent('apply-direct-layout', {
                    detail: { algorithm: 'layered', spacing: { x: 150, y: 80 }, direction: 'DOWN' }
                  }))
                }}
                icon={<Columns size={16} />}
              >
                {t('layout.layer')}
              </MainMenu.Item>
              <MainMenu.Item
                onSelect={() => {
                  window.dispatchEvent(new CustomEvent('apply-direct-layout', {
                    detail: { algorithm: 'grid', spacing: { x: 80, y: 80 } }
                  }))
                }}
                icon={<Grid size={16} />}
              >
                {t('layout.grid')}
              </MainMenu.Item>
              <MainMenu.Item
                onSelect={() => {
                  window.dispatchEvent(new CustomEvent('apply-direct-layout', {
                    detail: { algorithm: 'box', spacing: { x: 100, y: 100 } }
                  }))
                }}
                icon={<Circle size={16} />}
              >
                {t('layout.circle')}
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
                icon={<Bot size={16} />}
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
                icon={<RotateCw size={16} />}
              >
                重置画布
              </MainMenu.Item>
              <MainMenu.Item
                onSelect={() => window.dispatchEvent(new CustomEvent('open-ai-settings'))}
                icon={<Cog size={16} />}
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

      {/* Library Import Dialog */}
      <LibraryImportDialog
        isOpen={libraryImportStatus !== null}
        onClose={() => {
          setLibraryImportStatus(null)
          setLibraryImportError(null)
        }}
        status={libraryImportStatus || 'downloading'}
        itemCount={libraryImportCount}
        errorMessage={libraryImportError}
      />

    </div>
  )
}