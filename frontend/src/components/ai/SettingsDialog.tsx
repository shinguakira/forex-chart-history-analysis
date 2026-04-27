import { useState } from 'react'
import { createProvider } from '@/lib/ai/provider'
import { useAIStore } from '@/store/ai-store'

export function SettingsDialog() {
  const {
    provider,
    apiKey,
    ollamaUrl,
    ollamaModel,
    settingsOpen,
    setProvider,
    setApiKey,
    setOllamaUrl,
    setOllamaModel,
    setSettingsOpen,
  } = useAIStore()

  const [localKey, setLocalKey] = useState(apiKey)
  const [localUrl, setLocalUrl] = useState(ollamaUrl)
  const [localModel, setLocalModel] = useState(ollamaModel)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  if (!settingsOpen) return null

  const handleSave = () => {
    setApiKey(localKey)
    setOllamaUrl(localUrl)
    setOllamaModel(localModel)
    setSettingsOpen(false)
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const p = createProvider({
        type: provider,
        apiKey: localKey,
        ollamaUrl: localUrl,
        ollamaModel: localModel,
      })
      if (!p.isConfigured()) {
        setTestResult('Error: Not configured')
        setTesting(false)
        return
      }
      let received = false
      await p.stream([{ role: 'user', content: 'Say "ok" and nothing else.' }], {
        onToken: () => {
          received = true
        },
        onComplete: () => {
          setTestResult(received ? 'Connected successfully' : 'No response received')
          setTesting(false)
        },
        onError: (err) => {
          setTestResult(`Error: ${err.message}`)
          setTesting(false)
        },
      })
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setTesting(false)
    }
  }

  const envHint = (envVar: string, value: string) =>
    value ? <span className="text-xs text-gray-600 ml-1">(from {envVar})</span> : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h2 className="text-lg font-bold text-white mb-4">AI Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Provider</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded ${provider === 'claude' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                onClick={() => setProvider('claude')}
              >
                Claude API
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded ${provider === 'ollama' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                onClick={() => setProvider('ollama')}
              >
                Ollama
              </button>
            </div>
          </div>

          {provider === 'claude' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                API Key
                {envHint('VITE_CLAUDE_API_KEY', import.meta.env.VITE_CLAUDE_API_KEY ?? '')}
              </label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  className="px-2 text-xs text-gray-400 hover:text-gray-200"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">Set VITE_CLAUDE_API_KEY in .env</p>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  URL
                  {envHint('VITE_OLLAMA_URL', import.meta.env.VITE_OLLAMA_URL ?? '')}
                </label>
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">Set VITE_OLLAMA_URL in .env</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Model
                  {envHint('VITE_OLLAMA_MODEL', import.meta.env.VITE_OLLAMA_MODEL ?? '')}
                </label>
                <input
                  type="text"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder="plutus"
                  className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">Set VITE_OLLAMA_MODEL in .env</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
              <span
                className={`text-xs ${testResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}
              >
                {testResult}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            onClick={() => {
              setSettingsOpen(false)
              setTestResult(null)
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
