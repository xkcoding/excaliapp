import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { cn } from '../lib/utils'
import { FileTreeNode } from '../types'
import { useStore } from '../store/useStore'
import { ask } from '@tauri-apps/plugin-dialog'

interface TreeViewProps {
  nodes: FileTreeNode[]
  onFileClick: (node: FileTreeNode) => void
  activeFilePath?: string
}

interface TreeNodeProps {
  node: FileTreeNode
  onFileClick: (node: FileTreeNode) => void
  activeFilePath?: string
  depth: number
}

function TreeNode({ node, onFileClick, activeFilePath, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(node.name.replace('.excalidraw', ''))
  const [showMenu, setShowMenu] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const { renameFile, deleteFile } = useStore()
  
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [isRenaming])
  
  const handleClick = () => {
    if (node.is_directory) {
      setIsExpanded(!isExpanded)
    } else {
      onFileClick(node)
    }
  }
  
  const handleRename = async () => {
    if (!newName.trim()) {
      setNewName(node.name.replace('.excalidraw', ''))
      setIsRenaming(false)
      return
    }
    
    const finalName = newName.trim()
    if (finalName !== node.name.replace('.excalidraw', '')) {
      await renameFile(node.path, finalName)
    }
    setIsRenaming(false)
  }
  
  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Close menu first
    setShowMenu(false)
    
    // Get the filename for clear confirmation
    const fileName = node.name.replace('.excalidraw', '')
    
    try {
      // Use Tauri's native dialog API for confirmation
      const confirmed = await ask(
        `Are you sure you want to delete "${fileName}"?`,
        {
          title: 'Confirm Deletion',
          kind: 'warning',
          okLabel: 'Delete',
          cancelLabel: 'Cancel'
        }
      )
      
      console.log('Tauri dialog response:', confirmed, 'for file:', fileName)
      
      // Check if user clicked Delete (true) or Cancel (false)
      if (confirmed === true) {
        console.log('✅ User clicked Delete, proceeding with deletion of:', node.path)
        // Delete the file
        try {
          await deleteFile(node.path)
          console.log('✅ File deleted successfully')
        } catch (error) {
          console.error('❌ Failed to delete file:', error)
          // Use Tauri dialog for error too
          const { message } = await import('@tauri-apps/plugin-dialog')
          await message(`Failed to delete file: ${error}`, { title: 'Error', kind: 'error' })
        }
      } else {
        console.log('❌ User clicked Cancel, file NOT deleted:', fileName)
      }
    } catch (error) {
      console.error('Error showing confirmation dialog:', error)
    }
  }
  
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!node.is_directory) {
      e.preventDefault()
      setShowMenu(true)
    }
  }
  
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }
  
  const isActive = activeFilePath === node.path
  const hasChildren = node.children && node.children.length > 0
  
  return (
    <div className="relative">
      <div
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors group relative',
          'hover:bg-gray-100 hover:text-gray-900',
          isActive && 'bg-blue-50 text-blue-900',
          node.modified && 'font-semibold'
        )}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.is_directory && hasChildren && (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )
        )}
        
        {node.is_directory && !hasChildren && (
          <div className="w-4 h-4 flex-shrink-0" />
        )}
        
        {node.is_directory ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-blue-600" />
          )
        ) : (
          <File className="w-4 h-4 flex-shrink-0 text-gray-600" />
        )}
        
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename()
              } else if (e.key === 'Escape') {
                setNewName(node.name.replace('.excalidraw', ''))
                setIsRenaming(false)
              }
            }}
            className="flex-1 text-sm px-1 py-0 border border-blue-500 rounded outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm truncate flex-1">
            {node.is_directory ? node.name : node.name.replace('.excalidraw', '')}
          </span>
        )}
        
        {node.modified && (
          <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
        )}
        
        {!node.is_directory && (
          <button
            onClick={handleMenuClick}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}
        
        {isActive && !node.is_directory && (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
      </div>
      
      {/* Context Menu */}
      {showMenu && !node.is_directory && (
        <div 
          className="absolute right-0 top-8 z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[150px]"
          onMouseLeave={() => setShowMenu(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsRenaming(true)
              setShowMenu(false)
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit2 className="w-3 h-3" />
            Rename
          </button>
          <button
            onClick={(e) => {
              console.log('Delete button clicked!')
              handleDelete(e)
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
      
      {node.is_directory && hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreeView({ nodes, onFileClick, activeFilePath }: TreeViewProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        No .excalidraw files found
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
          depth={0}
        />
      ))}
    </div>
  )
}