import { useQuery } from '@tanstack/react-query'

import { isAIConfigured } from '@/lib/ai/provider'

export function useIsAIConfigured(): boolean {
  const q = useQuery({
    queryKey: ['ai.isConfigured'],
    queryFn: isAIConfigured,
    staleTime: 60_000,
  })
  return q.data ?? false
}
