import { useEffect } from 'react'
import { X, Download, CheckCircle, AlertTriangle, Copy } from 'lucide-react'
import { useTranslation } from '../store/useI18nStore'

interface LibraryImportDialogProps {
  isOpen: boolean
  onClose: () => void
  status: 'downloading' | 'success' | 'error' | 'empty'
  itemCount?: number
  errorMessage?: string
}

export function LibraryImportDialog({
  isOpen,
  onClose,
  status,
  itemCount = 0,
  errorMessage
}: LibraryImportDialogProps) {
  const { t: rawT } = useTranslation()
  
  // Safe translation function that won't crash if i18n isn't ready
  const t = (key: string, params?: any) => {
    try {
      const result = rawT(key, params)
      return result === key ? getDefaultTranslation(key, params) : result
    } catch (error) {
      console.warn('Translation failed for key:', key, error)
      return getDefaultTranslation(key, params)
    }
  }
  
  // Fallback translations
  const getDefaultTranslation = (key: string, params?: any) => {
    const defaults: Record<string, string> = {
      'library.importing': '导入素材',
      'library.importSuccess': '导入成功', 
      'library.importError': '导入失败',
      'library.importEmpty': '素材库为空',
      'library.downloadingMessage': '正在下载素材库...',
      'library.successMessage': `成功导入 ${params?.count || 0} 个素材`,
      'library.errorMessage': '导入素材时发生错误',
      'library.emptyMessage': '选择的素材库没有可导入的内容',
      'common.ok': '确定'
    }
    return defaults[key] || key
  }
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // No auto close - all dialogs require manual close by user

  if (!isOpen) return null

  const getIcon = () => {
    switch (status) {
      case 'downloading':
        return <Download className="w-6 h-6 text-blue-500 animate-bounce" />
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error':
      case 'empty':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />
      default:
        return <Download className="w-6 h-6 text-blue-500" />
    }
  }

  const getIconBgColor = () => {
    switch (status) {
      case 'downloading':
        return 'bg-blue-100'
      case 'success':
        return 'bg-green-100'
      case 'error':
      case 'empty':
        return 'bg-orange-100'
      default:
        return 'bg-blue-100'
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'downloading':
        return t('library.importing')
      case 'success':
        return t('library.importSuccess')
      case 'error':
        return t('library.importError')
      case 'empty':
        return t('library.importEmpty')
      default:
        return t('library.importing')
    }
  }

  const getMessage = () => {
    switch (status) {
      case 'downloading':
        return t('library.downloadingMessage')
      case 'success':
        return t('library.successMessage', { count: itemCount })
      case 'error':
        return errorMessage || t('library.errorMessage')
      case 'empty':
        return t('library.emptyMessage')
      default:
        return ''
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && status !== 'downloading') {
      onClose()
    }
  }

  const handleCopyError = async () => {
    if (errorMessage && status === 'error') {
      try {
        await navigator.clipboard.writeText(errorMessage)
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
      }
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${getIconBgColor()}`}>
              {getIcon()}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getTitle()}
            </h3>
          </div>
          {status !== 'downloading' && (
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="px-6 pb-6">
          {((status === 'error' && errorMessage && errorMessage.includes('接收到的数据结构')) || 
            (status === 'success' && errorMessage && errorMessage.includes('调试信息'))) ? (
            <div className="space-y-3">
              <p className="text-gray-600 font-medium">📋 详细统计信息：</p>
              <div className="relative">
                <pre className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg text-sm max-h-80 overflow-y-auto font-mono border border-gray-200 leading-relaxed">
                  {errorMessage || ''}
                </pre>
                <button
                  onClick={handleCopyError}
                  className="absolute top-2 right-2 p-1 bg-white rounded border shadow-sm hover:bg-gray-50 transition-colors"
                  title="复制到剪贴板"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {getMessage()}
            </p>
          )}
          
          {/* Progress indicator for downloading */}
          {status === 'downloading' && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse bg-gradient-to-r from-blue-400 to-blue-600"></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        {status !== 'downloading' && (
          <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {t('common.ok')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}