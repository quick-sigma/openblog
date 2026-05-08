# Configurar agente desde panel — UI Design

> Estado: designed
> Arquitectura: `specs/architected/agent-config-button.md`
> Design system: `specs/design_system.md` (§2.14–2.16, N16, --transition-rainbow)

---

## 1. Árbol de componentes

```
AgentPanel
├── [unconfigured] button.agent-setup-btn  ← borde arcoíris animado
│   └── onClick → showSetupWizard=true
├── [configured] header bar + chat content  ← existente, sin cambios
└── [showSetupWizard] AgentSetupWizard
    ├── overlay (click cierra)
    ├─┬ wizard card
    │ ├── header ("Configurar provider" + X)
    │ └── body
    │     ├── sidebar (220px) → "Provider" + IoSettingsOutline
    │     └── content (flex:1)
    │         ├── [loading]  "Cargando providers..."
    │         ├── [error]    mensaje error + "Reintentar"
    │         ├── [loaded]   ProviderCard[] list
    │         │   └── cada ProviderCard:
    │         │       ├── img logo (fallback .png)
    │         │       ├── name
    │         │       └── description
    │         └── [selected] SetupForm (reemplaza la lista)
    │             ├── label "API Key de {name}"
    │             ├── input type=password
    │             ├── save button
    │             ├── cancel button
    │             └── error message (si falla validación)
    └── [saved] → onClose(), se desmonta
```

---

## 2. Componentes y su mapeo al Design System

| Componente | ID en DS | Archivo | Props | Consume context |
|---|---|---|---|---|
| `AgentSetupWizard` | 2.14 | `AgentSetupWizard.tsx` | `onClose` | `AgentContext` |
| `ProviderCard` | 2.15 | `ProviderCard.tsx` | `descriptor, onSelect, isConfigured` | Ninguno |
| `SetupForm` | 2.16 | `SetupForm.tsx` | `descriptor, onSave, onCancel` | Ninguno |

---

## 3. Flujo de estados del wizard

```
mount
  ↓
loading ──(fetch fails)──→ error ──(click reintentar)──→ loading
  │
  (fetch ok)
  ↓
loaded (lista de ProviderCard[])
  │
  └── click en ProviderCard no configurado
       ↓
    selecting → show SetupForm (input API Key + botón Guardar)
       │
       ├── click Cancel → back to loaded (lista)
       │
       └── click Save (apiKey no vacía)
            ↓
          saving (spinner en botón, input disabled, botón disabled)
            │
            ├── (fetch list_models falla)
            │    ↓
            │  save-error → mensaje error rojo debajo del input
            │    │
            │    └── usuario edita input + click Save → saving again
            │
            └── (fetch list_models ok)
                 ↓
               saved → AgentContext.saveConfig()
                      → AgentContext.setActiveConfig()
                      → AgentContext.setProvider()
                      → onClose() → desmonta wizard
```

---

## 4. Animación del botón configurar

Clase: `.agent-setup-btn`

```
@keyframes rainbow-cycle {
  0%, 100% { border-color: #ff0000; }
  14%      { border-color: #ff8800; }
  28%      { border-color: #ffdd00; }
  42%      { border-color: #00cc44; }
  57%      { border-color: #0099ff; }
  71%      { border-color: #6633ff; }
  85%      { border-color: #cc00ff; }
}

.agent-setup-btn {
  display: inline-block;
  padding: 12px 24px;
  border: 2px solid #ff0000;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  animation: rainbow-cycle 3s linear infinite;
  transition: transform 150ms, box-shadow 150ms;
}
.agent-setup-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 0 12px rgba(255,0,0,0.3);
}
.agent-setup-btn:active {
  transform: scale(0.97);
}
```

---

## 5. Estados de carga y error en ProviderCard list

| Estado | UI dentro del content area |
|---|---|
| `loading` | Spinner CSS simple (círculo rotando) + texto "Cargando providers…" centrado |
| `error` | Icono warning + texto "No se pudieron cargar los providers." + botón "Reintentar" (llama `loadProviderDescriptors()` otra vez) |
| `loaded` | Lista de `ProviderCard` con scroll vertical si excede altura |
| `empty` | Texto "No hay providers disponibles." (si `descriptors.length === 0`) |

---

