import type { IpcRenderer } from 'electron'
import type { AgentStorageAPI } from '../shared/storage-api'

declare global {
	interface Window {
		ipcRenderer: Pick<IpcRenderer, 'on' | 'off' | 'send' | 'invoke'>
		electronAPI: {
			openExternal: (url: string) => Promise<void>
		} & AgentStorageAPI
	}
}

export {}
