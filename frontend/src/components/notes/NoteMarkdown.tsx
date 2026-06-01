import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  source: string
}

// Per-element styling so we don't need the @tailwindcss/typography plugin.
// All elements stay inside the dark theme palette already used elsewhere.
export function NoteMarkdown({ source }: Props) {
  return (
    <div className="text-sm text-gray-200 leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mt-3 mb-1 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-white mt-3 mb-1 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-white mt-2 mb-1 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 last:mb-0 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => <li className="text-gray-200">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            // remark-gfm puts language-* on fenced code blocks; pass through
            // so a syntax-highlight rehype plugin could pick it up later.
            const isBlock = typeof className === 'string' && className.startsWith('language-')
            if (isBlock) {
              return (
                <code className={`${className} font-mono text-[12px] text-gray-100`}>
                  {children}
                </code>
              )
            }
            return (
              <code className="bg-gray-800 px-1 py-0.5 rounded text-[12px] font-mono text-gray-100">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-gray-800 p-2 rounded mb-2 last:mb-0 overflow-x-auto">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-700 pl-3 text-gray-400 italic mb-2 last:mb-0">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-3 border-gray-800" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2 last:mb-0">
              <table className="border-collapse text-[12px] min-w-full">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-700 px-2 py-1 bg-gray-800 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-700 px-2 py-1 align-top">{children}</td>
          ),
          input: ({ checked, type }) => {
            // remark-gfm renders task list checkboxes; keep them as static
            // visual markers (the source-of-truth is the markdown text).
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-1 align-middle accent-blue-500"
                />
              )
            }
            return <input type={type} />
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
