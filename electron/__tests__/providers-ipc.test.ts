import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Mock electron modules before importing the module under test
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp/test-user-data'),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}))

import { loadProvidersFromDisk } from '../providers-ipc'

let tmpDir: string

function createProviderDir(
  id: string,
  files: { description?: string; logo?: 'svg' | 'png' }
): string {
  const dir = path.join(tmpDir, id)
  fs.mkdirSync(dir, { recursive: true })
  if (files.description !== undefined) {
    fs.writeFileSync(path.join(dir, 'description.json'), files.description, 'utf-8')
  }
  if (files.logo === 'svg') {
    fs.writeFileSync(path.join(dir, 'logo.svg'), '<svg></svg>', 'utf-8')
  }
  if (files.logo === 'png') {
    fs.writeFileSync(path.join(dir, 'logo.png'), Buffer.from([137, 80, 78, 71]), 'utf-8')
  }
  return dir
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'providers-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('loadProvidersFromDisk', () => {
  it('retorna array vacío si el directorio no existe', () => {
    const result = loadProvidersFromDisk('/tmp/non-existent-dir-12345')
    expect(result.descriptors).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('retorna array vacío si el directorio está vacío', () => {
    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('carga un provider válido con logo SVG', () => {
    createProviderDir('openai', {
      description: JSON.stringify({
        name: 'OpenAI',
        description: 'GPT models',
        base_url: 'https://api.openai.com',
      }),
      logo: 'svg',
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(1)
    expect(result.descriptors[0]).toEqual({
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models',
      base_url: 'https://api.openai.com',
      logo_url: 'providers/openai/logo.svg',
    })
    expect(result.errors).toEqual([])
  })

  it('detecta logo PNG cuando SVG no existe', () => {
    createProviderDir('local', {
      description: JSON.stringify({
        name: 'Local LLM',
        base_url: 'http://localhost:8080',
      }),
      logo: 'png',
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(1)
    expect(result.descriptors[0].logo_url).toBe('providers/local/logo.png')
  })

  it('logo_url undefined cuando no hay logo', () => {
    createProviderDir('nologo', {
      description: JSON.stringify({
        name: 'No Logo',
        base_url: 'https://example.com',
      }),
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(1)
    expect(result.descriptors[0].logo_url).toBeUndefined()
  })

  it('emite error si description.json no existe', () => {
    fs.mkdirSync(path.join(tmpDir, 'broken'), { recursive: true })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual({
      providerId: 'broken',
      error: 'description.json no encontrado o ilegible',
    })
  })

  it('emite error si description.json tiene JSON inválido', () => {
    createProviderDir('invalid', { description: '{ invalid json }' })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual({
      providerId: 'invalid',
      error: 'JSON inválido en description.json',
    })
  })

  it('emite error si falta name', () => {
    createProviderDir('noname', {
      description: JSON.stringify({ base_url: 'https://example.com' }),
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].error).toContain('name')
  })

  it('emite error si falta base_url', () => {
    createProviderDir('nourl', {
      description: JSON.stringify({ name: 'No URL' }),
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].error).toContain('base_url')
  })

  it('continúa con providers válidos cuando hay errores', () => {
    createProviderDir('good', {
      description: JSON.stringify({
        name: 'Good Provider',
        base_url: 'https://good.com',
      }),
      logo: 'svg',
    })
    createProviderDir('bad', {
      description: '{ invalid }',
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(1)
    expect(result.descriptors[0].id).toBe('good')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].providerId).toBe('bad')
  })

  it('ignora archivos que no son directorios', () => {
    fs.writeFileSync(path.join(tmpDir, 'file.json'), '{}', 'utf-8')
    createProviderDir('valid', {
      description: JSON.stringify({
        name: 'Valid',
        base_url: 'https://valid.com',
      }),
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(1)
    expect(result.descriptors[0].id).toBe('valid')
  })

  it('carga múltiples providers', () => {
    createProviderDir('alpha', {
      description: JSON.stringify({ name: 'Alpha', base_url: 'https://a.com' }),
    })
    createProviderDir('beta', {
      description: JSON.stringify({ name: 'Beta', base_url: 'https://b.com' }),
    })

    const result = loadProvidersFromDisk(tmpDir)
    expect(result.descriptors).toHaveLength(2)
    expect(result.descriptors.map((d) => d.id).sort()).toEqual(['alpha', 'beta'])
  })
})
