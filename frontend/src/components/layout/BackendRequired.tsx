import type { ReactNode } from 'react'
import { useBackendHealth } from '@/hooks/use-backend-health'

export function BackendRequired({ children }: { children: ReactNode }) {
  const { offline } = useBackendHealth()

  if (offline) {
    return (
      <div className="flex-1 flex flex-col justify-center px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-[10px] font-mono text-red-400 tracking-widest uppercase">offline</span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Backend not running</p>
          <p className="text-[11px] text-gray-600 font-mono">port 24000 unreachable</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
