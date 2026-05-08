# Disk-based provider loading

---

## Architectural Design

### Patrón arquitectónico

**Layered IPC con Bridge Contract.** Tres capas con contratos de datos explícitos:

```
Renderer (React)          Preload (Bridge)          Main (Node.js)
─────────────────         ────────────────          ───────────────
AgentSetupWizard          window.electronAPI        providers-ipc.ts
  ├─ providerErrors[]       ├─ listProviders()  →   ipcMain.handle('providers:list')
  └─ <ProviderCard>         └─ onProvidersError() → ipcMain.emit('providers:error')
       └─ <img src=logo>
```

**Flujo de datos:** Renderer invoca `window.electronAPI.listProviders()` → Preload traduce a `ipcRenderer.invoke('providers:list')` → Main lee disco síncrono, construye `ProviderDescriptor[]`, emite errores granularmente vía `webContents.send('providers:error')`. Resultado viaja serializado por IPC. Renderer recibe `ProviderDescriptor[]` (con `logo_url` como ruta estática) + errores vía listener.

---

### Contratos de datos

#### `ProviderDescriptor` — tipo compartido en `src/types/provider.ts`

```typescript
export interface ProviderDescriptor {
  id: string;           // ID único = nombre del subdirectorio en assets/providers/
  name: string;         // Nombre mostrado en UI. Requerido.
  description?: string; // Descripción opcional para tooltip / detalle.
  base_url: string;     // URL base de la API del provider. Requerido.
  logo_url?: string;    // Ruta al logo servido estáticamente, relativa al renderer.
                        // undefined si no existe logo.svg ni logo.png.
}
```

#### `ProviderDescriptionFile` — esquema del `description.json` en disco

```typescript
export interface ProviderDescriptionFile {
  name: string;         // Nombre del provider (requerido, string no vacío).
  description?: string; // Descripción textual (opcional).
  base_url: string;     // URL base de la API (requerido, string no vacío).
  models?: string[];    // Lista de modelos conocidos (opcional).
}
```

#### `ProviderError` — evento IPC `providers:error`

```typescript
export interface ProviderError {
  providerId: string;
  error: string;
}
```

---

### Capas y módulos

#### Main Process — `src/main/providers-ipc.ts`

**Responsabilidad única:** leer directorio de providers desde disco y exponerlos vía IPC.

```
providers-ipc.ts
├── loadProvidersFromDisk(dirPath: string): ProviderLoadResult
│   ├── fs.readdirSync(dirPath)
│   ├── for each subdir:
│   │   ├── readFileSync('description.json') → parse JSON
│   │   ├── detectLogo(subdir): fs.existsSync('logo.svg') > 'logo.png' > undefined
│   │   ├── validate(parsed): name!=null, base_url!=null, strings no vacíos
│   │   ├── valid → push a descriptors[]
│   │   └── invalid → push a errors[] + emit 'providers:error'
│   └── return { descriptors, errors }
│
├── registerProviderIPCHandlers(): void
│   ├── ipcMain.handle('providers:list', () => {
│   │     const { descriptors } = loadProvidersFromDisk(PROVIDERS_DIR)
│   │     return descriptors
│   │   })
│   └── (errors se emiten como eventos push durante la carga)
│
└── PROVIDERS_DIR: string  // path.join(__dirname, '../../renderer/assets/providers')
```

**Reglas:**
- Lectura síncrona (`readdirSync`, `readFileSync`, `existsSync`) — se ejecuta una vez por IPC call, no es hot-path.
- Cada error se emite como `webContents.send('providers:error', error)` al `BrowserWindow` activo.
- Si `providers/` no existe → retornar `[]` sin error (no es condición de fallo, es "sin providers custom").
- El módulo NO expone `loadProvidersFromDisk` fuera de su scope (solo se usa internamente).

#### Preload — `src/preload/index.ts`

**Responsabilidad única:** exponer contratos tipados del IPC al renderer.

```typescript
// Métodos a agregar a window.electronAPI:
{
  listProviders: () => ipcRenderer.invoke('providers:list'),
  onProvidersError: (callback: (error: ProviderError) => void) => {
    ipcRenderer.on('providers:error', (_event, error) => callback(error))
  }
}
```

**Reglas:**
- No lógica de negocio en preload. Solo forwarding de IPC.
- Tipos importados desde `src/types/provider.ts`.
- Declaración de tipos en `src/types/renderer.d.ts` referencia a `ProviderDescriptor` y `ProviderError` vía import del tipo compartido.

#### Renderer

