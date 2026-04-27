import { getJSTDayOfWeek, getJSTHour } from '@/lib/date-utils'
import type { Trade } from '@/types/trade'

// ─── Summary ───

export interface SummaryStats {
  totalTrades: number
  netPL: number
  grossProfit: number
  grossLoss: number
  winCount: number
  lossCount: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  expectancy: number
  bestTrade: Trade | null
  worstTrade: Trade | null
  longCount: number
  shortCount: number
  avgPL: number
  medianPL: number
}

export function computeSummary(trades: Trade[]): SummaryStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      netPL: 0,
      grossProfit: 0,
      grossLoss: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      bestTrade: null,
      worstTrade: null,
      longCount: 0,
      shortCount: 0,
      avgPL: 0,
      medianPL: 0,
    }
  }

  const wins = trades.filter((t) => t.pl > 0)
  const losses = trades.filter((t) => t.pl <= 0)
  const grossProfit = wins.reduce((s, t) => s + t.pl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pl, 0))
  const netPL = trades.reduce((s, t) => s + t.pl, 0)

  const sorted = [...trades].sort((a, b) => a.pl - b.pl)
  const mid = Math.floor(sorted.length / 2)
  const medianPL = sorted.length % 2 ? sorted[mid].pl : (sorted[mid - 1].pl + sorted[mid].pl) / 2

  return {
    totalTrades: trades.length,
    netPL,
    grossProfit,
    grossLoss,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: wins.length / trades.length,
    avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    expectancy: netPL / trades.length,
    bestTrade: sorted[sorted.length - 1],
    worstTrade: sorted[0],
    longCount: trades.filter((t) => t.direction === 'bull').length,
    shortCount: trades.filter((t) => t.direction === 'bear').length,
    avgPL: netPL / trades.length,
    medianPL,
  }
}

// ─── Cumulative P/L ───

export interface CumulativePLPoint {
  date: string
  cumPL: number
  trade: Trade
}

export function computeCumulativePL(trades: Trade[]): CumulativePLPoint[] {
  let cum = 0
  return trades.map((t) => {
    cum += t.pl
    return { date: t.closeDate, cumPL: cum, trade: t }
  })
}

// ─── Monthly Breakdown ───

export interface MonthlyRow {
  month: string
  trades: number
  wins: number
  losses: number
  netPL: number
  winRate: number
  avgPL: number
}

export function computeMonthlyBreakdown(trades: Trade[]): MonthlyRow[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    const month = t.closeDate.slice(0, 7)
    const arr = map.get(month) ?? []
    arr.push(t)
    map.set(month, arr)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, arr]) => {
      const wins = arr.filter((t) => t.pl > 0).length
      const netPL = arr.reduce((s, t) => s + t.pl, 0)
      return {
        month,
        trades: arr.length,
        wins,
        losses: arr.length - wins,
        netPL,
        winRate: wins / arr.length,
        avgPL: netPL / arr.length,
      }
    })
}

// ─── Pair Performance ───

export interface PairStats {
  pairId: string
  trades: number
  netPL: number
  winRate: number
  avgPL: number
  profitFactor: number
}

export function computePairPerformance(trades: Trade[]): PairStats[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    const arr = map.get(t.pairId) ?? []
    arr.push(t)
    map.set(t.pairId, arr)
  }

  return [...map.entries()].map(([pairId, arr]) => {
    const wins = arr.filter((t) => t.pl > 0)
    const losses = arr.filter((t) => t.pl <= 0)
    const gp = wins.reduce((s, t) => s + t.pl, 0)
    const gl = Math.abs(losses.reduce((s, t) => s + t.pl, 0))
    const netPL = arr.reduce((s, t) => s + t.pl, 0)
    return {
      pairId,
      trades: arr.length,
      netPL,
      winRate: wins.length / arr.length,
      avgPL: netPL / arr.length,
      profitFactor: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    }
  })
}

// ─── Direction Analysis ───

export interface DirectionStats {
  direction: 'bull' | 'bear'
  count: number
  winRate: number
  avgWin: number
  avgLoss: number
  netPL: number
  profitFactor: number
}

