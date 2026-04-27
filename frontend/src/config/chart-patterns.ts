import type { Candle } from '@/types/candle'

// ─── Types ───

export type PatternCategory = 'reversal' | 'continuation' | 'candlestick'
export type SignalType = 'bullish' | 'bearish' | 'neutral'

export interface PatternMarker {
  index: number
  label: string
  position: 'above' | 'below'
}

export interface ChartPattern {
  id: string
  name: string
  category: PatternCategory
  signal: SignalType
  description: string
  identification: string[]
  trading: { entry: string; stopLoss: string; target: string }
  generateCandles: () => Candle[]
  getMarkers?: () => PatternMarker[]
}

// ─── Helpers ───

const BASE_TIME = 1_700_000_000

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function interpolate(keyPoints: [number, number][]): number[] {
  const total = keyPoints[keyPoints.length - 1][0] + 1
  const result: number[] = new Array(total)
  for (let seg = 0; seg < keyPoints.length - 1; seg++) {
    const [i0, p0] = keyPoints[seg]
    const [i1, p1] = keyPoints[seg + 1]
    for (let i = i0; i <= i1; i++) {
      const t = (i - i0) / (i1 - i0)
      result[i] = p0 + (p1 - p0) * t
    }
  }
  return result
}

function buildCandlesFromPath(closePrices: number[], seed: number): Candle[] {
  const rand = mulberry32(seed)
  return closePrices.map((close, i) => {
    const open = i === 0 ? close + (rand() - 0.5) * 0.4 : closePrices[i - 1] + (rand() - 0.5) * 0.2
    const bodyHigh = Math.max(open, close)
    const bodyLow = Math.min(open, close)
    const wickUp = 0.1 + rand() * 0.5
    const wickDown = 0.1 + rand() * 0.5
    return {
      time: BASE_TIME + i * 3600,
      open: Math.round(open * 1000) / 1000,
      high: Math.round((bodyHigh + wickUp) * 1000) / 1000,
      low: Math.round((bodyLow - wickDown) * 1000) / 1000,
      close: Math.round(close * 1000) / 1000,
    }
  })
}

function manualCandles(data: [number, number, number, number][]): Candle[] {
  return data.map((c, i) => ({
    time: BASE_TIME + i * 3600,
    open: c[0],
    high: c[1],
    low: c[2],
    close: c[3],
  }))
}

// ─── Reversal Patterns ───

const doubleBottom: ChartPattern = {
  id: 'double-bottom',
  name: 'Double Bottom',
  category: 'reversal',
  signal: 'bullish',
  description:
    'A bullish reversal pattern resembling the letter "W". Price tests a support level twice and fails to break below, then rallies above the interim high.',
  identification: [
    'Two roughly equal lows separated by a moderate peak',
    'Volume often increases on the second bottom test',
    'Confirmed when price breaks above the peak between the two lows (neckline)',
  ],
  trading: {
    entry: 'Break above the neckline (middle peak)',
    stopLoss: 'Below the double bottom lows',
    target: 'Distance from lows to neckline, projected above the breakout',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 110],
        [9, 100],
        [15, 106],
        [21, 100],
        [30, 112],
        [37, 115],
      ]),
      1,
    ),
  getMarkers: () => [
    { index: 9, label: '1st Bottom', position: 'below' },
    { index: 21, label: '2nd Bottom', position: 'below' },
    { index: 26, label: 'Breakout', position: 'below' },
  ],
}

const doubleTop: ChartPattern = {
  id: 'double-top',
  name: 'Double Top',
  category: 'reversal',
  signal: 'bearish',
  description:
    'A bearish reversal pattern resembling the letter "M". Price tests a resistance level twice and fails to break above, then falls below the interim low.',
  identification: [
    'Two roughly equal highs separated by a moderate trough',
    'Volume often decreases on the second top test',
    'Confirmed when price breaks below the trough between the two highs (neckline)',
  ],
  trading: {
    entry: 'Break below the neckline (middle trough)',
    stopLoss: 'Above the double top highs',
    target: 'Distance from highs to neckline, projected below the breakdown',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 100],
        [9, 110],
        [15, 104],
        [21, 110],
        [30, 98],
        [37, 95],
      ]),
      2,
    ),
  getMarkers: () => [
    { index: 9, label: '1st Top', position: 'above' },
    { index: 21, label: '2nd Top', position: 'above' },
    { index: 26, label: 'Breakdown', position: 'above' },
  ],
}

