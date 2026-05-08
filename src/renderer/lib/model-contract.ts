import type { Message } from '../../shared/storage-api'

export interface GenerateOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
}

export interface GenerateResponse {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

export interface Model {
  id: string
  name: string
}

export interface ModelProvider {
  generate_content(prompt: string, options?: GenerateOptions): Promise<GenerateResponse>
  list_models(): Promise<Model[]>
  get_title(messages: Message[]): Promise<string>
}

export class DummyModelProvider implements ModelProvider {
  async generate_content(prompt: string, _options?: GenerateOptions): Promise<GenerateResponse> {
    const content = `[Dummy echo] ${prompt}`
    return { content, model: 'dummy' }
  }

  async list_models(): Promise<Model[]> {
    return [
      { id: 'dummy-v1', name: 'Dummy Model v1' },
      { id: 'dummy-v2', name: 'Dummy Model v2' },
    ]
  }

  async get_title(_messages: Message[]): Promise<string> {
    return 'Nueva conversación'
  }
}
