import { describe, it, expect } from 'vitest'
import { DummyModelProvider } from '../lib/model-contract'

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
