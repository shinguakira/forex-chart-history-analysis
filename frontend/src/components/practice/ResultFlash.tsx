import { Circle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { playCorrect, playWrong } from '@/lib/sounds'
import { usePracticeStore, type VerdictKind } from '@/store/practice-store'

const VISIBLE_MS = 1200

/**
 * Full-screen Maru / Batsu verdict overlay. Mounted once at the practice
 * page root; flashes whenever `pulse.id` bumps in the practice store.
 */
export function ResultFlash() {
  const pulse = usePracticeStore((s) => s.pulse)
  const soundMuted = usePracticeStore((s) => s.soundMuted)
  const clearPulse = usePracticeStore((s) => s.clearPulse)

  const [active, setActive] = useState<{ kind: VerdictKind; id: number } | null>(null)

  useEffect(() => {
    if (!pulse) return
    setActive(pulse)
    if (!soundMuted) {
      if (pulse.kind === 'correct') playCorrect()
      else playWrong()
    }
    const timer = setTimeout(() => {
      setActive(null)
      clearPulse()
    }, VISIBLE_MS)
    return () => clearTimeout(timer)
    // Re-run on every new pulse id, even when kind matches the previous one.
  }, [pulse, soundMuted, clearPulse])

  if (!active) return null

  const correct = active.kind === 'correct'
  const ring = correct ? 'text-green-400' : 'text-red-400'
  const bg = correct ? 'bg-green-500/10' : 'bg-red-500/10'
  const label = correct ? 'Correct' : 'Wrong'

  // pointer-events: none so the flash never blocks the buttons underneath —
  // user input goes through and the overlay just times out on its own.
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="result-flash"
      data-verdict={active.kind}
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-[2px] ${bg}`}
    >
      <div className={`flex flex-col items-center gap-4 ${ring}`}>
        {correct ? (
          <Circle size={240} strokeWidth={8} aria-hidden />
        ) : (
          <X size={280} strokeWidth={8} aria-hidden />
        )}
        <span className="text-2xl font-bold tracking-wider uppercase">{label}</span>
      </div>
    </div>
  )
}
