import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Sidebar } from './components/Sidebar'
import { ExcalidrawEditor } from './components/ExcalidrawEditor'
import { useStore } from './store/useStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMenuHandler } from './hooks/useMenuHandler'
import './index.css'

function App() {
  const { loadPreferences, loadDirectory, currentDirectory, sidebarVisible } = useStore()

  console.log('App render - sidebarVisible:', sidebarVisible)

  // Load preferences and setup on mount
  useEffect(() => {
    console.log('Loading preferences...')
    loadPreferences()
  }, [])

  // Listen for file system changes
  useEffect(() => {
    if (!currentDirectory) return

    const unlisten = listen('file-system-change', async (event) => {
      console.log('File system change detected:', event)
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
          console.log('Active file was deleted externally, clearing editor')
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