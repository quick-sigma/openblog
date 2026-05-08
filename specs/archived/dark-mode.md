# Dark Mode — Arquitectura

## Capas del sistema

```
┌─────────────────────────────────────────────────────┐
│  Bootstrap Layer   index.html inline script          │
│  (sin framework, DOM puro, antes del primer paint)   │
├─────────────────────────────────────────────────────┤
│  Provider Layer    ThemeContext.tsx                   │
│  (Context + estado + persistencia + API pública)     │
├─────────────────────────────────────────────────────┤
│  Presentation Layer   ThemeToggler + CSS variables   │
│  (componente React + design tokens por clase .dark)  │
└─────────────────────────────────────────────────────┘
```

## Estructura de archivos

```
src/
├── renderer/
│   ├── index.html                 ← bootstrap script inline en <head>
│   ├── main.tsx                   ← envuelve <App> con <ThemeProvider>
│   ├── App.tsx                    ← importa <ThemeToggler />, lo coloca
│   ├── context/
│   │   └── ThemeContext.tsx        ← ThemeProvider + useTheme hook
│   ├── components/
│   │   ├── ThemeToggler.tsx        ← botón ☀/☾ fixed top-right
│   │   └── .gitkeep
│   └── __tests__/
│       ├── App.test.tsx
│       └── ThemeToggler.test.tsx
└── styles/
    └── App.css                    ← :root + .dark + estilos de .theme-toggler
```

## Contratos de datos

### Tipos

```ts
type Theme = 'light' | 'dark'
```

### Constantes

```ts
const STORAGE_KEY = 'theme'        // clave en localStorage
```

### Contexto

```ts
interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
}
```

### Hook público

```ts
// Llamado desde cualquier componente hijo de <ThemeProvider>
function useTheme(): ThemeContextValue
// Lanza error si se usa fuera del provider
```

## Flujo de datos

```
[Boot: index.html]
  │
  ├── leer localStorage.getItem('theme')
  │   ├── existe 'dark'   → html.classList.add('dark')
  │   └── existe 'light'  → no hacer nada (light es default)
  │
  └── no existe localStorage
      └── matchMedia('(prefers-color-scheme: dark)').matches
          ├── true  → html.classList.add('dark')
          └── false → no hacer nada
  │
  ▼
[React: main.tsx → ThemeProvider → mount]
  │
  ├── leer localStorage.getItem('theme')
  │   ├── existe  → usar ese valor (light | dark)
  │   └── no existe → detectar system con matchMedia, escribir en localStorage
  │
  ├── sincronizar html.classList (add/remove 'dark')
  │
  └── proveer { theme, toggleTheme, isDark }
      │
      └── App → ThemeToggler (consume hook, renderiza icono)
  │
  ▼
[Toggle click → toggleTheme()]
  │
  ├── invertir theme (light ⇄ dark)
  ├── localStorage.setItem('theme', nuevoValor)
  ├── html.classList.toggle('dark')
  └── todos los componentes hijos se re-renderizan vía context
```

## Design tokens (CSS variables)

### Light (`:root`) — valores base

```css
--color-body-bg:         #ffffff
--color-panel-bg:        #f9fafb     ← existente
--color-text:            #111827
--color-text-muted:      #6b7280
--color-border-divider:  #e5e7eb     ← existente
--color-border-subtle:   #d1d5db
```

### Dark (`.dark`) — override por especificidad

```css
--color-body-bg:         #0f0f1a
--color-panel-bg:        #1a1a2e
--color-text:            #e2e2e8
--color-text-muted:      #9e9eb0
--color-border-divider:  #2a2a3d
--color-border-subtle:   #35354a
```

### Reglas de uso

- Todo color en la app debe referenciar `var(--color-*)`. Prohibido valores literales en `color`, `background`, `border-color`, `box-shadow`, etc.
- El selector `.dark` se aplica sobre `html`. No usar `.dark` en `body` ni en contenedores.
- `--color-body-bg` se asigna al `body` (o `#app-container` como raíz visible).
- `--color-text` se asigna al `body` (herencia natural).
- `--color-border-subtle` se usa para hover, focus, o borders secundarios.

