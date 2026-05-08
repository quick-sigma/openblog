# b711a17 — Node.js Provider Fetch

1. `PROVIDER_REQUEST` IPC invoke chan: all provider HTTP → main process. CORS eliminated.
2. `provider-client-ipc.ts`: handler builds URL, headers, dispatches Node.js `fetch()`. Streaming via `Response.body.getReader()` → `Uint8Array` chunks → `webContents.send(PROVIDER_CHUNK)`.
3. Channels: `PROVIDER_REQUEST` (invoke), `PROVIDER_CHUNK` (send→renderer), `PROVIDER_REQUEST_ERROR` (send→renderer, stream errors only).
4. Preload exposes `requestProvider()`, `onProviderChunk()→cleanup`, `onProviderRequestError()→cleanup`.
5. `OpenAILikeProvider` rewritten: no `fetch()` calls. `list_models()` → IPC GET. `generate_content()` → IPC POST. `get_title()` unchanged (local).
6. Types: `ProviderRequestPayload`, `ProviderResponse`, `ProviderChunkEvent` in `src/types/provider.ts`. `renderer.d.ts` typed.
7. `IPC_CHANNELS` extracted from `electron/ipc.ts` to own `electron/ipc-channels.ts`. Consumed by ipc.ts, providers-ipc.ts, provider-client-ipc.ts.
8. Electron tests (7): mock `fetch()`, test GET/POST/401/network-error/streaming/stream-error/POST-no-body.
9. Renderer tests (15): mock `window.electronAPI.requestProvider`, test `list_models` mapping/filter/error, `generate_content` full suite, `get_title` local-only.
10. Zero UI changes. Zero new deps. 19 files changed, +863/−57.
