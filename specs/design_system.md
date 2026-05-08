# Design System — Blog Comp

> Fuente única de verdad para el frontend. Todos los componentes UI se definen aquí.
> Versión actual: `agent-panel` (sucesor de `layout-2-columnas-70-30` + `dark-mode`; ver §5 Arquitecturas vinculadas).

---

## 1. Design Tokens

### Colores

#### Light mode (`:root`)

| Token | Valor | Uso |
|---|---|---|
| `--color-body-bg` | `#ffffff` | Fondo del body |
| `--color-panel-bg` | `#f9fafb` | Fondo de paneles |
| `--color-text` | `#111827` | Texto principal |
| `--color-text-muted` | `#6b7280` | Texto secundario |
| `--color-border-divider` | `#e5e7eb` | Borde divisor entre paneles |
| `--color-border-subtle` | `#d1d5db` | Hover, focus, bordes secundarios |
| `--color-primary` | `#3b82f6` | Accent primary: user bubbles, botón enviar, enlaces |
| `--color-primary-hover` | `#2563eb` | Hover de elementos primary |

#### Dark mode (`.dark`)

| Token | Valor | Uso |
|---|---|---|
| `--color-body-bg` | `#0f0f1a` | Fondo del body |
| `--color-panel-bg` | `#1a1a2e` | Fondo de paneles |
| `--color-text` | `#e2e2e8` | Texto principal |
| `--color-text-muted` | `#9e9eb0` | Texto secundario |
| `--color-border-divider` | `#2a2a3d` | Borde divisor entre paneles |
| `--color-border-subtle` | `#35354a` | Hover, focus, bordes secundarios |
| `--color-primary` | `#60a5fa` | Accent primary: user bubbles, botón enviar, enlaces |
| `--color-primary-hover` | `#93c5fd` | Hover de elementos primary |

### Espaciado

| Token | Valor | Uso |
|---|---|---|
| `--spacing-panel` | `16px` | Padding interior de paneles |

### Layout

| Token | Valor | Uso |
|---|---|---|
| `--layout-min-height` | `100vh` | Alto mínimo del viewport |
| `--layout-ratio-content` | `70%` | Ancho del panel de contenido |
| `--layout-ratio-agent` | `30%` | Ancho del panel de agente |
| `--layout-gap` | `0` | Sin gap entre paneles (usa borde divisor) |

### Animación y transiciones

| Token | Valor | Uso |
|---|---|---|
| `--transition-theme` | `background-color 300ms ease, color 300ms ease` | Transición suave de colores al cambiar tema |
| `--transition-icon` | `transform 400ms ease` | Rotación del icono en ThemeToggler |
| `--transition-rainbow` | `border-color 3s linear infinite` | Animación de borde arcoíris en botón configurar |

---

## 2. Componentes

### 2.1 `App`

| Propiedad | Valor |
|---|---|
| **Descripción** | Punto de entrada único del layout. Sin lógica interna. Sin estado. Renderiza solo `AppContainer`. |
| **Props** | Ninguna |
| **Estados** | — (estructural, sin estados) |
| **Responsive** | No aplica (pendiente de definición futura) |
| **Archivo destino** | `src/renderer/App.tsx` |

### 2.2 `AppContainer`

| Propiedad | Valor |
|---|---|
| **Descripción** | Contenedor raíz flex que ocupa todo el viewport. Dispón los paneles ContentPanel y AgentPanel en fila horizontal. |
| **Props** | `children: ReactNode` |
| **Estados** | — (estructural, sin estados) |
| **CSS contract** | `display: flex; width: 100%; height: var(--layout-min-height);` |
| **Responsive** | No aplica |
| **Elemento DOM** | `<div id="app-container">` |

### 2.3 `ContentPanel`

| Propiedad | Valor |
|---|---|
| **Descripción** | Panel izquierdo (70%). Slot para contenido futuro del blog. Scroll vertical cuando el contenido desborda. |
| **Props** | `children: ReactNode` |
| **Estados** | — (estructural, sin estados) |
| **CSS contract** | `width: var(--layout-ratio-content); overflow-y: auto; padding: var(--spacing-panel); background: var(--color-panel-bg);` |
| **Responsive** | No aplica |
| **Elemento DOM** | `<div id="content-panel">` |

