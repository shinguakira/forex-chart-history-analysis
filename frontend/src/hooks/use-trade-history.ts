import { useQuery } from '@tanstack/react-query'

import type { Trade } from '@/types/trade'
import { rspc } from '@/lib/rspc'

const KEY = ['trades.list'] as const

export function useTradeHistory() {
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => rspc.query(['trades.list']) as Promise<Trade[]>,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return {
    trades: (q.data ?? []) as Trade[],
    loaded: q.isSuccess,
  }
}
