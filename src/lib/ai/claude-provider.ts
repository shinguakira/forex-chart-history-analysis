import type { AIMessage, AIProvider, AIStreamCallbacks } from '@/types/ai'

export class ClaudeProvider implements AIProvider {
  readonly name = 'Claude'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async stream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    const systemMessages = messages.filter((m) => m.role === 'system')
    const nonSystemMessages = messages.filter((m) => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      stream: true,
      messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
    }

    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join('\n\n')
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      const text = await res.text()
      callbacks.onError(new Error(`Claude API error ${res.status}: ${text}`))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      callbacks.onError(new Error('No response body'))
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text
              callbacks.onToken(event.delta.text)
            }
            if (event.type === 'error') {
              callbacks.onError(new Error(event.error?.message ?? 'Unknown stream error'))
              return
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
      callbacks.onComplete(fullText)
    } catch (err) {
      if (signal?.aborted) return
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
