import type { Message } from '../../shared/storage-api'
import type { ModelProvider, Model, GenerateOptions, GenerateResponse } from './model-contract'
import type { ProviderRequestPayload } from '../../types/provider'

/**
 * Provider that implements the OpenAI-compatible REST API schema.
 * All HTTP calls go through the main process via IPC to avoid CORS.
 */
export class OpenAILikeProvider implements ModelProvider {
  private baseUrl: string
  private apiKey: string
  private activeModel: string | null

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.apiKey = apiKey
    this.activeModel = null
  }

  /** Build payload for IPC provider request. */
  private buildPayload(
    endpoint: string,
    options?: { method?: 'GET' | 'POST'; body?: unknown; stream?: boolean }
  ): ProviderRequestPayload {
    return {
      endpoint,
      base_url: this.baseUrl,
      apiKey: this.apiKey,
      method: options?.method ?? 'POST',
      body: options?.body,
      stream: options?.stream ?? false,
    }
  }

  async list_models(): Promise<Model[]> {
    const payload = this.buildPayload('/v1/models', { method: 'GET' })
    const resp = await window.electronAPI.requestProvider(payload)

    if (resp.status >= 400) {
      throw new Error(`Failed to list models: ${resp.status} ${resp.error ?? ''}`)
    }

    const body = resp.data as { data?: Array<{ id: string; object?: string }> } | undefined

    if (!body?.data || !Array.isArray(body.data)) {
      throw new Error('Unexpected response format from /v1/models')
    }

    return body.data
      .filter((m) => m.object === 'model' || m.object === undefined)
      .map((m) => ({ id: m.id, name: m.id }))
  }

  async generate_content(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResponse> {
    const model = options?.model ?? this.activeModel ?? 'gpt-4o-mini'

    const body = {
      model,
      messages: [
        ...(options?.system_prompt
          ? [{ role: 'system' as const, content: options.system_prompt }]
          : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2048,
    }

    const payload = this.buildPayload('/v1/chat/completions', { body, stream: false })
    const resp = await window.electronAPI.requestProvider(payload)

    const result = resp.data as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens: number; completion_tokens: number }
      model?: string
    } | undefined

    if (resp.status >= 400 || !result) {
      const errorDetail = resp.error ?? (result ? JSON.stringify(result).slice(0, 200) : 'No response')
      throw new Error(`generate_content failed: ${resp.status} — ${errorDetail}`)
    }

    const content = result.choices?.[0]?.message?.content ?? ''

    return {
      content,
      model: result.model ?? model,
      usage: result.usage,
    }
  }

  async get_title(messages: Message[]): Promise<string> {
    if (messages.length === 0) return 'Nueva conversación'

    // Use first user message or last message content as title
    const firstUser = messages.find((m) => m.role === 'user')
    const text = firstUser?.content ?? messages[messages.length - 1]?.content ?? ''
    const truncated = text.slice(0, 60).replace(/\n/g, ' ')
    return truncated.length < text.length ? `${truncated}...` : truncated
  }
}