### 2.4 `AgentPanel`

| Propiedad | Valor |
|---|---|
| **Descripción** | Feature component que orquesta el panel del agente (30% derecho). Sin props externas — consume `AgentContext` y `ConversationContext`. Layout interno: header bar fijo (75px) + overlay de lista o vista de chat. |
| **Props** | Ninguna (todo vía `useAgent()` y `useConversations()`) |
| **Estados** | `loading` (inicializando contexts), `unconfigured` (sin AgentConfig → muestra CTA "Configure Agent"), `configured-no-conversation` (config ok, sin conversación activa → muestra ConversationList overlay), `configured-with-conversation` (config ok + conversación activa → muestra ChatView + header bar) |
| **Header bar** | Fijo en el tope, 75px de alto. Contiene (en este orden): `NewChatButton` → título de la conversación → `ModelDropdown` → `DropdownMenu("…")`. |
| **CSS contract** | `#agent-panel { width: var(--layout-ratio-agent); background: var(--color-panel-bg); border-left: 1px solid var(--color-border-divider); display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative; }` |
| **Header CSS** | `.agent-panel-header { height: 75px; min-height: 75px; display: flex; align-items: center; padding: 0 12px; border-bottom: 1px solid var(--color-border-divider); gap: 8px; }` |
| **Responsive** | No aplica |
| **Elemento DOM** | `<div id="agent-panel">` |
| **Dependencias** | `AgentContext`, `ConversationContext`, `ChatView`, `ConversationList`, `ModelDropdown`, `DropdownMenu`, `NewChatButton` |
| **Archivo destino** | `src/renderer/components/AgentPanel.tsx` |

### 2.5 `ThemeToggler`

| Propiedad | Valor |
|---|---|
| **Descripción** | Botón toggle de tema claro/oscuro. Consume `useTheme()` del context de tema. Renderiza icono sol/luna según estado actual. Posición fixed top-right para acceso global. |
| **Props** | Ninguna (todo vía `useTheme()` de `ThemeContext`) |
| **Estados** | `light` (icono `<SunIcon />`), `dark` (icono `<MoonIcon />`), `hover` (background change + scale 1.1×), `focus` (outline ring), `active` (scale 0.95×) |
| **Comportamiento** | `onClick` → `toggleTheme()`. Tooltip con `title="Cambiar a modo oscuro"` / `title="Cambiar a modo claro"`. Animación de rotación del icono al cambiar. |
| **CSS contract** | `.theme-toggler { position: fixed; top: 12px; right: 16px; z-index: 9999; border-radius: 8px; padding: 8px 12px; background: var(--color-panel-bg); cursor: pointer; border: 1px solid var(--color-border-subtle); transition: background 200ms, transform 200ms; display: flex; align-items: center; justify-content: center; }` |
| **Hover** | `background: var(--color-border-divider); transform: scale(1.1);` |
| **Focus** | `outline: 2px solid var(--color-text-muted); outline-offset: 2px;` |
| **Active** | `transform: scale(0.95);` |
| **Animación** | Icono rota 360° en 400ms al cambiar de tema (`@keyframes spin-theme { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`) |
| **Accesibilidad** | `aria-label="Toggle theme"`, `role="button"`, `tabindex="0"` |
| **Dependencias** | `useTheme()` de `ThemeContext` |
| **Archivo destino** | `src/renderer/components/ThemeToggler.tsx` |

### 2.6 `ChatView`

