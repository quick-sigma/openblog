# Design System — Disk-based Provider Loading

> Fuente única de verdad UI/UX. Consumido por implementadores frontend.
> Spec de origen: `specs/designed/disk-providers.md`

---

## 1. Tokens nuevos / modificados

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-error-bg` | `#fef2f2` light / `#2d1b1b` dark | Fondo banner de errores |
| `--color-error-border` | `#fecaca` light / `#7f1d1d` dark | Borde banner de errores |
| `--color-error-text` | `#991b1b` light / `#fca5a5` dark | Texto e iconos de error |
| `--color-monogram-bg` | `var(--color-border-divider)` | Fondo circular monograma |
| `--color-monogram-text` | `var(--color-text-muted)` | Iniciales del monograma |
| `--shadow-card-hover` | `0 4px 12px rgba(0,0,0,0.08)` light / `0 4px 12px rgba(0,0,0,0.3)` dark | Sombra hover ProviderCard |

Todos los tokens tienen variante `.dark` correspondiente.

---

## 2. Componentes UI

### 2.1 `ProviderErrorBanner`

**Ubicación:** `AgentSetupWizard`, debajo del header, sticky, full-width.

**Props:**
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `errors` | `ProviderError[]` | Sí | Array de errores acumulados |
| `onDismiss` | `() => void` | No | Callback al cerrar banner (si se implementa dismiss) |

**Estados:**
| Estado | Condición | Visual |
|--------|-----------|--------|
| `hidden` | `errors.length === 0` | No se renderiza |
| `collapsed` | `errors.length > 0`, no expandido | Barra horizontal con ⚠️ + "X provider(s) no se pudieron cargar" + caret ▼ |
| `expanded` | Click en collapsed | Lista de errores individuales debajo del resumen |

**Estilos:**
- Fondo: `var(--color-error-bg)`
- Borde inferior: `1px solid var(--color-error-border)`
- Padding collapsed: `10px 24px`
- Icono ⚠️ a la izquierda, texto resumen, caret ▼ a la derecha
- Cursor pointer en toda la barra
- Transición expand/colapsar: `max-height` animado 250ms ease
- Lista expandida: padding `8px 24px 12px 24px`, items con `❌ providerId — mensaje`, fuente `13px`, color `var(--color-error-text)`

**Comportamiento:**
- Click en la barra → toggle expand/colapsar
- Acumula errores vía `onProvidersError` listener en AgentSetupWizard
- Se limpia al cerrar/reabrir wizard (`useEffect` cleanup)
- NO bloquea interacción con providers (no bloqueante)

---

### 2.2 `ProviderCard` (modificado)

**Cambios respecto a versión actual:**

#### Props (sin cambios en interfaz)
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `descriptor` | `ProviderDescriptor` | Sí | Datos del provider |
| `onSelect` | `(d: ProviderDescriptor) => void` | Sí | Callback selección |
| `isConfigured` | `boolean` | Sí | Si ya está configurado |

#### `ProviderDescriptor` (modificado)

```typescript
interface ProviderDescriptor {
  id: string
  name: string
  description: string
  base_url: string
  logo_url?: string        // Ruta completa desde main, o undefined
  // ELIMINADO: logo_fallback_url
}
```

**ELIMINAR:**
- `logoError` state
- `handleLogoError`
- `logo_fallback_url` del tipo y de toda referencia
- Lógica de doble fallback SVG→PNG

**NUEVO — Monograma (cuando `logo_url === undefined`):**
- Renderizar círculo con iniciales del provider
- Extraer iniciales: primeras 2 letras del `name`, uppercase (ej: "Opencode Go" → "OG", "Anthropic" → "AN")
- Círculo: `72px × 72px`, `border-radius: 50%`, `background: var(--color-monogram-bg)`
- Texto: `font-size: 28px`, `font-weight: 700`, `color: var(--color-monogram-text)`, centrado
- Atributo `aria-label="Logo de {name}"` en el contenedor del monograma

**Estados:**
| Estado | Condición | Visual |
|--------|-----------|--------|
| `default` | No configurado, no hover | Card con borde `divider`, sin elevación |
| `hover` | Mouse encima, no configurado | Borde `primary`, fondo `divider`, `translateY(-2px)`, `box-shadow: var(--shadow-card-hover)` |
| `configured` | `isConfigured === true` | Borde `#22c55e`, cursor `default`, sin hover effect, checkmark ✓ verde |
| `with-logo` | `logo_url` definido | `<img>` visible en slot logo |
| `no-logo` | `logo_url === undefined` | Monograma circular en slot logo |
| `logo-load-error` | `<img onError>` disparado | Oculta `<img>`, muestra monograma (fallback único) |

**Comportamiento `<img onError>`:**
- Si la imagen falla (404, red), ocultar `<img>` (display: none) y mostrar monograma
- Se implementa con un estado local `imgFailed: boolean`, seteado a `true` en `onError`
- Si `imgFailed === true` → monograma
- Si `logo_url === undefined` directamente → monograma