export function computeDirectionStats(trades: Trade[]): DirectionStats[] {
  return (['bull', 'bear'] as const).map((dir) => {
    const arr = trades.filter((t) => t.direction === dir)
    if (arr.length === 0) {
      return {
        direction: dir,
        count: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        netPL: 0,
        profitFactor: 0,
      }
    }
    const wins = arr.filter((t) => t.pl > 0)
    const losses = arr.filter((t) => t.pl <= 0)
    const gp = wins.reduce((s, t) => s + t.pl, 0)
    const gl = Math.abs(losses.reduce((s, t) => s + t.pl, 0))
    return {
      direction: dir,
      count: arr.length,
      winRate: wins.length / arr.length,
      avgWin: wins.length > 0 ? gp / wins.length : 0,
      avgLoss: losses.length > 0 ? gl / losses.length : 0,
      netPL: arr.reduce((s, t) => s + t.pl, 0),
      profitFactor: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    }
  })
}

// ─── Time of Day / Day of Week ───

export interface HourBucket {
  hour: number
  tradeCount: number
  winRate: number
  netPL: number
  avgPL: number
}

export function computeHourlyAnalysis(trades: Trade[]): HourBucket[] {
  const buckets: { count: number; wins: number; pl: number }[] = Array.from({ length: 24 }, () => ({
    count: 0,
    wins: 0,
    pl: 0,
  }))

  for (const t of trades) {
    const h = getJSTHour(t.openDate)
    buckets[h].count++
    if (t.pl > 0) buckets[h].wins++
    buckets[h].pl += t.pl
  }

  return buckets.map((b, hour) => ({
    hour,
    tradeCount: b.count,
    winRate: b.count > 0 ? b.wins / b.count : 0,
    netPL: b.pl,
    avgPL: b.count > 0 ? b.pl / b.count : 0,
  }))
}

