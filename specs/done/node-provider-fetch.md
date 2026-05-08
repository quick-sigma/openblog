# Node.js Provider Fetch — mover todo HTTP a main process

## Contexto

- `OpenAILikeProvider` en `src/renderer/lib/openai-like-provider.ts` usa `fetch()` del renderer para hablar con el provider.
- El renderer sufre CORS cuando el provider no envía los headers adecuados.
- Electron tiene Node.js en main process → se puede hacer fetch nativo sin CORS.
- `ModelProvider` interface y `OpenAILikeProvider` se mantienen como contrato público del renderer.
- `AgentContext` sigue siendo fuente de verdad de `base_url` y `apiKey`.

## Tareas atómicas

### 1. Crear `electron/provider-client-ipc.ts` — handler IPC genérico `provider:request`

- Canal IPC: `PROVIDER_REQUEST = 'provider:request'`
- Contrato: `invoke(PROVIDER_REQUEST, { endpoint, body, base_url, apiKey, method?, stream? })`
  - `endpoint`: string, ej `/v1/chat/completions`
  - `body`: unknown, payload JSON del request
  - `base_url`: string, URL base del provider
  - `apiKey`: string, API key
  - `method`: `'GET' | 'POST'` (default `'POST'`)
  - `stream`: boolean (default `false`) — si `true`, respuesta por eventos en vez de invoke
- Handler en main process:
  - Construye `url = base_url.replace(/\/+$/, '') + endpoint`
  - `headers`: `Content-Type: application/json`, `Authorization: Bearer ${apiKey}`
  - Usa `fetch()` nativo de Node.js 20+ (built-in en Electron 30+)
  - Si `stream === false`: espera respuesta completa, devuelve `{ status, data }`
  - Si `stream === true`: usa `Response.body.getReader()` (ReadableStream), lee chunks como `Uint8Array`, envía al renderer vía `webContents.send(PROVIDER_CHUNK, { chunk: Uint8Array, done: boolean })`
    - Canal adicional: `PROVIDER_CHUNK = 'provider:chunk'`
    - Evento `PROVIDER_ERROR = 'provider:error'` para errores durante streaming
  - Errores HTTP: devuelve `{ status, error: string }`
  - Errores de red: lanza excepción (se propaga como reject de invoke)

### 2. Añadir canales a `electron/ipc-channels.ts`

- `PROVIDER_REQUEST` (invoke)
- `PROVIDER_CHUNK` (send → renderer)
- `PROVIDER_ERROR` (send → renderer, para errores de stream)

### 3. Registrar handler en `electron/main.ts`

- Llamar `registerProviderRequestHandler()` justo después de `registerProviderIPCHandlers()`

### 4. Exponer en `electron/preload.ts`

- `requestProvider(payload)` → `ipcRenderer.invoke(PROVIDER_REQUEST, payload)`
- `onProviderChunk(callback)` → listener de `PROVIDER_CHUNK`, devuelve cleanup
- `onProviderError(callback)` → listener de `PROVIDER_ERROR`, devuelve cleanup (reusar o crear canal separado del errors de providers list)

### 5. Tipar en `src/types/provider.ts`

- `ProviderRequestPayload`: `{ endpoint, body, base_url, apiKey, method?, stream? }` con tipos concretos
- `ProviderResponse`: `{ status: number, data?: unknown, error?: string }`
- `ProviderChunkEvent`: `{ chunk: Uint8Array, done: boolean }`

### 6. Tipar en `src/types/renderer.d.ts`

- Añadir `requestProvider(payload: ProviderRequestPayload): Promise<ProviderResponse>`
- Añadir `onProviderChunk(callback: (chunk: ProviderChunkEvent) => void): () => void`
- Añadir `onProviderError(callback: (error: string) => void): () => void`

### 7. Reescribir `src/renderer/lib/openai-like-provider.ts`

- Eliminar todo `fetch()` directo
- `OpenAILikeProvider` recibe `baseUrl` y `apiKey` (igual que ahora)
- `list_models()`:
  - Llama `window.electronAPI.requestProvider({ endpoint: '/v1/models', base_url, apiKey, method: 'GET', stream: false })`
  - Parsea `data` como `{ data?: Array<{ id: string, object?: string }> }`
  - Filtra y mapea igual que ahora
- `generate_content(prompt, options?)`:
  - Construye body igual que ahora
  - Si NO streaming: llama `requestProvider` síncrono, parsea respuesta igual que ahora
  - Si streaming (cuando se implemente en el futuro): llama `requestProvider` con `stream: true`, recibe chunks `Uint8Array` por `onProviderChunk`, decodifica con `TextDecoder`
- `get_title()`: igual que ahora (solo usa strings locales, no necesita fetch)

### 8. Actualizar `src/renderer/components/SetupForm.tsx`

- `handleSaveApiKey` en `AgentSetupWizard` usa `OpenAILikeProvider.list_models()` para validar → ahora ese fetch va por IPC automáticamente
- **No requiere cambios** porque la validación llama `provider.list_models()` que ya fue migrado

### 9. Actualizar `src/renderer/components/ChatView.tsx`

- `handleSend` actualmente simula con DummyModelProvider
- Cuando use `generate_content` real, la llamada irá por IPC automáticamente
- **No requiere cambios ahora** — la migración es transparente para ChatView

### 10. Tests — `electron/__tests__/provider-client-ipc.test.ts`

