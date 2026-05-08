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

	/** Provider request channels */
	PROVIDER_REQUEST: 'provider:request',
	PROVIDER_CHUNK: 'provider:chunk',
	PROVIDER_REQUEST_ERROR: 'provider:request-error',
} as const
