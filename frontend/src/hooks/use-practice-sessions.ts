import { useCallback, useEffect, useRef, useState } from 'react'
import type { PracticeTrade } from '@/types/practice'

async function load(): Promise<PracticeTrade[]> {
  const res = await fetch('/api/practice')
  if (!res.ok) return []
  return res.json()
}

async function save(trades: PracticeTrade[]): Promise<void> {
  await fetch('/api/practice', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trades),
  })
}

export function usePracticeSessions() {
  const [trades, setTrades] = useState<PracticeTrade[]>([])
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    load().then((data) => {
      setTrades(data)
      setLoaded(true)
    })
  }, [])

  const persist = useCallback((updated: PracticeTrade[]) => {
    setTrades(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(updated), 300)
  }, [])

  const addTrade = useCallback(
    (trade: PracticeTrade) => {
      persist([trade, ...trades])
    },
    [trades, persist],
  )

  const updateTrade = useCallback(
    (id: string, patch: Partial<PracticeTrade>) => {
      persist(trades.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [trades, persist],
  )

  const deleteTrade = useCallback(
    (id: string) => {
      persist(trades.filter((t) => t.id !== id))
    },
    [trades, persist],
  )

  const clearAll = useCallback(() => {
    persist([])
  }, [persist])

  return { trades, loaded, addTrade, updateTrade, deleteTrade, clearAll }
}
