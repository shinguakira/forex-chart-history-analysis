import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { PAIRS } from '@/config/pairs'
import type { IngestionJob, TimeFrame } from '@/generated/bindings'
import { rspc } from '@/lib/rspc'

const LIST_KEY = ['ingestion.listJobs'] as const
const TIMEFRAMES: TimeFrame[] = ['1', '5', '15', '60', '240', 'D', 'W']

function tfLabel(tf: TimeFrame) {
  switch (tf) {
    case '1':
      return '1m'
    case '5':
      return '5m'
    case '15':
      return '15m'
    case '60':
      return '1h'
    case '240':
      return '4h'
    case 'D':
      return 'Daily'
    case 'W':
      return 'Weekly'
  }
}

function fmtTime(epoch: number) {
  if (!epoch || epoch >= 9_999_999_999) return '-'
  const d = new Date(epoch * 1000)
  return d.toISOString().replace('T', ' ').slice(0, 16)
}

export function IngestionPage() {
  const qc = useQueryClient()
  const [pairId, setPairId] = useState(PAIRS[0].id)
  const [tf, setTf] = useState<TimeFrame>('60')
  const [days, setDays] = useState(180)

  const jobs = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => rspc.query(['ingestion.listJobs']) as Promise<IngestionJob[]>,
    refetchInterval: 5_000,
  })

  const startBackfill = useMutation({
    mutationFn: (input: {
      pairId: string
      timeframe: TimeFrame
      rangeStart: number
      rangeEnd: number
    }) => rspc.mutation(['ingestion.startBackfill', input]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const startCatchup = useMutation({
    mutationFn: (input: { pairId: string; timeframe: TimeFrame }) =>
      rspc.mutation(['ingestion.startCatchup', input]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const pause = useMutation({
    mutationFn: (jobId: string) => rspc.mutation(['ingestion.pauseJob', { jobId }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
  const resume = useMutation({
    mutationFn: (jobId: string) => rspc.mutation(['ingestion.resumeJob', { jobId }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
  const remove = useMutation({
    mutationFn: (jobId: string) => rspc.mutation(['ingestion.deleteJob', { jobId }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const handleBackfill = () => {
    const now = Math.floor(Date.now() / 1000)
    const start = now - days * 86_400
    startBackfill.mutate({ pairId, timeframe: tf, rangeStart: start, rangeEnd: now })
  }

  const handleCatchup = () => {
    startCatchup.mutate({ pairId, timeframe: tf })
  }

  const list = jobs.data ?? []
  const backfills = list.filter((j) => j.kind === 'backfill')
  const catchups = list.filter((j) => j.kind === 'catchup')

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">Candle Ingestion</h1>

        <section className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h2 className="text-sm font-semibold text-gray-300">Start a job</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Pair</label>
              <select
                value={pairId}
                onChange={(e) => setPairId(e.target.value)}
                className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm"
              >
                {PAIRS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Timeframe</label>
              <select
                value={tf}
                onChange={(e) => setTf(e.target.value as TimeFrame)}
                className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm"
              >
                {TIMEFRAMES.map((t) => (
                  <option key={t} value={t}>
                    {tfLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Backfill (days back)</label>
              <input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
                className="w-24 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm"
              />
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={handleBackfill}
              disabled={startBackfill.isPending}
            >
              Start Backfill
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              onClick={handleCatchup}
              disabled={startCatchup.isPending}
            >
              Start Catch-up
            </button>
          </div>
        </section>

        <JobsTable
          title="Backfill jobs"
          jobs={backfills}
          onPause={pause.mutate}
          onResume={resume.mutate}
          onDelete={remove.mutate}
        />
        <JobsTable
          title="Catch-up jobs"
          jobs={catchups}
          onPause={pause.mutate}
          onResume={resume.mutate}
          onDelete={remove.mutate}
        />
      </div>
    </div>
  )
}

interface TableProps {
  title: string
  jobs: IngestionJob[]
  onPause: (jobId: string) => void
  onResume: (jobId: string) => void
  onDelete: (jobId: string) => void
}

function JobsTable({ title, jobs, onPause, onResume, onDelete }: TableProps) {
  if (jobs.length === 0) {
    return (
      <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">{title}</h2>
        <p className="text-xs text-gray-500">No jobs yet.</p>
      </section>
    )
  }
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">{title}</h2>
      <div className="text-xs">
        <div className="grid grid-cols-[100px_60px_90px_140px_120px_70px_1fr_120px] gap-2 text-gray-500 pb-2 border-b border-gray-800">
          <span>Pair</span>
          <span>TF</span>
          <span>Status</span>
          <span>Range</span>
          <span>Progress</span>
          <span>Retry</span>
          <span>Last error</span>
          <span>Actions</span>
        </div>
        {jobs.map((j) => (
          <div
            key={j.id}
            className="grid grid-cols-[100px_60px_90px_140px_120px_70px_1fr_120px] gap-2 items-center py-2 border-b border-gray-800/50"
          >
            <span className="text-gray-200">{j.pairId.replace('_', '/')}</span>
            <span className="text-gray-400">{tfLabel(j.timeframe)}</span>
            <span className={statusClass(j.status)}>{j.status}</span>
            <span className="text-gray-500 text-[10px]">
              {fmtTime(j.rangeStart)} → {fmtTime(j.rangeEnd)}
            </span>
            <span className="text-gray-400">
              {j.completedChunks}/{j.totalChunks || '∞'}
            </span>
            <span className="text-gray-400">{j.retryCount}</span>
            <span className="text-red-400 truncate">{j.lastError ?? ''}</span>
            <span className="flex gap-1">
              {j.status === 'running' || j.status === 'pending' ? (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                  onClick={() => onPause(j.id)}
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded bg-blue-700 text-white hover:bg-blue-600"
                  onClick={() => onResume(j.id)}
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                className="px-2 py-0.5 rounded bg-red-900 text-red-200 hover:bg-red-800"
                onClick={() => onDelete(j.id)}
              >
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function statusClass(s: string) {
  switch (s) {
    case 'running':
      return 'text-blue-400'
    case 'completed':
      return 'text-green-400'
    case 'failed':
      return 'text-red-400'
    case 'paused':
      return 'text-yellow-400'
    default:
      return 'text-gray-400'
  }
}
