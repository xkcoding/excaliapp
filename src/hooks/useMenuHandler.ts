import { useEffect, useRef } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store/useStore'

interface MenuCommand {
  command: string
  data?: any
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

  const excalidrawAPIRef = useRef<any>(null)

  // Store reference to Excalidraw API
  const setExcalidrawAPI = (api: any) => {
    excalidrawAPIRef.current = api
  }

  useEffect(() => {
    let unlisten: UnlistenFn | null = null

    const setupListener = async () => {
      unlisten = await listen<MenuCommand>('menu-command', async (event) => {
        const { command, data } = event.payload
        console.log('Menu command received:', command, data)

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
    // Create a simple dialog to get the file name
    const fileName = window.prompt('Enter file name (without .excalidraw extension):')
    if (fileName) {
      await createNewFile(`${fileName}.excalidraw`)
    }
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
    await invoke('save_preferences', { preferences: newPrefs })
    useStore.getState().setPreferences(newPrefs)
  }

  // Edit menu handlers - delegate to Excalidraw
  const handleUndo = () => {
    if (excalidrawAPIRef.current) {
      const actionManager = excalidrawAPIRef.current.actionManager
      if (actionManager) {
        actionManager.executeAction('undo')
      }
    }
  }

  const handleRedo = () => {
    if (excalidrawAPIRef.current) {
      const actionManager = excalidrawAPIRef.current.actionManager
      if (actionManager) {
        actionManager.executeAction('redo')
      }
    }
  }

  const handleCut = () => {
    document.execCommand('cut')
  }

  const handleCopy = () => {
    document.execCommand('copy')
  }

  const handlePaste = () => {
    document.execCommand('paste')
  }

  const handleSelectAll = () => {
    if (excalidrawAPIRef.current) {
      const actionManager = excalidrawAPIRef.current.actionManager
      if (actionManager) {
        actionManager.executeAction('selectAll')
      }
    }
  }

  // View menu handlers
  const handleZoomIn = () => {
    if (excalidrawAPIRef.current) {
      const appState = excalidrawAPIRef.current.getAppState()
      excalidrawAPIRef.current.updateScene({
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
    if (excalidrawAPIRef.current) {
      const appState = excalidrawAPIRef.current.getAppState()
      excalidrawAPIRef.current.updateScene({
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
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.resetScene()
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