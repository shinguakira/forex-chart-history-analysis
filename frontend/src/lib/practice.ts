import type { ReplayDirection } from '@/types/practice'

/**
 * Pip multiplier for forex pairs.
 * JPY quote pairs (3-decimal quotes) → 100; 5-decimal quotes → 10000.
 */
function pipMultiplier(decimals: number): number {
  return decimals === 3 ? 100 : 10000
}

/** Signed pip distance from `from` → `to`, rounded to 0.1 pip. Positive = price rose. */
export function pipsBetween(from: number, to: number, decimals: number): number {
  return Math.round((to - from) * pipMultiplier(decimals) * 10) / 10
}

/** Pips earned by a trade in `direction` going from `entry` to `exit`. */
export function calcPips(
  direction: ReplayDirection,
  entry: number,
  exit: number,
  decimals: number,
): number {
  return direction === 'long'
    ? pipsBetween(entry, exit, decimals)
    : pipsBetween(exit, entry, decimals)
}

export type SetupJudgement = 'long' | 'short' | 'no-trade'

/**
 * True iff a setup judgement matches the realized move.
 * `no-trade` is considered correct when the realized move stayed within ±20 pips.
 */
export function judgementCorrect(j: SetupJudgement, pips: number): boolean {
  if (j === 'long') return pips > 0
  if (j === 'short') return pips < 0
  return Math.abs(pips) < 20
}
