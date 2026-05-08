import type { IpcRenderer } from 'electron'
import type { AgentStorageAPI } from '../shared/storage-api'
import type { ProviderDescriptor, ProviderError } from './provider'

declare global {
	interface Window {
		ipcRenderer: Pick<IpcRenderer, 'on' | 'off' | 'send' | 'invoke'>
		electronAPI: {
			openExternal: (url: string) => Promise<void>
			listProviders: () => Promise<ProviderDescriptor[]>
			onProvidersError: (callback: (error: ProviderError) => void) => () => void
		} & AgentStorageAPI
	}
}

export {}
