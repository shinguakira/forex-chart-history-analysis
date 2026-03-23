import { getPairById } from '@/config/pairs'
import { formatCandleTimeJST } from '@/lib/date-utils'
import type { IndicatorSnapshot, TradeContext } from '@/types/ai'
import type { Candle } from '@/types/candle'
import type { Trade } from '@/types/trade'

const SYSTEM_PROMPT = `You are an experienced forex trading analyst reviewing a personal trading journal of KO (knockout) options on forex pairs. Your role is to provide direct, analytical, and actionable feedback.

Key context:
- All P/L values are in JPY (Japanese Yen)
- KO options: "bull" = long, "bear" = short
- Trades include entry/exit prices, position size, and duration
- Technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands) are computed from actual price data at trade entry/exit

Guidelines:
- Be specific and reference actual numbers from the data
- Focus on patterns, not individual outcomes (one trade can be bad but the pattern matters)
- Identify concrete, actionable improvements
- Don't give generic trading advice — analyze THIS trader's specific data
- Use markdown formatting for readability`

export function formatCandles(candles: Candle[], label: string, limit: number): string {
  const slice = candles.slice(-limit)
  if (slice.length === 0) return ''

  let text = `**${label}** (${slice.length} candles):\n`
  text += 'Time | Open | High | Low | Close\n'
  for (const c of slice) {
    const t = formatCandleTimeJST(c.time)
    text += `${t} | ${c.open} | ${c.high} | ${c.low} | ${c.close}\n`
  }
  return text
}

export function formatSnapshot(snap: IndicatorSnapshot, label: string): string {
  const parts: string[] = []
  if (snap.rsi != null) parts.push(`RSI: ${snap.rsi}`)
  if (snap.macdLine != null) parts.push(`MACD: ${snap.macdLine}`)
  if (snap.macdSignal != null) parts.push(`Signal: ${snap.macdSignal}`)
  if (snap.macdHistogram != null) parts.push(`Histogram: ${snap.macdHistogram}`)
  if (snap.sma20 != null) parts.push(`SMA20: ${snap.sma20}`)
  if (snap.sma50 != null) parts.push(`SMA50: ${snap.sma50}`)
  if (snap.ema12 != null) parts.push(`EMA12: ${snap.ema12}`)
  if (snap.ema26 != null) parts.push(`EMA26: ${snap.ema26}`)
  if (snap.bollingerUpper != null) parts.push(`BB Upper: ${snap.bollingerUpper}`)
  if (snap.bollingerMiddle != null) parts.push(`BB Middle: ${snap.bollingerMiddle}`)
  if (snap.bollingerLower != null) parts.push(`BB Lower: ${snap.bollingerLower}`)

  if (parts.length === 0) return `**${label}**: No indicator data available\n`
  return `**${label}**: ${parts.join(' | ')}\n`
}

function formatTradeDuration(trade: Trade): string {
  const openMs = new Date(trade.openDate).getTime()
  const closeMs = new Date(trade.closeDate).getTime()
  const diffMin = Math.round((closeMs - openMs) / 60_000)
  if (diffMin < 60) return `${diffMin}m`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`
  return `${Math.floor(diffMin / 1440)}d ${Math.floor((diffMin % 1440) / 60)}h`
}

function formatTradeContextBlock(ctx: TradeContext): string {
  const pair = getPairById(ctx.trade.pairId)
  const displayName = pair?.displayName ?? ctx.trade.pairId

  let text = `### ${displayName} — ${ctx.trade.direction === 'bull' ? 'LONG' : 'SHORT'} x${ctx.trade.size}\n`
  text += `- Entry: ${ctx.trade.openPrice} at ${ctx.trade.openDate}\n`
  text += `- Exit: ${ctx.trade.closePrice} at ${ctx.trade.closeDate}\n`
  text += `- P/L: ¥${Math.round(ctx.trade.pl).toLocaleString()} | Duration: ${formatTradeDuration(ctx.trade)}\n\n`

  text += formatCandles(ctx.candlesBefore, 'Before Entry', 10)
  text += '\n'
  text += formatCandles(ctx.candlesDuring, 'During Trade', 20)
  text += '\n'
  text += formatCandles(ctx.candlesAfter, 'After Exit', 10)
  text += '\n'

  text += formatSnapshot(ctx.indicatorsAtEntry, 'Indicators at Entry')
  text += formatSnapshot(ctx.indicatorsAtExit, 'Indicators at Exit')
  text += '\n'

  return text
}

