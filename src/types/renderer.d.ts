import type { IpcRenderer } from 'electron'

declare global {
	interface Window {
		ipcRenderer: Pick<IpcRenderer, 'on' | 'off' | 'send' | 'invoke'>
		electronAPI: {
			openExternal: (url: string) => Promise<void>
		}
	}
}

export {}
