import type { IpcRenderer } from 'electron'
import type { AgentStorageAPI } from '../shared/storage-api'
import type { ProviderDescriptor, ProviderError, ProviderRequestPayload, ProviderResponse, ProviderChunkEvent } from './provider'

declare global {
	interface Window {
		ipcRenderer: Pick<IpcRenderer, 'on' | 'off' | 'send' | 'invoke'>
		electronAPI: {
			openExternal: (url: string) => Promise<void>
			listProviders: () => Promise<ProviderDescriptor[]>
			onProvidersError: (callback: (error: ProviderError) => void) => () => void
			requestProvider: (payload: ProviderRequestPayload) => Promise<ProviderResponse>
			onProviderChunk: (callback: (event: ProviderChunkEvent) => void) => () => void
			onProviderRequestError: (callback: (error: string) => void) => () => void
		} & AgentStorageAPI
	}
}

export {}
