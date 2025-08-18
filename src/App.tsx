import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Sidebar } from './components/Sidebar'
import { ExcalidrawEditor } from './components/ExcalidrawEditor'
import { useStore } from './store/useStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMenuHandler } from './hooks/useMenuHandler'
import './index.css'

function App() {
  const { loadPreferences, loadDirectory, currentDirectory, sidebarVisible, isDirty, saveCurrentFile } = useStore()


  // Load preferences and setup on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  // Listen for file system changes
  useEffect(() => {
    if (!currentDirectory) return

    const unlisten = listen('file-system-change', async () => {
      // Reload the directory to refresh file list
      const state = useStore.getState()
      await state.loadFileTree(currentDirectory)
      
      // If the active file was deleted, clear it
      if (state.activeFile) {
        const fileStillExists = state.fileTree.some(node => 
          node.path === state.activeFile?.path || 
          (node.children && node.children.some(child => child.path === state.activeFile?.path))
        )
        
        if (!fileStillExists) {
          state.setActiveFile(null)
          state.setFileContent(null)
          state.setIsDirty(false)
        }
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [currentDirectory, loadDirectory])

  // Listen for window close event
  useEffect(() => {
    const unlisten = listen('check-unsaved-before-close', async () => {
      if (isDirty) {
        const { confirm } = await import('@tauri-apps/plugin-dialog')
        
        // First ask if they want to save
        const shouldSave = await confirm('Do you want to save your changes before closing?', {
          title: 'Unsaved Changes',
          kind: 'warning',
          okLabel: 'Save & Close',
          cancelLabel: 'Cancel'
        })
        
        if (shouldSave === null || shouldSave === undefined) {
          // User cancelled, don't close
          return
        }
        
        if (shouldSave) {
          // Save before closing
          await saveCurrentFile()
          await invoke('force_close_app')
        } else {
          // Ask for confirmation to close without saving
          const reallyClose = await confirm('Are you sure you want to close without saving?', {
            title: 'Confirm Close',
            kind: 'warning',
            okLabel: 'Close Without Saving',
            cancelLabel: 'Cancel'
          })
          
          if (reallyClose) {
            await invoke('force_close_app')
          }
        }
      } else {
        // No unsaved changes, close directly
        await invoke('force_close_app')
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [isDirty, saveCurrentFile])

  // Setup keyboard shortcuts
  useKeyboardShortcuts()
  
  // Setup menu handler (NOTE: ExcalidrawEditor will set the Excalidraw API)
  useMenuHandler()

  return (
    <div className="h-screen flex bg-white text-gray-900 overflow-hidden">
      {sidebarVisible && <Sidebar />}
      <ExcalidrawEditor />
    </div>
  )
}

export default App