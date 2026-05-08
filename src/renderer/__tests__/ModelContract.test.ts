import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DummyModelProvider } from '../lib/model-contract'
import { OpenAILikeProvider } from '../lib/openai-like-provider'

// Mock window.electronAPI for OpenAILikeProvider tests
const mockRequestProvider = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).electronAPI = {
    requestProvider: mockRequestProvider,
  }
})

describe('DummyModelProvider', () => {
  const provider = new DummyModelProvider()

  it('generate_content returns echo', async () => {
    const res = await provider.generate_content('hello world')
    expect(res.content).toBe('[Dummy echo] hello world')
    expect(res.model).toBe('dummy')
  })

  it('list_models returns dummy models', async () => {
    const models = await provider.list_models()
    expect(models.length).toBeGreaterThan(0)
    expect(models[0]).toHaveProperty('id')
    expect(models[0]).toHaveProperty('name')
  })

  it('get_title returns default title', async () => {
    const title = await provider.get_title([])
    expect(title).toBe('Nueva conversación')
  })
})

describe('OpenAILikeProvider (via IPC)', () => {
  const baseUrl = 'https://api.openai.com'
  const apiKey = 'sk-test-123'

  it('list_models mapea respuesta correctamente', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [
          { id: 'gpt-4', object: 'model' },
          { id: 'gpt-3.5-turbo', object: 'model' },
          { id: 'whisper-1', object: 'model' },
        ],
      },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)
    const models = await provider.list_models()

    expect(models).toEqual([
      { id: 'gpt-4', name: 'gpt-4' },
      { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' },
      { id: 'whisper-1', name: 'whisper-1' },
    ])

    expect(mockRequestProvider).toHaveBeenCalledWith({
      endpoint: '/v1/models',
      base_url: baseUrl,
      apiKey,
      method: 'GET',
      stream: false,
    })
  })

  it('list_models filtra objetos con object=list', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [
          { id: 'gpt-4', object: 'model' },
          { id: 'some-list', object: 'list' },
          { id: 'no-object' },
        ],
      },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)
    const models = await provider.list_models()

    // some-list (object=list) is filtered out; model and undefined are accepted
    expect(models).toHaveLength(2)
    expect(models.map((m) => m.id)).toEqual(['gpt-4', 'no-object'])
  })

  it('list_models propaga error 401', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 401,
      error: 'Unauthorized',
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)

    await expect(provider.list_models()).rejects.toThrow('Failed to list models: 401 Unauthorized')
  })

  it('list_models lanza en formato inesperado', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 200,
      data: { notData: true },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)

    await expect(provider.list_models()).rejects.toThrow('Unexpected response format')
  })

  it('generate_content manda body correcto y parsea respuesta', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 200,
      data: {
        choices: [{ message: { content: 'Hello!' } }],
        model: 'gpt-4',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)
    const result = await provider.generate_content('Hi', {
      model: 'gpt-4',
      temperature: 0.5,
      max_tokens: 100,
      system_prompt: 'Be concise',
    })

    expect(result.content).toBe('Hello!')
    expect(result.model).toBe('gpt-4')
    expect(result.usage).toEqual({ prompt_tokens: 10, completion_tokens: 5 })

    expect(mockRequestProvider).toHaveBeenCalledWith({
      endpoint: '/v1/chat/completions',
      base_url: baseUrl,
      apiKey,
      method: 'POST',
      stream: false,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Be concise' },
          { role: 'user', content: 'Hi' },
        ],
        temperature: 0.5,
        max_tokens: 100,
      },
    })
  })

  it('generate_content sin opciones usa defaults', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 200,
      data: {
        choices: [{ message: { content: 'response' } }],
      },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)
    const result = await provider.generate_content('Hello')

    expect(result.content).toBe('response')
    expect(result.model).toBe('gpt-4o-mini') // default model

    const callBody = mockRequestProvider.mock.calls[0][0].body
    expect(callBody.messages).toEqual([{ role: 'user', content: 'Hello' }])
    expect(callBody.temperature).toBe(0.7)
    expect(callBody.max_tokens).toBe(2048)
  })

  it('generate_content response sin choices devuelve content vacío', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 200,
      data: {
        choices: [],
      },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)
    const result = await provider.generate_content('Hello')

    expect(result.content).toBe('')
  })

  it('generate_content propaga error HTTP', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 500,
      error: 'Internal Server Error',
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)

    await expect(provider.generate_content('Hi')).rejects.toThrow('generate_content failed: 500')
  })

  it('generate_content propaga error sin error string', async () => {
    mockRequestProvider.mockResolvedValue({
      status: 429,
      data: { error: { message: 'Rate limited' } },
    })

    const provider = new OpenAILikeProvider(baseUrl, apiKey)

    await expect(provider.generate_content('Hi')).rejects.toThrow('generate_content failed: 429')
  })

  it('get_title no usa IPC (puramente local)', async () => {
    const provider = new OpenAILikeProvider(baseUrl, apiKey)

    const title = await provider.get_title([
      { role: 'user', content: 'Hello world', timestamp: 1000 },
    ])

    expect(title).toBe('Hello world')
    expect(mockRequestProvider).not.toHaveBeenCalled()
  })

  it('get_title devuelve texto truncado', async () => {
    const provider = new OpenAILikeProvider(baseUrl, apiKey)

    const longContent = 'a'.repeat(100)
    const title = await provider.get_title([
      { role: 'user', content: longContent, timestamp: 1000 },
    ])

    expect(title).toBe(`${'a'.repeat(60)}...`)
  })

  it('get_title empty messages', async () => {
    const provider = new OpenAILikeProvider(baseUrl, apiKey)
    const title = await provider.get_title([])
    expect(title).toBe('Nueva conversación')
  })
})
