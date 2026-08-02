import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createProvider, isAIConfigured } from '@/lib/ai/provider'
import { rspc } from '@/lib/rspc'
import { useAIStore } from '@/store/ai-store'

export function SettingsDialog() {
  const { provider, settingsOpen, setProvider, setSettingsOpen } = useAIStore()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const qc = useQueryClient()
  const cfg = useQuery({
    queryKey: ['meta.config'],
    queryFn: () => rspc.query(['meta.config', null]),
  })
  const aiConfigured = useQuery({
    queryKey: ['ai.isConfigured'],
    queryFn: () => isAIConfigured(),
  })
  const setConfigMut = useMutation({
    mutationFn: (input: {
      candleSourceDefault?: 'db' | 'yahoo'
      aiProvider?: 'claude' | 'ollama'
    }) => rspc.mutation(['meta.setConfig', input]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta.config'] })
      qc.invalidateQueries({ queryKey: ['candles.list'] })
    },
  })

  if (!settingsOpen) return null

  const handleClose = () => {
    setSettingsOpen(false)
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const p = createProvider()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Chart data source</label>
            <div className="flex gap-2">
              {(['yahoo', 'db'] as const).map((src) => {
                const active = cfg.data?.candleSourceDefault === src
                return (
                  <button
                    key={src}
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded ${active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    onClick={() => setConfigMut.mutate({ candleSourceDefault: src })}
                    disabled={setConfigMut.isPending}
                  >
                    {src === 'yahoo' ? 'Yahoo (live)' : 'Database (cached)'}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Choose whether candles.list reads from Yahoo Finance directly or from the local DB.
              Run a backfill on the Ingestion page first if you switch to Database.
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">AI provider preference</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded ${provider === 'claude' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                onClick={() => setProvider('claude')}
              >
                Claude
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded ${provider === 'ollama' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                onClick={() => setProvider('ollama')}
              >
                Ollama
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              The actual provider is chosen by the backend's AI_PROVIDER env var. Set
              ANTHROPIC_API_KEY (Claude) or OLLAMA_URL/OLLAMA_MODEL (Ollama) in the backend .env.
              Status:{' '}
              <span className={aiConfigured.data ? 'text-green-400' : 'text-red-400'}>
                {aiConfigured.data ? 'configured' : 'not configured'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test AI Connection'}
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
            className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