const headAndShoulders: ChartPattern = {
  id: 'head-and-shoulders',
  name: 'Head and Shoulders',
  category: 'reversal',
  signal: 'bearish',
  description:
    'A bearish reversal with three peaks — the middle peak (head) is highest, flanked by two lower peaks (shoulders). The neckline connects the troughs between them.',
  identification: [
    'Three consecutive peaks with the middle one clearly highest',
    'Neckline connects the two troughs between the peaks',
    'Volume typically decreases from left shoulder to right shoulder',
    'Confirmed when price breaks below the neckline',
  ],
  trading: {
    entry: 'Break below the neckline',
    stopLoss: 'Above the right shoulder',
    target: 'Distance from head to neckline, projected below the breakdown',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 100],
        [7, 108],
        [12, 103],
        [19, 113],
        [24, 103],
        [31, 108],
        [36, 103],
        [44, 93],
      ]),
      3,
    ),
  getMarkers: () => [
    { index: 7, label: 'L Shoulder', position: 'above' },
    { index: 19, label: 'Head', position: 'above' },
    { index: 31, label: 'R Shoulder', position: 'above' },
    { index: 37, label: 'Neckline Break', position: 'above' },
  ],
}

const inverseHeadAndShoulders: ChartPattern = {
  id: 'inverse-head-and-shoulders',
  name: 'Inverse Head & Shoulders',
  category: 'reversal',
  signal: 'bullish',
  description:
    'A bullish reversal with three troughs — the middle trough (head) is lowest, flanked by two higher troughs (shoulders). The neckline connects the peaks between them.',
  identification: [
    'Three consecutive troughs with the middle one clearly lowest',
    'Neckline connects the two peaks between the troughs',
    'Volume typically increases on the breakout above the neckline',
    'Confirmed when price breaks above the neckline',
  ],
  trading: {
    entry: 'Break above the neckline',
    stopLoss: 'Below the right shoulder',
    target: 'Distance from head to neckline, projected above the breakout',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 113],
        [7, 105],
        [12, 110],
        [19, 100],
        [24, 110],
        [31, 105],
        [36, 110],
        [44, 120],
      ]),
      4,
    ),
  getMarkers: () => [
    { index: 7, label: 'L Shoulder', position: 'below' },
    { index: 19, label: 'Head', position: 'below' },
    { index: 31, label: 'R Shoulder', position: 'below' },
    { index: 37, label: 'Breakout', position: 'below' },
  ],
}

const tripleBottom: ChartPattern = {
  id: 'triple-bottom',
  name: 'Triple Bottom',
  category: 'reversal',
  signal: 'bullish',
  description:
    'A bullish reversal where price tests a support level three times, creating three roughly equal lows before breaking higher.',
  identification: [
    'Three lows at approximately the same price level',
    'Bounces between lows reach a similar resistance area',
    'Volume often increases on the final breakout',
  ],
  trading: {
    entry: 'Break above the resistance connecting the bounce highs',
    stopLoss: 'Below the triple bottom lows',
    target: 'Height of the pattern projected above the breakout',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 110],
        [7, 100],
        [12, 106],
        [17, 100],
        [22, 106],
        [27, 100],
        [37, 113],
      ]),
      5,
    ),
  getMarkers: () => [
    { index: 7, label: '1st', position: 'below' },
    { index: 17, label: '2nd', position: 'below' },
    { index: 27, label: '3rd', position: 'below' },
    { index: 32, label: 'Breakout', position: 'below' },
  ],
}

const tripleTop: ChartPattern = {
  id: 'triple-top',
  name: 'Triple Top',
  category: 'reversal',
  signal: 'bearish',
  description:
    'A bearish reversal where price tests a resistance level three times, creating three roughly equal highs before breaking lower.',
  identification: [
    'Three highs at approximately the same price level',
    'Pullbacks between highs find support at a similar level',
    'Volume often decreases on successive tops',
  ],
  trading: {
    entry: 'Break below the support connecting the pullback lows',
    stopLoss: 'Above the triple top highs',
    target: 'Height of the pattern projected below the breakdown',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 100],
        [7, 110],
        [12, 104],
        [17, 110],
        [22, 104],
        [27, 110],
        [37, 97],
      ]),
      6,
    ),
  getMarkers: () => [
    { index: 7, label: '1st', position: 'above' },
    { index: 17, label: '2nd', position: 'above' },
    { index: 27, label: '3rd', position: 'above' },
    { index: 32, label: 'Breakdown', position: 'above' },
  ],
}

