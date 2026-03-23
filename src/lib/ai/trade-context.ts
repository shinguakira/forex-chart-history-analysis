import { getPairById } from '@/config/pairs'
import { bollingerBands, ema, macd, rsi, sma } from '@/lib/indicators'
import {
  computeDayOfWeekAnalysis,
  computeDrawdown,
  computeHourlyAnalysis,
  computeMonthlyBreakdown,
  computePairPerformance,
  computeRiskReward,
  computeStreaks,
  computeSummary,
} from '@/lib/trade-analysis'
import { fetchCandles } from '@/lib/yahoo-finance'
import type { IndicatorSnapshot, TradeContext } from '@/types/ai'
import type { Candle, TimeFrame } from '@/types/candle'
import type { Trade } from '@/types/trade'

function pickTimeframe(trade: Trade): TimeFrame {
  const openMs = new Date(trade.openDate).getTime()
  const closeMs = new Date(trade.closeDate).getTime()
  const durationH = (closeMs - openMs) / 3_600_000

  if (durationH < 1) return '5'
  if (durationH < 8) return '15'
  if (durationH < 48) return '60'
  return '240'
}

function intervalSeconds(tf: TimeFrame): number {
  const map: Record<TimeFrame, number> = {
    '1': 60,
    '5': 300,
    '15': 900,
    '60': 3600,
    '240': 14400,
    D: 86400,
    W: 604800,
  }
  return map[tf]
}

