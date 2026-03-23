import { useQuery } from '@tanstack/react-query'
import { buildTradeContext } from '@/lib/ai/trade-context'
import type { Trade } from '@/types/trade'

export function useTradeContext(trade: Trade | null) {
  return useQuery({
    queryKey: ['trade-context', trade?.ref],
    queryFn: () => buildTradeContext(trade!),
    enabled: trade != null,
    staleTime: Infinity,
    retry: 1,
  })
}
