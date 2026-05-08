import { ipcRenderer, contextBridge } from 'electron'
import { IPC_CHANNELS } from './ipc'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
	openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

	// Agent Storage API
	loadAppState: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_LOAD_APP_STATE),
	saveAppState: (state: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SAVE_APP_STATE, state),
	loadConversations: (configId: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_LOAD_CONVERSATIONS, configId),
	saveConversation: (configId: string, conv: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SAVE_CONVERSATION, configId, conv),
	deleteConversation: (configId: string, convId: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_DELETE_CONVERSATION, configId, convId),
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