## Límites de módulos

| Módulo | Responsabilidad | No debe |
|---|---|---|
| `index.html` inline script | Aplicar clase `dark` antes del render. Leer localStorage y matchMedia. | No escribir localStorage. No importar módulos. No usar React. |
| `ThemeContext.tsx` | Estado reactivo del tema. Persistencia en localStorage. Sincronización de `html.classList`. Proveer `toggleTheme()`. | No renderizar UI directa. No importar componentes. |
| `ThemeToggler.tsx` | Renderizar botón ☀/☾. Consumir `useTheme()`. Posición fixed top-right 12px/16px con z-index 9999. | No manejar persistencia. No tocar DOM fuera de su template. |
| `App.tsx` | Layout de paneles. Colocar `<ThemeToggler />`. | No contener lógica de theming. |
| `App.css` | Definir design tokens en `:root` y `.dark`. Estilos de `.theme-toggler`. | No definir valores de color literales fuera de variables. |

## Reglas de organización

1. **Context antes que hooks.** La lógica de estado global (tema) vive en `context/`, no en `hooks/`. Carpeta `hooks/` se omite si no hay hooks desacoplados del context.
2. **Un provider por concern.** `ThemeProvider` se importa en `main.tsx` y envuelve a `<App />`.
3. **Componentes atómicos.** `<ThemeToggler />` es un componente autónomo sin conexión a nada que no sea `useTheme()`.
4. **CSS agnóstico al framework.** Las variables CSS son el único contrato entre JS y estilos. React no aplica estilos inline de color.

## Flujo de inicialización (race condition)

```
Tiempo:
1. index.html script     → escribe clase en html  ← PRIMER PAINT
2. main.tsx              → carga React y monta ThemeProvider
3. ThemeProvider mount   → hook lee localStorage
4.                         sincroniza html.classList  ← RE-CONCILIACIÓN

El paso 1 garantiza que el primer paint ya tiene el tema correcto.
El paso 4 puede cambiar la clase si hubo un cambio de sistema entre cargas,
pero como la clase ya estaba, no hay flash.
```

---

## Architectural decisions

### AD-01: ThemeToggler como componente separado

**Contexto:** El spec original colocaba el botón toggle inline en `App.tsx`.

**Decisión:** Extraer a `src/renderer/components/ThemeToggler.tsx`.

**Consecuencias:**
- App no necesita conocer detalles de theming (solo importa y coloca).
- ThemeToggler es testeable de forma aislada.
- Si aparecen más componentes de theming (selector de fuente, modo daltónico), siguen el mismo patrón.

### AD-02: Context en vez de hook local

**Contexto:** Solo App usa el tema hoy. Futuros componentes en content-panel y agent-panel también lo necesitarán.

**Decisión:** Implementar `ThemeContext` con `ThemeProvider` en `main.tsx`. El hook `useTheme()` es simplemente `useContext(ThemeContext)`.

**Consecuencias:**
- Cualquier componente hijo accede al tema sin prop drilling.
- Coste: un wrapper adicional en `main.tsx`. Cero impacto en rendimiento (el tema cambia una vez por click, no por frame).
- El día que se necesite en subárboles, ya está listo.

### AD-03: CSS variables como único contrato visual

**Contexto:** El dark mode necesita cambiar colores en toda la app.

**Decisión:** Definir 6 design tokens (body, panel, text, text-muted, border, border-subtle) en `:root` y sobrescribirlos dentro de `.dark`. Prohibido hardcodear colores fuera de estas variables.

**Consecuencias:**
- Cambiar la paleta futura requiere tocar solo las variables, no buscar literales.
- Archivos CSS nuevos deben usar `var(--color-*)` desde el inicio.
- `--color-text-muted` y `--color-border-subtle` cubren casos secundarios sin necesidad de refactor posterior.

