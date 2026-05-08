import { ipcRenderer, contextBridge } from 'electron'
import { IPC_CHANNELS } from './ipc-channels'
import type { ProviderDescriptor, ProviderError, ProviderRequestPayload, ProviderResponse, ProviderChunkEvent } from '../src/types/provider'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
	openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

	// Agent Storage API
	loadAppState: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_LOAD_APP_STATE),
	saveAppState: (state: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SAVE_APP_STATE, state),
	loadConversations: (configId: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_LOAD_CONVERSATIONS, configId),
	saveConversation: (configId: string, conv: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SAVE_CONVERSATION, configId, conv),
	deleteConversation: (configId: string, convId: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_DELETE_CONVERSATION, configId, convId),

	// Provider disk loading
	listProviders: () => ipcRenderer.invoke(IPC_CHANNELS.PROVIDERS_LIST) as Promise<ProviderDescriptor[]>,
	onProvidersError: (callback: (error: ProviderError) => void) => {
		const handler = (_event: Electron.IpcRendererEvent, error: ProviderError) => callback(error)
		ipcRenderer.on(IPC_CHANNELS.PROVIDERS_ERROR, handler)
		// Return cleanup function
		return () => {
			ipcRenderer.removeListener(IPC_CHANNELS.PROVIDERS_ERROR, handler)
		}
	},

	// Provider HTTP request delegation
	requestProvider: (payload: ProviderRequestPayload) =>
		ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_REQUEST, payload) as Promise<ProviderResponse>,

	onProviderChunk: (callback: (event: ProviderChunkEvent) => void) => {
		const handler = (_event: Electron.IpcRendererEvent, chunk: ProviderChunkEvent) => callback(chunk)
		ipcRenderer.on(IPC_CHANNELS.PROVIDER_CHUNK, handler)
		return () => {
			ipcRenderer.removeListener(IPC_CHANNELS.PROVIDER_CHUNK, handler)
		}
	},

	onProviderRequestError: (callback: (error: string) => void) => {
		const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
		ipcRenderer.on(IPC_CHANNELS.PROVIDER_REQUEST_ERROR, handler)
		return () => {
			ipcRenderer.removeListener(IPC_CHANNELS.PROVIDER_REQUEST_ERROR, handler)
		}
	},
})
contextBridge.exposeInMainWorld('ipcRenderer', {
	on(...args: Parameters<typeof ipcRenderer.on>) {
		const [channel, listener] = args
		return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
	},
	off(...args: Parameters<typeof ipcRenderer.off>) {
		const [channel, ...omit] = args
		return ipcRenderer.off(channel, ...omit)
	},
	send(...args: Parameters<typeof ipcRenderer.send>) {
		const [channel, ...omit] = args
		return ipcRenderer.send(channel, ...omit)
	},
	invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
		const [channel, ...omit] = args
		return ipcRenderer.invoke(channel, ...omit)
	},

	// You can expose other APTs you need here.
	// ...
})