function findClosestCandle(candles: Candle[], timestamp: number): number {
  let best = 0
  let bestDiff = Math.abs(candles[0].time - timestamp)
  for (let i = 1; i < candles.length; i++) {
    const diff = Math.abs(candles[i].time - timestamp)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

export function extractSnapshot(candles: Candle[], targetIdx: number): IndicatorSnapshot {
  const snapshot: IndicatorSnapshot = {
    rsi: null,
    macdLine: null,
    macdSignal: null,
    macdHistogram: null,
    sma20: null,
    sma50: null,
    ema12: null,
    ema26: null,
    bollingerUpper: null,
    bollingerMiddle: null,
    bollingerLower: null,
  }

  const targetTime = candles[targetIdx].time

  const rsiData = rsi(candles)
  const rsiPoint = rsiData.find((p) => p.time === targetTime)
  if (rsiPoint) snapshot.rsi = Math.round(rsiPoint.value * 100) / 100

  const macdData = macd(candles)
  const macdPoint = macdData.macd.find((p) => p.time === targetTime)
  const signalPoint = macdData.signal.find((p) => p.time === targetTime)
  const histPoint = macdData.histogram.find((p) => p.time === targetTime)
  if (macdPoint) snapshot.macdLine = Math.round(macdPoint.value * 1e6) / 1e6
  if (signalPoint) snapshot.macdSignal = Math.round(signalPoint.value * 1e6) / 1e6
  if (histPoint) snapshot.macdHistogram = Math.round(histPoint.value * 1e6) / 1e6

  const sma20Data = sma(candles, 20)
  const sma20Point = sma20Data.find((p) => p.time === targetTime)
  if (sma20Point) snapshot.sma20 = Math.round(sma20Point.value * 1e5) / 1e5

  const sma50Data = sma(candles, 50)
  const sma50Point = sma50Data.find((p) => p.time === targetTime)
  if (sma50Point) snapshot.sma50 = Math.round(sma50Point.value * 1e5) / 1e5

  const ema12Data = ema(candles, 12)
  const ema12Point = ema12Data.find((p) => p.time === targetTime)
  if (ema12Point) snapshot.ema12 = Math.round(ema12Point.value * 1e5) / 1e5

  const ema26Data = ema(candles, 26)
  const ema26Point = ema26Data.find((p) => p.time === targetTime)
  if (ema26Point) snapshot.ema26 = Math.round(ema26Point.value * 1e5) / 1e5

  const bbData = bollingerBands(candles)
  const bbUpper = bbData.upper.find((p) => p.time === targetTime)
  const bbMiddle = bbData.middle.find((p) => p.time === targetTime)
  const bbLower = bbData.lower.find((p) => p.time === targetTime)
  if (bbUpper) snapshot.bollingerUpper = Math.round(bbUpper.value * 1e5) / 1e5
  if (bbMiddle) snapshot.bollingerMiddle = Math.round(bbMiddle.value * 1e5) / 1e5
  if (bbLower) snapshot.bollingerLower = Math.round(bbLower.value * 1e5) / 1e5

  return snapshot
}

export async function buildTradeContext(trade: Trade): Promise<TradeContext> {
  const pair = getPairById(trade.pairId)
  if (!pair) throw new Error(`Unknown pair: ${trade.pairId}`)

  const tf = pickTimeframe(trade)
  const intSec = intervalSeconds(tf)

  const openTs = Math.floor(new Date(trade.openDate).getTime() / 1000)
  const closeTs = Math.floor(new Date(trade.closeDate).getTime() / 1000)

  const period1 = openTs - intSec * 55
  const period2 = closeTs + intSec * 15

  const result = await fetchCandles(pair.yahooSymbol, tf, period1, period2)
  const allCandles = result.candles

  if (allCandles.length === 0) {
    return {
      trade,
      candlesBefore: [],
      candlesDuring: [],
      candlesAfter: [],
      indicatorsAtEntry: extractSnapshot([], 0),
      indicatorsAtExit: extractSnapshot([], 0),
    }
  }

  const entryIdx = findClosestCandle(allCandles, openTs)
  const exitIdx = findClosestCandle(allCandles, closeTs)

  const candlesBefore = allCandles.slice(0, entryIdx)
  const candlesDuring = allCandles.slice(entryIdx, exitIdx + 1)
  const candlesAfter = allCandles.slice(exitIdx + 1)

  const indicatorsAtEntry = extractSnapshot(allCandles, entryIdx)
  const indicatorsAtExit = extractSnapshot(allCandles, exitIdx)

  return {
    trade,
    candlesBefore,
    candlesDuring,
    candlesAfter,
    indicatorsAtEntry,
    indicatorsAtExit,
  }
}

export interface PortfolioContext {
  summaryText: string
  topTradeContexts: TradeContext[]
}

export async function buildPortfolioContext(trades: Trade[]): Promise<PortfolioContext> {
  const summary = computeSummary(trades)
  const monthly = computeMonthlyBreakdown(trades)
  const pairs = computePairPerformance(trades)
  const hourly = computeHourlyAnalysis(trades)
  const daily = computeDayOfWeekAnalysis(trades)
  const streaks = computeStreaks(trades)
  const drawdown = computeDrawdown(trades)
  const rr = computeRiskReward(trades)

  let text = ''
  text += '<portfolio_summary>\n'
  text += `Total Trades: ${summary.totalTrades}\n`
  text += `Net P/L: ¥${Math.round(summary.netPL).toLocaleString()}\n`
  text += `Win Rate: ${(summary.winRate * 100).toFixed(1)}% (${summary.winCount}W / ${summary.lossCount}L)\n`
  text += `Profit Factor: ${summary.profitFactor === Infinity ? '∞' : summary.profitFactor.toFixed(2)}\n`
  text += `Avg Win: ¥${Math.round(summary.avgWin).toLocaleString()}\n`
  text += `Avg Loss: ¥${Math.round(summary.avgLoss).toLocaleString()}\n`
  text += `Expectancy: ¥${Math.round(summary.expectancy).toLocaleString()}/trade\n`
  text += `Median P/L: ¥${Math.round(summary.medianPL).toLocaleString()}\n`
  text += `Long: ${summary.longCount} / Short: ${summary.shortCount}\n`
  text += '</portfolio_summary>\n\n'

  text += '<monthly_breakdown>\n'
  text += 'Month | Trades | Wins | Losses | Win% | Net P/L\n'
  for (const m of monthly) {
    text += `${m.month} | ${m.trades} | ${m.wins} | ${m.losses} | ${(m.winRate * 100).toFixed(0)}% | ¥${Math.round(m.netPL).toLocaleString()}\n`
  }
  text += '</monthly_breakdown>\n\n'

  text += '<pair_performance>\n'
  text += 'Pair | Trades | Win% | Net P/L | PF\n'
  for (const p of pairs) {
    text += `${p.pairId} | ${p.trades} | ${(p.winRate * 100).toFixed(0)}% | ¥${Math.round(p.netPL).toLocaleString()} | ${p.profitFactor === Infinity ? '∞' : p.profitFactor.toFixed(2)}\n`
  }
  text += '</pair_performance>\n\n'

  text += '<time_patterns>\n'
  const activeHours = hourly.filter((h) => h.tradeCount >= 5)
  text += 'Hour(JST) | Trades | Win% | Avg P/L\n'
  for (const h of activeHours) {
    text += `${h.hour}:00 | ${h.tradeCount} | ${(h.winRate * 100).toFixed(0)}% | ¥${Math.round(h.avgPL).toLocaleString()}\n`
  }
  text += '\nDay | Trades | Win% | Net P/L\n'
  for (const d of daily.filter((d) => d.tradeCount > 0)) {
    text += `${d.dayName} | ${d.tradeCount} | ${(d.winRate * 100).toFixed(0)}% | ¥${Math.round(d.netPL).toLocaleString()}\n`
  }
  text += '</time_patterns>\n\n'

  text += '<risk_profile>\n'
  text += `Max Drawdown: ¥${Math.round(drawdown.maxDrawdown).toLocaleString()}\n`
  text += `Current Drawdown: ¥${Math.round(drawdown.currentDrawdown).toLocaleString()}\n`
  text += `Peak P/L: ¥${Math.round(drawdown.currentPeak).toLocaleString()}\n`
  text += `Longest Win Streak: ${streaks.longestWin.length}\n`
  text += `Longest Loss Streak: ${streaks.longestLoss.length}\n`
  text += `Current Streak: ${streaks.currentStreak.type === 'win' ? '+' : '-'}${streaks.currentStreak.length}\n`
  text += `Avg R:R (wins): ${rr.avgRR.toFixed(2)}:1\n`
  text += `Wins ≥ 2:1 R:R: ${rr.tradesAbove2to1}/${rr.totalWins}\n`
  text += '</risk_profile>\n'

  // Fetch context for top/bottom trades
  const sorted = [...trades].sort((a, b) => a.pl - b.pl)
  const worst5 = sorted.slice(0, 5)
  const best5 = sorted.slice(-5).reverse()
  const sampleTrades = [...best5, ...worst5]

  const topTradeContexts: TradeContext[] = []
  for (const t of sampleTrades) {
    try {
      const ctx = await buildTradeContext(t)
      topTradeContexts.push(ctx)
      // Rate limit: 500ms between Yahoo Finance calls
      await new Promise((r) => setTimeout(r, 500))
    } catch {
      // Skip trades where candle data isn't available
    }
  }

  return { summaryText: text, topTradeContexts }
}