| Propiedad | Valor |
|---|---|
| **Descripción** | Área de mensajes del chat activo. Scroll infinito anclado al fondo. Muestra `MessageBubble` por cada mensaje. `MessageInput` fijo en la parte inferior. Todo fetch a provider (`generate_content`) se delega a main process vía IPC — ChatView no sabe del mecanismo de transporte.
| **Props** | Ninguna (vía `ConversationContext`) |
| **Estados** | `empty` (sin mensajes → placeholder "Inicia una conversación…"), `populated` (mensajes presentes → renderiza burbujas), `streaming` (respuesta del modelo en curso → pulso sutil en última burbuja assistant), `error` (fallo en `generate_content` → mensaje de error + botón "Reintentar") |
| **Estado error** | Cuando `generate_content()` lanza excepción (provider caído, timeout, 401, red), ChatView captura y muestra mensaje "Error de conexión con {provider}" + botón "Reintentar" que re-ejecuta `generate_content` con el mismo prompt. El mensaje de error anterior del assistant se descarta o se marca como fallido. |
| **Streaming (preparado)** | ChatView suscribe `onProviderChunk` en `useEffect`. Al recibir chunks, concatena `chunk` en el `content` del último mensaje assistant usando `TextDecoder`. Cuando `done: true`, desuscribe y desactiva `isStreaming`. No implementado — solo contrato. |
| **CSS contract** | `.chat-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }` |
| **Messages area** | `.chat-messages { flex: 1; overflow-y: auto; padding: 8px 16px; display: flex; flex-direction: column; gap: 4px; }` |
| **Responsive** | No aplica |
| **Elemento DOM** | `<div class="chat-view">` |
| **Dependencias** | `ConversationContext`, `MessageBubble`, `MessageInput` |
| **Archivo destino** | `src/renderer/components/ChatView.tsx` |

### 2.7 `MessageBubble`

| Propiedad | Valor |
|---|---|
| **Descripción** | Burbuja de mensaje individual con estilo según `role`. Contenido markdown renderizado para assistant, texto plano para user/system. Timestamp en esquina inferior. |
| **Props** | `message: Message` (`{ role, content, timestamp }`), `isStreaming?: boolean` |
| **Estados** | `user` (alineación derecha, fondo `--color-primary`), `assistant` (alineación izquierda, fondo panel bordeada), `system` (centrado, texto muted, tamaño reducido), `streaming` (solo assistant, borde izquierdo con animación pulse) |
| **Role: user** | `.message-bubble.user { justify-content: flex-end; } .message-bubble.user .bubble-content { background: var(--color-primary); color: white; border-radius: 16px 16px 4px 16px; }` |
| **Role: assistant** | `.message-bubble.assistant { justify-content: flex-start; } .message-bubble.assistant .bubble-content { background: var(--color-panel-bg); border: 1px solid var(--color-border-subtle); border-radius: 16px 16px 16px 4px; }` |
| **Role: system** | `.message-bubble.system { justify-content: center; } .message-bubble.system .bubble-content { font-size: 0.8em; color: var(--color-text-muted); font-style: italic; }` |
| **Streaming** | `.message-bubble.assistant.streaming .bubble-content { border-left: 3px solid var(--color-primary); animation: pulse-border 1.5s ease-in-out infinite; }` |
| **Accesibilidad** | `role="listitem"`, `aria-label="Mensaje de {role}"` |
| **Dependencias** | Ninguna (componente puro) |
| **Archivo destino** | `src/renderer/components/MessageBubble.tsx` |

### 2.8 `MessageInput`

| Propiedad | Valor |
|---|---|
| **Descripción** | Área de texto expandible con botón de envío a la derecha. Enter envía, Shift+Enter nueva línea. Botón deshabilitado si vacío o si hay streaming activo. |
| **Props** | `onSend: (content: string) => void`, `disabled?: boolean` |
| **Estados** | `idle` (vacío → botón gris), `composing` (texto presente → botón primary), `disabled` (streaming activo → input readonly + botón gris) |
| **CSS contract** | `.message-input { display: flex; align-items: flex-end; padding: 12px 16px; border-top: 1px solid var(--color-border-divider); gap: 8px; background: var(--color-panel-bg); }` |
| **Textarea** | `.message-input textarea { flex: 1; resize: none; border: 1px solid var(--color-border-subtle); border-radius: 8px; padding: 10px 12px; background: var(--color-body-bg); color: var(--color-text); font-family: inherit; font-size: 14px; line-height: 1.4; max-height: 200px; min-height: 40px; outline: none; }` |
| **Send button** | `.message-input .send-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--color-primary); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 200ms; } .message-input .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }` |
| **Accesibilidad** | `textarea` con `aria-label="Mensaje"`, botón con `aria-label="Enviar"` |
| **Dependencias** | Ninguna (componente puro) |
| **Archivo destino** | `src/renderer/components/MessageInput.tsx` |

