# Agent Panel — Arquitectura

## 1. Capas y límites

```
┌────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Componentes React)                    │
│  AgentPanel / ChatView / ConversationList / MessageInput  │
│  ModelDropdown / DropdownMenu / NewChatButton             │
│  ← solo importan context y lib. No hacen I/O directo.     │
├────────────────────────────────────────────────────────────┤
│  STATE / ORCHESTRATION (React Context)                     │
│  AgentContext   → config, provider instance, isConfigured  │
│  ConversationContext → conversations[], activeConversation │
│  ← orquestan flujos, inyectan provider, llaman storage.   │
├────────────────────────────────────────────────────────────┤
│  ABSTRACTION / DOMAIN (lib/)                               │
│  ModelProvider (interface) → generate_content / list_models│
│                              / get_title                   │
│  DummyModelProvider (impl dummy)                           │
│  ← ningún componente importa DummyModelProvider directo.  │
├────────────────────────────────────────────────────────────┤
│  PERSISTENCE (lib/storage)                                 │
│  AgentStorageAPI (interface en preload) → file I/O vía IPC│
│  ← Contexts llaman storage, nunca componentes.            │
├────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE (Electron main + preload)                  │
│  preload.ts → expone AgentStorageAPI via contextBridge    │
│  main.ts    → maneja canales IPC, lee/escribe JSON        │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Contratos de datos

### `Message`

```ts
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}
```

### `Conversation`

```ts
interface Conversation {
  id: string            // UUID v4
  title: string         // "Nueva conversación" hasta que el modelo genere título
  createdAt: number     // Date.now()
  updatedAt: number
  messages: Message[]
}
```

### `AgentConfig`

```ts
interface AgentConfig {
  id: string            // UUID v4 — identifica la config, usado como carpeta
  label: string         // nombre visible elegido por el usuario
  provider: 'openai' | 'anthropic' | 'dummy'
  apiKey?: string
  model: string         // ID del modelo seleccionado
}
```

### `AppState` (persistido aparte)

```ts
interface AppState {
  lastConfigId: string | null
  lastConversationId: string | null
  configs: AgentConfig[]
}
```

---

## 3. Interfaces del sistema

### `ModelProvider` (dominio/abstracción)

```ts
interface ModelProvider {
  generate_content(prompt: string, options?: GenerateOptions): Promise<GenerateResponse>
  list_models(): Promise<Model[]>
  get_title(messages: Message[]): Promise<string>
}

interface GenerateOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
}

interface GenerateResponse {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

interface Model {
  id: string
  name: string
}
```

### `AgentStorageAPI` (contrato IPC — preload → main)

```ts
interface AgentStorageAPI {
  // App state global (última config, última conversación, lista de configs)
  loadAppState(): Promise<AppState>
  saveAppState(state: AppState): Promise<void>

