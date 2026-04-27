import type { AIProvider } from '@/types/ai'
import { ClaudeProvider } from './claude-provider'
import { OllamaProvider } from './ollama-provider'

interface ProviderConfig {
  type: 'claude' | 'ollama'
  apiKey: string
  ollamaUrl: string
  ollamaModel: string
}

export function createProvider(config: ProviderConfig): AIProvider {
  if (config.type === 'ollama') {
    return new OllamaProvider(config.ollamaUrl, config.ollamaModel)
  }
  return new ClaudeProvider(config.apiKey)
}
