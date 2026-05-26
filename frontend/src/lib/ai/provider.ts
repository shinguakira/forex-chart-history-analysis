import type { Delta, Message, Role } from '@/generated/bindings'
import { rspc, rspcWs } from '@/lib/rspc'
import type { AIMessage, AIProvider, AIStreamCallbacks } from '@/types/ai'

class BackendProvider implements AIProvider {
  readonly name = 'backend'

  async stream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const wireMessages: Message[] = messages.map((m) => ({
        role: m.role as Role,
        content: m.content,
      }))
      let buffer = ''
      let settled = false
      let unsubscribe: (() => void) | null = null
      const finish = (err?: Error) => {
        if (settled) return
        settled = true
        try {
          unsubscribe?.()
        } catch {}
        if (err) {
          callbacks.onError(err)
        } else {
          callbacks.onComplete(buffer)
        }
        resolve()
      }
      if (signal) {
        if (signal.aborted) {
          finish(new Error('aborted'))
          return
        }
        signal.addEventListener('abort', () => finish(new Error('aborted')), { once: true })
      }
      unsubscribe = rspcWs.addSubscription(['ai.stream', { messages: wireMessages }], {
        onData: (d: Delta) => {
          if (d.type === 'token') {
            buffer += d.text
            callbacks.onToken(d.text)
          } else if (d.type === 'done') {
            finish()
          } else if (d.type === 'error') {
            finish(new Error(d.message))
          }
        },
        onError: (e) => finish(new Error(e.message)),
      })
    })
  }

  isConfigured(): boolean {
    // Backend has its own .env-driven configuration. The Settings dialog uses
    // isAIConfigured() to query the authoritative value. Optimistically true.
    return true
  }
}

// Legacy ProviderConfig shape, accepted but ignored — kept so existing callsites
// can be migrated incrementally without rewriting every signature.
export interface ProviderConfig {
  type?: 'claude' | 'ollama'
  apiKey?: string
  ollamaUrl?: string
  ollamaModel?: string
}

const SINGLETON = new BackendProvider()

export function createProvider(_config: ProviderConfig = {}): AIProvider {
  return SINGLETON
}

export async function isAIConfigured(): Promise<boolean> {
  return (await rspc.query(['ai.isConfigured'])) as boolean
}
