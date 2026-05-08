# Knowledge base

## State
- UI: AgentSetupWizard (provider selection + API key input + validation). ProviderCard (monogram fallback). ThemeToggler (dark/light).
- IPC: `providers:list`/`providers:error` (disk), `PROVIDER_REQUEST`/`PROVIDER_CHUNK`/`PROVIDER_REQUEST_ERROR` (HTTP fetch).
- Storage: JSON files in `~/.config/.openblog/`.
- Electron: Node.js 20+ `fetch()` in main process, no CORS.
- Tests: 128 pass (18 test files).

## History

### 88df944 — Agent Config Wizard
- Wizard with provider selection, API key validation via `list_models()`, rainbow CTA button.
- ProviderCard (logo→monogram), SetupForm (validation states).
- CSS unificado `agent-panel.css`. Zero new deps.

### a1ddcaf — Disk-based provider loading
- `electron/providers-ipc.ts`: reads `public/providers/<id>/description.json`, detects logo.
- IPC `providers:list`/`providers:error`. Preload: `listProviders()`, `onProvidersError(cb)→cleanup`.
- ProviderCard monograma circular. Error banner colapsable. Empty state.
- Tests: 10 (electron) + 3 (renderer). 17 files, 108 tests.

### b711a17 — Node.js Provider Fetch
- All provider HTTP moved to main process via `PROVIDER_REQUEST` IPC. CORS eliminated.
- `OpenAILikeProvider` rewritten: no `fetch()`. Delegates to IPC. Streaming contract prepared.
- `IPC_CHANNELS` extracted to own file. Preload: `requestProvider`, `onProviderChunk`, `onProviderRequestError`.
- Tests: 7 IPC integration + 15 ModelContract. 19 files, 128 tests.