**Transición hover (nueva):**
```css
.provider-card:not(.configured):hover {
  border-color: var(--color-primary);
  background: var(--color-border-divider);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
```
Transición: `transform 150ms ease, box-shadow 150ms ease, border-color 150ms, background 150ms`

---

### 2.3 `AgentSetupWizard` (modificado)

**Cambios respecto a versión actual:**

#### Nuevo estado local
```typescript
const [providerErrors, setProviderErrors] = useState<ProviderError[]>([])
const [bannerExpanded, setBannerExpanded] = useState(false)
```

#### Nuevo efecto: suscripción a errores
```typescript
useEffect(() => {
  const handler = (error: ProviderError) => {
    setProviderErrors(prev => [...prev, error])
  }
  window.electronAPI?.onProvidersError(handler)
  return () => {
    // cleanup: remover listener si electronAPI lo soporta
  }
}, [])
```

#### Cleanup al abrir/cerrar
- Al montar: limpiar `providerErrors = []`
- Al desmontar: limpiar listener

#### Banner en layout
- Renderizar entre header y body:
```
┌──────────────────────────────────┐
│ Header: "Configurar provider" [X]│
├──────────────────────────────────┤
│ ⚠ 2 provider(s) no se pudieron..│ ← ProviderErrorBanner (sticky)
├────────────┬─────────────────────┤
│ Sidebar    │ Content             │
│            │                     │
└────────────┴─────────────────────┘
```

---

### 2.4 Empty State "sin providers" (modificado)

**Reemplazar:** mensaje actual "No hay providers disponibles."

**Nuevo empty state:**
- Icono/ilustración: `📁` grande (48px, opacidad 0.3)
- Texto principal: "No se encontraron providers"
- Texto secundario: "Agrega carpetas de provider en `src/renderer/assets/providers/`"
- Botón secundario: "Escanear de nuevo" → llama `loadDescriptors()` nuevamente
- Centrado vertical y horizontal en `.agent-setup-content`

**Estilos:**
- Gap entre elementos: 12px
- Texto secundario: `font-size: 13px`, `color: var(--color-text-muted)`, `font-family: monospace` para la ruta
- Botón "Escanear de nuevo": mismo estilo que `.agent-setup-retry-btn`

---

### 2.5 Logo del provider en card (comportamiento final)

**Regla de decisión en ProviderCard:**
```
if (imgFailed || !logo_url)
  → monograma circular con iniciales
else
  → <img src={logo_url} onError={() => setImgFailed(true)} />
```

**Monograma:**
- Extraer `name`, tomar primeras 2 palabras/letras uppercase
- Algoritmo: `name.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase()`
- Ejemplos: "Opencode Go" → "OG", "Anthropic" → "AN", "OpenAI" → "OP", "Local LLM" → "LL"

---

## 3. Estados globales del wizard

| Estado | Gatillo | UI |
|--------|---------|-----|
| `loading` | Montaje, llamada IPC `listProviders` | Spinner + "Cargando providers..." |
| `loaded` + providers > 0 | IPC retorna descriptores | Lista de ProviderCards |
| `loaded` + providers === 0 | IPC retorna `[]` | Empty state con botón re-scan |
| `loaded` + errors > 0 | IPC emite `providers:error` | ProviderErrorBanner sticky + lista normal |
| `error` | `loadDescriptors()` rechaza | Mensaje error + botón reintentar (existente) |
| `configuring` | Usuario clickea card | SetupForm (existente, sin cambios) |

---

## 4. Lista de providers: ordenamiento y scroll

- **Orden:** alfabético por `name`, case-insensitive (`localeCompare`).
- **Scroll:** lista dentro de `.agent-setup-content` con `overflow-y: auto` (ya existente). No se modifica layout.
- **Sin cambios:** una columna, cards verticales.

---

## 5. Referencia rápida para implementadores

| Archivo | Qué cambia |
|---------|-----------|
| `src/types/provider.ts` | NUEVO: tipos `ProviderDescriptor`, `ProviderDescriptionFile`, `ProviderError` |
| `src/types/renderer.d.ts` | AGREGAR: `listProviders`, `onProvidersError` en `electronAPI` |
| `src/main/providers-ipc.ts` | NUEVO: lectura de disco, IPC handlers |
| `src/preload/index.ts` | AGREGAR: bridge methods `listProviders`, `onProvidersError` |
| `src/renderer/lib/provider-list.ts` | REESCRIBIR: eliminar `knownFiles`, llamar `electronAPI.listProviders()` |
| `src/renderer/components/ProviderCard.tsx` | MODIFICAR: monograma, eliminar doble fallback logo |
| `src/renderer/components/AgentSetupWizard.tsx` | MODIFICAR: `ProviderErrorBanner`, empty state con re-scan |
| `src/styles/agent-panel.css` | AGREGAR: `.provider-error-banner`, `.provider-monogram`, hover elevation, empty state |
| `src/styles/App.css` | AGREGAR: tokens `--color-error-*`, `--color-monogram-*`, `--shadow-card-hover` |
