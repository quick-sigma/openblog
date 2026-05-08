# Agent Panel — Especificación

## Árbol de componentes

```
<div#agent-panel>                           ← contenedor raíz flex column, height 100%
│
├── <header.agent-header>                   ← row 1: 10% height
│   ├── <div.agent-header__title>           ← 70% width
│   │   └── <span#conversation-title>       ← "Agent" si no hay conversación activa
│   └── <div.agent-header__actions>         ← 30% width
│       └── <DropdownMenu>                  ← componente reutilizable
│           └── <button.dropdown-trigger>   ← "..."
│               └── <ul.dropdown-menu>      ← toggle visibility en click
│                   ├── <li.dropdown-item>  ← "Configure Agent" (solo si no hay agente configurado)
│                   └── <li.dropdown-item>  ← "Configurations"
│
├── <main.agent-chat-area>                  ← row 2: 70% height
│   ├── [estado: sin agente configurado]
│   │   ├── <span.agent-icon>              ← icono de desconexión (plug-off / broken-chain)
│   │   ├── <h2>                           ← "Agent not configured"
│   │   └── <button.configure-btn>         ← "Configure Agent"
│   │
│   ├── [estado: agente configurado, 0 conversaciones]
│   │   ├── <span.agent-icon>              ← icono de conversación (message-circle / chat)
│   │   └── <h2>                           ← "Inicia tu primer chat"
│   │
│   └── [estado: agente configurado, 1+ conversaciones]
│       └── <ConversationList>             ← scrollable list
│           └── <ConversationItem> × N     ← título + fecha + última frase
│
├── <footer.agent-footer>                  ← row 3: 20% height (o auto)
│   ├── <div.agent-footer__controls>       ← fila 1: 70/30 split
│   │   ├── <ModelDropdown>                ← 70% width
│   │   │   └── <select.model-select>      ← disabled si no hay provider configurado
│   │   │                                   → muestra modelo seleccionado + chevron
│   │   │                                   → enabled: fetch de modelos desde provider
│   │   └── <button.new-chat-btn>          ← 30% width, icono "+"
│   │                                       → crea nueva conversación
│   └── <MessageInput>                     ← fila 2
│       └── <textarea.message-textarea>    ← Ctrl+Enter → newline
│                                           → Enter → send
│                                           → expand hasta 6× altura inicial
│                                           → overflow-y scroll después
```

## Estados del panel

### Estados del agente

| Estado | Condición | UI |
|---|---|---|
| `unconfigured` | No hay provider configurado | Icono desconexión + "Agent not configured" + botón "Configure Agent". Dropdown "..." solo muestra "Configure Agent". ModelDropdown deshabilitado. |
| `configured` | Provider configurado | Dropdown "..." muestra "Configurations". ModelDropdown habilitado (fetch modelos). |

### Estados de conversaciones (cuando agent = `configured`)

| Estado | Condición | UI |
|---|---|---|
| `empty` | 0 conversaciones | Icono chat + "Inicia tu primer chat" |
| `list` | 1+ conversaciones | `<ConversationList>` con items |
| `active` | Conversación seleccionada | `<ChatView>` con historial de mensajes |

## Estructura de archivos

```
src/
├── renderer/
│   ├── App.tsx                            ← renderiza <AgentPanel /> dentro de #agent-panel
│   ├── components/
│   │   ├── AgentPanel.tsx                 ← contenedor raíz del panel agente
│   │   ├── DropdownMenu.tsx               ← menú desplegable reutilizable
│   │   ├── ConversationList.tsx           ← lista de conversaciones
│   │   ├── ConversationItem.tsx           ← item individual en lista
│   │   ├── ChatView.tsx                   ← vista de conversación activa (historial + input)
│   │   ├── MessageBubble.tsx              ← burbuja de mensaje individual
│   │   ├── ModelDropdown.tsx              ← selector de modelo
│   │   ├── MessageInput.tsx               ← textarea con auto-expand, Ctrl+Enter
│   │   ├── NewChatButton.tsx              ← botón "+"
│   │   └── .gitkeep
│   ├── context/
│   │   ├── AgentContext.tsx               ← estado global del agente (provider, modelo, config)
│   │   └── ConversationContext.tsx         ← estado de conversaciones activas
│   ├── lib/
│   │   ├── storage.ts                     ← persistencia a JSON (lectura/escritura de archivos)
│   │   └── model-contract.ts              ← interfaz + dummy del modelo
│   └── __tests__/
│       ├── AgentPanel.test.tsx
│       ├── DropdownMenu.test.tsx
│       ├── ConversationList.test.tsx
│       ├── ChatView.test.tsx
│       ├── MessageInput.test.tsx
│       ├── ModelDropdown.test.tsx
│       ├── AgentContext.test.tsx
│       ├── ConversationContext.test.tsx
│       ├── storage.test.ts
│       └── model-contract.test.ts
└── styles/
    └── agent-panel.css                    ← estilos exclusivos del Agent Panel
```

## Contratos de datos

### Model Contract (`src/renderer/lib/model-contract.ts`)

