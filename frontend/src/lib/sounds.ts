/**
 * Tiny Web Audio helper for practice-mode verdict feedback. Generates the
 * tones on the fly so there are no bundled audio assets.
 *
 * `correct` plays a short ascending chime (C5 → G5).
 * `wrong` plays a low square buzz.
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  // Some Safari builds still need the webkit prefix.
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

interface ToneSpec {
  freq: number
  /** Tone duration in seconds. */
  duration: number
  /** Offset from `start`, in seconds. */
  delay?: number
  /** Default 'sine'. */
  type?: OscillatorType
  /** Peak gain (0–1). Default 0.18 — kept low so it isn't startling. */
  gain?: number
}

function playTones(tones: ToneSpec[]) {
  const audio = getContext()
  if (!audio) return
  // Browsers suspend the context until first user gesture; resume best-effort.
  if (audio.state === 'suspended') void audio.resume()

  const start = audio.currentTime + 0.01
  for (const t of tones) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.value = t.freq

    const peak = t.gain ?? 0.18
    const begin = start + (t.delay ?? 0)
    const end = begin + t.duration
    // Attack + release envelope so we don't pop the speakers.
    gain.gain.setValueAtTime(0, begin)
    gain.gain.linearRampToValueAtTime(peak, begin + 0.01)
    gain.gain.setValueAtTime(peak, end - 0.04)
    gain.gain.linearRampToValueAtTime(0, end)

    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(begin)
    osc.stop(end + 0.02)
  }
}

export function playCorrect(): void {
  playTones([
    { freq: 523.25, duration: 0.12 }, // C5
    { freq: 783.99, duration: 0.18, delay: 0.1 }, // G5
  ])
}

export function playWrong(): void {
  playTones([{ freq: 196, duration: 0.28, type: 'square', gain: 0.14 }])
}