### AD-04: Anti-flash script en index.html

**Contexto:** Leer localStorage en React (post-mount) causa un parpadeo del tema claro antes de aplicar el oscuro.

**Decisión:** Inyectar script síncrono en `<head>` de `index.html`, antes de cualquier CSS o bundle. El script solo lee y aplica clase `dark`, nunca escribe.

**Consecuencias:**
- El primer paint ya tiene la clase correcta en `<html>`.
- El script es <10 líneas, cero dependencias, cero impacto en bundle.
- El hook de React toma el control después del mount y puede re-sincronizar si cambió `prefers-color-scheme` entre la lectura del script y el mount.

---

## Design System vinculado

Esta arquitectura consume los siguientes elementos de [`specs/design_system.md`](../design_system.md):

| Elemento del DS | Rol aquí |
|---|---|
| `ThemeToggler` | Componente visual que renderiza el botón ☀/☾. Consume `useTheme()`. |
| `--color-body-bg` | Asignado al `body`. Cambia entre `#ffffff` y `#0f0f1a`. |
| `--color-panel-bg` | Fondo de paneles. Cambia entre `#f9fafb` y `#1a1a2e`. |
| `--color-text` | Color de texto principal. Cambia entre `#111827` y `#e2e2e8`. |
| `--color-text-muted` | Color de texto secundario. Cambia entre `#6b7280` y `#9e9eb0`. |
| `--color-border-divider` | Borde divisor entre paneles. Cambia entre `#e5e7eb` y `#2a2a3d`. |
| `--color-border-subtle` | Bordes de hover/focus. Cambia entre `#d1d5db` y `#35354a`. |
| `--transition-theme` | Transición global de colores (300ms ease). |
| `--transition-icon` | Rotación del icono en toggle (400ms ease). |

**Normas de diseño que aplican:** N1, N2, N3, N4, N5, N6, N7 (ver §4 de `design_system.md`).

**Reglas de consumo relevantes:** R1 (feature components), R6, R7, R8 (ver §3 de `design_system.md`).

---

## Implementation details

### Archivos creados

| Archivo | Propósito |
|---|---|
| `src/renderer/context/ThemeContext.tsx` | `ThemeProvider` + `useTheme()` hook. Estado reactivo, persistencia en localStorage, sincronización de `html.classList`. |
| `src/renderer/components/ThemeToggler.tsx` | Botón fixed top-right con icono ☀/☾. Consume `useTheme()`. Sin lógica de persistencia. |
| `src/renderer/__tests__/ThemeContext.test.tsx` | 6 tests: valores por defecto, lectura localStorage, toggle, persistencia, sincronización classList, error sin provider. |
| `src/renderer/__tests__/ThemeToggler.test.tsx` | 6 tests: render, iconos, click toggle, tooltip, tabIndex, accesibilidad. |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/renderer/index.html` | Script inline síncrono en `<head>` que lee localStorage/matchMedia y aplica `.dark` antes del primer paint (anti-flash, N3). |
| `src/renderer/main.tsx` | Envuelve `<App />` con `<ThemeProvider>`. |
| `src/renderer/App.tsx` | Importa y renderiza `<ThemeToggler />`. |
| `src/styles/App.css` | 6 design tokens en `:root` + overrides en `.dark` + estilos `.theme-toggler` (hover, focus, active, spin animation). |
| `src/styles/index.css` | Body usa `--color-body-bg` y `--color-text` en vez de literales. Transición vía `--transition-theme`. |
| `src/test/setup.ts` | Inyecta todos los tokens (light + dark). Mock de `matchMedia`. |
| `src/renderer/__tests__/App.test.tsx` | Envuelve `<App />` con `<ThemeProvider>` para evitar error de contexto. |

### Resultados de validación

- **Tests:** 19/19 passing (3 suites: App, ThemeContext, ThemeToggler)
- **Linter:** 0 errors, 1 warning (react-refresh/only-export-components — intencional, ver AD-02)
- **TypeScript:** `tsc -b` sin errores