```ts
// Interfaz pública para proveedores de modelo (formato OpenAI-compatible)
interface ModelProvider {
  // Envía un prompt y devuelve contenido generado
  generate_content(prompt: string, options?: GenerateOptions): Promise<GenerateResponse>

  // Lista modelos disponibles desde el provider
  list_models(): Promise<Model[]>

  // Pide al modelo un título corto para la conversación (JSON output)
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
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

interface Model {
  id: string
  name: string
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// Implementación dummy — devuelve respuestas fijas sin llamar a ninguna API.
// Reemplazar por implementación real (OpenAI / compatible) cuando se configure el provider.
class DummyModelProvider implements ModelProvider {
  async generate_content(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    // Devuelve eco del prompt truncado
    return { content: `Echo: ${prompt.slice(0, 100)}`, model: 'dummy-model', usage: { prompt_tokens: 0, completion_tokens: 0 } }
  }

  async list_models(): Promise<Model[]> {
    return [{ id: 'dummy-model', name: 'Dummy Model' }]
  }

  async get_title(messages: Message[]): Promise<string> {
    return 'Dummy Conversation'
  }
}
```

### Storage (`src/renderer/lib/storage.ts`)

```ts
interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

interface AgentConfig {
  provider: 'openai' | 'dummy'
  apiKey?: string
  model: string
}

// Estructura en disco:
// appData/
// └── agents/
//     └── <config-name>/
//         └── conversations.json   ← { conversations: Conversation[] }

// Funciones expuestas:
function loadConfig(): AgentConfig | null
function saveConfig(config: AgentConfig): void
function loadConversations(configName: string): Conversation[]
function saveConversation(configName: string, conv: Conversation): void
function deleteConversation(configName: string, convId: string): void
```

### AgentContext

```ts
interface AgentContextValue {
  config: AgentConfig | null
  isConfigured: boolean
  provider: ModelProvider
  setConfig: (config: AgentConfig) => void
  clearConfig: () => void
}
```

### ConversationContext

```ts
interface ConversationContextValue {
  conversations: Conversation[]
  activeConversation: Conversation | null
  setActiveConversation: (conv: Conversation | null) => void
  createConversation: () => string  // devuelve id
  addMessage: (convId: string, msg: Message) => void
  deleteConversation: (convId: string) => void
}
```

## Flujo de datos

```
[Inicio: App monta]
  │
  ├── AgentContext.init()
  │   ├── loadConfig() desde JSON
  │   └── si config existe → instancia provider. si no → provider = DummyModelProvider
  │
  ├── ConversationContext.init()
  │   ├── loadConversations() desde JSON (si config existe)
  │   └── activeConversation = null
  │
  └── AgentPanel renderiza según estados
  │
  ▼
[Usuario click "Configure Agent"]
  │
  ├── TODO: abrir modal/vista de configuración (fuera del scope actual)
  ├── botón placeholder, no hace nada
  │
  ▼
[Usuario click "..." > "Configurations"]
  │
  ├── TODO: abrir panel de configuraciones (fuera del scope actual)
  ├── botón placeholder, no hace nada
  │
  ▼
[Usuario click "+" → createConversation()]
  │
  ├── ConversationContext.createConversation()
  │   ├── genera UUID v4
  │   ├── title = "Nueva conversación"
  │   ├── createdAt/updatedAt = Date.now()
  │   ├── messages = []
  │   ├── activeConversation = nueva conversación
  │   └── saveConversation() a JSON
  │
  ▼
[Usuario escribe en MessageInput + Enter → send]
  │
  ├── 1. addMessage(convId, { role:'user', content, timestamp })
  │      → saveConversation()
  │
  ├── 2. provider.generate_content(prompt)
  │      → addMessage(convId, { role:'assistant', content, timestamp })
  │      → saveConversation()
  │
  ├── 3. provider.get_title(messages)  ← solo si title === "Nueva conversación"
  │      → actualiza conv.title
  │      → saveConversation()
  │      → animación de título (fade + slide)
  │
  └── 4. scroll ChatView al último mensaje
  │
  ▼
[Usuario selecciona conversación en ConversationList]
  │
  └── setActiveConversation(conv)
      → ChatView muestra historial de messages[]
```

## Estados del DropdownMenu

| Elemento | Estado | CSS |
|---|---|---|
| `.dropdown-trigger` | default | `opacity: 0.6; cursor: pointer` |
| `.dropdown-trigger` | hover | `opacity: 1; background: var(--color-border-divider)` |
| `.dropdown-trigger` | active | `transform: scale(0.95)` |
| `.dropdown-menu` | hidden | `opacity: 0; pointer-events: none; transform: translateY(-4px)` |
| `.dropdown-menu` | visible | `opacity: 1; pointer-events: auto; transform: translateY(0)` |
| `.dropdown-item` | default | `color: var(--color-text)` |
| `.dropdown-item` | hover | `background: var(--color-border-divider)` |

## Estados del MessageInput

