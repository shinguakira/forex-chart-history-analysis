interface Props {
  label?: string
}

export function ReviewSkeleton({ label = 'Generating review...' }: Props) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="h-4 bg-gray-800 rounded w-3/4" />
      <div className="h-4 bg-gray-800 rounded w-full" />
      <div className="h-4 bg-gray-800 rounded w-5/6" />
      <div className="h-4 bg-gray-800 rounded w-2/3" />
      <div className="h-4 bg-gray-800 rounded w-full" />
      <div className="h-4 bg-gray-800 rounded w-4/5" />
    </div>
  )
}
