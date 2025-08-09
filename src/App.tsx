import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Sidebar } from './components/Sidebar'
import { ExcalidrawEditor } from './components/ExcalidrawEditor'
import { useStore } from './store/useStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
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
      await loadDirectory(currentDirectory)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [currentDirectory, loadDirectory])

  // Setup keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex bg-white text-gray-900 overflow-hidden">
      {sidebarVisible && <Sidebar />}
      <ExcalidrawEditor />
    </div>
  )
}

export default App