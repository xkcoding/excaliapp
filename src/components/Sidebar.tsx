import { ScrollArea } from '@radix-ui/react-scroll-area'
import { ChevronRight, File, FolderOpen, Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store/useStore'
import { invoke } from '@tauri-apps/api/core'

export function Sidebar() {
  const {
    currentDirectory,
    files,
    activeFile,
    loadFile,
    createNewFile,
  } = useStore()

  const handleSelectDirectory = async () => {
    const dir = await invoke<string | null>('select_directory')
    if (dir) {
      await useStore.getState().loadDirectory(dir)
    }
  }

  const handleNewFile = async () => {
    const fileName = prompt('Enter file name (without .excalidraw extension):')
    if (fileName) {
      await createNewFile(`${fileName}.excalidraw`)
    }
  }

  return (
    <div className="w-[280px] h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleSelectDirectory}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-sm font-medium truncate">
            {currentDirectory ? currentDirectory.split('/').pop() : 'Select Directory'}
          </span>
        </button>
        
        {currentDirectory && (
          <button
            onClick={handleNewFile}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New File</span>
          </button>
        )}
      </div>

      {/* File List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2">
          {files.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              {currentDirectory ? 'No .excalidraw files found' : 'No directory selected'}
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => loadFile(file)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors group',
                    'hover:bg-gray-100 hover:text-gray-900',
                    activeFile?.path === file.path && 'bg-blue-50 text-blue-900',
                    file.modified && 'font-semibold'
                  )}
                >
                  <File className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">
                    {file.name.replace('.excalidraw', '')}
                  </span>
                  {file.modified && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                  )}
                  {activeFile?.path === file.path && (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}