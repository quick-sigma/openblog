# a1ddcaf — Disk-based provider loading

1. **Arquitectura**: Layered IPC (Renderer → Preload → Main) con bridge contract. Main lee `public/providers/<id>/description.json` síncrono.
2. **ProviderDescriptor**: tipo compartido en `src/types/provider.ts` — id, name, description, base_url, logo_url (undefined si no hay logo).
3. **ProviderError**: evento IPC `providers:error` con providerId + error string.
4. **providers-ipc.ts**: `loadProvidersFromDisk()` escanea subdirectorios, parsea JSON, detecta logo.svg>logo.png>undefined. Emite errores por webContents.
5. **Preload**: expone `listProviders()` (invoke) y `onProvidersError(cb)→cleanupFn` (event push).
6. **ProviderCard reescrito**: monograma circular con iniciales cuando no hay logo o falla carga. Sin `logo_fallback_url`.
7. **AgentSetupWizard**: error banner colapsable con contador y expand; suscribe `onProvidersError`.
8. **Provider assets migrados**: de `src/assets/providers/` a `public/providers/opencode/`. Logo como ruta estática.
9. **Empty state**: icono 📁 + ruta + botón "Escanear de nuevo".
10. **Tests**: `electron/__tests__/providers-ipc.test.ts` (10 tests con fs temporal), `src/renderer/__tests__/provider-list.test.ts` (3 tests). ProviderCard y AgentSetupWizard tests actualizados. 108 tests pass en total.
