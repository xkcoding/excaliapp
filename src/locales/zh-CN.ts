/**
 * 简体中文翻译
 * Simplified Chinese Translations
 */

import { TranslationKeys } from '../types/i18n'

export const translations: TranslationKeys = {
  // 应用基础
  app: {
    name: 'OwnExcaliDesk',
    description: '本地 Excalidraw 桌面应用',
    developer: '👨‍💻 柏玄 (Yangkai.Shen)',
    version: '版本: {{version}} | 构建时间: {{buildDate}}'
  },

  // 菜单系统
  menu: {
    file: '文件',
    edit: '编辑', 
    view: '视图',
    preferences: '偏好设置',
    window: '窗口',
    help: '帮助',
    
    // File menu
    openDirectory: '打开目录',
    newFile: '新建文件',
    save: '保存',
    saveAs: '另存为',
    recentDirectories: '最近目录',
    clearRecent: '清除最近记录',
    quit: '退出',

    // Edit menu
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',

    // View menu
    toggleSidebar: '切换侧边栏',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '重置缩放',
    fullscreen: '全屏',

    // Preferences menu
    aiSettings: 'AI 设置',
    generalSettings: '通用设置',

    // Help menu
    keyboardShortcuts: '键盘快捷键',
    about: '关于'
  },

  // AI 功能
  ai: {
    // AI Tools 菜单
    aiTools: 'AI 工具',
    textToDiagram: '文本转图表',
    aiSettings: 'AI 设置',

    // AI Settings 对话框
    settings: {
      title: 'AI 配置设置',
      description: '配置 AI 服务提供商和 API 设置，用于文本转图表功能',
      provider: 'AI 提供商',
      apiKey: 'API Key',
      apiUrl: 'API 地址',
      model: '模型',
      testConnection: '🔗 测试连接',
      testing: '测试连接中...',
      save: '保存',
      saving: '验证中...',
      cancel: '取消'
    },

    // 测试连接结果
    test: {
      success: '✅ 连接测试成功！AI 服务响应正常',
      saveSuccess: '✅ 配置已保存成功',
      authFailed: '❌ 认证失败：请检查 API Key 是否正确',
      rateLimited: '⚠️ 请求频率限制：请稍后再试',
      timeout: '⏰ 连接超时：请检查网络或 API 地址',
      networkError: '🌐 网络错误：请检查网络连接和 API 地址',
      connectionFailed: '❌ 连接失败：HTTP {{status}}',
      unknownError: '❌ 未知错误',
      testRequired: '⚠️ 请先测试连接成功后再保存'
    },

    // Text to Chart 对话框
    textToChart: {
      title: '文本转图表',
      description: '使用 AI 将文本描述转换为可视化图表',
      inputLabel: '描述内容',
      inputPlaceholder: '请描述您想要创建的图表...\n例如：用户登录流程、系统架构图、数据流程等',
      chartType: '图表类型',
      complexity: '复杂度',
      simple: '简单',
      detailed: '详细',
      language: '语言',
      generate: '生成图表',
      generating: '生成中...',
      cancel: '取消',
      tokenEstimate: '预计消耗：{{tokens}} tokens',
      configStatus: 'AI 配置状态',
      configured: '✅ 已配置',
      needsConfig: '❌ 需要配置',
      validationErrors: {
        tooShort: '描述至少需要10个字符',
        tooFewWords: '描述至少需要2个词',
        tooLong: '描述过长，可能超出模型限制',
        notDetailed: '描述不够详细'
      },
      preview: {
        mermaidCode: '生成的 Mermaid 代码',
        chartPreview: '图表预览',
        backToEdit: '← 返回编辑',
        regenerate: '重新生成',
        importToCanvas: '📥 导入到画布',
        previewComingSoon: '🖼️ Mermaid 预览功能即将推出'
      }
    },

    // 图表类型
    chartTypes: {
      flowchart: '流程图',
      sequenceDiagram: '时序图',
      classDiagram: '类图',
      stateDiagram: '状态图',
      erDiagram: 'ER图',
      gantt: '甘特图',
      mindmap: '思维导图',
      timeline: '时间线'
    },

    // AI 提供商
    providers: {
      openai: 'OpenAI',
      azure: 'Azure OpenAI',
      custom: '自定义'
    }
  },

  // 布局工具
  layout: {
    layoutTools: '布局工具',
    autoLayout: '自动布局',
    gridAlign: '网格对齐',
    smartGroup: '智能分组',
    verticalFlow: '垂直流程',
    horizontalFlow: '水平流程',
    // 工具描述
    gridAlignDesc: '将选中元素对齐到网格',
    smartGroupDesc: '智能分组附近的元素',
    verticalFlowDesc: '垂直排列元素',
    horizontalFlowDesc: '水平排列元素',
    // 错误消息
    selectElementsFirst: '请至少选择一个元素',
    
    // 布局选择对话框
    dialog: {
      title: '选择布局方式',
      description: '为 {{count}} 个选中元素选择最合适的布局方式：',
      apply: '应用布局',
      cancel: '取消',
      
      // 布局算法
      algorithms: {
        mrtree: {
          name: '流程图对称布局',
          description: '专为流程图设计，判断分支左右对称，决策节点整齐排列',
          bestFor: ['流程图', '决策树', '分支逻辑', '条件判断']
        },
        layered: {
          name: '步骤序列布局',
          description: '按逻辑顺序垂直排列，适合有明确先后关系的流程',
          bestFor: ['操作步骤', '时序图', '工作流程', '线性流程']
        },
        box: {
          name: '紧凑架构布局',
          description: '紧密排列所有组件，节省空间，适合复杂系统展示',
          bestFor: ['系统架构', '组件关系', '模块图', '微服务']
        },
        stress: {
          name: '关系网络布局',
          description: '智能优化连接线，减少交叉，适合复杂关系展示',
          bestFor: ['关系网络', '依赖图', '复杂连接', '网状结构']
        },
        grid: {
          name: '整齐网格布局',
          description: '规整的网格排列，简洁美观，适合简单元素组织',
          bestFor: ['卡片展示', '图标排列', '简单分组', '规整展示']
        }
      },
      
      bestForLabel: '适用于:'
    }
  },

  // 文件管理
  file: {
    // 侧边栏
    noDirectory: '未选择目录',
    selectDirectory: '选择目录',
    createFile: '新建文件',
    refreshFiles: '刷新文件',
    newFile: '新建文件',
    newFolder: '新建文件夹',
    createFolder: '创建新文件夹',
    noFilesFound: '未找到 .excalidraw 文件',
    fileCount: '{{count}} 个文件',
    
    // 文件状态
    unsavedChanges: '未保存的更改',
    fileModified: '文件已修改',
    
    // 空状态
    emptyState: {
      title: '欢迎使用 OwnExcaliDesk',
      subtitle: '请选择一个目录开始创建和编辑图表',
      selectAction: '选择目录',
      noFiles: '当前目录中未找到 Excalidraw 文件。\n创建您的第一个绘图开始吧！',
      newFileHint: '使用侧边栏中的"新建文件"按钮',
      tip: '💡 提示：您可以在文件夹之间拖拽文件来整理绘图'
    }
  },

  // 设置
  settings: {
    description: '配置应用程序的基本设置，包括语言和界面偏好',
    languageSettings: '语言设置',
    displayLanguage: '显示语言',
    autoDetect: '自动检测系统语言',
    appSettings: '应用设置',
    theme: '主题',
    themePlaceholder: '主题切换功能将在后续版本中提供',
    autoSave: '自动保存',
    autoSavePlaceholder: '自动保存设置将在后续版本中提供',
    changeSuccess: '✅ 语言已切换成功',
    changeFailed: '❌ 语言切换失败: {{error}}',
    unknownError: '未知错误'
  },

  // 通用词汇
  common: {
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    remove: '移除',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    warning: '警告',
    info: '信息',
    close: '关闭'
  },

  // 对话框和消息
  dialog: {
    // 保存确认
    saveConfirm: {
      title: '保存您的作品？ - OwnExcaliDesk',
      message: '您在当前绘图中有未保存的更改。\n\n您的创意作品很重要！是否要在关闭应用程序前保存？',
      save: '保存并关闭',
      dontSave: '不保存',
      cancel: '取消'
    },

    // 关闭确认
    closeConfirm: {
      title: '确认不保存关闭 - OwnExcaliDesk',
      message: '警告：所有未保存的更改将永久丢失！\n\n此操作无法撤销。您确定要继续吗？',
      closeWithoutSaving: '不保存关闭',
      goBack: '返回'
    },

    // 语言切换重启确认
    languageRestart: {
      title: '🌐 重启应用以应用语言设置',
      message: '语言设置已更改为 {{language}}。\n\n应用需要重启以更新菜单栏和界面语言。\n\n是否立即重启？',
      restart: '🔄 立即重启',
      cancel: '❌ 稍后重启'
    },

    // 删除确认
    deleteConfirm: {
      fileTitle: '🗑️ 删除文件',
      folderTitle: '🗑️ 删除文件夹',
      fileMessage: '⚠️ 这将永久删除文件 "{{fileName}}"。\n\n此操作无法撤销！\n\n您确定吗？',
      folderMessage: '⚠️ 危险：这将永久删除文件夹 "{{folderName}}" 及其内部的所有文件。\n\n此操作无法撤销！\n\n您确定吗？',
      confirmDelete: '🗑️ 是的，删除{{itemType}}',
      cancel: '❌ 取消'
    },

    // 错误消息
    errors: {
      createFolderFailed: '创建文件夹失败：{{error}}',
      deleteFailed: '删除{{itemType}}失败：{{error}}',
      moveFailed: '移动文件失败：{{error}}'
    },

    // 目录树操作
    treeOperations: {
      deleteFile: '删除文件',
      deleteFolder: '删除文件夹', 
      newFolder: '新建文件夹 {{timestamp}}',
      newSubfolder: '新建子文件夹',
      rename: '重命名'
    },

    // 通用
    ok: '确定',
    cancel: '取消',
    confirm: '确认',
    error: '错误',
    warning: '警告',
    info: '信息'
  },

  // 状态和反馈
  status: {
    loading: '加载中...',
    saving: '保存中...',
    saved: '已保存',
    failed: '失败',
    connecting: '连接中...',
    connected: '已连接',
    disconnected: '已断开'
  },

  // 键盘快捷键
  shortcuts: {
    title: '键盘快捷键',
    description: '应用程序的键盘快捷键列表',
    categories: {
      file: '文件操作',
      edit: '编辑操作',
      view: '视图操作',
      preferences: '偏好设置',
      window: '窗口操作'
    }
  }
}

export default translations