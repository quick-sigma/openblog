import type { Message } from '../../shared/storage-api'
import type { ModelProvider, Model, GenerateOptions, GenerateResponse } from './model-contract'

/**
 * Provider that implements the OpenAI-compatible REST API schema.
 * Supports any backend that exposes `/v1/chat/completions` and `/v1/models`.
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

  /** Build standard headers for OpenAI-compatible REST calls. */
  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }
  }

  async list_models(): Promise<Model[]> {
    const url = `${this.baseUrl}/v1/models`
    const resp = await fetch(url, { headers: this.headers() })

    if (!resp.ok) {
      throw new Error(
        `Failed to list models: ${resp.status} ${resp.statusText}`
      )
    }

    const body = (await resp.json()) as {
      data?: Array<{ id: string; object?: string }>
    }

    if (!body.data || !Array.isArray(body.data)) {
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
    const url = `${this.baseUrl}/v1/chat/completions`

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

    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(
        `generate_content failed: ${resp.status} ${resp.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`
      )
    }

    const result = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens: number; completion_tokens: number }
      model?: string
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
