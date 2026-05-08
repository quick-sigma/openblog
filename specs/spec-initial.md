# Toolchain Spec — Desktop App (TS)

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Electron 35+ | Mature desktop runtime. TS first-class. No Rust needed |
| Build | electron-vite 3.x | Vite bundler for main/preload/renderer. HMR. Zero-config TS |
| Language | TypeScript 5.x | Strict mode, project references |
| Package mgr | pnpm 10.x | Fast, strict dep tree, saves disk |
| Renderer | React 19 + React Router | Ubiquitous Electron UI lib. Alternatives: Vue, Svelte, Solid |
| CSS | Tailwind CSS 4 | Utility-first, fast iteration. Or CSS Modules if preferred |
| State | Zustand | Minimal boilerplate, TS-inferred types |
| IPC | electron-trpc or contextBridge + typed channels | Type-safe main↔renderer communication |
| Test | Vitest + React Testing Library | Same Vite pipeline, fast |
| Lint/Format | Biome (TS/JS/CSS) or ESLint + Prettier | Choose Biome for speed (single tool) |
| Packaging | electron-builder (via electron-vite) | Cross-platform builds, auto-update via electron-updater |
| Git Hooks | husky + lint-staged | Pre-commit lint + type-check |

## Project Structure

```
my-app/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json    # main + preload
├── tsconfig.web.json     # renderer
├── src/
│   ├── main/             # Electron main process
│   │   └── index.ts
│   ├── preload/           # preload bridge
│   │   └── index.ts
│   ├── renderer/          # React app
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   └── ...
│   │   └── tailwind.config.ts
│   └── common/            # shared types
│       └── ipc.ts
├── resources/             # icons, assets
└── build/                 # electron-builder config
    └── entitlements.mac.plist
```

## Scripts

```json
{
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "preview": "electron-vite preview",
  "package": "electron-vite build && electron-builder",
  "lint": "biome check src/",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

## Key Decisions

1. **Single renderer** — no multi-window complexity at start. Scale later.
2. **contextBridge + typed channels** — simpler than electron-trpc for solo dev. Use trpc if IPC grows >20 handlers.
3. **Zustand over Redux** — less boilerplate, same TS power.
4. **Tailwind over CSS-in-JS** — faster startup, no runtime cost.
5. **Biome over ESLint + Prettier** — single dep, ~10x faster. Caveat: fewer plugins. Switch if specific ESLint rules needed.

## Next

1. Run init commands above.
2. Install deps: `pnpm add zustand react-router-dom @tanstack/react-query`
3. Setup Tailwind: `pnpm add -D tailwindcss @tailwindcss/vite`
4. Drop this spec as `spec-initial.md` in project root.