// ─── Continuation Patterns ───

const bullFlag: ChartPattern = {
  id: 'bull-flag',
  name: 'Bull Flag',
  category: 'continuation',
  signal: 'bullish',
  description:
    'A continuation pattern where a sharp rally (the flagpole) is followed by a brief, slight downward consolidation (the flag), before price breaks out and continues higher.',
  identification: [
    'Preceded by a strong, steep price advance (the pole)',
    'Consolidation channel slopes slightly downward',
    'Volume contracts during the flag, expands on breakout',
  ],
  trading: {
    entry: 'Break above the upper trendline of the flag',
    stopLoss: 'Below the lower trendline of the flag',
    target: 'Length of the flagpole projected from the breakout point',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 100],
        [10, 115],
        [15, 114],
        [20, 113],
        [25, 112],
        [35, 125],
      ]),
      7,
    ),
  getMarkers: () => [
    { index: 10, label: 'Pole Top', position: 'above' },
    { index: 25, label: 'Flag End', position: 'below' },
    { index: 29, label: 'Breakout', position: 'below' },
  ],
}

const bearFlag: ChartPattern = {
  id: 'bear-flag',
  name: 'Bear Flag',
  category: 'continuation',
  signal: 'bearish',
  description:
    'A continuation pattern where a sharp decline (the flagpole) is followed by a brief, slight upward consolidation (the flag), before price breaks down and continues lower.',
  identification: [
    'Preceded by a strong, steep price decline (the pole)',
    'Consolidation channel slopes slightly upward',
    'Volume contracts during the flag, expands on breakdown',
  ],
  trading: {
    entry: 'Break below the lower trendline of the flag',
    stopLoss: 'Above the upper trendline of the flag',
    target: 'Length of the flagpole projected from the breakdown point',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 115],
        [10, 100],
        [15, 101],
        [20, 102],
        [25, 103],
        [35, 90],
      ]),
      8,
    ),
  getMarkers: () => [
    { index: 10, label: 'Pole Bottom', position: 'below' },
    { index: 25, label: 'Flag End', position: 'above' },
    { index: 29, label: 'Breakdown', position: 'above' },
  ],
}

const ascendingTriangle: ChartPattern = {
  id: 'ascending-triangle',
  name: 'Ascending Triangle',
  category: 'continuation',
  signal: 'bullish',
  description:
    'A bullish pattern with a flat resistance line and rising support (higher lows). Buyers are increasingly aggressive, pushing price toward a breakout above resistance.',
  identification: [
    'Horizontal resistance line tested multiple times',
    'Rising trendline connecting progressively higher lows',
    'Volume typically diminishes as the pattern matures',
  ],
  trading: {
    entry: 'Break above the horizontal resistance with volume',
    stopLoss: 'Below the most recent higher low',
    target: 'Height of the triangle projected above the breakout',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 100],
        [5, 108],
        [10, 102],
        [15, 108],
        [20, 104],
        [25, 108],
        [30, 106],
        [35, 108],
        [42, 115],
      ]),
      9,
    ),
  getMarkers: () => [
    { index: 5, label: 'Resistance', position: 'above' },
    { index: 10, label: 'Higher Low', position: 'below' },
    { index: 20, label: 'Higher Low', position: 'below' },
    { index: 37, label: 'Breakout', position: 'below' },
  ],
}

