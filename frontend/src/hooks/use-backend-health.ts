import { useQuery } from '@tanstack/react-query'
import { rspc } from '@/lib/rspc'

export function useBackendHealth() {
  const q = useQuery({
    queryKey: ['meta.health'],
    queryFn: () => rspc.query(['meta.health', null]),
    retry: 1,
    retryDelay: 800,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  })
  return {
    online: q.isSuccess,
    offline: q.isError,
    checking: q.isLoading || q.isFetching,
  }
}
