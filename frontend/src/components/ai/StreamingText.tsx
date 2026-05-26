interface Props {
  text: string
  isStreaming?: boolean
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-white mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-white mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$1. $2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export function StreamingText({ text, isStreaming = false }: Props) {
  if (!text) return null

  return (
    <div className="text-sm text-gray-300 leading-relaxed">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  )
}
