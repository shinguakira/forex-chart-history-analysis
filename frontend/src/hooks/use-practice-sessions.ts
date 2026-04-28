import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { PracticeTrade } from '@/types/practice'
import { rspc } from '@/lib/rspc'

const LIST_KEY = ['practice.list'] as const

export function usePracticeSessions() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => rspc.query(['practice.list']),
  })

  const upsert = useMutation({
    mutationFn: (trade: PracticeTrade) => rspc.mutation(['practice.upsert', trade]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => rspc.mutation(['practice.delete', { id }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const clear = useMutation({
    mutationFn: () => rspc.mutation(['practice.clearAll', undefined]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const trades = (query.data ?? []) as PracticeTrade[]
  const loaded = query.isSuccess

  const addTrade = useCallback((trade: PracticeTrade) => upsert.mutate(trade), [upsert])
  const updateTrade = useCallback(
    (id: string, patch: Partial<PracticeTrade>) => {
      const existing = trades.find((t) => t.id === id)
      if (!existing) return
      upsert.mutate({ ...existing, ...patch })
    },
    [trades, upsert],
  )
  const deleteTrade = useCallback((id: string) => remove.mutate(id), [remove])
  const clearAll = useCallback(() => clear.mutate(), [clear])

  return { trades, loaded, addTrade, updateTrade, deleteTrade, clearAll }
}