| Módulo | Responsabilidad única |
|--------|----------------------|
| `src/renderer/lib/provider-list.ts` | Cargar descriptores desde el bridge. `loadProviderDescriptors()` llama a `window.electronAPI?.listProviders()`. `logo_url` ya viene resuelto desde main. `knownFiles` hardcodeado se elimina. |
| `ProviderCard.tsx` | Renderizar card de provider. Si `logo_url === undefined` → sin `<img>`. Si `logo_url` existe → `<img src={logo_url} onError={...}>`. Sin estado `logoError`, sin `handleLogoError`, sin `logo_fallback_url`. |
| `AgentSetupWizard.tsx` | Orquestar wizard + banner de errores. Estado local `providerErrors: ProviderError[]`. `useEffect` al montar suscribe `onProvidersError`. Banner no bloqueante con texto "X provider(s) no se pudieron cargar" + expand con `providerId → error`. |

**Reglas de límites:**
- Main NUNCA importa código de renderer.
- Renderer NUNCA importa `fs`, `path`, ni módulos Node.
- ProviderCard NO conoce de IPC — solo recibe props.
- provider-list.ts es el ÚNICO módulo renderer que toca `window.electronAPI` para providers.
- AgentSetupWizard consume `ProviderError[]` vía listener, no vía provider-list.

---

### Build & Assets

**Directorio canónico:** `src/renderer/assets/providers/`

Electron-vite sirve `src/renderer/assets/` como root de assets estáticos del renderer. No se requiere configuración extra de build.

**Estructura esperada:**
```
src/renderer/assets/providers/
├── openai/
│   ├── description.json
│   └── logo.svg
├── anthropic/
│   ├── description.json
│   └── logo.svg
└── local-llm/
    ├── description.json
    └── logo.png
```

**En dev:** `vite dev` sirve `src/renderer/assets/` → accesible como `/assets/providers/<id>/logo.svg`.
**En build:** `electron-vite build` copia a `out/renderer/assets/providers/` automáticamente.

El main process resuelve la ruta de lectura como `path.join(__dirname, '../../renderer/assets/providers')`. En dev apunta a `src/renderer/assets/providers`, en build a `out/renderer/assets/providers`.

**Regla:** No se copian assets manualmente. Electron-vite maneja la ruta del renderer. Main solo lee, no sirve.

---

### Flujo completo

```
[App inicia] → [Renderer monta AgentSetupWizard]
  → useEffect suscribe onProvidersError
  → useEffect llama listProviders()
    → [Main] loadProvidersFromDisk(PROVIDERS_DIR)
      → readdirSync → ['openai', 'anthropic', 'local-llm']
      → Para 'openai': readFileSync → parse OK, existsSync('logo.svg')=true
        → push { id:'openai', name:'OpenAI', base_url:'https://...', logo_url:'assets/providers/openai/logo.svg' }
      → Para 'local-llm': readFileSync → JSON inválido
        → push error + webContents.send('providers:error', { providerId:'local-llm', error:'JSON inválido' })
      → Retorna descriptors (sin local-llm)
    → [Main] return descriptors[]
  → [Renderer] recibe descriptors[] → ProviderCard[] renderiza
  → [Renderer] recibe providers:error → acumula en providerErrors[]
  → [Renderer] muestra banner: "1 provider(s) no se pudieron cargar"
```

---

### Persistencia

No se requiere persistencia. Los providers se leen de disco en cada llamada a `providers:list` (sin caché). El disco es la fuente de verdad.

---

### Architectural Decisions

1. **Custom protocol (`app://`) para servir logos** — Evita copia de assets en build. Main process resuelve rutas dinámicas interceptando requests al protocolo, permitiendo que `logo_url` sea `app://providers/<id>/logo` sin importar ubicación física.

2. **Error handling granular con continuation** — Un provider inválido no bloquea a los demás. Errores se emiten como eventos IPC individuales (`providers:error`), permitiendo que el wizard muestre un banner informativo sin interrumpir el flujo de selección.

3. **Esquema mínimo tipado para `description.json`** — Solo `name: string` y `base_url: string` requeridos. `description?: string` y `models?: string[]` opcionales. Validación estructural sin librerías externas (checks de tipo en runtime).

4. **Tipos compartidos en `src/types/provider.ts`** — Single source of truth para `ProviderDescriptor`, `ProviderDescriptionFile` y `ProviderError`. Importado tanto por main como renderer/preload. Evita divergencia de interfaces.

5. **Directorio de providers en `src/renderer/assets/providers/`** — Aprovecha el pipeline de assets nativo de electron-vite sin configuración extra. En dev, vite sirve los archivos estáticos. En build, se copian automáticamente al output del renderer.

6. **Lectura fresh sin caché** — `providers:list` lee disco en cada invocación. El dataset es pequeño (3-10 providers, ~1KB de JSON cada uno) y solo cambia durante desarrollo. Sin TTL, sin watchers, sin invalidación manual.

