# Design System — Blog Comp

> Fuente única de verdad para el frontend. Todos los componentes UI se definen aquí.
> Versión actual: `layout-2-columnas-70-30` + `dark-mode` (ver §5 Arquitecturas vinculadas).

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

#### Dark mode (`.dark`)

| Token | Valor | Uso |
|---|---|---|
| `--color-body-bg` | `#0f0f1a` | Fondo del body |
| `--color-panel-bg` | `#1a1a2e` | Fondo de paneles |
| `--color-text` | `#e2e2e8` | Texto principal |
| `--color-text-muted` | `#9e9eb0` | Texto secundario |
| `--color-border-divider` | `#2a2a3d` | Borde divisor entre paneles |
| `--color-border-subtle` | `#35354a` | Hover, focus, bordes secundarios |

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
| **Descripción** | Panel derecho (30%). Slot para el agente futuro. Borde izquierdo divisor. Scroll vertical cuando el contenido desborda. |
| **Props** | `children: ReactNode` |
| **Estados** | — (estructural, sin estados) |
| **CSS contract** | `width: var(--layout-ratio-agent); overflow-y: auto; padding: var(--spacing-panel); background: var(--color-panel-bg); border-left: 1px solid var(--color-border-divider);` |
| **Responsive** | No aplica |
| **Elemento DOM** | `<div id="agent-panel">` |

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

---

## 3. Reglas de consumo

| Regla | Descripción |
|---|---|
| **R1** | Los componentes estructurales de layout no importan hooks, lib, ipc, services ni preload API. Los componentes de funcionalidad (feature components) pueden importar hooks del context correspondiente. |
| **R2** | `App` no importa nada de `../components/`, `../hooks/` ni `../lib/`. |
| **R3** | `App.css` no importa otros CSS. Contiene solo reglas del layout. |
| **R4** | Los componentes estructurales no tienen estado interno ni lógica de negocio. Feature components limitan su estado al contexto que consumen. |
| **R5** | Los paneles no renderizan contenido ni placeholder visible. Son slots puros. |
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

## 5. Arquitecturas vinculadas

Este Design System es consumido por las siguientes especificaciones arquitectónicas:

| Arquitectura | Archivo | Componentes del DS que consume |
|---|---|---|
| Layout 2 columnas 70/30 | `specs/archived/layout-2-columnas-70-30.md` | `App`, `AppContainer`, `ContentPanel`, `AgentPanel` |
| Dark Mode | `specs/architected/dark-mode.md` | `ThemeToggler`, tokens de color (todos), `--transition-theme`, `--transition-icon` |

## 6. Historial de cambios

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-05-07 | layout-2-columnas-70-30 | Creación inicial del design system |
| 2026-05-07 | dark-mode | Añadidos tokens dark, ThemeToggler, normas de diseño N1–N7, R6–R8, transiciones |
