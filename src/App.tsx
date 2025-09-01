import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Sidebar } from './components/Sidebar'
import { ExcalidrawEditor } from './components/ExcalidrawEditor'
import { useStore } from './store/useStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMenuHandler } from './hooks/useMenuHandler'
import { useDialog } from './contexts/DialogContext'
import { PanelLeft } from 'lucide-react'
import { AISettingsDialog } from './components/AISettingsDialog'
import { useI18nStore, useTranslation } from './store/useI18nStore'
import './index.css'

function App() {
  const { loadPreferences, loadDirectory, currentDirectory, sidebarVisible, isDirty, saveCurrentFile, toggleSidebar, activeFile } = useStore()
  const { showDialog } = useDialog()
  const { initialize: initializeI18n, isLoading: i18nLoading } = useI18nStore()
  const { t: rawT } = useTranslation()
  
  // Safe translation function that won't crash if i18n isn't ready
  const t = (key: string, params?: any) => {
    try {
      return rawT(key, params)
    } catch (error) {
      console.warn('Translation failed for key:', key, error)
      return key // Fallback to key itself
    }
  }
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)


  // Load preferences and setup on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App starting initialization...')
        await loadPreferences()
        console.log('✅ Preferences loaded')
        
        console.log('🌐 Initializing i18n...')
        await initializeI18n()
        console.log('✅ i18n initialized successfully')
        
        // Add a small delay to ensure everything is ready
        setTimeout(() => {
          setIsI18nInitialized(true)
          console.log('✅ App initialization complete')
        }, 100)
      } catch (error) {
        console.error('❌ Failed to initialize app:', error)
        // Even if failed, still show the app to prevent infinite loading
        setTimeout(() => {
          setIsI18nInitialized(true)
          console.log('⚠️ App forced to continue despite errors')
        }, 1000)
      }
    }
    initializeApp()
  }, [])

  // Listen for menu events
  useEffect(() => {
    const handleOpenAISettings = (event: any) => {
      console.log('🔧 App level: Opening AI Settings')
      const returnTo = event?.detail?.returnTo
      if (returnTo) {
        console.log('Will return to:', returnTo)
        // Store returnTo in URL for AI settings dialog to read
        const url = new URL(window.location)
        url.searchParams.set('returnTo', returnTo)
        window.history.pushState({}, '', url.toString())
      }
      setIsAISettingsOpen(true)
    }
    
    window.addEventListener('open-ai-settings', handleOpenAISettings)
    
    return () => {
      window.removeEventListener('open-ai-settings', handleOpenAISettings)
    }
  }, [])

  // Update window title based on active file
  useEffect(() => {
    const updateTitle = async () => {
      try {
        let title = 'OwnExcaliDesk'
        
        if (activeFile) {
          const fileName = activeFile.name.replace('.excalidraw', '')
          const dirtyIndicator = isDirty ? ' •' : ''
          // 使用绝对路径
          const absolutePath = activeFile.path
          title = `OwnExcaliDesk - ${fileName}${dirtyIndicator} (${absolutePath})`
        }
        
        console.log('🏷️ Updating window title to:', title)
        await invoke('set_title', { title })
      } catch (error) {
        console.error('Failed to set window title:', error)
      }
    }
    
    updateTitle()
  }, [activeFile, isDirty])

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
        // First ask if they want to save
        const shouldSave = await showDialog({
          title: t('dialog.saveConfirm.title'),
          message: t('dialog.saveConfirm.message'),
          type: 'info',
          confirmLabel: t('dialog.saveConfirm.save'),
          cancelLabel: t('dialog.saveConfirm.cancel'),
          showCancel: true
        })
        
        if (shouldSave === true) {
          // Save before closing
          await saveCurrentFile()
          await invoke('force_close_app')
        } else if (shouldSave === false) {
          // User chose "Cancel" - ask for confirmation to close without saving
          const reallyClose = await showDialog({
            title: t('dialog.closeConfirm.title'),
            message: t('dialog.closeConfirm.message'),
            type: 'warning',
            confirmLabel: t('dialog.closeConfirm.closeWithoutSaving'),
            cancelLabel: t('dialog.closeConfirm.goBack'),
            showCancel: true
          })
          
          if (reallyClose === true) {
            await invoke('force_close_app')
          }
          // If reallyClose is false or null (ESC/X), stay in the app
        }
        // If shouldSave is null (ESC/X pressed), don't close - user wants to stay
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

  // Emergency fallback - if stuck loading for too long, force show app
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (!isI18nInitialized) {
        console.warn('⚠️ Emergency timeout - forcing app to show')
        setIsI18nInitialized(true)
      }
    }, 5000) // 5 second emergency timeout

    return () => clearTimeout(emergencyTimeout)
  }, [isI18nInitialized])

  // Show loading screen while i18n is initializing
  if (!isI18nInitialized || i18nLoading) {
    return (
      <div className="h-screen flex bg-white text-gray-900 overflow-hidden items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-lg font-medium text-gray-700">OwnExcaliDesk</p>
          <p className="text-sm text-gray-500">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-white text-gray-900 overflow-hidden">
      {/* 侧边栏容器带动画 */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarVisible ? 'w-[280px]' : 'w-0'
        }`}
      >
        <Sidebar />
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 relative">
        {!sidebarVisible && (
          <button
            onClick={toggleSidebar}
            className="absolute bottom-20 left-4 z-[60] flex items-center justify-center w-10 h-10 rounded-lg shadow-xs hover:shadow-sm hover:bg-gray-100 transition-all duration-150 active:scale-95"
            style={{ backgroundColor: '#ECECF4' }}
            title={t('menu.toggleSidebar')}
          >
            <PanelLeft className="w-4 h-4 text-gray-700" />
          </button>
        )}
        <ExcalidrawEditor />
      </div>
      
      {/* AI Settings Dialog - Global level */}
      <AISettingsDialog
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
      />
      
    </div>
  )
}

export default App