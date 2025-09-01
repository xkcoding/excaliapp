import { MoreToolsMenu } from './index'

interface ExcalidrawToolbarProps {
  excalidrawAPI: any
}

/**
 * Custom toolbar component that integrates with Excalidraw
 * This component will be rendered as part of Excalidraw's main toolbar
 */
export function ExcalidrawToolbar({ excalidrawAPI }: ExcalidrawToolbarProps) {
  return (
    <div className="excalidraw-toolbar-custom">
      <MoreToolsMenu 
        excalidrawAPI={excalidrawAPI}
        onToolExecuted={(toolName) => {
          console.log('More Tools - Tool executed:', toolName)
        }}
      />
    </div>
  )
}