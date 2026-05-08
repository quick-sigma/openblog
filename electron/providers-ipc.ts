import { app, ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { IPC_CHANNELS } from './ipc'
import type { ProviderDescriptor, ProviderDescriptionFile, ProviderError } from '../src/types/provider'

/** Resolve the directory where provider assets live. */
function getProvidersDir(): string {
  const root = process.env.APP_ROOT!
  if (!app.isPackaged) {
    // Dev: vite serves public/ from project root
    return path.join(root, 'public', 'providers')
  }
  // Prod: public/ was copied to dist/ by vite
  return path.join(root, 'dist', 'providers')
}

export interface ProviderLoadResult {
  descriptors: ProviderDescriptor[]
  errors: ProviderError[]
}

function detectLogo(subdirPath: string): string | undefined {
  const svg = path.join(subdirPath, 'logo.svg')
  const png = path.join(subdirPath, 'logo.png')
  if (fs.existsSync(svg)) return 'logo.svg'
  if (fs.existsSync(png)) return 'logo.png'
  return undefined
}

export function loadProvidersFromDisk(dirPath: string): ProviderLoadResult {
  const descriptors: ProviderDescriptor[] = []
  const errors: ProviderError[] = []

  let entries: string[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    // Directory doesn't exist → no providers, no error
    return { descriptors: [], errors: [] }
  }

  const subdirs = entries.filter((e) => e.isDirectory())

  for (const entry of subdirs) {
    const providerId = entry.name
    const subdirPath = path.join(dirPath, providerId)
    const descriptionPath = path.join(subdirPath, 'description.json')

    let raw: string
    try {
      raw = fs.readFileSync(descriptionPath, 'utf-8')
    } catch {
      errors.push({ providerId, error: 'description.json no encontrado o ilegible' })
      continue
    }

    let parsed: ProviderDescriptionFile
    try {
      parsed = JSON.parse(raw) as ProviderDescriptionFile
    } catch {
      errors.push({ providerId, error: 'JSON inválido en description.json' })
      continue
    }

    // Validate required fields
    if (typeof parsed.name !== 'string' || parsed.name.trim().length === 0) {
      errors.push({ providerId, error: 'Falta name o name inválido' })
      continue
    }
    if (typeof parsed.base_url !== 'string' || parsed.base_url.trim().length === 0) {
      errors.push({ providerId, error: 'Falta base_url o base_url inválido' })
      continue
    }

    const logoFilename = detectLogo(subdirPath)
    const logoUrl = logoFilename
      ? `providers/${providerId}/${logoFilename}`
      : undefined

    descriptors.push({
      id: providerId,
      name: parsed.name,
      description: parsed.description,
      base_url: parsed.base_url,
      logo_url: logoUrl,
    })
  }

  return { descriptors, errors }
}

/** Emit all errors to the active BrowserWindow via providers:error. */
function emitErrors(errors: ProviderError[]): void {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) {
    for (const error of errors) {
      wins[0].webContents.send(IPC_CHANNELS.PROVIDERS_ERROR, error)
    }
  }
}

/** Register all provider-related IPC handlers. Call once at app startup. */
export function registerProviderIPCHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROVIDERS_LIST, async (): Promise<ProviderDescriptor[]> => {
    const { descriptors, errors } = loadProvidersFromDisk(getProvidersDir())
    if (errors.length > 0) {
      emitErrors(errors)
    }
    return descriptors
  })
}
