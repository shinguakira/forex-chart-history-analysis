interface Point {
  value: number
}

interface Props {
  points: Point[]
  height?: number
  color?: string
  showZeroLine?: boolean
  fillBelow?: boolean
}

export function MiniLineChart({
  points,
  height = 140,
  color = '#3b82f6',
  showZeroLine = false,
  fillBelow = false,
}: Props) {
  if (points.length < 2) return null

  const width = 800
  const padding = 4
  const min = Math.min(...points.map((p) => p.value))
  const max = Math.max(...points.map((p) => p.value))
  const range = max - min || 1

  const toX = (i: number) => padding + (i / (points.length - 1)) * (width - padding * 2)
  const toY = (v: number) => padding + (1 - (v - min) / range) * (height - padding * 2)

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(p.value)}`).join(' ')

  const fillD = fillBelow
    ? `${pathD} L${toX(points.length - 1)},${toY(Math.min(0, min))} L${toX(0)},${toY(Math.min(0, min))} Z`
    : ''

  const zeroY = min <= 0 && max >= 0 ? toY(0) : null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
      preserveAspectRatio="none"
    >
      {showZeroLine && zeroY != null && (
        <line
          x1={padding}
          y1={zeroY}
          x2={width - padding}
          y2={zeroY}
          stroke="#374151"
          strokeWidth={1}
        />
      )}
      {fillBelow && <path d={fillD} fill={`${color}15`} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  )
}