7. **Logo detection determinista: `logo.svg` > `logo.png` > undefined** — Nombres exactos, sin globbing. Si existe `logo.svg`, se ignora `logo.png`. Sin ambigüedad. El renderer recibe `logo_url` completamente resuelto desde main, sin lógica de detección.

8. **Preload como forwarding puro** — `window.electronAPI.listProviders()` es literalmente `ipcRenderer.invoke('providers:list')`. Cero lógica de negocio en preload. El contrato tipado vive en `src/types/renderer.d.ts`.

9. **ProviderCard sin lógica de fallback de imagen** — `onError` solo oculta el `<img>` si falla la carga (404, red, etc.). No hay doble fallback SVG→PNG. Si no hay logo, simplemente no se renderiza imagen. Simplifica el componente.

10. **AgentSetupWizard como único orquestador de errores** — Solo el wizard se suscribe a `onProvidersError`. provider-list.ts no emite ni consume errores. Separación clara: datos (provider-list) vs UI de errores (wizard).

---

## Design System Reference

> Fuente única de verdad UI/UX: `design_system.md`
> Sección relevante: §2.1–2.5 (ProviderErrorBanner, ProviderCard modificado, AgentSetupWizard modificado, Empty State, Logo behavior)

### Design Compact (10 decisiones clave)

1. **Banner errores sticky debajo del header**: `ProviderErrorBanner` full-width, colapsable, fondo `--color-error-bg`, con contador "X provider(s) no se pudieron cargar" y toggle expand.
2. **Lista de errores expandida**: items `❌ providerId — mensaje`, fuente 13px, `--color-error-text`, sin bloqueo de interacción.
3. **Empty state con re-scan**: ícono 📁 + "No se encontraron providers" + ruta monospace + botón "Escanear de nuevo".
4. **ProviderCard: monograma sustituye ausencia de logo**: sin `logo_fallback_url`. Si `logo_url === undefined` → círculo 72px con iniciales uppercase del `name` (primeras 2).
5. **Monograma estilo**: círculo `--color-monogram-bg`, texto 28px bold `--color-monogram-text`. Si `<img onError>` → oculta imagen y muestra monograma.
6. **ProviderCard elevation en hover**: `translateY(-2px)` + `box-shadow: var(--shadow-card-hover)` + borde primary. Transición 150ms ease.
7. **Spinner loading se mantiene**: "Cargando providers..." con animación existente. La carga IPC es <100ms.
8. **Providers orden alfabético**: `localeCompare` case-insensitive por `name`. Predecible, sin depender de orden de sistema de archivos.
9. **Sin indicadores visuales de errores en la lista de providers**: solo providers válidos se muestran como cards. Errores van exclusivamente al banner. Separación clara.
10. **Lista single-column scrolleable**: `overflow-y: auto` heredado de `.agent-setup-content`. Sin grid. Sin paginación. Sin cambios de layout.

---

## Tasks

## T1 — IPC channel: `providers:list`

- [ ] Crear `src/main/providers-ipc.ts`.
- [ ] Usar `fs.readdirSync` para leer `src/assets/providers/`.
- [ ] Por cada subdirectorio:
  - Leer `description.json` con `fs.readFileSync`.
  - Parsear JSON. Si falla → emitir evento `providers:error` con `{ providerId, error: 'JSON inválido' }`. Continuar con siguiente provider.
  - Detectar logo: si existe `logo.svg` → `logo_url = logo.svg`. Si no existe pero existe `logo.png` → `logo_url = logo.png`. Si ninguno → `logo_url = undefined`.
  - Validar que `name` y `base_url` existan y sean strings no vacíos. Si falta alguno → emitir `providers:error` con `{ providerId, error: 'Falta name o base_url' }`. Continuar.
  - Construir descriptor: `{ id, name, description, base_url, logo_url }`.
- [ ] Exponer el array resultante de descriptores al renderer vía IPC handle `providers:list`.
- [ ] Exponer canal `providers:error` como `ipcRenderer.on('providers:error', callback)` para que el renderer pueda mostrar errores en UI.
- [ ] Registrar el handler en `src/main/index.ts`.

## T2 — Preload bridge

- [ ] Agregar a `window.electronAPI` el método `listProviders(): Promise<ProviderDescriptor[]>` que invoque `ipcRenderer.invoke('providers:list')`.
- [ ] Agregar a `window.electronAPI` el listener `onProvidersError(callback)` que haga `ipcRenderer.on('providers:error', callback)`.
- [ ] Actualizar `src/types/renderer.d.ts` con los tipos correspondientes.

## T3 — Provider assets build copy

