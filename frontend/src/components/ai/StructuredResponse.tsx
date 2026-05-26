import { useMemo } from 'react'

interface Props {
  text: string
  isStreaming?: boolean
}

interface Section {
  title: string
  content: string
  type: SectionType
}

type SectionType =
  | 'banner-good'
  | 'banner-bad'
  | 'banner-neutral'
  | 'highlight'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'info'
  | 'action'
  | 'default'

// --- Section type detection ---

const SECTION_TYPE_MAP: [RegExp, SectionType][] = [
  // Banners (verdict, overview, assessment) — detected content determines good/bad
  [/verdict/i, 'banner-neutral'], // overridden by content analysis
  [/overall\s*assessment/i, 'banner-neutral'],
  [/market\s*overview/i, 'highlight'],
  // Positive
  [/strength/i, 'positive'],
  [/opportunit/i, 'positive'],
  [/setup/i, 'positive'],
  // Negative
  [/weakness/i, 'negative'],
  [/risk/i, 'warning'],
  // Info/analysis
  [/forecast/i, 'highlight'],
  [/key\s*levels/i, 'info'],
  [/levels/i, 'info'],
  [/cross.?pair/i, 'info'],
  [/correlation/i, 'info'],
  [/entry\s*analysis/i, 'info'],
  [/exit\s*analysis/i, 'info'],
  [/technical/i, 'info'],
  [/direction/i, 'info'],
  [/pattern/i, 'info'],
  [/risk\s*management/i, 'warning'],
  // Action
  [/action\s*item/i, 'action'],
  [/improvement/i, 'action'],
  [/improve/i, 'action'],
  [/suggestion/i, 'action'],
]

function detectSectionType(title: string, content: string): SectionType {
  for (const [pattern, type] of SECTION_TYPE_MAP) {
    if (pattern.test(title)) {
      // For verdict/assessment, analyze content for positive/negative sentiment
      if (type === 'banner-neutral') {
        return detectBannerSentiment(content)
      }
      return type
    }
  }
  return 'default'
}

function detectBannerSentiment(content: string): SectionType {
  const lower = content.toLowerCase()
  const positiveSignals = [
    'good',
    'well-timed',
    'profit',
    'strong',
    'solid',
    'excellent',
    'correct',
    'smart',
    'optimal',
    'positive',
  ]
  const negativeSignals = [
    'bad',
    'poor',
    'loss',
    'weak',
    'premature',
    'late',
    'wrong',
    'mistake',
    'missed',
    'negative',
    'suboptimal',
  ]
  const posCount = positiveSignals.filter((w) => lower.includes(w)).length
  const negCount = negativeSignals.filter((w) => lower.includes(w)).length
  if (posCount > negCount) return 'banner-good'
  if (negCount > posCount) return 'banner-bad'
  return 'banner-neutral'
}

// --- Section styles ---

interface SectionStyle {
  border: string
  headerBg: string
  headerText: string
  icon: string
  glow?: string
}

const SECTION_STYLES: Record<SectionType, SectionStyle> = {
  'banner-good': {
    border: 'border-green-500/60',
    headerBg: 'bg-green-500/15',
    headerText: 'text-green-300',
    icon: 'check-circle',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.08)]',
  },
  'banner-bad': {
    border: 'border-red-500/60',
    headerBg: 'bg-red-500/15',
    headerText: 'text-red-300',
    icon: 'x-circle',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.08)]',
  },
  'banner-neutral': {
    border: 'border-blue-500/60',
    headerBg: 'bg-blue-500/15',
    headerText: 'text-blue-300',
    icon: 'info',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.08)]',
  },
  highlight: {
    border: 'border-cyan-500/50',
    headerBg: 'bg-cyan-500/10',
    headerText: 'text-cyan-300',
    icon: 'chart',
  },
  positive: {
    border: 'border-emerald-500/40',
    headerBg: 'bg-emerald-500/8',
    headerText: 'text-emerald-400',
    icon: 'trending-up',
  },
  negative: {
    border: 'border-red-400/40',
    headerBg: 'bg-red-500/8',
    headerText: 'text-red-400',
    icon: 'trending-down',
  },
  warning: {
    border: 'border-amber-500/40',
    headerBg: 'bg-amber-500/8',
    headerText: 'text-amber-400',
    icon: 'alert',
  },
  info: {
    border: 'border-blue-400/30',
    headerBg: 'bg-blue-500/6',
    headerText: 'text-blue-400',
    icon: 'search',
  },
  action: {
    border: 'border-violet-500/40',
    headerBg: 'bg-violet-500/8',
    headerText: 'text-violet-400',
    icon: 'zap',
  },
  default: {
    border: 'border-gray-700/50',
    headerBg: 'bg-gray-800/30',
    headerText: 'text-gray-400',
    icon: 'dot',
  },
}

// --- SVG Icons ---

function SectionIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? 'w-4 h-4'
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: cls,
  }

  switch (name) {
    case 'check-circle':
      return (
        <svg {...props}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'x-circle':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    case 'info':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    case 'trending-up':
      return (
        <svg {...props}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
    case 'trending-down':
      return (
        <svg {...props}>
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...props}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'zap':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
  }
}

// --- Parse sections ---

function parseSections(text: string): Section[] {
  const lines = text.split('\n')
  const sections: Section[] = []
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/)
    if (match) {
      if (currentTitle || currentLines.length > 0) {
        const content = currentLines.join('\n').trim()
        sections.push({
          title: currentTitle,
          content,
          type: detectSectionType(currentTitle, content),
        })
      }
      currentTitle = match[1]
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentTitle || currentLines.length > 0) {
    const content = currentLines.join('\n').trim()
    sections.push({ title: currentTitle, content, type: detectSectionType(currentTitle, content) })
  }

  return sections
}

// --- Inline formatting ---

function inlineFormat(text: string): string {
  return (
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-gray-200 italic">$1</em>')
      .replace(
        /`(.+?)`/g,
        '<code class="px-1.5 py-0.5 bg-gray-800 rounded text-[11px] text-blue-300 font-mono">$1</code>',
      )
      // Highlight prices (e.g., 149.500, 1.0850)
      .replace(
        /(\d{1,3}\.\d{2,5})/g,
        '<span class="font-mono text-white bg-gray-800/60 px-1 rounded">$1</span>',
      )
      // Highlight percentages
      .replace(/([+-]?\d+\.?\d*%)/g, '<span class="font-mono font-medium">$1</span>')
      // Highlight yen amounts
      .replace(/(¥[+-]?[\d,]+)/g, '<span class="font-mono font-medium">$1</span>')
  )
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
}

// --- Table rendering ---

function detectCellSentiment(cell: string): string {
  const lower = cell.toLowerCase().trim()
  // Bullish/bearish bias
  if (/\bbullish\b|\blong\b|\bbuy\b|\bup\b/.test(lower)) return 'text-green-400 font-medium'
  if (/\bbearish\b|\bshort\b|\bsell\b|\bdown\b/.test(lower)) return 'text-red-400 font-medium'
  // Support/resistance
  if (/\bsupport\b/.test(lower)) return 'text-green-400'
  if (/\bresistance\b/.test(lower)) return 'text-red-400'
  // High/medium/low confidence
  if (/\bhigh\b/.test(lower)) return 'text-green-400 font-medium'
  if (/\bmedium\b|\bmoderate\b/.test(lower)) return 'text-yellow-400'
  if (/\blow\b/.test(lower)) return 'text-gray-500'
  return ''
}

function renderTable(rows: string[]): string {
  const parsed = rows.map((row) =>
    row
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean),
  )

  if (parsed.length < 2)
    return rows.map((r) => `<p class="text-sm text-gray-300">${r}</p>`).join('')

  const isSeparator = parsed[1].every((cell) => /^[-:]+$/.test(cell))
  const headerRow = parsed[0]
  const dataRows = isSeparator ? parsed.slice(2) : parsed.slice(1)

  let html = '<div class="overflow-x-auto my-3 rounded-lg border border-gray-800/80">'
  html += '<table class="w-full text-xs border-collapse">'
  html += '<thead><tr>'
  for (const cell of headerRow) {
    html += `<th class="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 bg-gray-800/60">${stripMarkdown(cell)}</th>`
  }
  html += '</tr></thead><tbody>'

  for (let i = 0; i < dataRows.length; i++) {
    const bg = i % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-800/20'
    html += `<tr class="${bg} hover:bg-gray-800/40 transition-colors">`
    for (let j = 0; j < dataRows[i].length; j++) {
      const cell = dataRows[i][j]
      const sentiment = detectCellSentiment(cell)
      const isFirstCol = j === 0
      const base = isFirstCol ? 'text-white font-medium' : sentiment || 'text-gray-300'
      html += `<td class="px-3 py-2 ${base} border-b border-gray-800/30">${inlineFormat(cell)}</td>`
    }
    html += '</tr>'
  }

  html += '</tbody></table></div>'
  return html
}

// --- Content rendering ---

