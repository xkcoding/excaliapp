/**
 * Layout Selection Dialog
 * Allows users to choose the most appropriate layout algorithm with clear descriptions
 */

import { useState } from 'react'
import { useTranslation } from '../../store/useI18nStore'
import type { LayoutAlgorithmType } from '../../types/layout'

interface LayoutOption {
  id: LayoutAlgorithmType
  name: string
  description: string
  icon: string
  bestFor: string[]
  spacing: { x: number; y: number }
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
}

interface LayoutSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (algorithm: LayoutAlgorithmType, spacing: { x: number; y: number }, direction?: string) => void
  elementCount: number
}

export function LayoutSelectionDialog({ 
  isOpen, 
  onClose, 
  onSelect, 
  elementCount 
}: LayoutSelectionDialogProps) {
  const { t } = useTranslation()
  const [selectedOption, setSelectedOption] = useState<LayoutOption | null>(null)

  const layoutOptions: LayoutOption[] = [
    {
      id: 'mrtree',
      name: t('layout.dialog.algorithms.mrtree.name'),
      description: t('layout.dialog.algorithms.mrtree.description'),
      icon: '🔀',
      bestFor: [t('layout.dialog.algorithms.mrtree.bestFor')],
      spacing: { x: 120, y: 100 },
      direction: 'DOWN'
    },
    {
      id: 'layered',
      name: t('layout.dialog.algorithms.layered.name'),
      description: t('layout.dialog.algorithms.layered.description'),
      icon: '📋',
      bestFor: [t('layout.dialog.algorithms.layered.bestFor')],
      spacing: { x: 150, y: 80 },
      direction: 'DOWN'
    },
    {
      id: 'box',
      name: t('layout.dialog.algorithms.box.name'),
      description: t('layout.dialog.algorithms.box.description'),
      icon: '📦',
      bestFor: [t('layout.dialog.algorithms.box.bestFor')],
      spacing: { x: 100, y: 80 }
    },
    {
      id: 'stress',
      name: t('layout.dialog.algorithms.stress.name'),
      description: t('layout.dialog.algorithms.stress.description'),
      icon: '🕸️',
      bestFor: [t('layout.dialog.algorithms.stress.bestFor')],
      spacing: { x: 100, y: 100 }
    },
    {
      id: 'grid',
      name: t('layout.dialog.algorithms.grid.name'),
      description: t('layout.dialog.algorithms.grid.description'),
      icon: '⚏',
      bestFor: [t('layout.dialog.algorithms.grid.bestFor')],
      spacing: { x: 80, y: 80 }
    }
  ]

  const handleApply = () => {
    if (selectedOption) {
      onSelect(selectedOption.id, selectedOption.spacing, selectedOption.direction)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('layout.dialog.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            {t('layout.dialog.description', { count: elementCount })}
          </div>

          <div className="space-y-3">
            {layoutOptions.map((option) => (
              <div
                key={option.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedOption?.id === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedOption(option)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{option.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{option.name}</h3>
                      <div className="text-xs text-gray-500">
                        间距: {option.spacing.x}×{option.spacing.y}
                        {option.direction && ` • 方向: ${option.direction}`}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500">{t('layout.dialog.bestForLabel')}</span>
                      {option.bestFor.map((use, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t('layout.dialog.cancel')}
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedOption}
              className={`px-6 py-2 rounded-md transition-colors ${
                selectedOption
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('layout.dialog.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}