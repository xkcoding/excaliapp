/**
 * AI Settings Dialog Component
 * Allows users to configure AI API settings
 */

import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Label from '@radix-ui/react-label'
import { useAIConfig } from '../../store/useAIConfigStore'
import { useTranslation } from '../../store/useI18nStore'
import { AI_PROVIDERS, AIConfig } from '../../types/ai-config'

export interface AISettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AISettingsDialog({ isOpen, onClose }: AISettingsDialogProps) {
  const { config, updateConfig, validateConfig } = useAIConfig()
  const { t } = useTranslation()
  const [tempConfig, setTempConfig] = useState(config)
  const [isValidating, setIsValidating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [validationResult, setValidationResult] = useState<string>('')
  const [hasTestedConnection, setHasTestedConnection] = useState(false)
  const [testResult, setTestResult] = useState<string>('')

  const handleSave = async () => {
    if (!hasTestedConnection) {
      setValidationResult(t('ai.test.testRequired'))
      return
    }

    try {
      setIsValidating(true)
      setValidationResult('')
      
      // First update config with temp values
      updateConfig(tempConfig)
      // Then validate the updated config
      await validateConfig()
      setValidationResult(t('ai.test.saveSuccess'))
      
      setTimeout(() => {
        onClose()
        setValidationResult('')
        setHasTestedConnection(false)
        
        // Check if we came from AI text-to-chart dialog and return to it
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('returnTo') === 'textToChart') {
          // Trigger event to reopen text to chart dialog
          window.dispatchEvent(new CustomEvent('reopen-text-to-chart'))
        }
      }, 1500)
    } catch (error) {
      setValidationResult(t('ai.test.unknownError'))
    } finally {
      setIsValidating(false)
    }
  }

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS[providerId]
    if (provider) {
      setTempConfig({
        ...tempConfig,
        baseUrl: provider.defaultConfig.baseUrl,
        model: provider.defaultConfig.model
      })
      setHasTestedConnection(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setIsTesting(true)
      setTestResult('')
      
      // Create test service with current temp config
      const testConfig: AIConfig = {
        ...tempConfig,
        maxTokens: 100, // Use minimal tokens for test
        timeout: 10000  // 10 second timeout for test
      }
      
      const response = await fetch(`${testConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testConfig.apiKey}`
        },
        body: JSON.stringify({
          model: testConfig.model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const data = await response.json()
        setTestResult(t('ai.test.success'))
        setHasTestedConnection(true)
      } else if (response.status === 401) {
        setTestResult(t('ai.test.authFailed'))
      } else if (response.status === 429) {
        setTestResult(t('ai.test.rateLimited'))
      } else {
        setTestResult(t('ai.test.connectionFailed', { status: response.status }))
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          setTestResult(t('ai.test.timeout'))
        } else if (error.message.includes('fetch')) {
          setTestResult(t('ai.test.networkError'))
        } else {
          setTestResult(t('ai.test.unknownError'))
        }
      } else {
        setTestResult(t('ai.test.unknownError'))
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-lg shadow-lg z-50 w-[500px] max-h-[80vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold mb-4">
            {t('ai.settings.title')}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-4">
            {t('ai.settings.description')}
          </Dialog.Description>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <Label.Root className="block text-sm font-medium mb-1">
                {t('ai.settings.provider')}
              </Label.Root>
              <Select.Root
                value={Object.entries(AI_PROVIDERS).find(([_, p]) => p.defaultConfig.baseUrl === tempConfig.baseUrl)?.[0] || 'custom'}
                onValueChange={handleProviderChange}
              >
                <Select.Trigger className="w-full p-2 border border-gray-300 rounded">
                  <Select.Value />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded shadow-lg">
                    <Select.Viewport>
                      {Object.entries(AI_PROVIDERS).map(([id, provider]) => (
                        <Select.Item
                          key={id}
                          value={id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <Select.ItemText>{provider.displayName}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* API Key */}
            <div>
              <Label.Root className="block text-sm font-medium mb-1">
                {t('ai.settings.apiKey')}
              </Label.Root>
              <input
                type="password"
                value={tempConfig.apiKey}
                onChange={(e) => {
                  setTempConfig({ ...tempConfig, apiKey: e.target.value })
                  setHasTestedConnection(false)
                }}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder={t('ai.settings.apiKey')}
              />
            </div>

            {/* Base URL */}
            <div>
              <Label.Root className="block text-sm font-medium mb-1">
                {t('ai.settings.apiUrl')}
              </Label.Root>
              <input
                type="url"
                value={tempConfig.baseUrl}
                onChange={(e) => {
                  setTempConfig({ ...tempConfig, baseUrl: e.target.value })
                  setHasTestedConnection(false)
                }}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="https://api.openai.com/v1"
              />
            </div>

            {/* Model */}
            <div>
              <Label.Root className="block text-sm font-medium mb-1">
                {t('ai.settings.model')}
              </Label.Root>
              <input
                type="text"
                value={tempConfig.model}
                onChange={(e) => {
                  setTempConfig({ ...tempConfig, model: e.target.value })
                  setHasTestedConnection(false)
                }}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="gpt-4o-mini"
              />
            </div>

            {/* Test Connection */}
            <div>
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !tempConfig.apiKey || !tempConfig.baseUrl}
                className="w-full p-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 disabled:opacity-50 text-sm"
              >
                {isTesting ? t('ai.settings.testing') : t('ai.settings.testConnection')}
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className="p-3 rounded bg-gray-50 text-sm">
                {testResult}
              </div>
            )}

            {/* Validation Result */}
            {validationResult && (
              <div className="p-3 rounded bg-gray-50 text-sm">
                {validationResult}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isValidating}
            >
              {t('ai.settings.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isValidating || !tempConfig.apiKey || !tempConfig.baseUrl || !hasTestedConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isValidating ? t('ai.settings.saving') : t('ai.settings.save')}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}