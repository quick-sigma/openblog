![header](https://capsule-render.vercel.app/api?type=waving&color=timeGradient&height=130&section=header&text=Road-Glide/electron-vite-react-ts&fontSize=30&fontColor=ffffff&fontAlign=70&fontAlignY=40)
# electron-vite-react-ts

[![npm version](https://img.shields.io/npm/v/create-electron-vite-react-ts.svg)](https://www.npmjs.com/package/create-electron-vite-react-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/Road-Glide/electron-vite-react-ts/blob/master/LICENSE)
[![CI](https://github.com/Road-Glide/electron-vite-react-ts/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/Road-Glide/electron-vite-react-ts/actions/workflows/ci.yml)
[![Node 20](https://img.shields.io/badge/node-20.x-43853d.svg?logo=node.js&logoColor=white)](https://github.com/Road-Glide/electron-vite-react-ts/blob/master/.github/workflows/ci.yml)
[![Node 22](https://img.shields.io/badge/node-22.x-43853d.svg?logo=node.js&logoColor=white)](https://github.com/Road-Glide/electron-vite-react-ts)

An Electron desktop application built with **React 18** and **TypeScript**.  
It uses **[electron-vite](https://electron-vite.org/)** to build the main, preload, and renderer processes together.  
The baseline includes essential cross-platform desktop capabilities for **Windows, macOS, and Linux** (window lifecycle/state restore, safe IPC bridge, external-link handling, environment-driven startup behavior, and logging).  
It also presents a production-oriented architecture that helps teams design and extend the exact product they want by separating Electron main, preload, and renderer responsibilities clearly.

- Source: [GitHub Repository](https://github.com/Road-Glide/electron-vite-react-ts)
- Issues: [Bug Reports & Feature Requests](https://github.com/Road-Glide/electron-vite-react-ts/issues)
- npm: [create-electron-vite-react-ts](https://www.npmjs.com/package/create-electron-vite-react-ts)


## Create CLI Usage

Publish this package to npm as `create-electron-vite-react-ts`, then bootstrap a new app:

```bash
npx create-electron-vite-react-ts my-desktop-app
cd my-desktop-app
npm install
npm run start # or npm run dev for development mode
```

## Requirements

- **Node.js** — **20.x** or **22.x** (CI uses 20; see `.nvmrc` for the pinned 22.x line)
- **npm** — package manager

## Getting Started

Install dependencies after cloning the repository:

```bash
npm install
```

## npm Scripts

| Command | Description |
|------|------|
| `npm run dev` | Development mode — runs Vite dev server and Electron |
| `npm run build` | Runs TypeScript project reference build, then `electron-vite build` |
| `npm run start` | Preview built output with `electron-vite preview` |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier formatting |
| `npm run clean` | Clean build outputs and cache (`dist`, `release`, etc.) |
| `npm run release` | Run `npm run build`, then package with **electron-builder** |
| `npm run lang` | Switch Windows console code page to UTF-8 (65001) |

> **Note:** Default dev server port is 5173. If occupied, another port (for example 5174) may be selected automatically.

## Project Structure

```text
.
├─ electron/
│  ├─ main.ts              # Main process bootstrap and window lifecycle
│  ├─ preload.ts           # ContextBridge APIs exposed to renderer
│  ├─ ipc.ts               # IPC channel constants and handlers
│  ├─ logger.ts            # Main-process logger (file/console policy)
│  └─ dotenv.ts            # .env parser + shared global typings
├─ src/
│  ├─ renderer/
│  │  ├─ index.html        # Renderer HTML entry (Vite root)
│  │  ├─ main.tsx          # Renderer React bootstrap
│  │  └─ App.tsx           # Root React component
│  ├─ components/          # Recommended shared UI components folder (create when scaling)
│  ├─ stores/              # Recommended state stores folder (create when scaling)
│  ├─ styles/
│  │  ├─ index.css         # Global styles
│  │  └─ App.css           # App-level styles
│  ├─ assets/
│  │  └─ react.svg
│  └─ types/
│     └─ renderer.d.ts     # Window global type declarations
├─ public/                 # Static assets copied by Vite/electron-vite
├─ logs/                   # Runtime logs (dev/non-packaged)
├─ dist/                   # Build output (main/preload/renderer)
├─ release/                # electron-builder artifacts
├─ electron.vite.config.ts
├─ tsconfig.app.json
├─ tsconfig.electron.json
└─ package.json
```

- All build outputs are placed under **`dist/`**: `dist/main/`, `dist/preload/`, and renderer files (`index.html`, `assets/`).
- `package.json` `main` points to Electron entry at **`dist/main/main.js`**.

## Extension Concepts

This project is organized to scale by separating concerns between Electron main, preload bridge, and renderer UI.

- **Renderer feature growth**
  - Add feature folders under `src/renderer/` (for example, `src/renderer/features/<feature-name>/`).
  - Create `src/components/` for reusable presentation/UI components shared across screens.
  - Create `src/stores/` for app-wide state management (for example, auth/session/app settings).
  - Keep visual styles in `src/styles/` or feature-local style files.
  - Keep `main.tsx` as pure bootstrap; avoid placing business logic there.

- **IPC-first desktop capabilities**
  - Define channel names and handlers in `electron/ipc.ts`.
  - Expose minimal, safe APIs in `electron/preload.ts` via `contextBridge`.
  - Consume those APIs in renderer through `window.electronAPI` with typed contracts in `src/types/renderer.d.ts`.
  - Prefer `invoke/handle` for request-response flows; reserve event channels for streaming/push use cases.

- **Main-process service layering**
  - As logic grows, split `electron/main.ts` into domain modules (for example, `electron/services/window-state.ts`, `electron/services/menu.ts`).
  - Keep `main.ts` as orchestration/composition layer.

- **Configuration and environment strategy**
  - Centralize env parsing/defaults in `electron/dotenv.ts`.
  - Add new flags in `.env.example` with clear comments and production-safe defaults.
  - Keep renderer-safe env usage prefixed and explicit.

- **Build and packaging evolution**
  - Renderer root is `src/renderer`, while output is unified under `dist/`.
  - Packaging outputs are isolated in `release/` via `build.directories.output`.
  - Add platform-specific packaging options in `package.json > build` as distribution needs increase.

## Feature Expansion Checklist

When adding a new desktop capability:

1. Add/extend IPC channel and runtime guard in `electron/ipc.ts`.
2. Expose a narrow preload API in `electron/preload.ts`.
3. Add/update renderer global typings in `src/types/renderer.d.ts`.
4. Implement UI flow under `src/renderer/` and styles in `src/styles/`.
5. Validate with `npm run build` and run-time smoke test in `npm run dev`.

## Development Notes

- In development mode, electron-vite passes the renderer URL through **`ELECTRON_RENDERER_URL`** (kept with fallback support for legacy `VITE_DEV_SERVER_URL`).
- If Unicode/Korean output is broken in Windows terminal, run `npm run ko` first and execute commands in the same session.
- Renderer clicks on external `http(s)` links are handled via IPC (`app:open-external`) and opened in the **system default browser**, not inside the app.

## Window State Restore Policy

- **Saved by run mode:** development (with dev server) and production (loading built files) use separate state files.
  - `window-state.development.json`
  - `window-state.production.json`
  - These files are stored in Electron's **`userData`** directory.
- **Save timing:** state is saved **once right before `close`**, not on every move/resize.
- **Saved fields:** absolute position (`x`, `y`), size (`width`, `height`), maximized state, **display ID (`displayId`)**, display-relative offsets (`offsetX`, `offsetY`), and work-area size (`workAreaWidth`, `workAreaHeight`).
- **Restore order:** the window starts with **`show: false`**, then applies saved bounds (or maximize) on `ready-to-show`, and finally calls **`show()`** to reduce flicker and first-paint size jumps.
- **Multi-monitor behavior:** if the saved monitor is unavailable, it can fall back to primary display. If the same display ID is still valid, saved bounds are prioritized.
- **Minimized state is not restored** to avoid launching into an invisible window.

## SCREEN_CENTER by Run Mode

- `SCREEN_CENTER` is read from `.env` (or `process.env`) and applies in both development and production.
- The centering decision runs during startup before the first `show()` and only when all conditions are met:
  - `SCREEN_CENTER=true`
  - window is not maximized
  - window size is smaller than the target display work area
- Because window-state is separated by run mode, centering can lead to different visible results:
  - **Development mode:** uses `window-state.development.json`
  - **Production mode:** uses `window-state.production.json`
  - If the two mode files store different size/position history, startup placement can differ by mode even with the same `SCREEN_CENTER` value.

## Electron Menu Visibility

- Menu visibility is controlled by `ELECTRON_MENU_ENABLED`.
- Default behavior is `true` (menu is visible).
- Set `ELECTRON_MENU_ENABLED=false` to hide the application menu via `Menu.setApplicationMenu(null)` at app startup.
- This setting is applied in the main process during `app.whenReady()`.
- Note: hiding the top menu mostly affects Windows/Linux UX; on macOS, global menu-bar conventions still apply at OS level.

## Logging (`logs/`)

- Main process logging (`logger.ts`) can write daily logs to project root as **`logs/system.YYYYMMDD.log`**.
- **Development mode:** writes to both console and file.
- **Production mode (non-packaged):** writes to file only.
- **Packaged app (`app.isPackaged`):** file logging is disabled.

## DevTools in Development

- In development mode (when loading renderer from Vite dev server), the main process opens **DevTools** automatically.
- In production build mode (loading from `dist`), DevTools is not opened automatically.

## Release Packaging

```bash
npm run release
```

- This project sets `build.directories.output` to `release` in `package.json`.
- Packaging artifacts are generated under root **`release/`**.
- For platform-specific options, extend the `build` field using the [electron-builder docs](https://www.electron.build/).

---

## Tech Stack

- **Runtime:** Electron 39.8.5
- **Bundler / Dev:** Vite 6, electron-vite 5
- **UI:** React 18, TypeScript 5.x
- **Quality:** ESLint 9, Prettier 3
- **Packaging:** electron-builder 26

![footer](https://capsule-render.vercel.app/api?type=waving&color=timeGradient&height=70&section=footer)
