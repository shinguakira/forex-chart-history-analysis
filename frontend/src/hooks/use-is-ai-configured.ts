import { useQuery } from '@tanstack/react-query'

import { isAIConfigured } from '@/lib/ai/provider'

export interface AIConfigStatus {
  /** True once the backend confirmed the AI provider is wired up. */
  configured: boolean
  /** True while the first probe is in flight — callers should suppress the
   *  "API Key Required" banner during this window so it doesn't flash on
   *  every navigation. */
  loading: boolean
}

export function useIsAIConfigured(): AIConfigStatus {
  const q = useQuery({
    queryKey: ['ai.isConfigured'],
    queryFn: isAIConfigured,
    staleTime: 60_000,
  })
  return {
    configured: q.data ?? false,
    loading: q.isPending,
  }
}