function renderContent(content: string, sectionType: SectionType): string {
  if (!content) return ''

  const lines = content.split('\n')
  const html: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table block
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows: string[] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i].trim())
        i++
      }
      html.push(renderTable(tableRows))
      continue
    }

    // H3 header
    const h3Match = line.match(/^###\s+(.+)$/)
    if (h3Match) {
      html.push(
        `<div class="flex items-center gap-2 mt-4 mb-2"><div class="w-1 h-4 rounded-full bg-gray-600"></div><h3 class="text-sm font-semibold text-white">${inlineFormat(h3Match[1])}</h3></div>`,
      )
      i++
      continue
    }

    // Bullet list
    if (line.match(/^\s*[-*]\s/)) {
      const listType =
        sectionType === 'positive'
          ? 'emerald'
          : sectionType === 'negative'
            ? 'red'
            : sectionType === 'warning'
              ? 'amber'
              : sectionType === 'action'
                ? 'violet'
                : 'gray'
      html.push('<ul class="space-y-2 my-3">')
      while (i < lines.length && lines[i].match(/^\s*[-*]\s/)) {
        const item = lines[i].replace(/^\s*[-*]\s/, '')
        html.push(
          `<li class="flex gap-3 text-sm text-gray-300 leading-relaxed">` +
            `<span class="mt-2 w-1.5 h-1.5 rounded-full bg-${listType}-500/60 shrink-0"></span>` +
            `<span>${inlineFormat(item)}</span></li>`,
        )
        i++
      }
      html.push('</ul>')
      continue
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s/)) {
      html.push('<ol class="space-y-3 my-3">')
      let num = 1
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s/)) {
        const item = lines[i].replace(/^\s*\d+\.\s/, '')
        const numColor =
          sectionType === 'action'
            ? 'bg-violet-500/20 text-violet-400'
            : 'bg-blue-500/20 text-blue-400'
        html.push(
          `<li class="flex gap-3 text-sm text-gray-300 leading-relaxed">` +
            `<span class="shrink-0 w-5 h-5 rounded-full ${numColor} flex items-center justify-center text-[10px] font-bold mt-0.5">${num}</span>` +
            `<span>${inlineFormat(item)}</span></li>`,
        )
        num++
        i++
      }
      html.push('</ol>')
      continue
    }

    // Empty line
    if (line.trim() === '') {
      html.push('<div class="h-1.5"></div>')
      i++
      continue
    }

    // Horizontal rule
    if (line.trim().match(/^[-*_]{3,}$/)) {
      html.push('<hr class="border-gray-800/50 my-4">')
      i++
      continue
    }

    // Regular paragraph
    html.push(
      `<p class="text-[13px] text-gray-300 leading-relaxed my-1.5">${inlineFormat(line)}</p>`,
    )
    i++
  }

  return html.join('\n')
}

// --- Banner section (verdict / overview / assessment) ---

function BannerSection({
  section,
  isLast,
  isStreaming,
}: {
  section: Section
  isLast: boolean
  isStreaming: boolean
}) {
  const style = SECTION_STYLES[section.type]
  const rendered = useMemo(
    () => renderContent(section.content, section.type),
    [section.content, section.type],
  )

  return (
    <div className={`rounded-xl ${style.border} border ${style.glow ?? ''} overflow-hidden`}>
      <div className={`${style.headerBg} px-5 py-4`}>
        <div className="flex items-center gap-2.5 mb-2">
          <SectionIcon name={style.icon} className={`w-5 h-5 ${style.headerText}`} />
          <h2 className={`text-base font-bold ${style.headerText}`}>
            {stripMarkdown(section.title)}
          </h2>
        </div>
        <div className="text-[13px] text-gray-200 leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: rendered }} />
          {isLast && isStreaming && <StreamingCursor />}
        </div>
      </div>
    </div>
  )
}

// --- Standard section card ---

function SectionCard({
  section,
  isLast,
  isStreaming,
}: {
  section: Section
  isLast: boolean
  isStreaming: boolean
}) {
  const style = SECTION_STYLES[section.type]
  const rendered = useMemo(
    () => renderContent(section.content, section.type),
    [section.content, section.type],
  )

  // No title = preamble text
  if (!section.title) {
    if (!section.content) return null
    return (
      <div className="text-[13px] text-gray-400 mb-2">
        <div dangerouslySetInnerHTML={{ __html: rendered }} />
        {isLast && isStreaming && <StreamingCursor />}
      </div>
    )
  }

  // Banner types get special treatment
  if (section.type.startsWith('banner-') || section.type === 'highlight') {
    return <BannerSection section={section} isLast={isLast} isStreaming={isStreaming} />
  }

  return (
    <div
      className={`rounded-xl border ${style.border} bg-gray-900/40 overflow-hidden transition-colors`}
    >
      <div
        className={`${style.headerBg} px-4 py-2.5 border-b ${style.border} flex items-center gap-2`}
      >
        <SectionIcon name={style.icon} className={`w-3.5 h-3.5 ${style.headerText}`} />
        <h2 className={`text-xs font-bold uppercase tracking-wide ${style.headerText}`}>
          {stripMarkdown(section.title)}
        </h2>
      </div>
      <div className="px-4 py-3">
        <div dangerouslySetInnerHTML={{ __html: rendered }} />
        {isLast && isStreaming && <StreamingCursor />}
      </div>
    </div>
  )
}

function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />
  )
}

// --- Main component ---

export function StructuredResponse({ text, isStreaming = false }: Props) {
  const sections = useMemo(() => parseSections(text), [text])

  if (!text) return null

  // Fallback: no sections detected
  if (sections.length === 1 && !sections[0].title) {
    const rendered = renderContent(sections[0].content, 'default')
    return (
      <div className="text-[13px] text-gray-300 leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: rendered }} />
        {isStreaming && <StreamingCursor />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => (
        <SectionCard
          key={section.title || `pre-${i}`}
          section={section}
          isLast={i === sections.length - 1}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  )
}
