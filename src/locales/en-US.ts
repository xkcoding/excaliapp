/**
 * English (US) Translations
 * 英文翻译
 */

import { TranslationKeys } from '../types/i18n'

export const translations: TranslationKeys = {
  // App basics
  app: {
    name: 'OwnExcaliDesk',
    description: 'Local Excalidraw Desktop Application',
    developer: '👨‍💻 Baixuan (Yangkai.Shen)',
    version: 'Version: {{version}} | Build: {{buildDate}}'
  },

  // Menu system
  menu: {
    file: 'File',
    edit: 'Edit', 
    view: 'View',
    preferences: 'Preferences',
    window: 'Window',
    help: 'Help',
    
    // File menu
    openDirectory: 'Open Directory',
    newFile: 'New File',
    save: 'Save',
    saveAs: 'Save As',
    recentDirectories: 'Recent Directories',
    clearRecent: 'Clear Recent',
    quit: 'Quit',

    // Edit menu
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',

    // View menu
    toggleSidebar: 'Toggle Sidebar',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset Zoom',
    fullscreen: 'Toggle Fullscreen',

    // Preferences menu
    aiSettings: 'AI Settings',
    generalSettings: 'General Settings',

    // Help menu
    keyboardShortcuts: 'Keyboard Shortcuts',
    about: 'About'
  },

  // AI Features
  ai: {
    // AI Tools menu
    aiTools: 'AI Tools',
    textToDiagram: 'Text to Diagram',
    aiSettings: 'AI Settings',

    // AI Settings dialog
    settings: {
      title: 'AI Configuration Settings',
      description: 'Configure AI service providers and API settings for text-to-chart functionality',
      provider: 'AI Provider',
      apiKey: 'API Key',
      apiUrl: 'API URL',
      model: 'Model',
      testConnection: '🔗 Test Connection',
      testing: 'Testing connection...',
      save: 'Save',
      saving: 'Validating...',
      cancel: 'Cancel'
    },

    // Test connection results
    test: {
      success: '✅ Connection test successful! AI service is responding normally',
      saveSuccess: '✅ Configuration saved successfully',
      authFailed: '❌ Authentication failed: Please check if API Key is correct',
      rateLimited: '⚠️ Rate limit exceeded: Please try again later',
      timeout: '⏰ Connection timeout: Please check network or API URL',
      networkError: '🌐 Network error: Please check network connection and API URL',
      connectionFailed: '❌ Connection failed: HTTP {{status}}',
      unknownError: '❌ Unknown error',
      testRequired: '⚠️ Please test connection first before saving'
    },

    // Text to Chart dialog
    textToChart: {
      title: 'Text to Diagram',
      description: 'Use AI to convert text descriptions into visual diagrams',
      inputLabel: 'Description',
      inputPlaceholder: 'Please describe the diagram you want to create...\nFor example: user login flow, system architecture, data flow, etc.',
      chartType: 'Chart Type',
      complexity: 'Complexity',
      simple: 'Simple',
      detailed: 'Detailed',
      language: 'Language',
      generate: 'Generate Diagram',
      generating: 'Generating...',
      cancel: 'Cancel',
      tokenEstimate: 'Estimated usage: {{tokens}} tokens',
      configStatus: 'AI Configuration Status',
      configured: '✅ Configured',
      needsConfig: '❌ Needs Configuration',
      validationErrors: {
        tooShort: 'Description must be at least 10 characters',
        tooFewWords: 'Description must be at least 2 words',
        tooLong: 'Description too long, may exceed model limits',
        notDetailed: 'Description not detailed enough'
      },
      preview: {
        mermaidCode: 'Generated Mermaid Code',
        chartPreview: 'Chart Preview',
        backToEdit: '← Back to Edit',
        regenerate: 'Regenerate',
        importToCanvas: '📥 Import to Canvas',
        previewComingSoon: '🖼️ Mermaid preview coming soon'
      }
    },

    // Chart types
    chartTypes: {
      flowchart: 'Flowchart',
      sequenceDiagram: 'Sequence Diagram',
      classDiagram: 'Class Diagram',
      stateDiagram: 'State Diagram',
      erDiagram: 'ER Diagram',
      gantt: 'Gantt Chart',
      mindmap: 'Mind Map',
      timeline: 'Timeline'
    },

    // AI providers
    providers: {
      openai: 'OpenAI',
      azure: 'Azure OpenAI',
      custom: 'Custom'
    }
  },

  // Layout tools
  layout: {
    layoutTools: 'Layout Tools',
    autoLayout: 'Auto Layout',
    gridAlign: 'Grid Align',
    smartGroup: 'Smart Group',
    verticalFlow: 'Vertical Flow',
    horizontalFlow: 'Horizontal Flow',
    // Tool descriptions
    gridAlignDesc: 'Align selected elements to grid',
    smartGroupDesc: 'Group nearby elements intelligently',
    verticalFlowDesc: 'Arrange elements in vertical flow',
    horizontalFlowDesc: 'Arrange elements in horizontal flow',
    // Error messages
    selectElementsFirst: 'Please select at least one element',
    
    // Layout selection dialog
    dialog: {
      title: 'Choose Layout Style',
      description: 'Select the most appropriate layout for {{count}} selected elements:',
      apply: 'Apply Layout',
      cancel: 'Cancel',
      
      // Layout algorithms
      algorithms: {
        mrtree: {
          name: 'Symmetric Flowchart Layout',
          description: 'Designed for flowcharts with symmetric branching and balanced decision nodes',
          bestFor: ['Flowcharts', 'Decision Trees', 'Branch Logic', 'Conditional Flows']
        },
        layered: {
          name: 'Sequential Steps Layout',
          description: 'Arrange elements in logical vertical sequence for clear step-by-step flows',
          bestFor: ['Process Steps', 'Sequence Diagrams', 'Workflows', 'Linear Flows']
        },
        box: {
          name: 'Compact Architecture Layout',
          description: 'Tight component arrangement to save space and show complex system relationships',
          bestFor: ['System Architecture', 'Component Relations', 'Module Diagrams', 'Microservices']
        },
        stress: {
          name: 'Network Relations Layout',
          description: 'Optimize connections intelligently to minimize crossings in complex networks',
          bestFor: ['Relation Networks', 'Dependency Graphs', 'Complex Connections', 'Web Structures']
        },
        grid: {
          name: 'Clean Grid Layout',
          description: 'Neat grid arrangement for simple and organized element display',
          bestFor: ['Card Displays', 'Icon Arrays', 'Simple Grouping', 'Regular Display']
        }
      },
      
      bestForLabel: 'Best for:'
    }
  },

  // Settings
  settings: {
    description: 'Configure basic application settings including language and interface preferences',
    languageSettings: 'Language Settings',
    displayLanguage: 'Display Language',
    autoDetect: 'Auto-detect system language',
    appSettings: 'App Settings',
    theme: 'Theme',
    themePlaceholder: 'Theme switching will be available in future versions',
    autoSave: 'Auto-save',
    autoSavePlaceholder: 'Auto-save settings will be available in future versions',
    changeSuccess: '✅ Language switched successfully',
    changeFailed: '❌ Language switch failed: {{error}}',
    unknownError: 'Unknown error'
  },

  // Common words
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
    close: 'Close'
  },

  // File management
  file: {
    // Sidebar
    noDirectory: 'No directory selected',
    selectDirectory: 'Select Directory',
    createFile: 'Create File',
    refreshFiles: 'Refresh Files',
    newFile: 'New File',
    newFolder: 'New Folder',
    createFolder: 'Create a new folder',
    noFilesFound: 'No .excalidraw files found',
    fileCount: '{{count}} file{{count === 1 ? "" : "s"}}',
    
    // File status
    unsavedChanges: 'Unsaved changes',
    fileModified: 'File modified',
    
    // Empty state
    emptyState: {
      title: 'Welcome to OwnExcaliDesk',
      subtitle: 'Please select a directory to start creating and editing diagrams',
      selectAction: 'Select Directory',
      noFiles: 'No Excalidraw files found in the current directory.\nCreate your first drawing to get started!',
      newFileHint: 'Use the "New File" button in the sidebar',
      tip: '💡 Tip: You can drag files between folders to organize your drawings'
    }
  },

  // Dialogs and messages
  dialog: {
    // Save confirmation
    saveConfirm: {
      title: 'Save Your Work? - OwnExcaliDesk',
      message: 'You have unsaved changes in your current drawing.\n\nYour creative work is important! Would you like to save it before closing the application?',
      save: 'Save & Close',
      dontSave: "Don't Save",
      cancel: 'Cancel'
    },

    // Close confirmation
    closeConfirm: {
      title: 'Confirm Close Without Saving - OwnExcaliDesk',
      message: 'Warning: All your unsaved changes will be permanently lost!\n\nThis action cannot be undone. Are you sure you want to continue?',
      closeWithoutSaving: 'Close Without Saving',
      goBack: 'Go Back'
    },

    // Delete confirmation
    deleteConfirm: {
      fileTitle: '🗑️ Delete File',
      folderTitle: '🗑️ Delete Folder',
      fileMessage: '⚠️ This will permanently delete the file "{{fileName}}".\n\nThis action cannot be undone!\n\nAre you sure?',
      folderMessage: '⚠️ DANGER: This will permanently delete the folder "{{folderName}}" and ALL files inside it.\n\nThis action cannot be undone!\n\nAre you absolutely sure?',
      confirmDelete: '🗑️ Yes, Delete {{itemType}}',
      cancel: '❌ Cancel'
    },

    // Error messages
    errors: {
      createFolderFailed: 'Failed to create folder: {{error}}',
      deleteFailed: 'Failed to delete {{itemType}}: {{error}}',
      moveFailed: 'Failed to move file: {{error}}'
    },

    // Tree operations
    treeOperations: {
      deleteFile: 'Delete File', 
      deleteFolder: 'Delete Folder',
      newFolder: 'New Folder {{timestamp}}',
      newSubfolder: 'New Subfolder',
      rename: 'Rename'
    },

    // General
    ok: 'OK',
    cancel: 'Cancel',
    confirm: 'Confirm',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
  },

  // Status and feedback
  status: {
    loading: 'Loading...',
    saving: 'Saving...',
    saved: 'Saved',
    failed: 'Failed',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected'
  },

  // Keyboard shortcuts
  shortcuts: {
    title: 'Keyboard Shortcuts',
    description: 'List of application keyboard shortcuts',
    categories: {
      file: 'File Operations',
      edit: 'Edit Operations',
      view: 'View Operations',
      preferences: 'Preferences',
      window: 'Window Operations'
    }
  }
}

export default translations