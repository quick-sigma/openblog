# Knowledge base

## Paso 1 — Agent Config Wizard (88df944)
- Implementado wizard de configuración de agente con selección de provider, input de API Key con type=password, y validación real contra `list_models()`.
- Componentes puros ProviderCard y SetupForm; orquestación en AgentSetupWizard vía AgentContext.
- CSS unificado en `agent-panel.css` con animación rainbow en botón "Configurar agente" (7 stops, 3s).
- Sidebar del wizard fijo 220px; overlay cierra con click fuera o X sin confirmación.
- Logo de provider: intenta SVG, fallback a PNG, doble fallback → sin imagen.
- Expuestos `setProvider` en AgentContext y `base_url` en storage-api para OpenAILikeProvider.
- Tests agregados para todos los componentes nuevos (ProviderCard, SetupForm, AgentContext, etc).
- Cero dependencias npm nuevas.

## Paso 2 — Disk-based provider loading
- Creado `electron/providers-ipc.ts` — `loadProvidersFromDisk()` lee `public/providers/<id>/description.json` síncrono, detecta logo.svg>logo.png>undefined.
- IPC channels: `providers:list` (invoke) y `providers:error` (event push).
- Preload expone `listProviders()` y `onProvidersError(cb)→cleanupFn`.
- ProviderDescriptor/ProviderError/ProviderDescriptionFile en `src/types/provider.ts`.
- Provider assets migrados de `src/assets/providers/` a `public/providers/opencode/`.
- ProviderCard reescrito: monograma circular con iniciales cuando no hay logo o falla carga. Sin `logo_fallback_url`.
- AgentSetupWizard: error banner colapsable con contador y expand; suscribe `onProvidersError`.
- Empty state: icono 📁 + ruta + botón "Escanear de nuevo".
- Tests: `electron/__tests__/providers-ipc.test.ts` (10 tests con fs temporal), `src/renderer/__tests__/provider-list.test.ts` (3 tests). ProviderCard y AgentSetupWizard tests actualizados. 17 files, 108 tests pass.
