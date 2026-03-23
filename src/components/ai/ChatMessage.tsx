import { StreamingText } from './StreamingText'

interface Props {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isStreaming = false }: Props) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] rounded-lg bg-blue-600/20 border border-blue-600/30 px-3 py-2 text-sm text-gray-200">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="max-w-[90%] rounded-lg bg-gray-800/50 border border-gray-700/50 px-3 py-2">
        <StreamingText text={content} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