const descendingTriangle: ChartPattern = {
  id: 'descending-triangle',
  name: 'Descending Triangle',
  category: 'continuation',
  signal: 'bearish',
  description:
    'A bearish pattern with a flat support line and falling resistance (lower highs). Sellers are increasingly aggressive, pushing price toward a breakdown below support.',
  identification: [
    'Horizontal support line tested multiple times',
    'Falling trendline connecting progressively lower highs',
    'Volume typically diminishes as the pattern matures',
  ],
  trading: {
    entry: 'Break below the horizontal support with volume',
    stopLoss: 'Above the most recent lower high',
    target: 'Height of the triangle projected below the breakdown',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 108],
        [5, 100],
        [10, 106],
        [15, 100],
        [20, 104],
        [25, 100],
        [30, 102],
        [35, 100],
        [42, 93],
      ]),
      10,
    ),
  getMarkers: () => [
    { index: 5, label: 'Support', position: 'below' },
    { index: 10, label: 'Lower High', position: 'above' },
    { index: 20, label: 'Lower High', position: 'above' },
    { index: 37, label: 'Breakdown', position: 'above' },
  ],
}

const symmetricalTriangle: ChartPattern = {
  id: 'symmetrical-triangle',
  name: 'Symmetrical Triangle',
  category: 'continuation',
  signal: 'neutral',
  description:
    'A neutral pattern where converging trendlines of lower highs and higher lows form a triangle. The breakout direction determines the trade — usually continues the prior trend.',
  identification: [
    'Both resistance (falling) and support (rising) trendlines converge',
    'Price swings diminish as the apex approaches',
    'Usually resolves in the direction of the preceding trend',
  ],
  trading: {
    entry: 'Break above resistance or below support with volume confirmation',
    stopLoss: 'Opposite side of the triangle from the breakout',
    target: 'Widest part of the triangle projected from the breakout',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 105],
        [5, 112],
        [10, 98],
        [15, 110],
        [20, 100],
        [25, 108],
        [30, 102],
        [33, 105],
        [42, 114],
      ]),
      11,
    ),
  getMarkers: () => [
    { index: 5, label: 'Lower High', position: 'above' },
    { index: 10, label: 'Higher Low', position: 'below' },
    { index: 34, label: 'Breakout', position: 'below' },
  ],
}

const cupAndHandle: ChartPattern = {
  id: 'cup-and-handle',
  name: 'Cup and Handle',
  category: 'continuation',
  signal: 'bullish',
  description:
    'A bullish continuation shaped like a teacup. A rounded bottom (cup) is followed by a small consolidation (handle), then price breaks out to new highs.',
  identification: [
    'U-shaped cup with roughly equal rim heights',
    'Handle forms as a small pullback on the right side of the cup',
    'Handle should be shallow — less than one-third of the cup depth',
  ],
  trading: {
    entry: 'Break above the handle resistance (cup rim level)',
    stopLoss: 'Below the bottom of the handle',
    target: 'Depth of the cup projected above the breakout',
  },
  generateCandles: () =>
    buildCandlesFromPath(
      interpolate([
        [0, 110],
        [4, 107],
        [8, 103],
        [12, 100],
        [16, 103],
        [20, 107],
        [24, 110],
        [28, 108],
        [32, 109],
        [40, 118],
      ]),
      12,
    ),
  getMarkers: () => [
    { index: 12, label: 'Cup Bottom', position: 'below' },
    { index: 28, label: 'Handle', position: 'below' },
    { index: 34, label: 'Breakout', position: 'below' },
  ],
}

// ─── Candlestick Patterns ───

const hammer: ChartPattern = {
  id: 'hammer',
  name: 'Hammer',
  category: 'candlestick',
  signal: 'bullish',
  description:
    'A single bullish reversal candle at the bottom of a downtrend. It has a small body near the top and a long lower shadow (at least 2x the body), showing buyers rejected lower prices.',
  identification: [
    'Appears after a sustained downtrend',
    'Small real body at or near the high of the candle',
    'Lower shadow at least twice the length of the body',
    'Little to no upper shadow',
  ],
  trading: {
    entry: 'Open of the next candle after bullish confirmation',
    stopLoss: "Below the hammer's low",
    target: 'Previous resistance level or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [108.0, 108.5, 107.2, 107.5],
      [107.5, 107.8, 106.3, 106.6],
      [106.6, 107.0, 105.5, 105.8],
      [105.8, 106.1, 104.8, 105.0],
      [105.0, 105.4, 103.8, 104.0],
      [104.0, 104.3, 102.8, 103.0],
      [103.0, 103.4, 101.8, 102.0],
      [102.0, 102.3, 100.8, 101.0],
      [100.5, 101.0, 97.0, 100.8],
      [100.8, 102.5, 100.5, 102.3],
      [102.3, 104.0, 102.0, 103.8],
      [103.8, 105.5, 103.5, 105.2],
    ]),
  getMarkers: () => [{ index: 8, label: 'Hammer', position: 'below' }],
}

