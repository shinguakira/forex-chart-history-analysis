import { createClient, FetchTransport, WebsocketTransport, NoOpTransport, type Transport } from '@rspc/client'
import { TauriTransport } from '@rspc/tauri'
import type { ProceduresLegacy } from '@/generated/bindings'

export type Procedures = ProceduresLegacy

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000'

function makeTransport(): Transport {
  if (isTauri) return new TauriTransport()
  if (typeof window === 'undefined') return new NoOpTransport()
  return new FetchTransport(`${SERVER_URL}/rspc`)
}

function makeWsTransport(): Transport {
  if (isTauri) return new TauriTransport()
  if (typeof window === 'undefined') return new NoOpTransport()
  const wsUrl = SERVER_URL.replace(/^http/, 'ws')
  return new WebsocketTransport(`${wsUrl}/rspc/ws`)
}

export const rspc = createClient<Procedures>({ transport: makeTransport() })
export const rspcWs = createClient<Procedures>({ transport: makeWsTransport() })