### 2.9 `ConversationList`

| Propiedad | Valor |
|---|---|
| **Descripción** | Overlay que cubre el área de chat cuando no hay conversación activa. Muestra lista de `ConversationItem` + `NewChatButton` prominente. Se cierra al seleccionar una conversación. |
| **Props** | Ninguna (vía `ConversationContext`) |
| **Estados** | `empty` (sin conversaciones → texto "No hay conversaciones. Crea una nueva." + NewChatButton grande), `populated` (lista de `ConversationItem` + NewChatButton compacto) |
| **CSS contract** | `.conversation-list-overlay { position: absolute; inset: 0; top: 75px; background: var(--color-panel-bg); z-index: 10; display: flex; flex-direction: column; overflow-y: auto; }` |
| **Header en overlay** | `.conversation-list-overlay .list-header { padding: 16px; text-align: center; }` |
| **Dependencias** | `ConversationContext`, `ConversationItem`, `NewChatButton` |
| **Archivo destino** | `src/renderer/components/ConversationList.tsx` |

### 2.10 `ConversationItem`

| Propiedad | Valor |
|---|---|
| **Descripción** | Fila individual en la lista de conversaciones. Muestra título, preview del último mensaje y timestamp relativo. |
| **Props** | `conversation: Conversation`, `isActive: boolean`, `onClick: () => void` |
| **Estados** | `default`, `hover` (background change), `active` (highlighted con borde izquierdo) |
| **CSS contract** | `.conversation-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--color-border-divider); transition: background 150ms; } .conversation-item:hover { background: var(--color-border-divider); } .conversation-item.active { border-left: 3px solid var(--color-primary); }` |
| **Layout interno** | Título en `font-weight: 600`, preview en `color: var(--color-text-muted); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`, timestamp en `color: var(--color-text-muted); font-size: 0.75em; text-align: right;` |
| **Accesibilidad** | `role="listitem"`, `aria-selected={isActive}` |
| **Dependencias** | Ninguna (componente puro) |
| **Archivo destino** | `src/renderer/components/ConversationItem.tsx` |

### 2.11 `ModelDropdown`

| Propiedad | Valor |
|---|---|
| **Descripción** | Dropdown de selección de modelo. Dispara `provider.list_models()` al abrirse (lazy load). Muestra el modelo activo como trigger. `list_models()` delega a main process vía IPC, transparente para el dropdown. |
| **Props** | Ninguna (vía `AgentContext`) |
| **Estados** | `closed` (trigger muestra nombre del modelo actual), `loading` (fetching modelos → spinner en dropdown), `open` (lista de modelos), `error` (fallo en fetch → mensaje "Error al cargar modelos" + botón "Reintentar"), `empty` (provider devolvió lista vacía → "No hay modelos disponibles") |
| **CSS contract** | `.model-dropdown { position: relative; } .model-dropdown .trigger { padding: 6px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font-size: 13px; color: var(--color-text-muted); background: transparent; transition: border-color 200ms; display: flex; align-items: center; gap: 4px; } .model-dropdown .trigger:hover { border-color: var(--color-border-subtle); }` |
| **Menu dropdown** | `.model-dropdown .menu { position: absolute; top: 100%; right: 0; min-width: 220px; background: var(--color-panel-bg); border: 1px solid var(--color-border-divider); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; padding: 4px; }` |
| **Dependencias** | `AgentContext` |
| **Archivo destino** | `src/renderer/components/ModelDropdown.tsx` |

### 2.12 `DropdownMenu`

