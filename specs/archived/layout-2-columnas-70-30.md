# Arquitectura: Layout 2 columnas (70/30)

## Árbol de componentes

```
<App>                          # src/renderer/App.tsx
  <div#app-container>          # flex container, height: 100vh
    <div#content-panel>        # 70% width, overflow-y: auto
      <!-- vacío, slot para contenido futuro -->
    </div#content-panel>
    <div#agent-panel>          # 30% width, overflow-y: auto
      <!-- vacío, slot para agente futuro -->
    </div#agent-panel>
  </div#app-container>
```

## Reglas de organización

- `src/renderer/App.tsx` — único punto de entrada del layout. Sin lógica interna. Sin estado.
- `src/renderer/components/` — directorio preparado (vacío) para futuros componentes.
- `src/styles/App.css` — estilos exclusivos del layout (flex, widths, padding, border).
- `src/styles/index.css` — estilos globales (tipografía base, reset de body).
- No crear hooks, lib, ipc, services, ni preload api aún.
- No agregar contenido ni placeholder visible dentro de los paneles.

## Contratos de CSS

| Selector | Propiedades clave | Propósito |
|---|---|---|
| `#app-container` | `display: flex; width: 100%; height: 100vh;` | Contenedor raíz full viewport |
| `#content-panel` | `width: 70%; overflow-y: auto;` | Panel izquierdo (slot contenido) |
| `#agent-panel` | `width: 30%; overflow-y: auto; border-left: 1px solid;` | Panel derecho (slot agente) |

## Límites

- `App.tsx` no importa nada de `../components/`, `../hooks/`, ni `../lib/`.
- `App.css` no importa otros CSS.
- `index.html` solo cambia el title. No tocar el div#root.
- `main.tsx` no se modifica.

## Archivos afectados (y qué cambia)

| Archivo | Acción |
|---|---|
| `src/renderer/App.tsx` | Reescribir: eliminar boilerplate, renderizar solo layout |
| `src/styles/App.css` | Reescribir: solo reglas del layout |
| `src/styles/index.css` | Editar: eliminar centrado flex de body, manteniendo reset mínimo |
| `src/renderer/index.html` | Editar: title → "Blog Comp" |

## Design System vinculado

Este layout consume los siguientes elementos de [`specs/design_system.md`](../design_system.md):

| Componente del DS | Rol aquí |
|---|---|
| `App` | Punto de entrada (`src/renderer/App.tsx`) |
| `AppContainer` | `div#app-container` — contenedor raíz flex |
| `ContentPanel` | `div#content-panel` — slot 70% izquierdo |
| `AgentPanel` | `div#agent-panel` — slot 30% derecho |

Los **design tokens** (`--color-border-divider`, `--color-panel-bg`, `--spacing-panel`, etc.)
definen los valores exactos de color, espaciado y layout. Cualquier cambio visual
futuro debe actualizar primero `design_system.md` y luego propagarse a `App.css`.

## No implementar

- Contenido del panel izquierdo
- Agente de IA
- IPC / persistencia
- Estado global
- Routing
- Componentes hijos
