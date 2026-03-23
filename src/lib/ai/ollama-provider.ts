import type { AIMessage, AIProvider, AIStreamCallbacks } from '@/types/ai'

export class OllamaProvider implements AIProvider {
  readonly name = 'Ollama'
  private url: string
  private model: string

  constructor(url: string, model: string) {
    this.url = url.replace(/\/$/, '')
    this.model = model
  }

  isConfigured(): boolean {
    return this.model.length > 0 && this.url.length > 0
  }

  async stream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${this.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
      signal,
    })

    if (!res.ok) {
      const text = await res.text()
      callbacks.onError(new Error(`Ollama error ${res.status}: ${text}`))
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
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.message?.content) {
              fullText += event.message.content
              callbacks.onToken(event.message.content)
            }
          } catch {
            // skip
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
