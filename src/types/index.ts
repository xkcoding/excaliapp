export interface ExcalidrawFile {
  name: string
  path: string
  modified: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  is_directory: boolean
  modified: boolean
  children?: FileTreeNode[]
}

export interface AppState {
  currentDirectory: string | null
  files: ExcalidrawFile[]
  activeFile: ExcalidrawFile | null
  recentDirectories: string[]
}

export interface Preferences {
  lastDirectory: string | null
  recentDirectories: string[]
  theme: 'light' | 'dark' | 'system'
  sidebarVisible: boolean
}