const shootingStar: ChartPattern = {
  id: 'shooting-star',
  name: 'Shooting Star',
  category: 'candlestick',
  signal: 'bearish',
  description:
    'A single bearish reversal candle at the top of an uptrend. It has a small body near the bottom and a long upper shadow (at least 2x the body), showing sellers rejected higher prices.',
  identification: [
    'Appears after a sustained uptrend',
    'Small real body at or near the low of the candle',
    'Upper shadow at least twice the length of the body',
    'Little to no lower shadow',
  ],
  trading: {
    entry: 'Open of the next candle after bearish confirmation',
    stopLoss: "Above the shooting star's high",
    target: 'Previous support level or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [100.0, 100.8, 99.8, 100.5],
      [100.5, 101.5, 100.3, 101.2],
      [101.2, 102.3, 101.0, 102.0],
      [102.0, 103.0, 101.8, 102.8],
      [102.8, 103.8, 102.5, 103.5],
      [103.5, 104.5, 103.3, 104.2],
      [104.2, 105.3, 104.0, 105.0],
      [105.0, 106.0, 104.8, 105.8],
      [106.2, 110.0, 105.8, 106.0],
      [106.0, 106.3, 104.5, 104.8],
      [104.8, 105.0, 103.5, 103.8],
      [103.8, 104.0, 102.5, 102.8],
    ]),
  getMarkers: () => [{ index: 8, label: 'Star', position: 'above' }],
}

const bullishEngulfing: ChartPattern = {
  id: 'bullish-engulfing',
  name: 'Bullish Engulfing',
  category: 'candlestick',
  signal: 'bullish',
  description:
    'A two-candle bullish reversal where a small bearish candle is followed by a larger bullish candle whose body completely engulfs the previous body.',
  identification: [
    'Appears after a downtrend',
    'First candle is bearish (red) with a small body',
    'Second candle is bullish (green) and its body fully covers the first',
    'The larger the engulfing candle, the stronger the signal',
  ],
  trading: {
    entry: 'Open of the next candle after the engulfing pattern',
    stopLoss: 'Below the low of the engulfing candle',
    target: 'Previous resistance or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [108.0, 108.3, 107.0, 107.2],
      [107.2, 107.5, 106.0, 106.3],
      [106.3, 106.5, 105.2, 105.5],
      [105.5, 105.8, 104.3, 104.5],
      [104.5, 104.8, 103.3, 103.5],
      [103.5, 103.8, 102.3, 102.5],
      [102.5, 102.8, 101.3, 101.5],
      [101.5, 101.8, 100.5, 100.8],
      [100.8, 101.0, 99.8, 100.0],
      [99.5, 102.5, 99.3, 102.2],
      [102.2, 103.5, 102.0, 103.2],
      [103.2, 104.8, 103.0, 104.5],
    ]),
  getMarkers: () => [{ index: 9, label: 'Engulfing', position: 'below' }],
}

const bearishEngulfing: ChartPattern = {
  id: 'bearish-engulfing',
  name: 'Bearish Engulfing',
  category: 'candlestick',
  signal: 'bearish',
  description:
    'A two-candle bearish reversal where a small bullish candle is followed by a larger bearish candle whose body completely engulfs the previous body.',
  identification: [
    'Appears after an uptrend',
    'First candle is bullish (green) with a small body',
    'Second candle is bearish (red) and its body fully covers the first',
    'The larger the engulfing candle, the stronger the signal',
  ],
  trading: {
    entry: 'Open of the next candle after the engulfing pattern',
    stopLoss: 'Above the high of the engulfing candle',
    target: 'Previous support or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [100.0, 100.8, 99.8, 100.5],
      [100.5, 101.3, 100.3, 101.0],
      [101.0, 101.8, 100.8, 101.5],
      [101.5, 102.3, 101.3, 102.0],
      [102.0, 102.8, 101.8, 102.5],
      [102.5, 103.3, 102.3, 103.0],
      [103.0, 103.8, 102.8, 103.5],
      [103.5, 104.3, 103.3, 104.0],
      [104.0, 104.5, 103.8, 104.3],
      [104.8, 105.0, 101.8, 102.0],
      [102.0, 102.3, 100.8, 101.0],
      [101.0, 101.3, 99.8, 100.0],
    ]),
  getMarkers: () => [{ index: 9, label: 'Engulfing', position: 'above' }],
}

