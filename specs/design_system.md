# Design System — Blog Comp

> Fuente única de verdad para el frontend. Todos los componentes UI se definen aquí.
> Versión del layout: `layout-2-columnas-70-30` (especificación arquitectónica vigente).

---

## 1. Design Tokens

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--color-panel-bg` | `#f9fafb` | Fondo de paneles (gris muy claro) |
| `--color-border-divider` | `#e5e7eb` | Borde divisor entre paneles (gray-200) |
| `--color-app-bg` | `inherit` | Fondo del contenedor raíz (hereda de body) |

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

---

## 3. Reglas de consumo

| Regla | Descripción |
|---|---|
| **R1** | Ningún componente importa hooks, lib, ipc, services ni preload API. |
| **R2** | `App` no importa nada de `../components/`, `../hooks/` ni `../lib/`. |
| **R3** | `App.css` no importa otros CSS. Contiene solo reglas del layout. |
| **R4** | Los componentes no tienen estado interno ni lógica de negocio. |
| **R5** | Los paneles no renderizan contenido ni placeholder visible. Son slots puros. |

---

## 4. Historial de cambios

| Fecha | Versión layout | Cambio |
|---|---|---|
| 2026-05-07 | layout-2-columnas-70-30 | Creación inicial del design system |