| Propiedad | Valor |
|---|---|
| **Descripción** | Menú contextual genérico con trigger "…" (AD-04). Renderiza items según prop. Cierra al hacer clic fuera o seleccionar un item. |
| **Props** | `items: Array<{ label: string; onClick: () => void; visible?: boolean; icon?: ReactNode }>` |
| **Estados** | `closed` (trigger "…"), `open` (menú posicionado debajo del trigger) |
| **CSS contract** | `.dropdown-menu { position: relative; } .dropdown-menu .trigger { width: 32px; height: 32px; border-radius: 6px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 18px; transition: background 150ms; } .dropdown-menu .trigger:hover { background: var(--color-border-divider); }` |
| **Menu** | `.dropdown-menu .menu-items { position: absolute; top: 100%; right: 0; min-width: 180px; background: var(--color-panel-bg); border: 1px solid var(--color-border-divider); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; padding: 4px; }` |
| **Item** | `.dropdown-menu .menu-item { padding: 8px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--color-text); transition: background 150ms; } .dropdown-menu .menu-item:hover { background: var(--color-border-divider); }` |
| **Accesibilidad** | `aria-haspopup="true"`, `aria-expanded={isOpen}` |
| **Dependencias** | Ninguna (componente puro, AD-04) |
| **Archivo destino** | `src/renderer/components/DropdownMenu.tsx` |

### 2.13 `NewChatButton`

| Propiedad | Valor |
|---|---|
| **Descripción** | Botón para crear nueva conversación. Dos variantes: icono compacto (header bar) y botón texto grande (overlay ConversationList vacío). |
| **Props** | `onClick: () => void`, `variant: 'compact' | 'full'` |
| **Estados** | `default`, `hover` (background change), `active` (scale 0.97×) |
| **CSS contract (compact)** | `.new-chat-btn.compact { width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--color-border-subtle); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-text); transition: background 150ms; }` |
| **CSS contract (full)** | `.new-chat-btn.full { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px dashed var(--color-border-divider); background: transparent; cursor: pointer; font-size: 14px; color: var(--color-text-muted); transition: background 150ms, border-color 150ms; display: flex; align-items: center; justify-content: center; gap: 8px; } .new-chat-btn.full:hover { border-color: var(--color-border-subtle); background: var(--color-border-divider); }` |
| **Accesibilidad** | `aria-label="Nueva conversación"` |
| **Dependencias** | Ninguna (componente puro) |
| **Archivo destino** | `src/renderer/components/NewChatButton.tsx` |

### 2.14 `AgentSetupWizard`

| Propiedad | Valor |
|---|---|
| **Descripción** | Modal (toplevel) de configuración de agente. Overlay fullscreen con card centrado. Layout interno: header + sidebar (220px) + contenido. Se monta/desmonta desde AgentPanel vía estado `showSetupWizard`. Consume `AgentContext`. |
| **Props** | `onClose: () => void` |
| **Estados** | `loading` (cargando descriptors desde `loadProviderDescriptors()`), `loaded` (descriptors cargados → muestra lista), `error` (fallo en carga → mensaje + botón reintentar), `selecting` (usuario eligiendo provider), `configuring` (input API Key visible), `saving` (validando API Key contra servidor), `saved` (config guardada, feedback check verde), `save-error` (fallo validación → mensaje error) |
| **Overlay** | `.agent-setup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }` |
| **Card** | `.agent-setup-wizard { background: var(--color-panel-bg); border-radius: 12px; width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: flex; flex-direction: column; }` |
| **Header** | `.agent-setup-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--color-border-divider); }` Header text: "Configurar provider", font-weight 600, font-size 18px. Close button: X icon, 32x32, border-radius 6px, hover background var(--color-border-divider). |
| **Body** | `.agent-setup-body { display: flex; min-height: 400px; }` |
| **Sidebar** | `.agent-setup-sidebar { width: 220px; min-width: 220px; background: var(--color-panel-bg); border-right: 1px solid var(--color-border-divider); padding: 8px; }` |
| **Sidebar item** | `.agent-setup-sidebar-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; border-radius: 6px; color: var(--color-text); font-size: 14px; transition: background 150ms; } .agent-setup-sidebar-item:hover { background: var(--color-border-divider); } .agent-setup-sidebar-item--active { background: var(--color-border-divider); font-weight: 600; }` |
| **Content area** | `.agent-setup-content { flex: 1; padding: 20px 24px; overflow-y: auto; }` |
| **Accesibilidad** | Overlay `role="dialog"`, `aria-modal="true"`, `aria-label="Configurar provider"`. Primer foco en close button. Trap focus dentro del modal. Escape cierra. |
| **Dependencias** | `AgentContext` (useAgent), `loadProviderDescriptors()` de lib/provider-list, `OpenAILikeProvider` de lib/openai-like-provider |
| **Archivo destino** | `src/renderer/components/AgentSetupWizard.tsx` |

