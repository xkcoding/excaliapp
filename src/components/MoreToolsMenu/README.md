# MoreToolsMenu Component

The `MoreToolsMenu` component provides advanced layout and AI-powered tools for ExcaliApp. It integrates seamlessly with the Excalidraw editor to provide intelligent element arrangement and content generation capabilities.

## Features

### Layout Tools
- **Grid Align**: Snap selected elements to the canvas grid for precise positioning
- **Smart Group**: Create visual groups around nearby elements with bounding boxes
- **Vertical Flow**: Arrange selected elements in a vertical flow with equal spacing
- **Horizontal Flow**: Arrange selected elements in a horizontal flow with equal spacing

### AI Tools
- **Text to Diagram**: Generate diagrams from text descriptions (flowcharts, org charts, system architecture, mind maps)

## Usage

```tsx
import { MoreToolsMenu } from './components/MoreToolsMenu'

// In your Excalidraw component
<MoreToolsMenu 
  excalidrawAPI={excalidrawAPI}
  onToolExecuted={(toolName) => {
    console.log('Tool executed:', toolName)
  }}
/>
```

## Props

- `excalidrawAPI` (required): The Excalidraw API instance for canvas operations
- `onToolExecuted` (optional): Callback function called when a tool is executed

## Component Architecture

```
MoreToolsMenu/
├── index.tsx              # Main menu component with dropdown UI
├── hooks/
│   ├── useLayoutTools.ts  # Layout operations hook
│   └── useAITools.ts      # AI-powered tools hook
├── types.ts               # TypeScript definitions
├── ExcalidrawToolbar.tsx  # Toolbar integration component
└── README.md              # This file
```

## Integration

The component is integrated as a floating toolbar in the top-right corner of the Excalidraw canvas:

```tsx
{/* Floating More Tools Menu */}
{excalidrawAPI && (
  <div className="absolute top-4 right-4 z-10">
    <MoreToolsMenu 
      excalidrawAPI={excalidrawAPI}
      onToolExecuted={(toolName) => {
        console.log('More Tools - Tool executed:', toolName)
      }}
    />
  </div>
)}
```

## Tool Requirements

Each tool has specific requirements:

- **Grid Align**: Requires at least 1 selected element
- **Smart Group**: Requires at least 2 selected elements  
- **Vertical Flow**: Requires at least 2 selected elements
- **Horizontal Flow**: Requires at least 2 selected elements
- **Text to Diagram**: No selection required

## Accessibility

The component includes:
- Keyboard navigation support through Radix UI
- Screen reader compatibility
- Focus management
- Proper ARIA labels and descriptions
- Disabled state indicators with explanations

## Customization

The component uses:
- TailwindCSS for styling
- Lucide React icons
- Radix UI primitives for accessibility
- TypeScript for type safety

Colors and styling can be customized by modifying the Tailwind classes in the component files.

## Error Handling

- Tool execution errors are logged and displayed to the user
- Invalid element operations are prevented with validation
- Graceful fallbacks for API failures
- User-friendly error messages

## Performance

- Debounced element selection updates
- Lazy loading of tool operations  
- Minimal re-renders through proper memoization
- Efficient element filtering and updates