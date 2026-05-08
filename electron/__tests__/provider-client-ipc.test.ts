import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron modules before importing the module under test
vi.mock('electron', () => {
  const mockWebContents = {
    send: vi.fn(),
  }
  const mockWindow = {
    webContents: mockWebContents,
  }
  return {
    ipcMain: {
      handle: vi.fn(),
    },
    BrowserWindow: {
      getFocusedWindow: vi.fn(() => mockWindow),
      getAllWindows: vi.fn(() => [mockWindow]),
    },
  }
})

import { registerProviderRequestHandler } from '../provider-client-ipc'
import { IPC_CHANNELS } from '../ipc-channels'
import { ipcMain, BrowserWindow } from 'electron'

const win = (BrowserWindow as any).getFocusedWindow()

beforeEach(() => {
  vi.clearAllMocks()
})

/** Extract the IPC handler function that was registered via ipcMain.handle. */
function getHandler(): (event: any, payload: any) => Promise<any> {
  const calls = (ipcMain.handle as any).mock.calls
  const call = calls.find((c: any) => c[0] === IPC_CHANNELS.PROVIDER_REQUEST)
  if (!call) throw new Error('PROVIDER_REQUEST handler not registered')
  return call[1]
}

describe('registerProviderRequestHandler', () => {
  it('registra el handler IPC', () => {
    registerProviderRequestHandler()
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.PROVIDER_REQUEST,
      expect.any(Function)
    )
  })

  it('handler responde 200 con data en GET /v1/models', async () => {
    const mockData = {
      data: [
        { id: 'gpt-4', object: 'model' },
        { id: 'gpt-3.5-turbo', object: 'model' },
      ],
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    const result = await handler(null, {
      endpoint: '/v1/models',
      base_url: 'https://api.openai.com',
      apiKey: 'sk-test',
      method: 'GET',
      stream: false,
    })

    expect(result.status).toBe(200)
    expect(result.data).toEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      })
    )
  })

  it('handler responde error HTTP 401', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'invalid_api_key' }),
    })
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    const result = await handler(null, {
      endpoint: '/v1/models',
      base_url: 'https://api.openai.com',
      apiKey: 'sk-bad',
      method: 'GET',
      stream: false,
    })

    expect(result.status).toBe(401)
    expect(result.error).toContain('Unauthorized')
  })

  it('handler lanza error de red cuando fetch falla', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fetch failed'))
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    await expect(
      handler(null, {
        endpoint: '/v1/models',
        base_url: 'https://api.openai.com',
        apiKey: 'sk-test',
        method: 'GET',
        stream: false,
      })
    ).rejects.toThrow('Network error: fetch failed')
  })

  it('handler POST con body en generate_content', async () => {
    const mockData = {
      choices: [{ message: { content: 'Hello!' } }],
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    const body = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.7,
      max_tokens: 2048,
    }

    const result = await handler(null, {
      endpoint: '/v1/chat/completions',
      base_url: 'https://api.openai.com',
      apiKey: 'sk-test',
      method: 'POST',
      body,
      stream: false,
    })

    expect(result.status).toBe(200)
    expect(result.data).toEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  })

  it('streaming envía chunks por webContents.send', async () => {
    const encoder = new TextEncoder()
    const chunk1 = encoder.encode('Hello')
    const chunk2 = encoder.encode(' World')
    let readCount = 0

    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        readCount++
        if (readCount === 1) return Promise.resolve({ done: false, value: chunk1 })
        if (readCount === 2) return Promise.resolve({ done: false, value: chunk2 })
        return Promise.resolve({ done: true, value: undefined })
      }),
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => mockReader },
    })
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    await handler(null, {
      endpoint: '/v1/chat/completions',
      base_url: 'https://api.openai.com',
      apiKey: 'sk-test',
      method: 'POST',
      body: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hi' }] },
      stream: true,
    })

    expect(win.webContents.send).toHaveBeenCalledTimes(3)
    expect(win.webContents.send).toHaveBeenNthCalledWith(1, IPC_CHANNELS.PROVIDER_CHUNK, {
      chunk: chunk1,
      done: false,
    })
    expect(win.webContents.send).toHaveBeenNthCalledWith(2, IPC_CHANNELS.PROVIDER_CHUNK, {
      chunk: chunk2,
      done: false,
    })
    expect(win.webContents.send).toHaveBeenNthCalledWith(3, IPC_CHANNELS.PROVIDER_CHUNK, {
      chunk: new Uint8Array(0),
      done: true,
    })
  })

  it('streaming envía error cuando reader falla', async () => {
    const mockReader = {
      read: vi.fn().mockRejectedValue(new Error('stream interrupted')),
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => mockReader },
    })
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    await handler(null, {
      endpoint: '/v1/chat/completions',
      base_url: 'https://api.openai.com',
      apiKey: 'sk-test',
      method: 'POST',
      body: { model: 'gpt-4', messages: [] },
      stream: true,
    })

    expect(win.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.PROVIDER_REQUEST_ERROR,
      'stream interrupted'
    )
  })

  it('handler con POST sin body (solo headers)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok' }),
    })
    ;(globalThis as any).fetch = mockFetch

    registerProviderRequestHandler()
    const handler = getHandler()

    const result = await handler(null, {
      endpoint: '/v1/health',
      base_url: 'https://api.openai.com',
      apiKey: 'sk-test',
      method: 'POST',
      stream: false,
    })

    expect(result.status).toBe(200)
    // body should not be set when no body provided and method is POST
    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.body).toBeUndefined()
  })
})
