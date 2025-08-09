import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { ExcalidrawFile, Preferences } from '../types'

interface AppStore {
  // State
  currentDirectory: string | null
  files: ExcalidrawFile[]
  activeFile: ExcalidrawFile | null
  fileContent: string | null
  preferences: Preferences
  sidebarVisible: boolean
  isDirty: boolean
  autoSaveTimer: ReturnType<typeof setInterval> | null

  // Actions
  setCurrentDirectory: (dir: string | null) => void
  setFiles: (files: ExcalidrawFile[]) => void
  setActiveFile: (file: ExcalidrawFile | null) => void
  setFileContent: (content: string | null) => void
  setPreferences: (prefs: Preferences) => void
  setSidebarVisible: (visible: boolean) => void
  setIsDirty: (dirty: boolean) => void
  markFileAsModified: (filePath: string, modified: boolean) => void
  
  // Async actions
  loadDirectory: (dir: string) => Promise<void>
  loadFile: (file: ExcalidrawFile) => Promise<void>
  saveCurrentFile: (content?: string) => Promise<void>
  createNewFile: (fileName: string) => Promise<void>
  loadPreferences: () => Promise<void>
  savePreferences: () => Promise<void>
  toggleSidebar: () => void
  startAutoSave: () => void
  stopAutoSave: () => void
}

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  currentDirectory: null,
  files: [],
  activeFile: null,
  fileContent: null,
  preferences: {
    lastDirectory: null,
    recentDirectories: [],
    theme: 'system',
    sidebarVisible: true,
  },
  sidebarVisible: true,
  isDirty: false,
  autoSaveTimer: null,

  // Basic setters
  setCurrentDirectory: (dir) => set({ currentDirectory: dir }),
  setFiles: (files) => set({ files }),
  setActiveFile: (file) => set({ activeFile: file }),
  setFileContent: (content) => set({ fileContent: content }),
  setPreferences: (prefs) => set({ preferences: prefs }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  
  markFileAsModified: (filePath, modified) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.path === filePath ? { ...f, modified } : f
      ),
    }))
  },

  // Load directory and list files
  loadDirectory: async (dir) => {
    try {
      const files = await invoke<ExcalidrawFile[]>('list_excalidraw_files', {
        directory: dir,
      })
      
      set({
        currentDirectory: dir,
        files,
        activeFile: null,
        fileContent: null,
      })
      
      // Update preferences with recent directory
      const prefs = get().preferences
      const recentDirs = prefs.recentDirectories.filter((d) => d !== dir)
      recentDirs.unshift(dir)
      if (recentDirs.length > 10) {
        recentDirs.pop()
      }
      
      const newPrefs = {
        ...prefs,
        lastDirectory: dir,
        recentDirectories: recentDirs,
      }
      
      set({ preferences: newPrefs })
      await get().savePreferences()
      
      // Start watching directory
      await invoke('watch_directory', { directory: dir })
    } catch (error) {
      console.error('Failed to load directory:', error)
    }
  },

  // Load file content
  loadFile: async (file) => {
    const state = get()
    
    // Save current file if dirty
    if (state.isDirty && state.activeFile) {
      await state.saveCurrentFile()
    }
    
    try {
      const content = await invoke<string>('read_file', {
        filePath: file.path,
      })
      
      set({
        activeFile: file,
        fileContent: content,
        isDirty: false,
      })
      
      // Start auto-save
      state.startAutoSave()
    } catch (error) {
      console.error('Failed to load file:', error)
    }
  },

  // Save current file
  saveCurrentFile: async (content) => {
    const state = get()
    const { activeFile, fileContent } = state
    
    if (!activeFile) return
    
    const contentToSave = content || fileContent
    if (!contentToSave) return
    
    try {
      await invoke('save_file', {
        filePath: activeFile.path,
        content: contentToSave,
      })
      
      state.markFileAsModified(activeFile.path, false)
      set({ isDirty: false })
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  },

  // Create new file
  createNewFile: async (fileName) => {
    const state = get()
    const { currentDirectory } = state
    
    if (!currentDirectory) return
    
    try {
      const filePath = await invoke<string>('create_new_file', {
        directory: currentDirectory,
        fileName,
      })
      
      // Reload directory to show new file
      await state.loadDirectory(currentDirectory)
      
      // Load the new file
      const newFile = state.files.find((f) => f.path === filePath)
      if (newFile) {
        await state.loadFile(newFile)
      }
    } catch (error) {
      console.error('Failed to create new file:', error)
    }
  },

  // Load preferences
  loadPreferences: async () => {
    try {
      const prefs = await invoke<Preferences>('get_preferences')
      console.log('Loaded preferences:', prefs)
      set({
        preferences: prefs,
        sidebarVisible: prefs.sidebarVisible !== undefined ? prefs.sidebarVisible : true,
      })
      
      // Apply theme
      const root = document.documentElement
      if (prefs.theme === 'dark') {
        root.classList.add('dark')
      } else if (prefs.theme === 'light') {
        root.classList.remove('dark')
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
      
      // Load last directory if exists
      if (prefs.lastDirectory) {
        await get().loadDirectory(prefs.lastDirectory)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  },

  // Save preferences
  savePreferences: async () => {
    const { preferences } = get()
    try {
      // Ensure all required fields are present
      const prefsToSave = {
        lastDirectory: preferences.lastDirectory || null,
        recentDirectories: preferences.recentDirectories || [],
        theme: preferences.theme || 'system',
        sidebarVisible: preferences.sidebarVisible !== undefined ? preferences.sidebarVisible : true,
      }
      await invoke('save_preferences', { preferences: prefsToSave })
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  },

  // Toggle sidebar
  toggleSidebar: () => {
    const state = get()
    const newVisible = !state.sidebarVisible
    set({ sidebarVisible: newVisible })
    
    // Update preferences
    const newPrefs = { ...state.preferences, sidebarVisible: newVisible }
    set({ preferences: newPrefs })
    state.savePreferences()
  },

  // Auto-save functionality
  startAutoSave: () => {
    const state = get()
    
    // Clear existing timer
    if (state.autoSaveTimer) {
      clearInterval(state.autoSaveTimer)
    }
    
    // Set up new timer (30 seconds)
    const timer = setInterval(() => {
      if (get().isDirty) {
        get().saveCurrentFile()
      }
    }, 30000)
    
    set({ autoSaveTimer: timer })
  },

  stopAutoSave: () => {
    const { autoSaveTimer } = get()
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      set({ autoSaveTimer: null })
    }
  },
}))