### 2.15 `ProviderCard`

| Propiedad | Valor |
|---|---|
| **Descripción** | Card individual de provider dentro de la lista del wizard. Muestra logo (30%) + nombre y descripción (70%). Clickable. Al hacer click, el wizard padre muestra el input de API Key. |
| **Props** | `descriptor: ProviderDescriptor`, `onSelect: (descriptor: ProviderDescriptor) => void`, `isConfigured: boolean` |
| **Estados** | `default` (clickeable, borde sutil), `configured` (isConfigured=true → check verde + borde verde, no clickeable), `hover` (background change + borde primary) |
| **CSS contract** | `.provider-card { display: flex; cursor: pointer; padding: 14px; border: 1px solid var(--color-border-divider); border-radius: 8px; margin-bottom: 10px; transition: border-color 150ms, background 150ms; } .provider-card:hover { border-color: var(--color-primary); background: var(--color-border-divider); }` |
| **Logo container** | `.provider-card-logo { width: 30%; min-width: 80px; display: flex; align-items: center; justify-content: center; } .provider-card-logo img { max-width: 72px; max-height: 72px; object-fit: contain; }` |
| **Info container** | `.provider-card-info { width: 70%; padding-left: 12px; }` |
| **Name** | `.provider-card-name { font-weight: 600; font-size: 16px; color: var(--color-text); margin-bottom: 4px; }` |
| **Description** | `.provider-card-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.4; }` |
| **Configured indicator** | `.provider-card.configured { border-color: #22c55e; cursor: default; } .provider-card.configured:hover { border-color: #22c55e; background: transparent; }` Check icon (green) overlay en esquina superior derecha o inline junto al nombre. |
| **Accesibilidad** | `role="button"`, `tabindex="0"`, `aria-label="Configurar {descriptor.name}"` |
| **Dependencias** | Ninguna (componente puro) |
| **Archivo destino** | `src/renderer/components/ProviderCard.tsx` |

### 2.16 `SetupForm`

| Propiedad | Valor |
|---|---|
| **Descripción** | Formulario de ingreso de API Key para un provider seleccionado. Se renderiza dentro del content area del wizard cuando el usuario clickea un provider no configurado. Incluye input de API Key + botón Guardar + estado de validación. La validación (`provider.list_models()`) delega a main process vía IPC — SetupForm no nota el cambio. Los errores de red (provider no responde) se capturan igual que errores de API key inválida. |
| **Props** | `descriptor: ProviderDescriptor`, `onSave: (apiKey: string) => Promise<void>`, `onCancel: () => void` |
| **Estados** | `idle` (input vacío, botón deshabilitado), `typing` (input con texto, botón habilitado), `saving` (validando contra servidor → spinner en botón, input disabled), `error` (fallo validación → mensaje error debajo del input), `success` (no aplica, el padre cierra o muestra check) |
| **CSS contract** | `.setup-form { padding: 16px 0; }` |
| **Input label** | `.setup-form label { display: block; font-size: 14px; font-weight: 500; color: var(--color-text); margin-bottom: 6px; }` Text: "API Key de {descriptor.name}" |
| **Input** | `.setup-form input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border-subtle); border-radius: 6px; background: var(--color-body-bg); color: var(--color-text); font-size: 14px; outline: none; transition: border-color 200ms; } .setup-form input[type="password"]:focus { border-color: var(--color-primary); }` |
| **Actions row** | `.setup-form-actions { display: flex; gap: 8px; margin-top: 16px; }` |
| **Save button** | `.setup-form-save-btn { padding: 8px 20px; background: var(--color-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: opacity 200ms; } .setup-form-save-btn:disabled { opacity: 0.5; cursor: not-allowed; } .setup-form-save-btn:hover:not(:disabled) { background: var(--color-primary-hover); }` |
| **Cancel button** | `.setup-form-cancel-btn { padding: 8px 20px; background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border-subtle); border-radius: 6px; cursor: pointer; font-size: 14px; } .setup-form-cancel-btn:hover { background: var(--color-border-divider); }` |
| **Error message** | `.setup-form-error { color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 4px; }` |
| **Accesibilidad** | Input `type="password"` con `aria-label="API Key de {name}"`, `aria-describedby` apuntando al error. Botón save con `aria-label="Guardar configuración"`. |
| **Dependencias** | Ninguna (componente puro) |
| **Archivo destino** | `src/renderer/components/SetupForm.tsx` |

