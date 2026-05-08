/** Provider descriptor emitted from main process via IPC */
export interface ProviderDescriptor {
  id: string
  name: string
  description?: string
  base_url: string
  logo_url?: string
}

/** Schema of description.json on disk */
export interface ProviderDescriptionFile {
  name: string
  description?: string
  base_url: string
  models?: string[]
}

/** Error event emitted via providers:error IPC channel */
export interface ProviderError {
  providerId: string
  error: string
}
