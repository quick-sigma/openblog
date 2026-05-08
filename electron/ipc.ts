import { ipcMain, shell } from 'electron'

/** IPC channel names shared by renderer and preload (single source of truth). */
export const IPC_CHANNELS = {
	/** `invoke(url: string)` — allows only `http:` / `https:`, then calls `shell.openExternal`. */
	OPEN_EXTERNAL: 'app:open-external',
} as const

function isAllowedExternalUrl(url: string): boolean {
	try {
		const u = new URL(url)
		return u.protocol === 'http:' || u.protocol === 'https:'
	} catch {
		return false
	}
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
}
