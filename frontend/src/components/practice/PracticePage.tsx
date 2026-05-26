import { useIsAIConfigured } from '@/hooks/use-is-ai-configured'
import { useAIStore } from '@/store/ai-store'
import { usePracticeStore } from '@/store/practice-store'
import type { PracticeMode } from '@/types/practice'
import { SettingsDialog } from '../ai/SettingsDialog'
import { PracticeStats } from './PracticeStats'
import { QuizMode } from './QuizMode'
import { ReplayMode } from './ReplayMode'
import { SetupMode } from './SetupMode'

const MODES: Array<{ id: PracticeMode; label: string; desc: string }> = [
  { id: 'replay', label: 'Replay', desc: 'Step through bars and trade' },
  { id: 'quiz', label: 'Quiz', desc: 'Up or down? Quick reps' },
  { id: 'setup', label: 'Setup', desc: 'Judge the setup with reasoning' },
]

export function PracticePage() {
  const mode = usePracticeStore((s) => s.mode)
  const setMode = usePracticeStore((s) => s.setMode)
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen)
  const aiConfigured = useIsAIConfigured()

  return (
    <div className="h-[calc(100vh-49px)] overflow-y-auto bg-[#0f1117] text-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Practice</h1>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    mode === m.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                  onClick={() => setMode(m.id)}
                  title={m.desc}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {aiConfigured && <span className="text-[10px] text-green-400">AI ready</span>}
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

        {mode === 'replay' && <ReplayMode />}
        {mode === 'quiz' && <QuizMode />}
        {mode === 'setup' && <SetupMode />}
      </div>
      <SettingsDialog />
    </div>
  )
}