export interface DayOfWeekBucket {
  day: number
  dayName: string
  tradeCount: number
  winRate: number
  netPL: number
  avgPL: number
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function computeDayOfWeekAnalysis(trades: Trade[]): DayOfWeekBucket[] {
  const buckets: { count: number; wins: number; pl: number }[] = Array.from({ length: 7 }, () => ({
    count: 0,
    wins: 0,
    pl: 0,
  }))

  for (const t of trades) {
    const d = getJSTDayOfWeek(t.openDate)
    buckets[d].count++
    if (t.pl > 0) buckets[d].wins++
    buckets[d].pl += t.pl
  }

  return buckets.map((b, day) => ({
    day,
    dayName: DAY_NAMES[day],
    tradeCount: b.count,
    winRate: b.count > 0 ? b.wins / b.count : 0,
    netPL: b.pl,
    avgPL: b.count > 0 ? b.pl / b.count : 0,
  }))
}

// ─── Trade Duration ───

export interface DurationBucket {
  label: string
  minMinutes: number
  maxMinutes: number
  count: number
  avgPL: number
  winRate: number
  netPL: number
}

const DURATION_RANGES: [string, number, number][] = [
  ['<5m', 0, 5],
  ['5-15m', 5, 15],
  ['15-30m', 15, 30],
  ['30m-1h', 30, 60],
  ['1-2h', 60, 120],
  ['2-4h', 120, 240],
  ['4h+', 240, Infinity],
]

export function computeDurationAnalysis(trades: Trade[]): DurationBucket[] {
  const buckets: { count: number; wins: number; pl: number }[] = DURATION_RANGES.map(() => ({
    count: 0,
    wins: 0,
    pl: 0,
  }))

  for (const t of trades) {
    const mins = (new Date(t.closeDate).getTime() - new Date(t.openDate).getTime()) / 60000
    const idx = DURATION_RANGES.findIndex(([, min, max]) => mins >= min && mins < max)
    if (idx >= 0) {
      buckets[idx].count++
      if (t.pl > 0) buckets[idx].wins++
      buckets[idx].pl += t.pl
    }
  }

  return DURATION_RANGES.map(([label, minMinutes, maxMinutes], i) => ({
    label,
    minMinutes,
    maxMinutes,
    count: buckets[i].count,
    avgPL: buckets[i].count > 0 ? buckets[i].pl / buckets[i].count : 0,
    winRate: buckets[i].count > 0 ? buckets[i].wins / buckets[i].count : 0,
    netPL: buckets[i].pl,
  }))
}

// ─── Position Size ───

export interface SizeBucket {
  size: number
  count: number
  netPL: number
  winRate: number
  avgPL: number
}

export function computeSizeAnalysis(trades: Trade[]): SizeBucket[] {
  const map = new Map<number, { count: number; wins: number; pl: number }>()
  for (const t of trades) {
    const b = map.get(t.size) ?? { count: 0, wins: 0, pl: 0 }
    b.count++
    if (t.pl > 0) b.wins++
    b.pl += t.pl
    map.set(t.size, b)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([size, b]) => ({
      size,
      count: b.count,
      netPL: b.pl,
      winRate: b.wins / b.count,
      avgPL: b.pl / b.count,
    }))
}

// ─── Streak Analysis ───

export interface StreakInfo {
  currentStreak: { type: 'win' | 'loss'; length: number }
  longestWin: { length: number; startDate: string; endDate: string }
  longestLoss: { length: number; startDate: string; endDate: string }
  avgWinStreak: number
  avgLossStreak: number
}

export function computeStreaks(trades: Trade[]): StreakInfo {
  if (trades.length === 0) {
    return {
      currentStreak: { type: 'win', length: 0 },
      longestWin: { length: 0, startDate: '', endDate: '' },
      longestLoss: { length: 0, startDate: '', endDate: '' },
      avgWinStreak: 0,
      avgLossStreak: 0,
    }
  }

  const winStreaks: { length: number; startDate: string; endDate: string }[] = []
  const lossStreaks: { length: number; startDate: string; endDate: string }[] = []

  let currentType: 'win' | 'loss' = trades[0].pl > 0 ? 'win' : 'loss'
  let currentLen = 1
  let currentStart = trades[0].closeDate

  for (let i = 1; i < trades.length; i++) {
    const isWin = trades[i].pl > 0
    if ((isWin && currentType === 'win') || (!isWin && currentType === 'loss')) {
      currentLen++
    } else {
      const arr = currentType === 'win' ? winStreaks : lossStreaks
      arr.push({ length: currentLen, startDate: currentStart, endDate: trades[i - 1].closeDate })
      currentType = isWin ? 'win' : 'loss'
      currentLen = 1
      currentStart = trades[i].closeDate
    }
  }
  const lastArr = currentType === 'win' ? winStreaks : lossStreaks
  lastArr.push({
    length: currentLen,
    startDate: currentStart,
    endDate: trades[trades.length - 1].closeDate,
  })

  const longestWin = winStreaks.reduce((best, s) => (s.length > best.length ? s : best), {
    length: 0,
    startDate: '',
    endDate: '',
  })
  const longestLoss = lossStreaks.reduce((best, s) => (s.length > best.length ? s : best), {
    length: 0,
    startDate: '',
    endDate: '',
  })

  const avgWinStreak =
    winStreaks.length > 0 ? winStreaks.reduce((s, x) => s + x.length, 0) / winStreaks.length : 0
  const avgLossStreak =
    lossStreaks.length > 0 ? lossStreaks.reduce((s, x) => s + x.length, 0) / lossStreaks.length : 0

  return {
    currentStreak: { type: currentType, length: currentLen },
    longestWin,
    longestLoss,
    avgWinStreak,
    avgLossStreak,
  }
}

// ─── Drawdown ───

export interface DrawdownInfo {
  maxDrawdown: number
  maxDrawdownPeak: number
  maxDrawdownTrough: number
  maxDrawdownStartDate: string
  maxDrawdownEndDate: string
  currentDrawdown: number
  currentPeak: number
}

export function computeDrawdown(trades: Trade[]): DrawdownInfo {
  if (trades.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPeak: 0,
      maxDrawdownTrough: 0,
      maxDrawdownStartDate: '',
      maxDrawdownEndDate: '',
      currentDrawdown: 0,
      currentPeak: 0,
    }
  }

  let cum = 0
  let peak = 0
  let peakDate = trades[0].closeDate
  let maxDD = 0
  let maxDDPeak = 0
  let maxDDTrough = 0
  let maxDDStart = ''
  let maxDDEnd = ''

  for (const t of trades) {
    cum += t.pl
    if (cum > peak) {
      peak = cum
      peakDate = t.closeDate
    }
    const dd = peak - cum
    if (dd > maxDD) {
      maxDD = dd
      maxDDPeak = peak
      maxDDTrough = cum
      maxDDStart = peakDate
      maxDDEnd = t.closeDate
    }
  }

  return {
    maxDrawdown: maxDD,
    maxDrawdownPeak: maxDDPeak,
    maxDrawdownTrough: maxDDTrough,
    maxDrawdownStartDate: maxDDStart,
    maxDrawdownEndDate: maxDDEnd,
    currentDrawdown: peak - cum,
    currentPeak: peak,
  }
}