export function buildTradeReviewMessages(
  ctx: TradeContext,
  overallWinRate: number,
  pairWinRate: number,
): { system: string; user: string } {
  const pair = getPairById(ctx.trade.pairId)
  const displayName = pair?.displayName ?? ctx.trade.pairId

  let user = `Review this ${displayName} trade:\n\n`
  user += formatTradeContextBlock(ctx)

  user += '<your_stats>\n'
  user += `Overall win rate: ${(overallWinRate * 100).toFixed(1)}%\n`
  user += `${displayName} win rate: ${(pairWinRate * 100).toFixed(1)}%\n`
  user += '</your_stats>\n\n'

  user += 'Analyze:\n'
  user += '1. Was the entry well-timed based on the technical indicators?\n'
  user += '2. Was the exit optimal, premature, or late? (check candles after exit)\n'
  user += '3. Was the direction choice correct given the technicals?\n'
  user += '4. What specific improvement would you suggest for this type of setup?\n'

  return { system: SYSTEM_PROMPT, user }
}

export function buildPortfolioReviewMessages(
  summaryText: string,
  tradeContexts: TradeContext[],
): { system: string; user: string } {
  let user = 'Review my complete trading portfolio:\n\n'
  user += `${summaryText}\n`

  if (tradeContexts.length > 0) {
    const best = tradeContexts.filter((c) => c.trade.pl > 0)
    const worst = tradeContexts.filter((c) => c.trade.pl <= 0)

    if (best.length > 0) {
      user += '<best_trades>\n'
      for (const ctx of best) {
        user += formatTradeContextBlock(ctx)
      }
      user += '</best_trades>\n\n'
    }

    if (worst.length > 0) {
      user += '<worst_trades>\n'
      for (const ctx of worst) {
        user += formatTradeContextBlock(ctx)
      }
      user += '</worst_trades>\n\n'
    }
  }

  user += 'Provide:\n'
  user += '1. Overall assessment of trading performance\n'
  user += '2. Top 3 strengths (with supporting data)\n'
  user += '3. Top 3 weaknesses (with supporting data)\n'
  user += '4. Specific patterns: time-of-day bias, pair-specific issues, direction bias\n'
  user += '5. Risk management assessment\n'
  user += '6. Concrete action items to improve (prioritized)\n'

  return { system: SYSTEM_PROMPT, user }
}

export function buildChatSystemMessage(
  context: 'portfolio' | 'forecast' | 'trade-review',
  summaryText?: string,
): string {
  let contextInfo = `${SYSTEM_PROMPT}\n\n`

  if (context === 'forecast' && summaryText) {
    contextInfo +=
      'The user is asking follow-up questions about a forex forecast you generated.\n\n'
    contextInfo += `<forecast_result>\n${summaryText}\n</forecast_result>\n`
  } else if (context === 'portfolio' && summaryText) {
    contextInfo += 'The user is asking follow-up questions about their portfolio review.\n\n'
    contextInfo += `<review_result>\n${summaryText}\n</review_result>\n`
  } else if (context === 'trade-review' && summaryText) {
    contextInfo +=
      'The user is asking follow-up questions about an AI review of a specific trade.\n\n'
    contextInfo += `<review_result>\n${summaryText}\n</review_result>\n`
  }

  return contextInfo
}