const morningStar: ChartPattern = {
  id: 'morning-star',
  name: 'Morning Star',
  category: 'candlestick',
  signal: 'bullish',
  description:
    'A three-candle bullish reversal at the bottom of a downtrend. A large bearish candle, followed by a small-bodied "star", then a strong bullish candle.',
  identification: [
    'Appears after a downtrend',
    'First candle is a large bearish candle',
    'Second candle has a small body that gaps down from the first',
    "Third candle is a large bullish candle closing well into the first candle's body",
  ],
  trading: {
    entry: 'Close of the third candle or open of the next',
    stopLoss: 'Below the low of the star (middle candle)',
    target: 'Previous resistance or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [108.0, 108.5, 107.0, 107.3],
      [107.3, 107.5, 106.0, 106.3],
      [106.3, 106.5, 105.2, 105.5],
      [105.5, 105.8, 104.3, 104.5],
      [104.5, 104.8, 103.3, 103.5],
      [103.5, 103.8, 102.3, 102.5],
      [102.5, 102.8, 101.3, 101.5],
      [101.5, 101.8, 99.5, 99.8],
      [99.3, 99.8, 98.8, 99.2],
      [99.5, 102.5, 99.3, 102.2],
      [102.2, 103.5, 102.0, 103.2],
      [103.2, 104.8, 103.0, 104.5],
      [104.5, 106.0, 104.3, 105.8],
    ]),
  getMarkers: () => [{ index: 8, label: 'Star', position: 'below' }],
}

const eveningStar: ChartPattern = {
  id: 'evening-star',
  name: 'Evening Star',
  category: 'candlestick',
  signal: 'bearish',
  description:
    'A three-candle bearish reversal at the top of an uptrend. A large bullish candle, followed by a small-bodied "star", then a strong bearish candle.',
  identification: [
    'Appears after an uptrend',
    'First candle is a large bullish candle',
    'Second candle has a small body that gaps up from the first',
    "Third candle is a large bearish candle closing well into the first candle's body",
  ],
  trading: {
    entry: 'Close of the third candle or open of the next',
    stopLoss: 'Above the high of the star (middle candle)',
    target: 'Previous support or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [100.0, 100.8, 99.8, 100.5],
      [100.5, 101.3, 100.3, 101.0],
      [101.0, 101.8, 100.8, 101.5],
      [101.5, 102.3, 101.3, 102.0],
      [102.0, 102.8, 101.8, 102.5],
      [102.5, 103.3, 102.3, 103.0],
      [103.0, 103.8, 102.8, 103.5],
      [103.5, 106.0, 103.3, 105.8],
      [106.3, 106.8, 105.8, 106.2],
      [106.0, 106.2, 103.0, 103.3],
      [103.3, 103.5, 101.8, 102.0],
      [102.0, 102.3, 100.8, 101.0],
      [101.0, 101.3, 99.5, 99.8],
    ]),
  getMarkers: () => [{ index: 8, label: 'Star', position: 'above' }],
}

const doji: ChartPattern = {
  id: 'doji',
  name: 'Doji',
  category: 'candlestick',
  signal: 'neutral',
  description:
    'A single candle where open and close are nearly equal, forming a cross shape. It signals indecision and potential reversal, especially after a strong trend.',
  identification: [
    'Open and close at or very near the same price',
    'Upper and lower shadows can vary in length',
    'Most significant after a strong directional move',
    'Context determines bias: at resistance = bearish, at support = bullish',
  ],
  trading: {
    entry: 'After the next candle confirms direction',
    stopLoss: "Beyond the doji's extreme (high or low)",
    target: 'Previous support/resistance or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [100.0, 100.8, 99.8, 100.5],
      [100.5, 101.3, 100.3, 101.0],
      [101.0, 101.8, 100.8, 101.5],
      [101.5, 102.3, 101.3, 102.0],
      [102.0, 102.8, 101.8, 102.5],
      [102.5, 103.3, 102.3, 103.0],
      [103.0, 103.8, 102.8, 103.5],
      [103.5, 104.3, 103.3, 104.0],
      [104.0, 106.0, 102.0, 104.05],
      [104.0, 104.3, 102.5, 102.8],
      [102.8, 103.0, 101.5, 101.8],
      [101.8, 102.0, 100.5, 100.8],
    ]),
  getMarkers: () => [{ index: 8, label: 'Doji', position: 'above' }],
}

