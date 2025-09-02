/**
 * 国际化类型定义
 * Internationalization Type Definitions
 */

/**
 * 支持的语言列表
 */
export type SupportedLanguage = 'zh-CN' | 'en-US'

/**
 * 语言配置
 */
export interface LanguageConfig {
  /** 语言代码 */
  code: SupportedLanguage
  /** 显示名称（本地化） */
  displayName: string
  /** 英文名称 */
  englishName: string
  /** 语言方向 */
  direction: 'ltr' | 'rtl'
  /** 是否为默认语言 */
  isDefault?: boolean
}

/**
 * 翻译键值对结构
 */
export interface TranslationKeys {
  // 应用基础
  app: {
    name: string
    description: string
    developer: string
    version: string
  }

  // 菜单系统
  menu: {
    file: string
    edit: string
    view: string
    preferences: string
    window: string
    help: string
    
    // File menu
    openDirectory: string
    newFile: string
    save: string
    saveAs: string
    recentDirectories: string
    clearRecent: string
    quit: string

    // Edit menu
    cut: string
    copy: string
    paste: string
    selectAll: string

    // View menu
    toggleSidebar: string
    zoomIn: string
    zoomOut: string
    resetZoom: string
    fullscreen: string

    // Preferences menu
    aiSettings: string
    generalSettings: string

    // Help menu
    keyboardShortcuts: string
    about: string
  }

  // AI 功能
  ai: {
    // AI Tools 菜单
    aiTools: string
    textToDiagram: string
    aiSettings: string

    // AI Settings 对话框
    settings: {
      title: string
      description: string
      provider: string
      apiKey: string
      apiUrl: string
      model: string
      testConnection: string
      testing: string
      save: string
      saving: string
      cancel: string
    }

    // 测试连接结果
    test: {
      success: string
      saveSuccess: string
      authFailed: string
      rateLimited: string
      timeout: string
      networkError: string
      connectionFailed: string
      unknownError: string
      testRequired: string
    }

    // Text to Chart 对话框
    textToChart: {
      title: string
      description: string
      inputLabel: string
      inputPlaceholder: string
      chartType: string
      complexity: string
      simple: string
      detailed: string
      language: string
      generate: string
      generating: string
      cancel: string
      tokenEstimate: string
      configStatus: string
      configured: string
      needsConfig: string
      validationErrors: {
        tooShort: string
        tooFewWords: string
        tooLong: string
        notDetailed: string
      }
      preview: {
        mermaidCode: string
        chartPreview: string
        backToEdit: string
        regenerate: string
        importToCanvas: string
        previewComingSoon: string
      }
    }

    // 图表类型
    chartTypes: {
      flowchart: string
      sequenceDiagram: string
      classDiagram: string
      stateDiagram: string
      erDiagram: string
      gantt: string
      mindmap: string
      timeline: string
    }

    // AI 提供商
    providers: {
      openai: string
      azure: string
      custom: string
    }
  }

  // 布局工具
  layout: {
    layoutTools: string
    autoLayout: string
    tree: string
    layer: string
    grid: string
    circle: string
    gridAlign: string
    smartGroup: string
    verticalFlow: string
    horizontalFlow: string
    // 工具描述
    gridAlignDesc: string
    smartGroupDesc: string
    verticalFlowDesc: string
    horizontalFlowDesc: string
    // 错误消息
    selectElementsFirst: string
    
    // Layout selection dialog
    dialog: {
      title: string
      description: string
      apply: string
      cancel: string
      algorithms: {
        [key: string]: {
          name: string
          description: string
          bestFor: string[]
        }
      }
    }
  }

  // 设置
  settings: {
    description: string
    languageSettings: string
    displayLanguage: string
    autoDetect: string
    appSettings: string
    theme: string
    themePlaceholder: string
    autoSave: string
    autoSavePlaceholder: string
    changeSuccess: string
    changeFailed: string
    unknownError: string
  }

  // 素材库
  library: {
    importing: string
    importSuccess: string
    importError: string
    importEmpty: string
    downloadingMessage: string
    successMessage: string
    errorMessage: string
    emptyMessage: string
  }

  // 通用词汇
  common: {
    save: string
    cancel: string
    confirm: string
    delete: string
    edit: string
    add: string
    remove: string
    search: string
    loading: string
    error: string
    success: string
    warning: string
    info: string
    close: string
  }

  // 文件管理
  file: {
    // 侧边栏
    noDirectory: string
    selectDirectory: string
    createFile: string
    refreshFiles: string
    newFile: string
    newFolder: string
    createFolder: string
    noFilesFound: string
    fileCount: string
    
    // 文件状态
    unsavedChanges: string
    fileModified: string
    
    // 空状态
    emptyState: {
      title: string
      subtitle: string
      selectAction: string
      noFiles: string
      newFileHint: string
      tip: string
    }
  }

  // 对话框和消息
  dialog: {
    // 保存确认
    saveConfirm: {
      title: string
      message: string
      save: string
      dontSave: string
      cancel: string
    }

    // 关闭确认
    closeConfirm: {
      title: string
      message: string
      closeWithoutSaving: string
      goBack: string
    }

    // 语言切换重启确认
    languageRestart: {
      title: string
      message: string
      restart: string
      cancel: string
    }

    // 删除确认
    deleteConfirm: {
      fileTitle: string
      folderTitle: string
      fileMessage: string
      folderMessage: string
      confirmDelete: string
      cancel: string
    }

    // 错误消息
    errors: {
      createFolderFailed: string
      deleteFailed: string
      moveFailed: string
    }

    // 目录树操作
    treeOperations: {
      deleteFile: string
      deleteFolder: string
      newFolder: string
      newSubfolder: string
      rename: string
    }

    // 通用
    ok: string
    cancel: string
    confirm: string
    error: string
    warning: string
    info: string
  }

  // 状态和反馈
  status: {
    loading: string
    saving: string
    saved: string
    failed: string
    connecting: string
    connected: string
    disconnected: string
  }

  // 键盘快捷键
  shortcuts: {
    title: string
    description: string
    categories: {
      file: string
      edit: string
      view: string
      preferences: string
      window: string
    }
  }
}

/**
 * 国际化配置
 */
export interface I18nConfig {
  /** 当前语言 */
  currentLanguage: SupportedLanguage
  /** 备用语言 */
  fallbackLanguage: SupportedLanguage
  /** 是否自动检测系统语言 */
  autoDetect: boolean
  /** 语言切换历史 */
  languageHistory: SupportedLanguage[]
}

/**
 * 翻译函数类型
 */
export type TranslationFunction = (key: string, params?: Record<string, string | number>) => string

/**
 * 支持的语言配置列表
 */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'zh-CN',
    displayName: '简体中文',
    englishName: 'Simplified Chinese',
    direction: 'ltr',
    isDefault: true
  },
  {
    code: 'en-US', 
    displayName: 'English (US)',
    englishName: 'English (US)',
    direction: 'ltr',
    isDefault: false
  }
]

/**
 * 默认国际化配置
 */
export const DEFAULT_I18N_CONFIG: I18nConfig = {
  currentLanguage: 'zh-CN',
  fallbackLanguage: 'en-US',
  autoDetect: false, // 禁用自动检测，避免重启后语言冲突
  languageHistory: ['zh-CN']
}