- Mock de `fetch()` global de Node.js
- Test: handler responde `{ status: 200, data: { ... } }`
- Test: handler responde error HTTP 401
- Test: handler responde error de red (fetch lanza)
- Test: handler con endpoint GET lista modelos
- Test: streaming envía chunks por `webContents.send`
- Test: streaming envía done=true al final

### 11. Tests — `src/renderer/__tests__/ModelContract.test.ts`

- Actualizar test existente o crear nuevo
- Mock de `window.electronAPI.requestProvider`
- Test: `list_models()` mapea respuesta correctamente
- Test: `generate_content()` manda body correcto
- Test: error 401 se propaga como excepción
- Test: response sin choices devuelve content vacío

### 12. Migrar `src/renderer/lib/provider-list.ts` (opcional, fuera de scope)

- `loadProviderDescriptors` ya usa IPC para listar providers del disco
- **No requiere cambios** — no hace fetch a URLs externas, solo lee disco

## Design System — referencias cruzadas

| Componente | Design System § | Impacto UI |
|---|---|---|
| `ChatView` | §2.6 | Estado `error` real + suscripción preparada para streaming (`onProviderChunk`). Sin cambios visuales hasta que se implemente streaming. |
| `ModelDropdown` | §2.11 | Sin cambios visuales. Nota: `list_models()` delega a IPC. |
| `SetupForm` | §2.16 | Sin cambios visuales. Nota: validación de API key delega a IPC. |
| Tokens | — | Sin nuevos tokens. Sin nuevas variables CSS. |
| `electronAPI` | `renderer.d.ts` | Nuevos métodos: `requestProvider`, `onProviderChunk`, `onProviderRequestError`. |

## Design Decisions (UI/UX)

1. **Migración invisible**: El usuario no nota que el fetch cambió de proceso. SetupForm mantiene sus estados `saving`/`error` sin alteraciones.
2. **Error real en ChatView**: Cuando `generate_content` falle (provider caído, timeout), ChatView muestra mensaje + botón Reintentar siguiendo el patrón N13.
3. **Streaming preparado, no activo**: ChatView escucha `onProviderChunk` pero el placeholder DummyModelProvider no lo usa. El contrato queda listo para futura implementación.
4. **Sin nuevos componentes**: Cero componentes UI añadidos. Cero cambios de layout.
5. **IPC como transporte interno**: ElectronAPI crece con 3 nuevos métodos, pero ningún componente los invoca directamente — solo `OpenAILikeProvider` (que es capa de infraestructura, no UI).
6. **Uint8Array para chunks**: Los chunks viajan como bytes crudos, el renderer decodifica. Evita doble encoding y da control de codificación al renderer.
7. **Un solo canal de invoke**: `provider:request` sirve GET y POST. El dispatch lo hace el renderer por endpoint.
8. **Error de red en validación igual que error de API key**: SetupForm no distingue visualmente entre "API key inválida" y "provider no responde". Ambos se muestran en `.setup-form-error`.
9. **ModelDropdown no cambia**: Sus estados `loading`/`error`/`empty` siguen siendo válidos. El fetch interno va por IPC pero el componente no lo sabe.
10. **Sin nuevos tests visuales**: Los tests de componentes UI existentes no requieren cambios. Los tests nuevos son de integración IPC (electron/) y de contrato (ModelContract).

## No hacer

- No modificar `ModelProvider` interface en `model-contract.ts`
- No modificar `AgentContext`
- No modificar `DummyModelProvider`
- No modificar `electron/providers-ipc.ts`
- No implementar streaming real en ChatView — solo preparar el contrato
- No tocar `electron/ipc.ts` (handlers de storage)

## Implementation details (compact)

1. `PROVIDER_REQUEST` invoke chan: `{endpoint,body,base_url,apiKey,method?,stream?}` → `{status,data?,error?}`. Handled in `provider-client-ipc.ts`.
2. `fetch()` nativo Node.js 20+ (built-in Electron 30+). No CORS. Headers: `Content-Type: application/json`, `Authorization: Bearer ${apiKey}`.
3. Streaming: `Response.body.getReader()` → `Uint8Array` chunks → `webContents.send(PROVIDER_CHUNK, {chunk,done})`. Error in stream → `PROVIDER_REQUEST_ERROR`.
4. Channels: `PROVIDER_REQUEST` (invoke), `PROVIDER_CHUNK` (send→renderer), `PROVIDER_REQUEST_ERROR` (send→renderer).
5. Preload exposes: `requestProvider()`, `onProviderChunk()→cleanup`, `onProviderRequestError()→cleanup`.
6. `OpenAILikeProvider` rewritten: no `fetch()` calls. `list_models()` → IPC GET. `generate_content()` → IPC POST with body. `get_title()` → unchanged (local string-only).
7. Types: `ProviderRequestPayload`, `ProviderResponse`, `ProviderChunkEvent` in `src/types/provider.ts`.
8. `renderer.d.ts`: `requestProvider`, `onProviderChunk`, `onProviderRequestError` in `electronAPI`.
9. Electron test (7 tests): mock `fetch()`, test GET/POST/401/network error/streaming/stream-error/POST-no-body.
10. Renderer test (15 tests): mock `window.electronAPI.requestProvider`, test `list_models` mapping/filter/error/format, `generate_content` body/options/defaults/empty-choices/HTTP-error/error-without-string, `get_title` local-only/truncate/empty.