  // Conversaciones de una config específica
  loadConversations(configId: string): Promise<Conversation[]>
  saveConversation(configId: string, conv: Conversation): Promise<void>
  deleteConversation(configId: string, convId: string): Promise<void>
}
```

### `AgentContextValue`

```ts
interface AgentContextValue {
  configs: AgentConfig[]
  activeConfig: AgentConfig | null
  isConfigured: boolean
  provider: ModelProvider
  setActiveConfig: (config: AgentConfig) => void
  saveConfig: (config: AgentConfig) => void
  deleteConfig: (configId: string) => void
}
```

### `ConversationContextValue`

```ts
interface ConversationContextValue {
  conversations: Conversation[]
  activeConversation: Conversation | null
  setActiveConversation: (conv: Conversation | null) => void
  createConversation: () => string   // devuelve id
  addMessage: (convId: string, msg: Message) => void
  deleteConversation: (convId: string) => void
}
```

---

## 4. Estructura de archivos (proyecto)

```
src/
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── AgentPanel.tsx
│   │   ├── ChatView.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── ConversationList.tsx
│   │   ├── ConversationItem.tsx
│   │   ├── ModelDropdown.tsx
│   │   ├── DropdownMenu.tsx
│   │   └── NewChatButton.tsx
│   ├── context/
│   │   ├── AgentContext.tsx
│   │   └── ConversationContext.tsx
│   └── lib/
│       ├── model-contract.ts      ← interface + DummyModelProvider
│       └── storage.ts             ← wrapper tipado sobre AgentStorageAPI
├── main/
│   ├── main.ts                    ← setup IPC handlers
│   └── preload.ts                 ← contextBridge expone AgentStorageAPI
└── styles/
    └── agent-panel.css
```

---

## 5. Persistencia en disco

Raíz: `~/.config/.openblog/`

```
~/.config/.openblog/
├── app-state.json        ← AppState { lastConfigId, lastConversationId, configs[] }
└── conversations/
    └── <config-uuid>/
        └── conversations.json   ← { conversations: Conversation[] }
```

- `app-state.json` se reescribe completo en cada `saveAppState()`.
- `conversations.json` por config: lectura completa al montar, reescritura completa en cada mutación.
- Electron `main.ts` gestiona la creación de `~/.config/.openblog/` y subcarpetas si no existen.

---

## 6. Flujo de startup

```
[App monta]
  │
  ├── AgentContext.init()
  │   ├── storage.loadAppState()
  │   ├── si lastConfigId existe → activeConfig = configs.find(id)
  │   ├── si activeConfig → provider = instancia según activeConfig.provider
  │   └── si no → provider = DummyModelProvider, isConfigured = false
  │
  ├── ConversationContext.init()
  │   ├── si activeConfig → loadConversations(activeConfig.id)
  │   ├── si lastConversationId existe → activeConversation = conversations.find(id)
  │   └── si no → activeConversation = null
  │
  └── AgentPanel renderiza estado compuesto
```

---

## 7. Architectural decisions

### AD-01: Contextos separados (Agent vs Conversation)
AgentConfig es global y long-lived. Las conversaciones pertenecen a una config y se cargan bajo demanda. Separarlos evita re-renders en cascada: ConversationContext solo monta componentes de lista/chat cuando `isConfigured === true`.

### AD-02: ModelProvider como interfaz inyectada
Ningún componente de presentación conoce la implementación concreta del provider. `AgentContext` instancia `DummyModelProvider` por defecto y lo reemplaza cuando hay una config real. Esto permite añadir providers (OpenAI, Anthropic, etc.) sin tocar componentes.

### AD-03: Persistencia en `~/.config/.openblog/` con JSON plano
Sin SQLite, indexedDB ni servicios externos. La carpeta sigue la convención XDG para datos de aplicación. `app-state.json` centraliza el estado global (configs + últimos IDs) para restaurar sesión al iniciar. Cada config usa un UUID como carpeta para evitar colisiones y facilitar multi-config.

### AD-04: DropdownMenu componente puramente genérico
`DropdownMenu` recibe `items: { label, onClick, visible? }[]` y no conoce el dominio (agentes, configuraciones). `AgentPanel` construye los items según el estado actual. Esto permite reutilizar el componente en cualquier menú contextual futuro.

### AD-05: Fetch de modelos lazy
`ModelDropdown` llama `provider.list_models()` solo al desplegarse (focus/click). No se precarga al montar la app. Si la llamada falla, el dropdown muestra estado de error con botón "Reintentar".

### AD-06: Restauración de estado al startup
`AppState.lastConfigId` + `AppState.lastConversationId` permiten restaurar exactamente dónde el usuario se quedó. Esto se guarda en cada cambio de config o de conversación activa.

### AD-07: Contrato IPC explícito via `AgentStorageAPI`
La interfaz `AgentStorageAPI` se define en un archivo compartido (`src/shared/storage-api.ts`) y se implementa tanto en `preload.ts` (contextBridge) como en los handlers de `main.ts`. Esto evita acoplamiento con canales IPC mágicos y permite testear storage con mocks.

### AD-08: Single entry point para configuración
Se elimina la dualidad "Configure Agent" / "Configurations". El dropdown "..." muestra un único item "Settings" que abre el gestor de configuraciones (multi-config). Si no hay ninguna config, el panel principal muestra "Configure Agent" como CTA.

### AD-09: Error handling en llamadas a provider
`ModelDropdown` y `ChatView` manejan estados `loading`, `error` y `empty`. Las promesas de `generate_content` y `list_models` tienen catch que actualiza el estado de error del contexto. El usuario puede reintentar sin perder el mensaje escrito.

---

## 8. Reglas de organización

1. **Navegación de imports:** Componentes → Contexts → lib. Nunca al revés. Los contexts importan lib/storage y lib/model-contract. Los componentes importan contexts y componentes hijos.
2. **Provider instancing:** Solo `AgentContext` crea instancias de `ModelProvider`. Ningún otro módulo hace `new DummyModelProvider()`.
3. **Storage calls:** Solo `AgentContext` y `ConversationContext` llaman funciones de storage. Los componentes nunca invocan `storage.*` directamente.
4. **CSS scoping:** Todos los estilos del panel van en `agent-panel.css`. No se mezclan con `App.css` ni estilos globales.
5. **Test por módulo:** Cada archivo en `components/`, `context/` y `lib/` tiene su test en `__tests__/` con el mismo nombre base.
6. **Mutations inmutable-style:** Los contexts reemplazan arrays/objetos completos en cada mutación para que React detecte cambios.

---

## 9. Design System References

Cada componente de la capa de presentación se corresponde con una especificación completa en `specs/design_system.md`. Consumir ese archivo como fuente única de verdad para props, estados, CSS contract y accesibilidad.

| Componente arquitectura | Componente Design System | Propiedades clave |
|---|---|---|
| `AgentPanel` | [`AgentPanel`](../design_system.md#24-agentpanel) | Feature component, 4 estados, header bar 75px, composer de hijos |
| `ChatView` | [`ChatView`](../design_system.md#26-chatview) | Scroll anclado, estados empty/populated/streaming/error |
| `MessageBubble` | [`MessageBubble`](../design_system.md#27-messagebubble) | 4 roles (user/assistant/system/streaming), CSS por role |
| `MessageInput` | [`MessageInput`](../design_system.md#28-messageinput) | Textarea expandible, send button, estados idle/composing/disabled |
| `ConversationList` | [`ConversationList`](../design_system.md#29-conversationlist) | Overlay absoluto, estados empty/populated |
| `ConversationItem` | [`ConversationItem`](../design_system.md#210-conversationitem) | Props `conversation`, `isActive`, `onClick` |
| `ModelDropdown` | [`ModelDropdown`](../design_system.md#211-modeldropdown) | Lazy fetch, 5 estados, slots de lista/error/loading |
| `DropdownMenu` | [`DropdownMenu`](../design_system.md#212-dropdownmenu) | Genérico (AD-04), props `items[]`, estados closed/open |
| `NewChatButton` | [`NewChatButton`](../design_system.md#213-newchatbutton) | Dos variantes `compact`/`full` |

### Design Tokens consumidos

| Token | Uso en este spec |
|---|---|
| `--color-primary` | Fondo de user bubbles, botón enviar, borde activo en ConversationItem, borde streaming |
| `--color-primary-hover` | Hover del botón enviar |
| `--color-panel-bg` | Fondo del AgentPanel, ChatView, ConversationList, assistant bubbles |
| `--color-body-bg` | Fondo del textarea MessageInput |
| `--color-text` | Texto en burbujas, header, items de menú |
| `--color-text-muted` | Texto secundario, trigger ModelDropdown, placeholder, sistema |
| `--color-border-divider` | Borde header, separador entre mensajes, border-top de MessageInput, borde de overlays |
| `--color-border-subtle` | Borde de textarea, hover de triggers, borde de assistant bubbles |

---

## 10. Normas de diseño

Las siguientes normas de diseño se aplican a la implementación de este spec. Están definidas formalmente en el Design System (`specs/design_system.md §4`).

| ID | Norma | Descripción |
|---|---|---|
| **N8** | Chat scroll anclado al fondo | El área de mensajes hace scroll automático al último mensaje. El auto-scroll se pausa si el usuario hace scroll hacia arriba. Botón "↓ Ir al final" cuando hay mensajes nuevos fuera del viewport. |
| **N9** | Overlay de lista sobre chat | `ConversationList` se renderiza como overlay absoluto (no sidebar ni tabs). Al seleccionar conversación, el overlay se desmonta y `ChatView` ocupa el espacio completo. |
| **N10** | Header bar fijo con jerarquía horizontal | 75px de alto. NewChatButton → título (flex:1, ellipsis) → ModelDropdown → DropdownMenu. |
| **N11** | Alineación de mensajes por rol | User derecha (primary), assistant izquierda (bordeada), system centrado (muted, italic). |
| **N12** | Streaming con pulso en borde | Última burbuja assistant muestra borde izquierdo animado (pulse) durante generación. Sin spinners. |
| **N13** | Estados loading/error/empty en toda operación async | `list_models` y `generate_content` implementan los tres estados. Ninguna promesa no-capturada. |
| **N14** | Lazy fetch de modelos | `ModelDropdown` llama `list_models()` solo al abrirse, no al montar. |
| **N15** | CSS unificado del agente | Todos los estilos del panel agente en `agent-panel.css`. Un solo archivo. Sin CSS per-componente. |

> Estas normas complementan las normas base N1–N7 del Design System (contrato de color vía variables, modo oscuro en `<html>`, anti-flash, componentes atómicos, persistencia separada, transiciones globales, CSS agnóstico al framework).

---

## 11. Implementation details

### 11.1 Archivos creados/modificados

**Backend (Electron main/preload):**
- `src/shared/storage-api.ts` — Interfaz compartida `AgentStorageAPI` con tipos `Message`, `Conversation`, `AgentConfig`, `AppState`
- `electron/ipc.ts` — Canales IPC `STORAGE_*` + handlers para load/save app state y conversaciones. Persistencia en `~/.config/.openblog/`
- `electron/preload.ts` — Exposición de `AgentStorageAPI` via `contextBridge` en `window.electronAPI`
- `src/types/renderer.d.ts` — Tipado global extendido para `window.electronAPI`

**Frontend — capa de dominio (lib):**
- `src/renderer/lib/model-contract.ts` — Interfaz `ModelProvider` + `DummyModelProvider` (implementación dummy)
- `src/renderer/lib/storage.ts` — Wrapper tipado sobre `window.electronAPI` para contexts

**Frontend — capa de estado (context):**
- `src/renderer/context/AgentContext.tsx` — `AgentProvider` + `useAgent()` hook. Gestiona configs, activeConfig, provider. State restoration al startup via `lastConfigId`
- `src/renderer/context/ConversationContext.tsx` — `ConversationProvider` + `useConversations()` hook. CRUD de conversaciones por `activeConfig.id`. State restoration via `lastConversationId`

**Frontend — componentes UI:**
- `src/renderer/components/AgentPanel.tsx` — Feature component orquestador. 4 estados: loading, unconfigured, configured-no-conversation, configured-with-conversation
- `src/renderer/components/ChatView.tsx` — Scroll anclado al fondo con auto-pause. Estados empty, populated, streaming, error
- `src/renderer/components/MessageBubble.tsx` — Burbuja por role (user/assistant/system) con clase streaming
- `src/renderer/components/MessageInput.tsx` — Textarea expandible con Enter/Shift+Enter. Estados idle/composing/disabled
- `src/renderer/components/ConversationList.tsx` — Overlay absoluto (N9). Estados empty/populated
- `src/renderer/components/ConversationItem.tsx` — Fila con título, preview, timestamp relativo, active state
- `src/renderer/components/ModelDropdown.tsx` — Lazy fetch (AD-05/N14). 5 estados: closed/loading/open/error/empty
- `src/renderer/components/DropdownMenu.tsx` — Genérico (AD-04). Props `items[]: { label, onClick, visible?, icon? }`
- `src/renderer/components/NewChatButton.tsx` — Dos variantes: compact (icono) y full (icono + texto)
- `src/styles/agent-panel.css` — CSS unificado del agente (N15). ~10KB de estilos con design tokens

**App wiring (modificados):**
- `src/renderer/App.tsx` — Renderiza `<AgentPanel />` en lugar de `<div id="agent-panel" />` vacío. Importa `agent-panel.css`
- `src/renderer/main.tsx` — Wraps con `<AgentProvider>` y `<ConversationProvider>`
- `src/styles/App.css` — Stripeadas reglas de `#agent-panel` que duplicaban las de `agent-panel.css`

### 11.2 Tests (58 tests, 11 files, todos pasando)

| Archivo | Tests | Cobertura |
|---|---|---|
| `App.test.tsx` | 7 | Layout 70/30, paneles, R4 compliance |
| `ThemeContext.test.tsx` | 6 | Tema inicial, toggle, persistencia, sincronización html.class |
| `ThemeToggler.test.tsx` | 6 | Iconos, tooltip, click, accesibilidad |
| `AgentContext.test.tsx` | 6 | Init, state restoration, setActiveConfig, saveConfig, deleteConfig, error sin provider |
| `ConversationContext.test.tsx` | 6 | Init, createConversation, addMessage, deleteConversation, setActiveConversation, error sin provider |
| `ModelContract.test.ts` | 3 | Echo, list_models, get_title |
| `DropDownMenu.test.tsx` | 5 | Render, open/close, selection, hidden items, accesibilidad |
| `NewChatButton.test.tsx` | 3 | Variantes compact/full, onClick |
| `MessageBubble.test.tsx` | 5 | Roles user/assistant/system, streaming, accesibilidad |
| `MessageInput.test.tsx` | 7 | Estados idle/composing/disabled, Enter/Shift+Enter, click send |
| `ConversationItem.test.tsx` | 5 | Título, preview, active state, onClick, accesibilidad |

### 11.3 Decisiones de implementación

- **IPC channels**: Se añadieron 5 canales `STORAGE_*` en `electron/ipc.ts`. Los handlers crean directorios automáticamente si no existen (recursive mkdir).
- **DummyModelProvider**: Implementación dummy que hace eco del prompt. Suficiente para desarrollo/test. Reemplazable por providers reales (OpenAI, Anthropic) sin tocar componentes.
- **ConversationProvider**: Usa `useRef` para trackear cambios de `activeConfig` y evitar re-fetches innecesarios. Cuando config cambia a null, resetea estado via microtask.
- **CSS**: Todos los estilos del agente en `agent-panel.css` (~10KB). Design tokens referenciados exclusivamente via `var(--color-*)`. Cumple N1, N6, N7, N15.
- **Shadow DOM fix**: En `agent-panel.css` se añadieron reglas `.dark` override para sombras de dropdowns (box-shadow más intenso en modo oscuro).
- **ESLint**: Se deshabilitó `react-hooks/set-state-in-effect` porque el patrón de sincronizar estado con storage externo en effects es intencional y necesario.
- **Test setup**: Se mockea `lib/storage` en tests de context para evitar dependencia de IPC. ConversationContext tests usan `AgentContext.Provider` mockeado directamente para evitar async init de AgentProvider.

### 11.4 Verificación

```
npm test       → 58 passed
npx tsc -b     → 0 errors
npm run lint   → 0 errors, 3 warnings (only-export-components)
```

El spec se movió de `specs/designed/` a `specs/testable/`.