const threeWhiteSoldiers: ChartPattern = {
  id: 'three-white-soldiers',
  name: 'Three White Soldiers',
  category: 'candlestick',
  signal: 'bullish',
  description:
    'A powerful bullish reversal of three consecutive long bullish candles, each opening within the previous body and closing at a new high.',
  identification: [
    'Three consecutive green (bullish) candles',
    'Each candle opens within the body of the previous candle',
    'Each candle closes progressively higher',
    'Small or no upper shadows indicate strong buying pressure',
  ],
  trading: {
    entry: 'After the third candle closes',
    stopLoss: 'Below the low of the first soldier',
    target: 'Previous resistance or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [108.0, 108.3, 107.0, 107.2],
      [107.2, 107.5, 106.0, 106.3],
      [106.3, 106.5, 105.2, 105.5],
      [105.5, 105.8, 104.3, 104.5],
      [104.5, 104.8, 103.3, 103.5],
      [103.5, 103.8, 102.3, 102.5],
      [102.5, 102.8, 101.3, 101.5],
      [101.5, 101.8, 100.5, 100.8],
      [100.5, 102.8, 100.3, 102.5],
      [102.0, 104.3, 101.8, 104.0],
      [103.5, 105.8, 103.3, 105.5],
      [105.5, 107.0, 105.3, 106.8],
      [106.8, 108.0, 106.5, 107.8],
    ]),
  getMarkers: () => [
    { index: 8, label: '1st', position: 'below' },
    { index: 9, label: '2nd', position: 'below' },
    { index: 10, label: '3rd', position: 'below' },
  ],
}

const threeBlackCrows: ChartPattern = {
  id: 'three-black-crows',
  name: 'Three Black Crows',
  category: 'candlestick',
  signal: 'bearish',
  description:
    'A powerful bearish reversal of three consecutive long bearish candles, each opening within the previous body and closing at a new low.',
  identification: [
    'Three consecutive red (bearish) candles',
    'Each candle opens within the body of the previous candle',
    'Each candle closes progressively lower',
    'Small or no lower shadows indicate strong selling pressure',
  ],
  trading: {
    entry: 'After the third candle closes',
    stopLoss: 'Above the high of the first crow',
    target: 'Previous support or 1:2 risk-reward',
  },
  generateCandles: () =>
    manualCandles([
      [100.0, 100.8, 99.8, 100.5],
      [100.5, 101.3, 100.3, 101.0],
      [101.0, 101.8, 100.8, 101.5],
      [101.5, 102.3, 101.3, 102.0],
      [102.0, 102.8, 101.8, 102.5],
      [102.5, 103.3, 102.3, 103.0],
      [103.0, 103.8, 102.8, 103.5],
      [103.5, 104.3, 103.3, 104.0],
      [104.0, 104.2, 101.5, 101.8],
      [102.2, 102.5, 99.8, 100.0],
      [100.5, 100.8, 98.0, 98.3],
      [98.3, 98.5, 96.8, 97.0],
      [97.0, 97.3, 95.5, 95.8],
    ]),
  getMarkers: () => [
    { index: 8, label: '1st', position: 'above' },
    { index: 9, label: '2nd', position: 'above' },
    { index: 10, label: '3rd', position: 'above' },
  ],
}

// ─── Export ───

export const CHART_PATTERNS: ChartPattern[] = [
  // Reversal
  doubleBottom,
  doubleTop,
  headAndShoulders,
  inverseHeadAndShoulders,
  tripleBottom,
  tripleTop,
  // Continuation
  bullFlag,
  bearFlag,
  ascendingTriangle,
  descendingTriangle,
  symmetricalTriangle,
  cupAndHandle,
  // Candlestick
  hammer,
  shootingStar,
  bullishEngulfing,
  bearishEngulfing,
  morningStar,
  eveningStar,
  doji,
  threeWhiteSoldiers,
  threeBlackCrows,
]