---

## 3. Reglas de consumo

| Regla | Descripción |
|---|---|
| **R1** | Los componentes estructurales de layout no importan hooks, lib, ipc, services ni preload API. Los componentes de funcionalidad (feature components) pueden importar hooks del context correspondiente. |
| **R2** | `App` no importa nada de `../components/`, `../hooks/` ni `../lib/`. |
| **R3** | `App.css` no importa otros CSS. Contiene solo reglas del layout. |
| **R4** | Los componentes estructurales de layout no tienen estado interno ni lógica de negocio. Feature components limitan su estado al contexto que consumen y no realizan I/O directo (llamadas a storage, IPC o provider). |
| **R5** | Los feature components orquestadores (ej: AgentPanel) pueden renderizar contenido, gestionar estados derivados del contexto y componer hijos funcionales. Los componentes estructurales (App, AppContainer, ContentPanel) siguen siendo slots puros sin contenido propio. |
| **R6** | Todo color debe referenciar `var(--color-*)`. Prohibidos valores literales en `color`, `background`, `border-color`, `box-shadow`. |
| **R7** | El selector `.dark` se aplica sobre `<html>`. No usar `.dark` en `<body>` ni contenedores internos. |
| **R8** | La transición de tema se define globalmente con `--transition-theme` y se aplica a `body` y paneles. Los componentes no definen sus propias transiciones de color. |

---

## 4. Normas de diseño

Las siguientes normas se derivan de los specs arquitectónicos y aplican a todo el frontend.

| ID | Norma | Descripción |
|---|---|---|
| **N1** | Contrato único de color vía CSS variables | Todos los colores se definen como variables CSS en `:root` (light) y `.dark` (dark). Ningún archivo CSS o componente hardcodea valores de color literales. Cualquier cambio de paleta se hace exclusivamente en las variables. |
| **N2** | Modo oscuro vía clase en `<html>` | El tema se controla añadiendo/removiendo la clase `.dark` en `<html>`. Esto permite herencia correcta de variables y evita conflictos de especificidad. Prohibido usar `.dark` en `<body>` o contenedores internos. |
| **N3** | Anti-flash antes del primer paint | Un script inline síncrono en `<head>` de `index.html` lee `localStorage` y `prefers-color-scheme` antes del primer paint, aplicando `.dark` si corresponde. Elimina el parpadeo de tema claro antes de que React monte. |
| **N4** | Componentes atómicos y autónomos | Cada componente UI tiene una sola responsabilidad. No mezcla lógica de estado, persistencia ni manipulación directa del DOM fuera de su template. Dependencias externas limitadas al hook de context correspondiente. |
| **N5** | Persistencia separada de UI | La escritura en `localStorage` es responsabilidad del provider (`ThemeContext`), no del componente visual (`ThemeToggler`). El componente solo llama a `toggleTheme()`. |
| **N6** | Transiciones globales | El cambio de tema usa transiciones CSS suaves definidas como tokens globales. Componentes individuales no definen sus propias transiciones de color. |
| **N7** | CSS agnóstico al framework | Las variables CSS son el único contrato entre JS y estilos. React no aplica estilos inline de color. El sistema de temas funciona independientemente del framework de UI. |
| **N8** | Chat scroll anclado al fondo | El área de mensajes (`ChatView`) hace scroll automático al último mensaje. Cuando el usuario hace scroll hacia arriba para leer historial, el auto-scroll se pausa. Un botón "↓ Ir al final" aparece cuando hay mensajes nuevos fuera del viewport. |
| **N9** | Overlay de lista sobre chat | `ConversationList` se renderiza como overlay absoluto cubriendo el área de chat (no como sidebar interna ni tabs). Al seleccionar una conversación, el overlay se desmonta y `ChatView` ocupa el espacio completo. |
| **N10** | Header bar fijo con jerarquía horizontal | El header del AgentPanel (75px) contiene, en este orden: NewChatButton → título dinámico → ModelDropdown → DropdownMenu. Los elementos se alinean en el eje horizontal con `gap: 8px`. El título ocupa el espacio restante via `flex: 1` con `text-overflow: ellipsis`. |
| **N11** | Alineación de mensajes por rol | User → derecha con fondo primary. Assistant → izquierda con fondo panel bordeado. System → centrado, tamaño reducido, italic. Esto proporciona jerarquía visual sin depender de iconos de avatar. |
| **N12** | Streaming con pulso en borde | Durante generación del modelo, la última burbuja assistant muestra un borde izquierdo animado (pulse) para indicar actividad. Sin spinners ni texto adicional. |
| **N13** | Estados de loading/error/empty en toda operación asíncrona | Cada componente que ejecuta una operación async (`list_models`, `generate_content`) implementa los tres estados: `loading` (spinner/skeleton), `error` (mensaje + botón Reintentar), `empty` (mensaje informativo). Ninguna promesa no-capturada. |
| **N14** | Lazy fetch de modelos | `ModelDropdown` no precarga modelos al montar la app. La llamada a `provider.list_models()` se dispara al abrir el dropdown (click/focus). Si la llamada falla, el dropdown muestra error con reintentar. |
| **N15** | CSS unificado del agente | Todos los estilos del panel agente van en `agent-panel.css` (un solo archivo). No se crean archivos CSS por componente. Esto sigue la regla de organización §8.4 del spec arquitectónico. |
| **N16** | Wizard modal con z-index aislado | El overlay del wizard usa `z-index: 1000` para estar siempre sobre cualquier otro contenido. El trap focus y `aria-modal` aseguran que el contenido tras el overlay no sea accesible. |

