interface Bar {
  label: string
  value: number
  color?: string
}

interface Props {
  bars: Bar[]
  height?: number
  showLabels?: boolean
  showValues?: boolean
  formatValue?: (v: number) => string
}

export function MiniBarChart({
  bars,
  height = 120,
  showLabels = true,
  showValues = false,
  formatValue = (v) => String(Math.round(v)),
}: Props) {
  if (bars.length === 0) return null

  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.value)), 1)
  const hasNeg = bars.some((b) => b.value < 0)
  const barWidth = Math.max(8, Math.min(32, Math.floor(600 / bars.length) - 4))
  const svgWidth = bars.length * (barWidth + 4)
  const labelH = showLabels ? 16 : 0
  const valueH = showValues ? 14 : 0
  const chartH = height - labelH - valueH
  const zeroY = hasNeg ? chartH / 2 : chartH

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
      preserveAspectRatio="xMidYMid meet"
    >
      {hasNeg && (
        <line
          x1={0}
          y1={valueH + zeroY}
          x2={svgWidth}
          y2={valueH + zeroY}
          stroke="#374151"
          strokeWidth={0.5}
        />
      )}
      {bars.map((bar, i) => {
        const x = i * (barWidth + 4) + 2
        const barH = (Math.abs(bar.value) / maxAbs) * (hasNeg ? chartH / 2 : chartH)
        const y = bar.value >= 0 ? valueH + zeroY - barH : valueH + zeroY
        const fill = bar.color ?? (bar.value >= 0 ? '#22c55e' : '#ef4444')

        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(1, barH)} fill={fill} rx={1} />
            {showValues && (
              <text
                x={x + barWidth / 2}
                y={bar.value >= 0 ? y - 2 : y + barH + 10}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={8}
              >
                {formatValue(bar.value)}
              </text>
            )}
            {showLabels && (
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={8}
              >
                {bar.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
