import { app, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppState, Conversation } from '../src/shared/storage-api'

/** IPC channel names shared by renderer and preload (single source of truth). */
export const IPC_CHANNELS = {
	/** `invoke(url: string)` — allows only `http:` / `https:`, then calls `shell.openExternal`. */
	OPEN_EXTERNAL: 'app:open-external',

	/** Storage channels */
	STORAGE_LOAD_APP_STATE: 'storage:load-app-state',
	STORAGE_SAVE_APP_STATE: 'storage:save-app-state',
	STORAGE_LOAD_CONVERSATIONS: 'storage:load-conversations',
	STORAGE_SAVE_CONVERSATION: 'storage:save-conversation',
	STORAGE_DELETE_CONVERSATION: 'storage:delete-conversation',

	/** Provider channels */
	PROVIDERS_LIST: 'providers:list',
	PROVIDERS_ERROR: 'providers:error',
} as const

function isAllowedExternalUrl(url: string): boolean {
	try {
		const u = new URL(url)
		return u.protocol === 'http:' || u.protocol === 'https:'
	} catch {
		return false
	}
}

/** Base path for persistence (following AD-03). */
export function getOpenBlogDir(): string {
	return path.join(app.getPath('home'), '.config', '.openblog')
}

/** Path to app-state.json */
export function getAppStatePath(): string {
	return path.join(getOpenBlogDir(), 'app-state.json')
}

/** Path to conversations.json for a given config. */
export function getConversationsPath(configId: string): string {
	return path.join(getOpenBlogDir(), 'conversations', configId, 'conversations.json')
}

/** Ensure directory exists (recursive). */
function ensureDir(dir: string): void {
	fs.mkdirSync(dir, { recursive: true })
}

function readJsonFile<T>(filePath: string, fallback: T): T {
	try {
		if (!fs.existsSync(filePath)) return fallback
		const raw = fs.readFileSync(filePath, 'utf-8')
		return JSON.parse(raw) as T
	} catch {
		return fallback
	}
}

function writeJsonFile(filePath: string, data: unknown): void {
	ensureDir(path.dirname(filePath))
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function makeDefaultAppState(): AppState {
	return { lastConfigId: null, lastConversationId: null, configs: [] }
}

/** Registers IPC handlers in the main process (call once at startup). */
export function registerIpcHandlers(): void {
	ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, raw: unknown) => {
		if (typeof raw !== 'string' || raw.length === 0) {
			throw new Error('open-external: URL must be a non-empty string')
		}
		if (!isAllowedExternalUrl(raw)) {
			throw new Error('open-external: only http(s) URLs are allowed')
		}
		await shell.openExternal(raw)
	})

	// ── Storage handlers ─────────────────────────────────────────

	ipcMain.handle(IPC_CHANNELS.STORAGE_LOAD_APP_STATE, async (): Promise<AppState> => {
		return readJsonFile<AppState>(getAppStatePath(), makeDefaultAppState())
	})

	ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE_APP_STATE, async (_event, state: AppState): Promise<void> => {
		writeJsonFile(getAppStatePath(), state)
	})

	ipcMain.handle(IPC_CHANNELS.STORAGE_LOAD_CONVERSATIONS, async (_event, configId: string): Promise<Conversation[]> => {
		const data = readJsonFile<{ conversations: Conversation[] } | null>(
			getConversationsPath(configId),
			null
		)
		return data?.conversations ?? []
	})

	ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE_CONVERSATION, async (_event, configId: string, conv: Conversation): Promise<void> => {
		const path_ = getConversationsPath(configId)
		const existing = readJsonFile<{ conversations: Conversation[] } | null>(path_, null)
		const conversations = existing?.conversations ?? []
		const idx = conversations.findIndex((c) => c.id === conv.id)
		if (idx >= 0) {
			conversations[idx] = conv
		} else {
			conversations.push(conv)
		}
		writeJsonFile(path_, { conversations })
	})

	ipcMain.handle(IPC_CHANNELS.STORAGE_DELETE_CONVERSATION, async (_event, configId: string, convId: string): Promise<void> => {
		const path_ = getConversationsPath(configId)
		const existing = readJsonFile<{ conversations: Conversation[] } | null>(path_, null)
		if (!existing) return
		existing.conversations = existing.conversations.filter((c) => c.id !== convId)
		writeJsonFile(path_, existing)
	})
}