## 6. Reglas de diseño específicas del wizard

| # | Regla |
|---|---|
| DW1 | El input de API Key usa `type="password"`. No hay toggle de visibilidad. |
| DW2 | El botón "Guardar" se deshabilita si input está vacío o si está en estado `saving`. |
| DW3 | El error de validación se muestra debajo del input, no en alert/toast. |
| DW4 | El overlay cierra al hacer click fuera del card. El botón X también cierra. Sin confirmación. |
| DW5 | El sidebar solo tiene un item ("Provider"). Se renderiza como lista plana para permitir agregar más items en el futuro sin cambiar estructura. |
| DW6 | ProviderCard intenta cargar logo SVG. Si falla (`onError`), fallback a PNG con mismo nombre base. Si también falla, no muestra logo (alt vacío). |
| DW7 | El wizard es responsivo solo en ancho: en viewports < 900px, el ancho del card pasa a 95vw. No hay versión mobile. |

---

## 7. Normas de diseño usadas (comprimido)

| # | Norma |
|---|---|
| 1 | **Colores vía CSS vars** — wizard usa `--color-panel-bg`, `--color-text`, `--color-border-divider`, `--color-primary`. Prohibidos literales. |
| 2 | **Dark mode heredado** — wizard hereda `.dark` del `<html>`. Sin estilos inline de color. |
| 3 | **Componentes atómicos** — ProviderCard y SetupForm son puros (sin context, sin I/O). Wizard es feature component que orquesta. |
| 4 | **Persistencia separada** — wizard no escribe storage. Delega en AgentContext.saveConfig(). |
| 5 | **Loading/error/empty en toda async** — wizard implementa los 3 estados en carga de descriptors y en validación de API Key. |
| 6 | **Sidebar fijo 220px** — no hereda tokens de layout global. El sidebar tiene ancho fijo, contenido flex:1. |
| 7 | **Modal con z-index aislado** — overlay z-index 1000, trap focus, aria-modal. |
| 8 | **Animación rainbow sólida** — keyframes con 7 stops de color, ciclo 3s linear infinite. Sin hue-rotate (inconsistente entre browsers). |
| 9 | **Fallback de logo SVG→PNG** — provider intenta .svg, onError→.png, doble fallback→sin imagen. |
| 10 | **Validación contra servidor real** — API Key se valida con list_models(). No hay validación sintáctica local. |

---

## 8. Implementation Details (comprimido)

1. **AgentConfig.base_url** añadido a `shared/storage-api.ts` para que `OpenAILikeProvider` tenga endpoint. Sin él, no puede construir requests REST.
2. **AgentContext.setProvider expuesto** — necesitamos reemplazar DummyModelProvider por OpenAILikeProvider post-validación. El context anterior no exponía `setProvider`.
3. **Wizard valida API Key con list_models() real** — no validación sintáctica. Si el servidor responde 401/403, el error se captura y muestra en `setup-form-error`. Sin esto, una key inválida pasaría desapercibida.
4. **ProviderCard es puro** — sin context, sin I/O. Props in, click out (DW3, N4). El estado `isConfigured` lo recibe del padre (wizard), que más adelante podría leer los configs guardados.
5. **SetupForm es puro** — maneja solo estados UI (idle/typing/saving/error). `onSave` es async, el form muestra spinner sin depender de estado externo.
6. **AgentSetupWizard orquesta todo** — consume AgentContext para `saveConfig`, `setActiveConfig`, `setProvider`. No escribe storage directamente (N5).
7. **loadProviderDescriptors() lee JSON estáticos** — en Electron, fetch a `/providers/descriptions/*.json`. Lista estática de archivos conocidos (evita directory listing). Escalable: solo agregar JSON + logo a `public/providers/`.
8. **OpenAILikeProvider implementa ModelProvider** — compatible con OpenAI API schema. Usa fetch nativo (sin librería externa). Soporta `/v1/models` y `/v1/chat/completions`.
9. **CSS unificado en agent-panel.css** — todo el CSS del wizard, provider card, setup form y rainbown btn en un solo archivo (N15). Sin archivos CSS extra.
10. **No se añadieron dependencias npm** — icono Settings inline SVG, animaciones CSS puras, fetch nativo. Cero nuevas librerías.
