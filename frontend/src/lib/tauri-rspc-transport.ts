// Custom rspc Transport for tauri-plugin-rspc 0.2.x (Tauri 2 Channel API).
//
// Why this exists: the published @rspc/tauri@0.3.1 NPM package still uses the
// old event-based wire format (plugin:rspc:transport / :resp events), whereas
// the Rust crate tauri-plugin-rspc@0.2.x switched to Tauri 2's invoke+Channel
// API. The two no longer talk to each other. This file is a thin (~80 lines)
// shim implementing the rspc-client Transport interface against the new wire
// format, so we can keep using rspc end-to-end without spinning up an HTTP
// server inside the Tauri process.
//
// Wire contract (from tauri-plugin-rspc 0.2.2 src/lib.rs):
//   invoke command: 'plugin:rspc|handle_rpc'
//   args: { req: Request, channel: Channel<Response> }
//   Request = { method: 'request', params: { path, input } }
//           | { method: 'abort',   params: <channel id: number> }
//   Response (untagged enum, sent via channel):
//     { code: number, value: any }  // a value (success code 200, error 4xx/5xx)
//     null                          // Done marker (stream end)

import { randomId, RSPCError, type Transport, type OperationType } from '@rspc/client'
import { Channel, invoke } from '@tauri-apps/api/core'

type ChannelMsg = { code: number; value: unknown } | null

const RPC_COMMAND = 'plugin:rspc|handle_rpc'

function toRpcError(msg: { code: number; value: unknown }): RSPCError {
  const detail =
    typeof msg.value === 'string'
      ? msg.value
      : msg.value && typeof msg.value === 'object' && 'message' in msg.value
        ? String((msg.value as { message: unknown }).message)
        : JSON.stringify(msg.value)
  return new RSPCError(msg.code, detail)
}

export class TauriPluginRspcTransport implements Transport {
  clientSubscriptionCallback?: (id: string, key: string, value: unknown) => void

  // Map rspc-side subscription id -> Tauri Channel id so subscriptionStop can abort.
  private subIdToChannelId = new Map<string, number>()

  async doRequest(operation: OperationType, key: string, input: unknown): Promise<unknown> {
    if (operation === 'subscriptionStop') {
      const channelId = this.subIdToChannelId.get(key)
      if (channelId == null) return
      this.subIdToChannelId.delete(key)
      await invoke(RPC_COMMAND, { req: { method: 'abort', params: channelId } })
      return
    }

    const channel = new Channel<ChannelMsg>()

    if (operation === 'subscription') {
      const rspcId = randomId()
      this.subIdToChannelId.set(rspcId, channel.id)
      channel.onmessage = (msg) => {
        if (msg === null) {
          this.subIdToChannelId.delete(rspcId)
          return
        }
        if (msg.code >= 400) {
          // No clean error path for subscriptions via the Transport interface;
          // logging keeps the stream alive without surfacing a stack trace.
          console.error('[rspc-tauri] subscription error', rspcId, key, msg)
          return
        }
        this.clientSubscriptionCallback?.(rspcId, key, msg.value)
      }
      await invoke(RPC_COMMAND, {
        req: { method: 'request', params: { path: key, input: input ?? null } },
        channel,
      })
      return rspcId
    }

    // query | mutation: resolve with the first value, reject on first error.
    return new Promise<unknown>((resolve, reject) => {
      let settled = false
      channel.onmessage = (msg) => {
        if (settled) return
        if (msg === null) {
          if (!settled) reject(new Error('rspc tauri: stream closed without value'))
          return
        }
        settled = true
        if (msg.code >= 400) reject(toRpcError(msg))
        else resolve(msg.value)
      }
      invoke(RPC_COMMAND, {
        req: { method: 'request', params: { path: key, input: input ?? null } },
        channel,
      }).catch((e) => {
        if (!settled) {
          settled = true
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      })
    })
  }
}
