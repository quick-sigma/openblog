import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from './ipc-channels'
import type { ProviderRequestPayload, ProviderResponse, ProviderChunkEvent } from '../src/types/provider'

function buildUrl(base_url: string, endpoint: string): string {
  const base = base_url.replace(/\/+$/, '')
  const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${base}${ep}`
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
}

async function handleRequest(
  payload: ProviderRequestPayload,
  win: BrowserWindow
): Promise<ProviderResponse> {
  const { endpoint, body, base_url, apiKey, method = 'POST', stream = false } = payload
  const url = buildUrl(base_url, endpoint)

  const fetchInit: RequestInit = {
    method,
    headers: buildHeaders(apiKey),
  }

  if (method !== 'GET' && body !== undefined) {
    fetchInit.body = JSON.stringify(body)
  }

  let resp: Response
  try {
    resp = await fetch(url, fetchInit)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Network error: ${message}`)
  }

  if (stream && method === 'POST' && resp.body) {
    // Streaming mode — send chunks via PROVIDER_CHUNK
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          win.webContents.send(IPC_CHANNELS.PROVIDER_CHUNK, { chunk: new Uint8Array(0), done: true } satisfies ProviderChunkEvent)
          break
        }
        // Decode and re-encode as Uint8Array for the renderer
        win.webContents.send(IPC_CHANNELS.PROVIDER_CHUNK, { chunk: value, done: false } satisfies ProviderChunkEvent)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      win.webContents.send(IPC_CHANNELS.PROVIDER_REQUEST_ERROR, message)
    }

    return { status: resp.status }
  }

  // Non-streaming: read full body
  let data: unknown
  try {
    data = await resp.json()
  } catch {
    data = undefined
  }

  if (!resp.ok) {
    return { status: resp.status, data, error: `HTTP ${resp.status}: ${resp.statusText}` }
  }

  return { status: resp.status, data }
}

/** Register the provider:request IPC handler. Call once at app startup. */
export function registerProviderRequestHandler(): void {
  ipcMain.handle(IPC_CHANNELS.PROVIDER_REQUEST, async (_event, payload: ProviderRequestPayload): Promise<ProviderResponse> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) {
      throw new Error('No BrowserWindow available')
    }
    return handleRequest(payload, win)
  })
}