## 5. Arquitecturas vinculadas

Este Design System es consumido por las siguientes especificaciones arquitectónicas:

| Arquitectura | Archivo | Componentes del DS que consume |
|---|---|---|
| Layout 2 columnas 70/30 | `specs/archived/layout-2-columnas-70-30.md` | `App`, `AppContainer`, `ContentPanel`, `AgentPanel` (estructural heredado) |
| Dark Mode | `specs/archived/dark-mode.md` | `ThemeToggler`, tokens de color (todos), `--transition-theme`, `--transition-icon` |
| Agent Panel | `specs/designed/agent-panel.md` | `AgentPanel` (feature), `ChatView`, `MessageBubble`, `MessageInput`, `ConversationList`, `ConversationItem`, `ModelDropdown`, `DropdownMenu`, `NewChatButton` |
| Agent Config Button | `specs/designed/agent-config-button.md` | `AgentSetupWizard`, `ProviderCard`, `SetupForm`, `AgentPanel` (botón config) |
| Node.js Provider Fetch | `specs/designed/node-provider-fetch.md` | `ChatView` (estado error real), `ModelDropdown` (nota IPC), `SetupForm` (nota IPC). Sin componentes nuevos. Sin cambios visuales. |

## 6. Historial de cambios

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-05-07 | layout-2-columnas-70-30 | Creación inicial del design system |
| 2026-05-07 | dark-mode | Añadidos tokens dark, ThemeToggler, normas de diseño N1–N7, R6–R8, transiciones |
| 2026-05-07 | agent-panel | AgentPanel upgrade a feature component. Añadidos: ChatView, MessageBubble, MessageInput, ConversationList, ConversationItem, ModelDropdown, DropdownMenu, NewChatButton. Nuevos tokens primary. Normas N8–N15. Reglas R4–R5 actualizadas. |
| 2026-05-07 | agent-config-button | Añadidos: AgentSetupWizard (2.14), ProviderCard (2.15), SetupForm (2.16). Nueva norma N16 (wizard modal z-index). Nuevos tokens de animación rainbow. |
| 2026-05-07 | node-provider-fetch | ChatView §2.6: añadido estado `error` real (antes placeholder) y suscripción preparada para streaming. ModelDropdown §2.11, SetupForm §2.16: notas de delegación IPC. Arquitectura vinculada §5 añadida. Sin cambios visuales — migración interna. |