- [ ] Configurar electron-vite para que `src/assets/providers/` se copie a `out/renderer/assets/providers/` durante el build.
- [ ] Asegurar que en dev mode los assets estén disponibles en la ruta `assets/providers/<id>/logo.svg` (o `.png`).
- [ ] Verificar que `ProviderCard` pueda cargar logos desde `assets/providers/<id>/logo.<ext>`.

## T4 — Reemplazar `loadProviderDescriptors()`

- [ ] Modificar `src/renderer/lib/provider-list.ts`:
  - Eliminar `knownFiles` hardcodeado.
  - `loadProviderDescriptors()` ahora llama a `window.electronAPI.listProviders()`.
  - Si `listProviders` no está disponible (fallback para tests), retornar array vacío.
  - `logo_url` ya viene resuelto desde main → usarlo directamente.
  - Eliminar `logo_fallback_url` del tipo.
- [ ] Actualizar `ProviderDescriptor`:
  - `logo_url?: string` → ruta completa al asset o `undefined`.
  - Eliminar `logo_fallback_url`.
- [ ] Ordenar resultados alfabéticamente por `name` antes de retornar.

## T5 — ProviderCard adaptación

- [ ] `ProviderCard.tsx`:
  - Eliminar lógica de fallback SVG→PNG (`logoError` state, `handleLogoError`, `logo_fallback_url`).
  - Si `logo_url === undefined` → renderizar **monograma circular** con iniciales del `name` (primeras 2 letras uppercase).
  - Si `logo_url` existe → renderizar `<img src={logo_url}>`. Si `onError` dispara → ocultar `<img>` y mostrar monograma.
  - Añadir `transform: translateY(-2px)` + `box-shadow` en hover (no configurado).
  - Seguir `design_system.md` §2.2.
- [ ] Tests: actualizar `ProviderCard.test.tsx` para reflejar monograma y eliminación de doble fallback.

## T6 — AgentSetupWizard: mostrar errores de providers

- [ ] Suscribirse a `window.electronAPI.onProvidersError` al montar `AgentSetupWizard`.
- [ ] Acumular errores en un array `providerErrors: { providerId: string; error: string }[]`.
- [ ] En estado `loaded`, si `providerErrors.length > 0`, renderizar `ProviderErrorBanner` sticky debajo del header:
  - Colapsado: `⚠ X provider(s) no se pudieron cargar` + caret ▼.
  - Expandido (click): lista `❌ providerId — mensaje` por cada error.
  - Estilos según `design_system.md` §2.1.
- [ ] Al cerrar/reabrir wizard, limpiar errores acumulados.
- [ ] Implementar empty state con botón "Escanear de nuevo" según `design_system.md` §2.4.

## T7 — Tests

- [x] `electron/__tests__/providers-ipc.test.ts`: testear lectura de disco, parseo JSON, validación de campos obligatorios, detección de logo svg/png, emisión de errores.
- [x] `src/renderer/__tests__/provider-list.test.ts`: testear que `loadProviderDescriptors()` llama a `listProviders()` y mapea correctamente.
- [x] `src/renderer/__tests__/AgentSetupWizard.test.tsx`: testear banner de errores cuando hay providers inválidos.
- [x] `src/renderer/__tests__/ProviderCard.test.tsx`: actualizar tests de logo.

---

## Implementation Details (compact)

1. **IPC en `electron/providers-ipc.ts`** — `loadProvidersFromDisk()` síncrona con `readdirSync`+`readFileSync`. `registerProviderIPCHandlers()` en `main.ts`.
2. **Provider dir `public/providers/<id>/`** — Vite sirve estáticos; main lee distinto según dev (`public/`) o prod (`dist/`).
3. **ProviderDescriptor, ProviderError, ProviderDescriptionFile** en `src/types/provider.ts` — single source of truth.
4. **Preload bridge** — `listProviders()`→`invoke`, `onProvidersError(cb)`→`ipcRenderer.on` con cleanup fn retornada.
5. **ProviderCard monograma** — Si `logo_url` ausente o `onError` → círculo 72px con iniciales. Sin `logo_fallback_url`.
6. **AgentSetupWizard error banner** — Sticky bajo header, colapsable, contador + expand. Suscribe `onProvidersError` en mount.
7. **Empty state** — Icono 📁 + ruta `public/providers/` + botón "Escanear de nuevo".
8. **2 tests nuevos** — `electron/__tests__/providers-ipc.test.ts` (10 tests, fs temporal) y `src/renderer/__tests__/provider-list.test.ts` (3 tests).
9. **ProviderCard/SetupForm imports** — `ProviderDescriptor` desde `src/types/provider`, no via `provider-list`.
10. **17 test files, 108 tests** — Todos pasan. Migrado de `src/assets/providers/` a `public/providers/`.
