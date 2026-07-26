import { Volume2, VolumeX } from 'lucide-react'
import { useRef } from 'react'
import { useIsAIConfigured } from '@/hooks/use-is-ai-configured'
import { useIsMobile } from '@/hooks/use-media-query'
import { useAIStore } from '@/store/ai-store'
import { usePracticeStore } from '@/store/practice-store'
import type { PracticeView } from '@/types/practice'
import { SettingsDialog } from '../ai/SettingsDialog'
import { HistoryMode } from './HistoryMode'
import { PracticeStats } from './PracticeStats'
import { QuizMode } from './QuizMode'
import { ReplayMode } from './ReplayMode'
import { ResultFlash } from './ResultFlash'
import { SetupMode } from './SetupMode'
import { TradeReviewMode } from './TradeReviewMode'

const VIEWS: Array<{ id: PracticeView; label: string; desc: string }> = [
  { id: 'replay', label: 'Replay', desc: 'Step through bars and trade' },
  { id: 'quiz', label: 'Quiz', desc: 'Up or down? Quick reps' },
  { id: 'setup', label: 'Setup', desc: 'Judge the setup with reasoning' },
  { id: 'trade-review', label: 'Trade Review', desc: 'Judge your past real trades' },
  { id: 'history', label: 'History', desc: 'Review past answers' },
]

// Order used by the mobile swipe gesture — left/right between adjacent
// modes. History is intentionally outside the cycle.
const SWIPE_VIEWS: PracticeView[] = ['replay', 'quiz', 'setup', 'trade-review']
const SWIPE_THRESHOLD_PX = 60

export function PracticePage() {
  const view = usePracticeStore((s) => s.view)
  const setView = usePracticeStore((s) => s.setView)
  const soundMuted = usePracticeStore((s) => s.soundMuted)
  const setSoundMuted = usePracticeStore((s) => s.setSoundMuted)
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen)
  const { configured: aiConfigured, loading: aiConfigLoading } = useIsAIConfigured()
  const isMobile = useIsMobile()

  // Track the first touch point so onTouchEnd can decide if it was a
  // horizontal swipe. We only fire mode changes for swipes that started
  // outside the chart canvas — otherwise we'd hijack lightweight-charts'
  // own pan gesture.
  const swipeStart = useRef<{ x: number; y: number; ignore: boolean } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    if (view === 'history') return
    const t = e.touches[0]
    if (!t) return
    const ignore = !!(e.target as HTMLElement | null)?.closest('[data-no-swipe]')
    swipeStart.current = { x: t.clientX, y: t.clientY, ignore }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || start.ignore) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return // mostly-vertical → ignore
    const idx = SWIPE_VIEWS.indexOf(view as PracticeView)
    if (idx < 0) return
    const nextIdx = dx < 0 ? (idx + 1) % SWIPE_VIEWS.length : (idx - 1 + SWIPE_VIEWS.length) % SWIPE_VIEWS.length
    setView(SWIPE_VIEWS[nextIdx])
  }

  return (
    <div
      className="h-[calc(100vh-49px)] overflow-y-auto bg-[#0f1117] text-gray-200"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="max-w-7xl mx-auto px-4 py-4 pb-28 md:pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Practice</h1>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    view === v.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                  onClick={() => setView(v.id)}
                  title={v.desc}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {!aiConfigLoading && aiConfigured && (
              <span className="text-[10px] text-green-400">AI ready</span>
            )}
            <button
              type="button"
              aria-label={soundMuted ? 'Unmute verdict sounds' : 'Mute verdict sounds'}
              aria-pressed={soundMuted}
              title={soundMuted ? 'Sound off' : 'Sound on'}
              className="p-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              onClick={() => setSoundMuted(!soundMuted)}
            >
              {soundMuted ? (
                <VolumeX size={14} aria-hidden />
              ) : (
                <Volume2 size={14} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </button>
          </div>
        </div>

        <PracticeStats />

        {view === 'replay' && <ReplayMode />}
        {view === 'quiz' && <QuizMode />}
        {view === 'setup' && <SetupMode />}
        {view === 'trade-review' && <TradeReviewMode />}
        {view === 'history' && <HistoryMode />}
      </div>
      <SettingsDialog />
      <ResultFlash />
    </div>
  )
}