| Propiedad | Valor |
|---|---|
| altura inicial | `40px` (1 línea) |
| altura máxima (6×) | `240px` |
| overflow | `hidden` hasta 6×, luego `overflow-y: auto` |
| Ctrl+Enter | inserta `\n` en el valor |
| Enter solo | dispara `onSubmit` |
| placeholder | `"Escribe un mensaje..."` |
| disabled | cuando `activeConversation === null` |
| borde default | `1px solid var(--color-border-subtle)` |
| borde focus | `1px solid var(--color-text-muted)` |
| borde hover | `1px solid var(--color-border-divider)` |

## Animaciones

### Título de conversación (al obtener título del modelo)

```css
.conversation-title--updating {
  animation: title-fade-slide 400ms ease;
}

@keyframes title-fade-slide {
  0%   { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

### Aparición de mensajes nuevos

```css
.message-bubble--new {
  animation: message-appear 300ms ease;
}

@keyframes message-appear {
  0%   { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

## Design System vinculado

| Elemento del DS | Uso |
|---|---|
| `--color-panel-bg` | Fondo de #agent-panel y subpaneles |
| `--color-text` | Color de texto principal |
| `--color-text-muted` | Texto secundario, placeholders, estados vacíos |
| `--color-border-divider` | Bordes entre secciones, separadores |
| `--color-border-subtle` | Bordes de inputs, hover de botones |
| `--spacing-panel` | Padding interno del panel |
| `--transition-theme` | Transiciones de color globales |
| `--transition-icon` | Rotación de iconos |

## Decisiones arquitectónicas

### AD-01: Context separado para Agent y Conversation

AgentConfig es global y persistente. Conversation es por sesión. Separarlos evita re-renders innecesarios. ConversationContext solo monta componentes de lista/chat cuando hay config.

### AD-02: ModelProvider como interfaz inyectada

`AgentContext` crea la instancia del provider (dummy o real) según config. Ningún componente importa `DummyModelProvider` directamente. `generate_content`, `list_models`, `get_title` son las únicas 3 funciones del contrato.

### AD-03: Storage plano con JSON

Sin DB embebida (SQLite). Sin indexedDB. Carpeta `agents/<config-name>/conversations.json`. `storage.ts` encapsula lectura/escritura. Electron main process expone file I/O vía contextBridge.

### AD-04: DropdownMenu componente genérico

`DropdownMenu` acepta `items: { label, onClick, visible? }[]`. No sabe de agentes ni configuraciones. `AgentPanel` pasa los items según estado.

### AD-05: Fetch de modelos lazy

`ModelDropdown` llama `provider.list_models()` solo cuando:
1. Provider configurado
2. Dropdown desplegado (on focus/click)

No precargar al montar AgentPanel.

## Archivos creados

| Archivo | Propósito |
|---|---|
| `src/renderer/components/AgentPanel.tsx` | Contenedor raíz, layout de 3 filas, orquestación de estados |
| `src/renderer/components/DropdownMenu.tsx` | Menú desplegable reutilizable con trigger "..." |
| `src/renderer/components/ConversationList.tsx` | Lista scrollable de conversaciones |
| `src/renderer/components/ConversationItem.tsx` | Item individual: título, fecha, última frase |
| `src/renderer/components/ChatView.tsx` | Historial de mensajes + auto-scroll |
| `src/renderer/components/MessageBubble.tsx` | Burbuja de mensaje (user/assistant), animación de entrada |
| `src/renderer/components/ModelDropdown.tsx` | Selector de modelo, deshabilitado si no hay config |
| `src/renderer/components/MessageInput.tsx` | Textarea multi-línea con auto-expand |
| `src/renderer/components/NewChatButton.tsx` | Botón "+" para nueva conversación |
| `src/renderer/context/AgentContext.tsx` | Estado global: config, provider, isConfigured |
| `src/renderer/context/ConversationContext.tsx` | Estado: conversaciones, activeConversation |
| `src/renderer/lib/storage.ts` | Persistencia a JSON via Electron IPC |
| `src/renderer/lib/model-contract.ts` | Interface ModelProvider + DummyModelProvider |
| `src/styles/agent-panel.css` | Todos los estilos del Agent Panel |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/renderer/App.tsx` | Reemplazar `<div id="agent-panel" />` por `<AgentPanel />` |
| `src/renderer/main.tsx` | Envolver `<App />` con `<AgentProvider>` y `<ConversationProvider>` |
| `src/styles/App.css` | Añadir `display: flex; flex-direction: column` a `#agent-panel` |

## Límites

- Dropdown "Configure Agent" y "Configurations": botones placeholder. No abren nada.
- Configuración de provider/API key: fuera de scope.
- Multi-proveedor: fuera de scope. Solo dummy implementado.
- Editar título de conversación: fuera de scope.
- Búsqueda/filtro de conversaciones: fuera de scope.
- Borrar mensajes individuales: fuera de scope.
- Streaming de respuestas: fuera de scope. Respuesta completa al recibir.
- Temas dark/light: hereda design tokens existentes. No añadir tokens nuevos.
- Electron IPC: `storage.ts` asume que existe contextBridge con funciones de file I/O. No implementar aún.