// ─── Risk/Reward ───

export interface RiskRewardInfo {
  avgRR: number
  tradesAbove1to1: number
  tradesAbove2to1: number
  tradesAbove3to1: number
  totalWins: number
}

export function computeRiskReward(trades: Trade[]): RiskRewardInfo {
  const wins = trades.filter((t) => t.pl > 0)
  const losses = trades.filter((t) => t.pl <= 0)
  if (wins.length === 0 || losses.length === 0) {
    return {
      avgRR: 0,
      tradesAbove1to1: 0,
      tradesAbove2to1: 0,
      tradesAbove3to1: 0,
      totalWins: wins.length,
    }
  }

  const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pl, 0)) / losses.length

  let above1 = 0
  let above2 = 0
  let above3 = 0
  let totalRR = 0

  for (const w of wins) {
    const rr = w.pl / avgLoss
    totalRR += rr
    if (rr >= 1) above1++
    if (rr >= 2) above2++
    if (rr >= 3) above3++
  }

  return {
    avgRR: totalRR / wins.length,
    tradesAbove1to1: above1,
    tradesAbove2to1: above2,
    tradesAbove3to1: above3,
    totalWins: wins.length,
  }
}

// ─── Consistency ───

export interface ConsistencyInfo {
  profitableMonthsPct: number
  profitableWeeksPct: number
  plStdDev: number
  sharpeRatio: number
  totalMonths: number
  profitableMonths: number
  totalWeeks: number
  profitableWeeks: number
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function computeConsistency(trades: Trade[]): ConsistencyInfo {
  if (trades.length === 0) {
    return {
      profitableMonthsPct: 0,
      profitableWeeksPct: 0,
      plStdDev: 0,
      sharpeRatio: 0,
      totalMonths: 0,
      profitableMonths: 0,
      totalWeeks: 0,
      profitableWeeks: 0,
    }
  }

  // Monthly
  const monthPL = new Map<string, number>()
  for (const t of trades) {
    const k = t.closeDate.slice(0, 7)
    monthPL.set(k, (monthPL.get(k) ?? 0) + t.pl)
  }
  const profitableMonths = [...monthPL.values()].filter((v) => v > 0).length

  // Weekly
  const weekPL = new Map<string, number>()
  for (const t of trades) {
    const k = getWeekKey(t.closeDate)
    weekPL.set(k, (weekPL.get(k) ?? 0) + t.pl)
  }
  const profitableWeeks = [...weekPL.values()].filter((v) => v > 0).length

  // Std dev of per-trade P/L
  const mean = trades.reduce((s, t) => s + t.pl, 0) / trades.length
  const variance = trades.reduce((s, t) => s + (t.pl - mean) ** 2, 0) / trades.length
  const stdDev = Math.sqrt(variance)

  return {
    profitableMonthsPct: monthPL.size > 0 ? profitableMonths / monthPL.size : 0,
    profitableWeeksPct: weekPL.size > 0 ? profitableWeeks / weekPL.size : 0,
    plStdDev: stdDev,
    sharpeRatio: stdDev > 0 ? mean / stdDev : 0,
    totalMonths: monthPL.size,
    profitableMonths,
    totalWeeks: weekPL.size,
    profitableWeeks,
  }
}

// ─── Rolling Performance ───

export interface RollingPoint {
  index: number
  date: string
  winRate: number
  avgPL: number
}

export function computeRolling(trades: Trade[], window: number): RollingPoint[] {
  if (trades.length < window) return []
  const points: RollingPoint[] = []
  for (let i = window - 1; i < trades.length; i++) {
    const slice = trades.slice(i - window + 1, i + 1)
    const wins = slice.filter((t) => t.pl > 0).length
    const pl = slice.reduce((s, t) => s + t.pl, 0)
    points.push({
      index: i,
      date: trades[i].closeDate,
      winRate: wins / window,
      avgPL: pl / window,
    })
  }
  return points
}

export interface RecentComparison {
  last30Days: SummaryStats
  overall: SummaryStats
}

export function computeRecentComparison(trades: Trade[]): RecentComparison | null {
  if (trades.length === 0) return null
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const recent = trades.filter((t) => new Date(t.closeDate) >= thirtyDaysAgo)
  return {
    last30Days: computeSummary(recent),
    overall: computeSummary(trades),
  }
}
