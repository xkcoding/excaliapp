import { useEffect } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store/useStore'
import { convertPreferencesToRust } from '../lib/preferences'

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

          // Edit menu commands
          case 'undo':
            handleUndo()
            break

          case 'redo':
            handleRedo()
            break

          case 'cut':
            handleCut()
            break

          case 'copy':
            handleCopy()
            break

          case 'paste':
            handlePaste()
            break

          case 'select_all':
            handleSelectAll()
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

  // Edit menu handlers - delegate to Excalidraw
  const handleUndo = () => {
    if (globalExcalidrawAPI) {
      const actionManager = globalExcalidrawAPI.actionManager
      if (actionManager) {
        actionManager.executeAction('undo')
      }
    }
  }

  const handleRedo = () => {
    if (globalExcalidrawAPI) {
      const actionManager = globalExcalidrawAPI.actionManager
      if (actionManager) {
        actionManager.executeAction('redo')
      }
    }
  }

  const handleCut = async () => {
    try {
      // Get selected elements from Excalidraw
      if (globalExcalidrawAPI) {
        const selectedElements = globalExcalidrawAPI.getSceneElements().filter((el: any) => 
          globalExcalidrawAPI.getAppState().selectedElementIds[el.id]
        )
        
        if (selectedElements.length > 0) {
          // Copy to clipboard
          const content = JSON.stringify(selectedElements)
          await navigator.clipboard.writeText(content)
          
          // Delete selected elements
          globalExcalidrawAPI.deleteElements(selectedElements)
        }
      } else {
        // Fallback for text input fields
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement
        if (activeElement && ('select' in activeElement)) {
          const text = activeElement.value.substring(
            activeElement.selectionStart || 0,
            activeElement.selectionEnd || 0
          )
          await navigator.clipboard.writeText(text)
          
          // Remove selected text
          const start = activeElement.selectionStart || 0
          const end = activeElement.selectionEnd || 0
          activeElement.value = activeElement.value.substring(0, start) + 
                                activeElement.value.substring(end)
          activeElement.selectionStart = activeElement.selectionEnd = start
        }
      }
    } catch (err) {
      console.error('Failed to cut:', err)
    }
  }

  const handleCopy = async () => {
    try {
      // Get selected elements from Excalidraw
      if (globalExcalidrawAPI) {
        const selectedElements = globalExcalidrawAPI.getSceneElements().filter((el: any) => 
          globalExcalidrawAPI.getAppState().selectedElementIds[el.id]
        )
        
        if (selectedElements.length > 0) {
          const content = JSON.stringify(selectedElements)
          await navigator.clipboard.writeText(content)
        }
      } else {
        // Fallback for text input fields
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement
        if (activeElement && ('select' in activeElement)) {
          const text = activeElement.value.substring(
            activeElement.selectionStart || 0,
            activeElement.selectionEnd || 0
          )
          await navigator.clipboard.writeText(text)
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      
      if (globalExcalidrawAPI) {
        // Try to parse as Excalidraw elements
        try {
          const elements = JSON.parse(text)
          if (Array.isArray(elements)) {
            // Add elements to the scene
            globalExcalidrawAPI.addElements(elements)
          }
        } catch {
          // If not valid JSON, let Excalidraw handle it as text
          const actionManager = globalExcalidrawAPI.actionManager
          if (actionManager) {
            actionManager.executeAction('paste')
          }
        }
      } else {
        // Fallback for text input fields
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement
        if (activeElement && ('value' in activeElement)) {
          const start = activeElement.selectionStart || 0
          const end = activeElement.selectionEnd || 0
          activeElement.value = activeElement.value.substring(0, start) + 
                                text + 
                                activeElement.value.substring(end)
          activeElement.selectionStart = activeElement.selectionEnd = start + text.length
        }
      }
    } catch (err) {
      console.error('Failed to paste:', err)
    }
  }

  const handleSelectAll = () => {
    if (globalExcalidrawAPI) {
      const actionManager = globalExcalidrawAPI.actionManager
      if (actionManager) {
        actionManager.executeAction('selectAll')
      }
    }
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
      globalExcalidrawAPI.resetScene()
    }
  }

  const handleToggleFullscreen = async () => {
    const window = getCurrentWindow()
    const isFullscreen = await window.isFullscreen()
    await window.setFullscreen(!isFullscreen)
  }

  const handleShowKeyboardShortcuts = () => {
    // Create a simple modal or alert with keyboard shortcuts
    const shortcuts = `
Keyboard Shortcuts:

File:
  Open Directory: Cmd/Ctrl+O
  New File: Cmd/Ctrl+N
  Save: Cmd/Ctrl+S
  Save As: Cmd/Ctrl+Shift+S
  Quit: Cmd/Ctrl+Q

Edit:
  Undo: Cmd/Ctrl+Z
  Redo: Cmd/Ctrl+Y (Cmd+Shift+Z on Mac)
  Cut: Cmd/Ctrl+X
  Copy: Cmd/Ctrl+C
  Paste: Cmd/Ctrl+V
  Select All: Cmd/Ctrl+A

View:
  Toggle Sidebar: Cmd/Ctrl+B
  Zoom In: Cmd/Ctrl++
  Zoom Out: Cmd/Ctrl+-
  Reset Zoom: Cmd/Ctrl+0
  Fullscreen: F11 (Ctrl+Cmd+F on Mac)

Window:
  Minimize: Cmd/Ctrl+M
  Close Window: Cmd/Ctrl+W
    `
    alert(shortcuts)
  }

  return { setExcalidrawAPI }
}