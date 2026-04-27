export function formatPrice(price: number, decimals: number): string {
  return price.toFixed(decimals)
}

export function formatPriceChange(
  current: number,
  previous: number,
): { value: string; percent: string; positive: boolean } {
  const diff = current - previous
  const percent = previous !== 0 ? (diff / previous) * 100 : 0
  const positive = diff >= 0
  return {
    value: `${positive ? '+' : ''}${diff.toFixed(current > 10 ? 3 : 5)}`,
    percent: `${positive ? '+' : ''}${percent.toFixed(2)}%`,
    positive,
  }
}
