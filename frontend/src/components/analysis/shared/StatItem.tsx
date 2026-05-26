interface Props {
  label: string
  value: string | number
  color?: 'green' | 'red' | 'default' | 'auto'
  numericValue?: number
  sub?: string
}

export function StatItem({ label, value, color = 'default', numericValue, sub }: Props) {
  const resolvedColor = color === 'auto' ? ((numericValue ?? 0) >= 0 ? 'green' : 'red') : color

  const colorClass =
    resolvedColor === 'green'
      ? 'text-green-400'
      : resolvedColor === 'red'
        ? 'text-red-400'
        : 'text-white'

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-semibold ${colorClass}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-600">{sub}</span>}
    </div>
  )
}
