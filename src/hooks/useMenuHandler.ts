import { useEffect } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store/useStore'
import { convertPreferencesToRust } from '../lib/preferences'
import { useI18nStore } from '../store/useI18nStore'
import { dialogService } from '../services/dialogService'

interface MenuCommand {
  command: string
  data?: any
}

// Singleton to store the Excalidraw API reference
let globalExcalidrawAPI: any = null

export function setGlobalExcalidrawAPI(api: any) {
  globalExcalidrawAPI = api
}

export function useMenuHandler() {
  const {
    loadDirectory,
    createNewFile,
    saveCurrentFile,
    activeFile,
    toggleSidebar,
    preferences,
    savePreferences,
  } = useStore()
  
  const { switchLanguage } = useI18nStore()

  // Use the global reference instead of a local one
  const setExcalidrawAPI = (api: any) => {
    setGlobalExcalidrawAPI(api)
  }

  useEffect(() => {
    console.log('🟣 [useMenuHandler] Setting up menu command listener')
    let unlisten: UnlistenFn | null = null

    const setupListener = async () => {
      unlisten = await listen<MenuCommand>('menu-command', async (event) => {
        const { command, data } = event.payload
        console.log('🟣 [useMenuHandler] Menu command received:', command, data)

        switch (command) {
          // File menu commands
          case 'open_directory':
            handleOpenDirectory()
            break

          case 'new_file':
            handleNewFile()
            break

          case 'save':
            await saveCurrentFile()
            break

          case 'save_as':
            handleSaveAs()
            break

          case 'quit':
            await getCurrentWindow().close()
            break

          // Recent directories
          case command.match(/^recent_dir_\d+$/)?.input:
            if (data?.directory) {
              await loadDirectory(data.directory)
            }
            break

          case 'clear_recent':
            handleClearRecent()
            break


          // View menu commands
          case 'toggle_sidebar':
            toggleSidebar()
            break

          case 'zoom_in':
            handleZoomIn()
            break

          case 'zoom_out':
            handleZoomOut()
            break

          case 'reset_zoom':
            handleResetZoom()
            break

          case 'fullscreen':
            handleToggleFullscreen()
            break

          // Window menu commands
          case 'minimize':
            await getCurrentWindow().minimize()
            break

          case 'close_window':
            await getCurrentWindow().close()
            break

          // Language menu commands
          case 'language_zh_CN':
            await handleLanguageSwitch('zh-CN')
            break

          case 'language_en_US':
            await handleLanguageSwitch('en-US')
            break

          // Preferences menu commands
          case 'ai_settings':
            console.log('🔧 Opening AI Settings from menu')
            window.dispatchEvent(new CustomEvent('open-ai-settings'))
            break

          // Layout menu commands
          case 'layout_mrtree':
            handleDirectLayout('mrtree', { x: 120, y: 100 }, 'DOWN')
            break

          case 'layout_layered':
            handleDirectLayout('layered', { x: 150, y: 80 }, 'DOWN')
            break

          case 'layout_box':
            handleDirectLayout('box', { x: 100, y: 80 })
            break

          case 'layout_stress':
            handleDirectLayout('stress', { x: 100, y: 100 })
            break

          case 'layout_grid':
            handleDirectLayout('grid', { x: 80, y: 80 })
            break

          case 'auto_layout':
            handleAutoLayout()
            break

          // Help menu commands
          case 'keyboard_shortcuts':
            handleShowKeyboardShortcuts()
            break

          default:
            console.log('Unknown menu command:', command)
        }
      })
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [
    loadDirectory,
    createNewFile,
    saveCurrentFile,
    activeFile,
    toggleSidebar,
    preferences,
    savePreferences,
  ])

  // File menu handlers
  const handleOpenDirectory = async () => {
    const selected = await invoke<string | null>('select_directory')
    if (selected) {
      await loadDirectory(selected)
    }
  }

  const handleNewFile = async () => {
    const state = useStore.getState()
    
    // If no directory is selected, select one first
    if (!state.currentDirectory) {
      const dir = await invoke<string | null>('select_directory')
      if (dir) {
        await state.loadDirectory(dir)
      }
      return
    }
    
    // Create with timestamp filename
    const fileName = `Untitled-${Date.now()}.excalidraw`
    await createNewFile(fileName)
  }

  const handleSaveAs = async () => {
    if (!activeFile) return

    // Get the current content from the store
    const state = useStore.getState()
    const content = state.fileContent
    
    if (!content) return

    const newPath = await invoke<string | null>('save_file_as', {
      content,
    })

    if (newPath) {
      // Optionally update the active file to the new path
      console.log('File saved as:', newPath)
    }
  }

  const handleClearRecent = async () => {
    const newPrefs = {
      ...preferences,
      recentDirectories: [],
    }
    // Convert to snake_case for Rust backend
    const prefsToSave = convertPreferencesToRust(newPrefs)
    await invoke('save_preferences', { preferences: prefsToSave })
    useStore.getState().setPreferences(newPrefs)
  }


  // View menu handlers
  const handleZoomIn = () => {
    if (globalExcalidrawAPI) {
      const appState = globalExcalidrawAPI.getAppState()
      globalExcalidrawAPI.updateScene({
        appState: {
          ...appState,
          zoom: {
            value: Math.min(appState.zoom.value * 1.1, 30),
          },
        },
      })
    }
  }

  const handleZoomOut = () => {
    if (globalExcalidrawAPI) {
      const appState = globalExcalidrawAPI.getAppState()
      globalExcalidrawAPI.updateScene({
        appState: {
          ...appState,
          zoom: {
            value: Math.max(appState.zoom.value * 0.9, 0.1),
          },
        },
      })
    }
  }

  const handleResetZoom = () => {
    if (globalExcalidrawAPI) {
      // Use scrollToContent to reset zoom without triggering changes
      const elements = globalExcalidrawAPI.getSceneElements()
      if (elements && elements.length > 0) {
        globalExcalidrawAPI.scrollToContent(elements, {
          fitToContent: true,
        })
      } else {
        // If no elements, just reset the zoom and scroll
        globalExcalidrawAPI.updateScene({
          appState: {
            zoom: { value: 1 },
            scrollX: 0,
            scrollY: 0,
          },
        })
      }
    }
  }

  const handleToggleFullscreen = async () => {
    const window = getCurrentWindow()
    const isFullscreen = await window.isFullscreen()
    await window.setFullscreen(!isFullscreen)
    
    // Wait for fullscreen transition to complete, then refresh the view
    if (globalExcalidrawAPI) {
      setTimeout(() => {
        try {
          // Force Excalidraw to refresh its dimensions
          globalExcalidrawAPI.refresh()
          
          // Then recenter the content
          const elements = globalExcalidrawAPI.getSceneElements()
          if (elements && elements.length > 0) {
            setTimeout(() => {
              globalExcalidrawAPI.scrollToContent(elements, {
                fitToContent: true,
              })
            }, 100)
          }
        } catch (err) {
          console.error('Failed to refresh view on fullscreen toggle:', err)
        }
      }, 300)
    }
  }



  // Layout menu handlers
  const handleDirectLayout = (algorithm: string, spacing: { x: number; y: number }, direction?: string) => {
    if (!globalExcalidrawAPI) {
      console.warn('Excalidraw API not available for layout')
      return
    }

    const appState = globalExcalidrawAPI.getAppState()
    const elements = globalExcalidrawAPI.getSceneElements()
    const selectedElements = elements.filter((el: any) => 
      appState.selectedElementIds[el.id]
    )

    if (selectedElements.length === 0) {
      alert('请先选择要布局的元素')
      return
    }

    // Trigger layout directly without dialog
    window.dispatchEvent(new CustomEvent('apply-direct-layout', {
      detail: { 
        algorithm,
        spacing,
        direction
      }
    }))
  }

  const handleAutoLayout = () => {
    if (!globalExcalidrawAPI) {
      console.warn('Excalidraw API not available for layout')
      return
    }

    const appState = globalExcalidrawAPI.getAppState()
    const elements = globalExcalidrawAPI.getSceneElements()
    const selectedElements = elements.filter((el: any) => 
      appState.selectedElementIds[el.id]
    )

    if (selectedElements.length === 0) {
      alert('请先选择要布局的元素')
      return
    }

    // Trigger the original layout selection dialog
    window.dispatchEvent(new CustomEvent('open-layout-selection', {
      detail: { 
        elementCount: selectedElements.length,
        onSelect: (algorithm: string, spacing: { x: number; y: number }, direction?: string) => {
          window.dispatchEvent(new CustomEvent('apply-direct-layout', {
            detail: { algorithm, spacing, direction }
          }))
        }
      }
    }))
  }

  const handleLanguageSwitch = async (language: 'zh-CN' | 'en-US') => {
    const { config, t } = useI18nStore.getState()
    
    // If already in this language, no need to restart
    if (config.currentLanguage === language) {
      return
    }
    
    try {
      // Switch language first
      await switchLanguage(language)
      
      // Get the updated translation function after language switch
      const { t: newT } = useI18nStore.getState()
      
      // Get language display name
      const languageName = language === 'zh-CN' ? '中文' : 'English'
      
      // Show restart confirmation dialog using CustomDialog style
      const shouldRestart = await dialogService.showDialog({
        title: newT('dialog.languageRestart.title'),
        message: newT('dialog.languageRestart.message', { language: languageName }),
        type: 'info',
        confirmLabel: newT('dialog.languageRestart.restart'),
        cancelLabel: newT('dialog.languageRestart.cancel'),
        showCancel: true
      })
      
      if (shouldRestart === true) {
        // Save any unsaved work first
        const store = useStore.getState()
        if (store.isDirty) {
          await store.saveCurrentFile()
        }
        
        // Restart the application
        await invoke('restart_app')
      }
    } catch (error) {
      console.error('Failed to switch language:', error)
    }
  }

  const handleShowKeyboardShortcuts = async () => {
    // Prevent multiple simultaneous executions
    if ((handleShowKeyboardShortcuts as any).isExecuting) {
      console.log('🚫 Keyboard shortcuts dialog already showing, ignoring duplicate call')
      return
    }
    
    (handleShowKeyboardShortcuts as any).isExecuting = true
    
    try {
      // Use Tauri dialog instead of browser alert
      const { message } = await import('@tauri-apps/plugin-dialog')
    
    const shortcuts = `键盘快捷键：

文件:
  打开目录: Cmd+O (Mac) / Ctrl+O (Win/Linux)
  新建文件: Cmd+N (Mac) / Ctrl+N (Win/Linux) 
  保存: Cmd+S (Mac) / Ctrl+S (Win/Linux)
  另存为: Cmd+Shift+S (Mac) / Ctrl+Shift+S (Win/Linux)
  退出: Cmd+Q (Mac) / Ctrl+Q (Win/Linux)

视图:
  切换侧边栏: Cmd+B (Mac) / Ctrl+B (Win/Linux)
  放大: Cmd++ (Mac) / Ctrl++ (Win/Linux)
  缩小: Cmd+- (Mac) / Ctrl+- (Win/Linux)
  重置缩放: Cmd+0 (Mac) / Ctrl+0 (Win/Linux)
  全屏: F11 (Ctrl+Cmd+F on Mac)

布局:
  自动布局: Ctrl+Shift+L (所有平台)

偏好设置:
  AI 设置: 配置 AI API 设置

窗口:
  最小化: Cmd+M (Mac) / Ctrl+M (Win/Linux)
  关闭窗口: Cmd+W (Mac) / Ctrl+W (Win/Linux)

注意: 所有编辑操作 (复制、粘贴、撤销等) 由 Excalidraw 原生处理。`
    
    await message(shortcuts, { 
        title: '键盘快捷键 - OwnExcaliDesk',
        kind: 'info'
      })
    } catch (error) {
      console.error('Failed to show keyboard shortcuts:', error)
    } finally {
      (handleShowKeyboardShortcuts as any).isExecuting = false
    }
  }

  return { setExcalidrawAPI }
}