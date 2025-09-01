import { useState, useEffect, useCallback } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { 
  Grid, 
  Group, 
  ArrowDown, 
  ArrowRight, 
  FileText, 
  MoreHorizontal,
  Sparkles,
  Layout
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useLayoutTools } from './hooks/useLayoutTools'
import { useAITools } from './hooks/useAITools'
import { useTranslation } from '../../store/useI18nStore'
import { useAIConfig } from '../../store/useAIConfigStore'
import { 
  MoreToolsMenuProps, 
  ToolItem, 
  ToolGroup, 
  ExcalidrawElement,
  ExcalidrawAppState 
} from './types'

export function MoreToolsMenu({ excalidrawAPI, onToolExecuted }: MoreToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const [selectedElements, setSelectedElements] = useState<ExcalidrawElement[]>([])
  const [isExecuting, setIsExecuting] = useState<string | null>(null)

  const layoutTools = useLayoutTools(excalidrawAPI)
  const aiTools = useAITools(excalidrawAPI)
  const { isValid: isAIConfigured } = useAIConfig()

  // Update selected elements when excalidraw state changes
  useEffect(() => {
    if (!excalidrawAPI) return

    const updateSelectedElements = () => {
      try {
        const appState: ExcalidrawAppState = excalidrawAPI.getAppState()
        const sceneElements: ExcalidrawElement[] = excalidrawAPI.getSceneElements()
        
        const selected = sceneElements.filter((element: ExcalidrawElement) => 
          appState.selectedElementIds[element.id]
        )
        setSelectedElements(selected)
      } catch (error) {
        console.warn('Failed to get selected elements:', error)
        setSelectedElements([])
      }
    }

    // Initial update
    updateSelectedElements()

    // Listen for changes (if available)
    const interval = setInterval(updateSelectedElements, 1000)
    
    return () => clearInterval(interval)
  }, [excalidrawAPI])

  // Check if tool is disabled based on requirements
  const isToolDisabled = useCallback((tool: ToolItem): { disabled: boolean; reason?: string } => {
    if (tool.disabled) {
      return { disabled: true, reason: tool.disabledReason }
    }

    if (tool.requiresSelectedElements && selectedElements.length === 0) {
      return { 
        disabled: true, 
        reason: t('layout.selectElementsFirst') 
      }
    }

    if (tool.minElementsRequired && selectedElements.length < tool.minElementsRequired) {
      return { 
        disabled: true, 
        reason: `Please select at least ${tool.minElementsRequired} elements` 
      }
    }

    return { disabled: false }
  }, [selectedElements])

  // Execute tool action
  const handleToolAction = useCallback(async (tool: ToolItem) => {
    const { disabled, reason } = isToolDisabled(tool)
    
    if (disabled) {
      console.warn(`Tool "${tool.label}" is disabled: ${reason}`)
      return
    }

    try {
      setIsExecuting(tool.id)
      await tool.action()
      onToolExecuted?.(tool.id)
      setIsOpen(false)
    } catch (error) {
      console.error(`Failed to execute tool "${tool.label}":`, error)
    } finally {
      setIsExecuting(null)
    }
  }, [isToolDisabled, onToolExecuted])

  // Define tool groups
  const toolGroups: ToolGroup[] = [
    {
      title: t('layout.layoutTools'),
      icon: Layout,
      items: [
        {
          id: 'grid-align',
          label: t('layout.gridAlign'),
          description: t('layout.gridAlignDesc'),
          icon: Grid,
          action: layoutTools.gridAlign,
          requiresSelectedElements: true,
          minElementsRequired: 1
        },
        {
          id: 'smart-group',
          label: t('layout.smartGroup'),
          description: t('layout.smartGroupDesc'),
          icon: Group,
          action: layoutTools.smartGroup,
          requiresSelectedElements: true,
          minElementsRequired: 2
        },
        {
          id: 'vertical-flow',
          label: t('layout.verticalFlow'),
          description: t('layout.verticalFlowDesc'),
          icon: ArrowDown,
          action: layoutTools.verticalFlow,
          requiresSelectedElements: true,
          minElementsRequired: 2
        },
        {
          id: 'horizontal-flow',
          label: t('layout.horizontalFlow'),
          description: t('layout.horizontalFlowDesc'),
          icon: ArrowRight,
          action: layoutTools.horizontalFlow,
          requiresSelectedElements: true,
          minElementsRequired: 2
        }
      ]
    },
    {
      title: t('ai.aiTools'),
      icon: Sparkles,
      items: [
        {
          id: 'text-to-diagram',
          label: t('ai.textToDiagram'),
          description: t('ai.textToChart.description'),
          icon: FileText,
          action: aiTools.textToDiagram,
          requiresSelectedElements: false,
          disabled: !isAIConfigured,
          disabledReason: !isAIConfigured ? t('ai.textToChart.needsConfig') : undefined
        }
      ]
    }
  ]

  if (!excalidrawAPI) {
    return null
  }

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg",
            "bg-white text-gray-700 hover:text-gray-900",
            "hover:bg-gray-50 active:bg-gray-100",
            "shadow-md hover:shadow-lg border border-gray-200",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            isOpen && "bg-blue-50 text-blue-700 border-blue-200"
          )}
          title={`${t('layout.layoutTools')} & ${t('ai.aiTools')}`}
          aria-label={`${t('layout.layoutTools')} & ${t('ai.aiTools')}`}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-64 max-w-80 p-1",
            "bg-white rounded-lg shadow-lg border border-gray-200",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=top]:slide-in-from-bottom-2"
          )}
          sideOffset={8}
          align="start"
        >
          {toolGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <group.icon className="w-3 h-3" />
                {group.title}
              </div>

              {/* Group items */}
              {group.items.map((tool) => {
                const { disabled, reason } = isToolDisabled(tool)
                const executing = isExecuting === tool.id

                return (
                  <DropdownMenu.Item
                    key={tool.id}
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 mx-1 rounded-md cursor-pointer",
                      "transition-colors duration-150",
                      !disabled && !executing && [
                        "hover:bg-gray-50 focus:bg-gray-50",
                        "focus:outline-none"
                      ],
                      disabled && [
                        "opacity-50 cursor-not-allowed",
                        "hover:bg-transparent focus:bg-transparent"
                      ],
                      executing && [
                        "bg-blue-50 cursor-wait",
                        "opacity-75"
                      ]
                    )}
                    disabled={disabled || executing}
                    onSelect={(event) => {
                      event.preventDefault()
                      if (!disabled && !executing) {
                        handleToolAction(tool)
                      }
                    }}
                  >
                    {/* Tool icon */}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0",
                      !disabled && !executing && "bg-gray-100 text-gray-600",
                      disabled && "bg-gray-50 text-gray-400",
                      executing && "bg-blue-100 text-blue-600"
                    )}>
                      {executing ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <tool.icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Tool content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {tool.label}
                      </div>
                      <div className={cn(
                        "text-xs mt-0.5 leading-relaxed",
                        disabled ? "text-gray-400" : "text-gray-500"
                      )}>
                        {disabled && reason ? reason : tool.description}
                      </div>
                      
                      {/* Element count indicator */}
                      {tool.requiresSelectedElements && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            selectedElements.length > 0 
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          )}>
                            {selectedElements.length} selected
                          </div>
                        </div>
                      )}
                    </div>
                  </DropdownMenu.Item>
                )
              })}

              {/* Separator between groups */}
              {groupIndex < toolGroups.length - 1 && (
                <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
              )}
            </div>
          ))}

          <DropdownMenu.Arrow className="fill-white" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}