import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  fullWidth?: boolean
}

export function AnalysisCard({ title, children, fullWidth }: Props) {
  return (
    <div
      className={`rounded-lg border border-gray-800 bg-gray-900/50 p-4 ${fullWidth ? 'col-span-full' : ''}`}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      {children}
    </div>
  )
}
