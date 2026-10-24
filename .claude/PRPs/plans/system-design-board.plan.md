# Plan: SDB — System Design Board

## Summary
A local-first web app for sketching system designs on a hand-drawn infinite canvas. It wraps the Excalidraw editor (MIT) in a small app shell that adds multiple saved boards, a palette of system-design components (service, database, queue, and so on) you can click or drag onto the canvas, and a "sketch shelf" for importing photos or scans of paper sketches and reusing them across boards. Everything is stored in the browser's IndexedDB, with backup and restore to a single JSON file.

## User Story
As someone who designs systems by sketching, I want a whiteboard that keeps all my boards, gives me ready-made architecture components in a hand-drawn style, and lets me drop in photos of my paper sketches, so that my rough design work lives in one place I can reopen, extend, and export.

## Problem → Solution
Sketches scattered across paper, photos, and one-off whiteboard tabs that are lost when closed → one local app at `localhost` with a list of persistent boards, a typed component palette, imported sketches, and PNG/SVG/.excalidraw export.

## Metadata
- **Complexity**: Large (new project, about 30 files, new dependency surface)
- **Source PRD**: N/A (free-form request plus four scoping answers)
- **PRD Phase**: N/A
- **Estimated Files**: 34 created
- **Decisions from the user**: diagrams and sketches together; hand-drawn whiteboard look; local web app; single user.

---

## UX Design

### Before
```
┌──────────────────────────────────────────────┐
│  Paper sketches + phone photos + an          │
│  excalidraw.com tab that holds ONE scene in  │
│  localStorage. No board list, no system-     │
│  design shapes, photos live in camera roll.  │
└──────────────────────────────────────────────┘
```

### After
```
┌─────────────┬────────────────────────────────────────────────┐
│ [search   ] │ ≡  Checkout flow            Saved 14:05   ◐    │  top bar 52px
│ [New board] ├────────────────────────────────────┬───────────┤
│             │                                    │Components │
│ ▣ Checkout  │   (client)──▶<LB>──▶[service]──▶   │ Sketches  │  Excalidraw Sidebar
│   flow  2m  │                        │      ⌸DB  │ ┌──┐ ┌──┐ │  (docked, 2 tabs)
│ ▢ Chat sys  │                        ▼           │ │  │ │  │ │
│   1d        │                    [|||queue|||]   │ └──┘ └──┘ │
│ ▢ Feed      │   [photo of paper sketch]          │ Edge      │
│   3d        │                                    │ Compute...│
│             │   Excalidraw toolbar, hand-drawn   │           │
└─────────────┴────────────────────────────────────┴───────────┘
  rail 264px            canvas (fills)                 sidebar
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Open app | Blank scene | Last active board restored, viewport included | `localStorage['sdb.activeBoard']` |
| Multiple boards | One scene per browser | Rail with create, rename, duplicate, delete, search, thumbnails | IndexedDB |
| Add an architecture part | Draw boxes by hand | Click a palette tile (inserts at viewport center) or drag it to a spot | Labeled, tier-colored, grouped, tagged `customData.sdb` |
| Paper sketches | Camera roll | Shelf tab: drop or choose files; downscaled, deduped, reusable | Pasted and dropped images join the shelf too |
| Export | n/a | Excalidraw's own Save as image (PNG/SVG, with embedded scene) and Save to disk (.excalidraw) | Built-in dialogs, not reimplemented |
| Import | Replaces the current scene | Becomes a NEW board (menu item, or dropping a `.excalidraw` file) | Prevents overwriting a board by accident |
| Safety | None | Autosave (400ms debounce), Download backup, Restore from backup, `navigator.storage.persist()` | |
| Theme | Excalidraw toggle | App-level light/dark/system toggle, passed to Excalidraw | |

---

## Mandatory Reading

The project folder is empty, so there's no existing code to mirror. Read these before implementing:

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `DESIGN.md` | all | Tokens, component specs, motion, and the Excalidraw theming bridge. Every UI task follows it. |
| P0 | `node_modules/@excalidraw/excalidraw/dist/types/excalidraw/index.d.ts` | all | The definitive list of public exports (checked for 0.18.1, see "Research findings" below) |
| P0 | `node_modules/@excalidraw/excalidraw/dist/types/excalidraw/types.d.ts` | search `ExcalidrawImperativeAPI`, `BinaryFileData`, `UIOptions`, `ExcalidrawProps` | API methods and props |
| P0 | `node_modules/@excalidraw/excalidraw/dist/types/excalidraw/data/transform.d.ts` | all | `ExcalidrawElementSkeleton`: which fields the `label`, `image`, and `line` skeletons accept |
| P1 | `node_modules/@excalidraw/excalidraw/dist/types/excalidraw/data/restore.d.ts` | all | `restore` signature for loading stored scenes |
| P1 | `node_modules/@excalidraw/excalidraw/dist/prod/index.css` | search `--color-primary`, `--ui-font` | Confirm the CSS variable names before overriding them |
| P2 | `node_modules/@excalidraw/excalidraw/dist/types/excalidraw/constants.d.ts` | search `FONT_FAMILY`, `ROUNDNESS` | Numeric values behind the constants |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Install | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation | `npm i react react-dom @excalidraw/excalidraw`. The container must have non-zero width and height. Fonts load from a CDN unless you self-host and set `window.EXCALIDRAW_ASSET_PATH`. |
| Integration | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration | `import "@excalidraw/excalidraw/index.css"`. Client-only rendering (no SSR concern for Vite). |
| Skeleton API | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton | `convertToExcalidrawElements(skeletons, { regenerateIds })`. `label` makes a bound text container. Arrows bind with `start: { id }`. |
| Imperative API | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api | Store the API from the `excalidrawAPI` callback. `updateScene`, `addFiles`, `getSceneElements`, `getAppState`, `getFiles`, `setActiveTool`, `scrollToContent`, `setToast`. |
| Export utils | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export | `exportToBlob({ elements, appState, files, mimeType, quality, maxWidthOrHeight })`, `exportToSvg({...})` |
| Sidebar | https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/sidebar | `<Sidebar name docked onDock>`, `Sidebar.Header`, `Sidebar.Tabs`, `Sidebar.Tab`, `Sidebar.TabTriggers`, `Sidebar.TabTrigger`, `Sidebar.Trigger` |
| npm registry | https://registry.npmjs.org/@excalidraw/excalidraw/latest | Latest is `0.18.1`, `"type": "module"`, peer React `^17.0.2 \|\| ^18.2.0 \|\| ^19.0.0`, CSS export `./index.css` |

### Research findings

```
KEY_INSIGHT: 0.18.1 is ESM-only ("type": "module") and ships CSS separately at "@excalidraw/excalidraw/index.css".
APPLIES_TO: Task 2 (mount)
GOTCHA: Forgetting the CSS import renders an unstyled, broken toolbar with no error.

KEY_INSIGHT: Type subpaths resolve through the exports map "./*" -> "./dist/types/excalidraw/*.d.ts".
APPLIES_TO: every file importing types
GOTCHA: Use `@excalidraw/excalidraw/types` (AppState, BinaryFiles, BinaryFileData, ExcalidrawImperativeAPI, ExcalidrawProps),
        `@excalidraw/excalidraw/element/types` (ExcalidrawElement, FileId), `@excalidraw/excalidraw/data/transform` (ExcalidrawElementSkeleton).
        If a subpath doesn't resolve, derive the type from the API instead, e.g.
        `type SceneElement = ReturnType<ExcalidrawImperativeAPI["getSceneElements"]>[number]`.

KEY_INSIGHT: serializeAsJSON(elements, appState: Partial<AppState>, files: BinaryFiles, type: "local" | "database"): string. Positional, NOT the object form shown in the docs.
APPLIES_TO: Task 4 (storage), Task 10 (backup)
GOTCHA: "local" strips non-exportable appState (scroll and zoom are dropped), so persist the viewport separately.

KEY_INSIGHT: addFiles takes an ARRAY: addFiles(data: BinaryFileData[]).
APPLIES_TO: Task 5 (load), Task 9 (shelf insert)

KEY_INSIGHT: BinaryFileData = { mimeType, id: FileId, dataURL: DataURL, created: number, lastRetrieved?: number, version?: number }.
APPLIES_TO: Task 4 (files store), Task 9

KEY_INSIGHT: renderTopRightUI?: (isMobile: boolean, appState: UIAppState) => JSX.Element | null
APPLIES_TO: Task 8 (sidebar trigger)

KEY_INSIGHT: UIOptions.canvasActions keys: changeViewBackgroundColor, clearCanvas, export, loadScene, saveToActiveFile, toggleTheme, saveAsImage. UIOptions.tools.image toggles the image tool.
APPLIES_TO: Task 10 (menu), Task 11 (theme)

KEY_INSIGHT: Exports confirmed in 0.18.1 index.d.ts: convertToExcalidrawElements, exportToBlob, exportToSvg, exportToCanvas,
        serializeAsJSON, loadFromBlob, restore, restoreElements, getSceneVersion, hashElementsVersion,
        viewportCoordsToSceneCoords, sceneCoordsToViewportCoords, FONT_FAMILY, ROUNDNESS, MIME_TYPES, THEME,
        CaptureUpdateAction, getNonDeletedElements, getDataURL, MainMenu, Sidebar, Footer, WelcomeScreen, DefaultSidebar.
APPLIES_TO: all tasks. Don't import anything outside this list without checking index.d.ts first.
```

---

## Patterns to Mirror

No existing code: greenfield. These are the conventions to establish in Task 1 and follow from then on. They're defined here, not invented mid-implementation.

### NAMING_CONVENTION
```
Files: React components in PascalCase.tsx (BoardRail.tsx); hooks in camelCase starting with "use" (useAutosave.ts);
       plain modules in camelCase.ts (boards.ts, toSkeleton.ts). Tests sit next to source as *.test.ts(x).
Exports: named exports only. No default exports (except vite.config.ts and eslint.config.js).
Types: PascalCase, in src/types.ts when shared, co-located otherwise. Prefer `type` over `interface` unless extending.
CSS: one global tokens.css (custom properties from DESIGN.md) plus co-located *.module.css per component.
Storage keys: "meta:{id}", "scene:{id}", "thumb:{id}" in the boards store; file id as the key in the files store.
localStorage keys: "sdb.activeBoard", "sdb.theme", "sdb.railOpen". Per-viewer conveniences only, every access wrapped in try/catch.
```

### ERROR_HANDLING
```ts
// Storage functions throw. UI boundaries catch and translate into user-facing state.
// src/storage/errors.ts
export class StorageError extends Error {
  constructor(message: string, readonly cause: unknown, readonly kind: "quota" | "unavailable" | "unknown") {
    super(message);
    this.name = "StorageError";
  }
}
export function toStorageError(err: unknown): StorageError {
  const name = (err as { name?: string })?.name;
  if (name === "QuotaExceededError") return new StorageError("Storage is full", err, "quota");
  if (name === "InvalidStateError" || name === "UnknownError") return new StorageError("Storage unavailable", err, "unavailable");
  return new StorageError("Storage error", err, "unknown");
}
// Callers: try { await saveScene(...) } catch (e) { setStatus({ kind: "error", error: toStorageError(e) }) }
// Never swallow: every catch either sets visible state or rethrows.
```

### LOGGING_PATTERN
```ts
// No logging framework. Use console.warn/console.error only at catch sites with an "[sdb]" prefix.
// No console.log left in committed code (the lint rule enforces this).
console.error("[sdb] saveScene failed", { boardId, err });
```

### REPOSITORY_PATTERN
```ts
// src/storage/db.ts. One idb-keyval store per DATABASE (idb-keyval can't safely hold two stores in one DB).
import { createStore } from "idb-keyval";
export const boardsStore = createStore("sdb-boards", "kv");
export const filesStore = createStore("sdb-files", "kv");
// src/storage/boards.ts exposes plain async functions (no classes):
// listBoards, createBoard, loadScene, saveScene, saveViewport, renameBoard, duplicateBoard, deleteBoard, saveThumbnail, getThumbnails
```

### SERVICE_PATTERN
```ts
// React state lives in hooks; components stay presentational where they can.
// useBoards(): { boards, activeId, create, rename, duplicate, remove, select, refresh, loading, error }
// useAutosave(boardId): { onChange, status, flush }
// No global state library. App.tsx owns the top-level state and passes props down. One level of props is fine;
// add context only if a value has to cross more than 2 levels.
```

### TEST_STRUCTURE
```ts
// Vitest. Pure modules and storage run in "node" with fake-indexeddb; components run in "jsdom".
// src/storage/boards.test.ts
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clear } from "idb-keyval";
import { boardsStore, filesStore } from "./db";
import { createBoard, listBoards } from "./boards";

beforeEach(async () => { await clear(boardsStore); await clear(filesStore); });

describe("createBoard", () => {
  it("lists a new board first", async () => {
    const a = await createBoard({ name: "A" });
    const b = await createBoard({ name: "B" });
    expect((await listBoards()).map((m) => m.id)).toEqual([b.id, a.id]);
  });
});
// Component tests: // @vitest-environment jsdom at the top of the file, @testing-library/react, user-event.
// Don't render <Excalidraw> in jsdom (it needs canvas and text measurement). Verify canvas behavior in the browser.
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.gitignore` | CREATE | node_modules, dist, public/fonts (generated), coverage |
| `package.json` | CREATE | Dependencies and scripts (Task 1) |
| `tsconfig.json` | CREATE | Strict TS, bundler resolution, noEmit |
| `vite.config.ts` | CREATE | React plugin plus Vitest config |
| `eslint.config.js` | CREATE | typescript-eslint, react-hooks, no-console (allow warn/error) |
| `index.html` | CREATE | Root element; sets `window.EXCALIDRAW_ASSET_PATH = "/"` before any module loads |
| `scripts/copy-excalidraw-assets.mjs` | CREATE | Copies `node_modules/@excalidraw/excalidraw/dist/prod/fonts` to `public/fonts` for offline use |
| `src/main.tsx` | CREATE | Imports fonts, Excalidraw CSS, and tokens; renders `<App/>` |
| `src/vite-env.d.ts` | CREATE | Vite client types plus `Window.EXCALIDRAW_ASSET_PATH` |
| `src/types.ts` | CREATE | BoardMeta, StoredScene, StoredFile, Viewport, SaveStatus, ThemePref |
| `src/styles/tokens.css` | CREATE | CSS custom properties from DESIGN.md (light, dark, Excalidraw bridge) |
| `src/styles/app.css` | CREATE | Shell grid, resets, focus rings, reduced motion |
| `src/App.tsx` | CREATE | Shell composition, active board, theme, rail state |
| `src/storage/db.ts` | CREATE | idb-keyval stores |
| `src/storage/errors.ts` | CREATE | StorageError, toStorageError |
| `src/storage/boards.ts` | CREATE | Board CRUD |
| `src/storage/files.ts` | CREATE | Sketch/file store, shelf listing, reference guard |
| `src/storage/backup.ts` | CREATE | Export/import of the whole workspace |
| `src/storage/boards.test.ts` | CREATE | CRUD tests |
| `src/storage/files.test.ts` | CREATE | Dedupe and reference-guard tests |
| `src/storage/backup.test.ts` | CREATE | Round-trip test |
| `src/lib/naming.ts` (+ `.test.ts`) | CREATE | `nextBoardName`, `formatRelative` |
| `src/lib/geometry.ts` (+ `.test.ts`) | CREATE | `sceneCenter(appState)`, `fitWithin(w, h, max)` |
| `src/board/BoardCanvas.tsx` | CREATE | Excalidraw wrapper: load, menu, sidebar, drop handling |
| `src/board/useAutosave.ts` | CREATE | Debounced save, file persistence, thumbnails, flush |
| `src/board/insert.ts` | CREATE | `insertSkeletons(api, skeletons)` shared by palette and shelf |
| `src/palette/catalog.ts` | CREATE | 17 component definitions |
| `src/palette/toSkeleton.ts` (+ `.test.ts`) | CREATE | Definition plus origin to skeleton list |
| `src/palette/ComponentPalette.tsx` (+ `.module.css`) | CREATE | Tile grid with SVG previews, click and drag |
| `src/sketches/importSketch.ts` (+ `.test.ts` for pure parts) | CREATE | Validate, downscale, hash, store |
| `src/sketches/SketchShelf.tsx` (+ `.module.css`) | CREATE | Drop zone, grid, insert, remove |
| `src/shell/BoardRail.tsx` (+ `.module.css`, `.test.tsx`) | CREATE | Board list UI |
| `src/shell/TopBar.tsx` (+ `.module.css`) | CREATE | Name editor, save status, theme toggle |
| `src/shell/ConfirmDialog.tsx` | CREATE | Native `<dialog>` delete confirmation |
| `src/shell/EmptyState.tsx` | CREATE | "No boards yet" composition |
| `src/hooks/useBoards.ts` | CREATE | Board list state |
| `src/hooks/useTheme.ts` | CREATE | light / dark / system, persisted |

## NOT Building

- Real-time collaboration, live cursors, share links, accounts, or any server.
- Cloud sync. Data lives only in this browser's IndexedDB, plus manual backup files.
- AI diagram generation (Excalidraw's TTD / text-to-diagram dialog stays off).
- Board templates (for example "URL shortener starter"). Candidate for v2.
- Version history beyond Excalidraw's in-session undo/redo.
- Custom PNG/SVG exporters. Excalidraw's built-in dialogs cover them.
- PWA install or a service worker.
- Folders or tags for boards.
- A Playwright end-to-end suite. Canvas flows are checked manually in the browser for v1.
- HEIC decoding.

---

## Step-by-Step Tasks

### Task 1: Scaffold the project
- **ACTION**: Create the project by hand. Don't run `npm create vite`, because the folder already holds `DESIGN.md` and `.claude/`, which makes create-vite prompt interactively.
- **IMPLEMENT**:
  - `git init` (no commit yet).
  - `package.json`: `"name": "sdb"`, `"private": true`, `"type": "module"`, and these scripts:
    ```json
    {
      "predev": "node scripts/copy-excalidraw-assets.mjs",
      "dev": "vite",
      "prebuild": "node scripts/copy-excalidraw-assets.mjs",
      "build": "tsc --noEmit && vite build",
      "preview": "vite preview",
      "typecheck": "tsc --noEmit",
      "lint": "eslint .",
      "test": "vitest run",
      "test:watch": "vitest"
    }
    ```
  - Install:
    ```bash
    npm i react react-dom @excalidraw/excalidraw@0.18.1 idb-keyval nanoid lucide-react @fontsource-variable/geist @fontsource-variable/geist-mono
    npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest jsdom fake-indexeddb @testing-library/react @testing-library/user-event @testing-library/jest-dom eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals
    ```
  - `tsconfig.json`: `target ES2022`, `lib ["ES2023","DOM","DOM.Iterable"]`, `module ESNext`, `moduleResolution bundler`, `jsx react-jsx`, `strict true`, `noUncheckedIndexedAccess true`, `noEmit true`, `skipLibCheck true`, `types ["vite/client", "vitest/globals"]`, `include ["src", "vite.config.ts"]`.
  - `vite.config.ts`: `plugins: [react()]`, `test: { environment: "node", css: false }`.
  - `eslint.config.js`: flat config with `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks` recommended, `no-console: ["error", { allow: ["warn", "error"] }]`, ignore `dist`, `public/fonts`.
  - `.gitignore`: `node_modules/`, `dist/`, `public/fonts/`, `coverage/`, `*.local`.
- **MIRROR**: NAMING_CONVENTION
- **GOTCHA**: Pin `@excalidraw/excalidraw` to exactly `0.18.1` (no caret). Pre-1.0 minor releases have broken the API before (the ref → excalidrawAPI change in 0.17; ESM-only and the separate CSS in 0.18).
- **VALIDATE**: `npm run typecheck` passes on an empty `src/main.tsx` stub; `npx eslint --version` prints.

### Task 2: Mount Excalidraw full-screen with self-hosted fonts
- **ACTION**: Get a working, offline-capable canvas before building anything around it.
- **IMPLEMENT**:
  - `scripts/copy-excalidraw-assets.mjs`:
    ```js
    import { cpSync, existsSync } from "node:fs";
    import { fileURLToPath } from "node:url";
    const src = fileURLToPath(new URL("../node_modules/@excalidraw/excalidraw/dist/prod/fonts", import.meta.url));
    const dest = fileURLToPath(new URL("../public/fonts", import.meta.url));
    if (!existsSync(src)) { console.error("[sdb] Excalidraw fonts not found at", src); process.exit(1); }
    cpSync(src, dest, { recursive: true });
    ```
  - `index.html`: `<div id="root"></div>`, and in `<head>` before the module script: `<script>window.EXCALIDRAW_ASSET_PATH = "/";</script>`. Title "SDB".
  - `src/vite-env.d.ts`: `/// <reference types="vite/client" />` plus `declare global { interface Window { EXCALIDRAW_ASSET_PATH?: string } } export {};`
  - `src/main.tsx`: import `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@excalidraw/excalidraw/index.css`, `./styles/tokens.css`, `./styles/app.css`, then `createRoot(...).render(<StrictMode><App/></StrictMode>)`.
  - A temporary `App.tsx` that renders `<div style={{ height: "100dvh" }}><Excalidraw /></div>`.
- **IMPORTS**: `import { Excalidraw } from "@excalidraw/excalidraw";`
- **GOTCHA**: Fonts resolve to `${EXCALIDRAW_ASSET_PATH}fonts/...`, so the copy target must be `public/fonts`. The inline script must run before the module graph, which is why it lives in `index.html` and not in `main.tsx`. If Vite reports `process is not defined`, add `define: { "process.env.IS_PREACT": JSON.stringify("false") }` to `vite.config.ts`.
- **VALIDATE**: `npm run dev`, open http://localhost:5173. Draw a rectangle with text. In the DevTools Network tab, font requests go to `localhost:5173/fonts/...` and none go to a CDN.

### Task 3: Design tokens and app shell
- **ACTION**: Turn DESIGN.md into CSS and build the static shell grid.
- **IMPLEMENT**:
  - `tokens.css`: `:root` holds the light tokens (`--paper #FAFAFA`, `--sheet #FFFFFF`, `--ink #18181B`, `--pencil #71717A`, `--rule #E4E4E7`, `--wash #F4F4F5`, `--accent #1F7A8C`, `--accent-wash #E3F1F4`, `--danger #B42318`, `--font-ui "Geist Variable", ui-sans-serif, sans-serif`, `--font-mono "Geist Mono Variable", ui-monospace, monospace`, `--ease cubic-bezier(0.22, 1, 0.36, 1)`, radii, spacing). Dark values go in `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` AND in `:root[data-theme="dark"] { ... }`. Paste the Excalidraw bridge block from DESIGN.md §7 verbatim.
  - `app.css`: `body { margin:0; background: var(--paper); color: var(--ink); font: 14px/20px var(--font-ui); }`; `.shell { display:grid; grid-template-columns: var(--rail-w, 264px) minmax(0,1fr); grid-template-rows: 52px minmax(0,1fr); min-height:100dvh; height:100dvh; }`; `.rail { grid-row: 1 / span 2 }`; `.canvas { min-width:0; min-height:0; position:relative }`; `:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px }`; a reduced-motion block.
  - App.tsx renders `<div class="shell">` with placeholder rail, top bar, and canvas cells, with Excalidraw inside `.canvas`.
- **MIRROR**: DESIGN.md §2, §5, §7
- **GOTCHA**: Grid children default to `min-width: auto`, so without `minmax(0,1fr)` and `min-width: 0` the Excalidraw canvas overflows. Check the CSS variable names against `dist/prod/index.css` before trusting the bridge block.
- **VALIDATE**: The selected tool in Excalidraw's toolbar is teal, not violet. Resizing the window never produces horizontal scroll. Toggling the OS dark mode switches the chrome colors.

### Task 4: Storage layer
- **ACTION**: Implement IndexedDB persistence with tests first.
- **IMPLEMENT**:
  - `src/types.ts`:
    ```ts
    import type { BinaryFileData } from "@excalidraw/excalidraw/types";
    export type BoardId = string;
    export type BoardMeta = { id: BoardId; name: string; createdAt: number; updatedAt: number };
    export type Viewport = { scrollX: number; scrollY: number; zoom: number };
    // `data` is JSON.parse(serializeAsJSON(elements, appState, {}, "local")). Files are stored separately.
    export type StoredScene = { data: unknown; viewport?: Viewport };
    export type StoredFile = BinaryFileData & { name?: string; width?: number; height?: number };
    export type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: number } | { kind: "error"; error: Error };
    export type ThemePref = "light" | "dark" | "system";
    ```
  - `boards.ts`: `listBoards()` = `keys(boardsStore)`, filter `meta:`, `getMany`, sort by `updatedAt` descending. `createBoard({ name?, scene? })` uses `nanoid()` as the id and `nextBoardName(existingNames, new Date())` as the default name, then writes meta and scene with `setMany`. `saveScene(id, scene)` updates the scene and bumps `meta.updatedAt` in one `setMany`. `saveViewport(id, viewport)` uses `update()` on `scene:{id}` and doesn't bump `updatedAt`. `duplicateBoard(id)` copies the scene and names the copy `"{name} copy"`. `deleteBoard(id)` uses `delMany` on meta, scene, and thumb. Every function wraps its IDB calls in try/catch and rethrows `toStorageError(e)`.
  - `files.ts`: `putFiles(files: StoredFile[])` skips ids already present (`getMany`, then `setMany` only the missing ones). `getFiles(ids): Promise<BinaryFiles>`. `listShelf(): Promise<StoredFile[]>` returns entries sorted by `created` descending. `isFileReferenced(id)` scans every `scene:*` for an image element whose `fileId === id`. `removeFromShelf(id)` throws if the file is referenced. Export a `shelfEvents = new EventTarget()` that fires `"change"` after any write.
- **MIRROR**: REPOSITORY_PATTERN, ERROR_HANDLING, TEST_STRUCTURE
- **IMPORTS**: `import { get, getMany, set, setMany, del, delMany, keys, update, entries } from "idb-keyval";`
- **GOTCHA**: Excalidraw's own file ids are SHA-1 hashes of the content, so dedupe by id is safe. Keep thumbnails out of `meta:*` so listing boards never loads large data URLs.
- **VALIDATE**: `npm test -- src/storage` covers create/list ordering, rename, duplicate (new id, same elements), delete removes all three keys, `putFiles` dedupe, `removeFromShelf` rejecting a referenced file, and `listShelf` ordering.

### Task 5: BoardCanvas with load and autosave
- **ACTION**: Load a board into Excalidraw and persist changes.
- **IMPLEMENT**:
  - `BoardCanvas` props: `{ boardId, theme, onApi(api), onStatus(status) }`. App renders it with `key={boardId}` so switching boards remounts the editor. That gives a clean undo history and fresh state per board.
  - `initialData` is a promise:
    ```ts
    async function loadInitialData(boardId: BoardId) {
      const stored = await loadScene(boardId);
      const restored = restore(stored?.data ?? null, null, null);
      const fileIds = restored.elements.flatMap((el) => (el.type === "image" && el.fileId ? [el.fileId] : []));
      const files = await getFiles(fileIds);
      const v = stored?.viewport;
      return {
        elements: restored.elements,
        appState: { ...restored.appState, ...(v ? { scrollX: v.scrollX, scrollY: v.scrollY, zoom: { value: v.zoom } } : {}) },
        files,
        scrollToContent: !v,
      };
    }
    ```
  - `useAutosave(boardId)` returns an `onChange(elements, appState, files)` handler, `status`, and `flush()`:
    - `const v = getSceneVersion(elements)`. If it differs from `lastVersionRef`, schedule `saveScene` after a 400ms debounce with `{ data: JSON.parse(serializeAsJSON(elements, appState, {}, "local")) }`.
    - New file ids not in `persistedFileIdsRef` go to `putFiles` (no debounce), then are added to the set (which fires `shelfEvents`).
    - A viewport change (scrollX, scrollY, zoom.value) schedules `saveViewport` after a 1000ms debounce.
    - After a successful scene save, if more than 8s have passed since the last thumbnail and at least one non-deleted element exists: `exportToBlob({ elements: getNonDeletedElements(elements), appState: { ...appState, exportBackground: true }, files, mimeType: "image/webp", quality: 0.8, maxWidthOrHeight: 320 })`, then `getDataURL(blob)`, then `saveThumbnail`.
    - `flush()` runs pending debounced work immediately. Call it on unmount (board switch), on `visibilitychange` to hidden, and on `pagehide`.
    - Status moves idle → saving → saved(at) / error. On error, keep the dirty flag and retry on the next change.
- **MIRROR**: SERVICE_PATTERN, ERROR_HANDLING
- **IMPORTS**: `Excalidraw, restore, serializeAsJSON, getSceneVersion, exportToBlob, getNonDeletedElements, getDataURL` from `@excalidraw/excalidraw`
- **GOTCHA**: `onChange` fires on every pointer move and selection change, so never write without a version check. In StrictMode, effects run twice in dev; make flush idempotent. `serializeAsJSON` "local" drops scroll and zoom, which is why the viewport is stored separately. Don't store `files` inside the scene, or every autosave rewrites megabytes of image data.
- **VALIDATE**: Draw, reload the page, and the drawing and viewport come back. In DevTools → Application → IndexedDB → `sdb-boards`, the `scene:*` value updates about 400ms after you stop drawing. Panning alone doesn't change `meta.updatedAt`.

### Task 6: Board rail and board management
- **ACTION**: Build the list UI and `useBoards`.
- **IMPLEMENT**:
  - `useBoards()` loads `listBoards()` and the thumbnails for visible ids, and exposes create, rename, duplicate, remove, and select. The active id is persisted in `localStorage['sdb.activeBoard']` (try/catch). It falls back to the most recent board, and with no boards at all it shows `EmptyState`.
  - `BoardRail`: search input (visually hidden label "Search boards"), a "New board" primary button, and a `<ul role="list">` of rows (thumbnail or a dot-grid placeholder, name, `formatRelative(updatedAt)` in mono, and a kebab menu with Rename, Duplicate, Delete). Rename edits inline in the row (Enter commits, Escape reverts, blank reverts). Delete opens `ConfirmDialog` (native `<dialog>`, `showModal()`), titled "Delete '{name}'? This can't be undone." Deleting the active board selects the next most recent one.
  - Skeleton rows while loading. Stagger animation per DESIGN.md §6.
  - `naming.ts`: `nextBoardName(existing: string[], now: Date)` returns "Sketch Oct 24", then "Sketch Oct 24 (2)", and so on. `formatRelative(ts, now)` uses `Intl.RelativeTimeFormat` ("2 min ago", "yesterday").
  - Before switching boards, App calls the current canvas's `flush()` and awaits it.
- **MIRROR**: DESIGN.md §4 board rail, TEST_STRUCTURE (jsdom)
- **GOTCHA**: The kebab button must be focusable and visible on `:focus-within`, not hover only. Keep the delete dialog's focus on Cancel by default.
- **VALIDATE**: `BoardRail.test.tsx` covers search filtering, Enter and Escape on rename, delete requiring confirmation, and the active row having `aria-current="true"`. Manually: create 3 boards, rename one, delete one, reload, and the state is preserved.

### Task 7: Component catalog and skeleton factory
- **ACTION**: Define the system-design components as data plus a pure converter.
- **IMPLEMENT**:
  - `catalog.ts`:
    ```ts
    export type Tier = "edge" | "compute" | "data" | "async" | "external" | "layout";
    export type Recipe = "box" | "rounded" | "ellipse" | "diamond" | "cylinder" | "queue" | "stack" | "dashed" | "dotted" | "boundary";
    export type ComponentDef = { kind: string; label: string; tier: Tier; recipe: Recipe; w: number; h: number; dividers?: number };
    export const TIER_FILL: Record<Tier, string> = {
      edge: "#a5d8ff", compute: "#b2f2bb", data: "#ffec99", async: "#ffc9c9", external: "transparent", layout: "transparent",
    };
    export const CATALOG: ComponentDef[] = [
      { kind: "client",        label: "Client",          tier: "edge",     recipe: "ellipse",  w: 160, h: 90 },
      { kind: "mobile",        label: "Mobile app",      tier: "edge",     recipe: "rounded",  w: 110, h: 160 },
      { kind: "dns",           label: "DNS",             tier: "edge",     recipe: "ellipse",  w: 140, h: 80 },
      { kind: "cdn",           label: "CDN",             tier: "edge",     recipe: "rounded",  w: 180, h: 80 },
      { kind: "load-balancer", label: "Load balancer",   tier: "edge",     recipe: "diamond",  w: 190, h: 120 },
      { kind: "api-gateway",   label: "API gateway",     tier: "edge",     recipe: "box",      w: 200, h: 80 },
      { kind: "service",       label: "Service",         tier: "compute",  recipe: "rounded",  w: 180, h: 90 },
      { kind: "worker-pool",   label: "Worker pool",     tier: "compute",  recipe: "stack",    w: 180, h: 90 },
      { kind: "auth",          label: "Auth service",    tier: "compute",  recipe: "rounded",  w: 180, h: 90 },
      { kind: "database",      label: "Database",        tier: "data",     recipe: "cylinder", w: 160, h: 120 },
      { kind: "cache",         label: "Cache",           tier: "data",     recipe: "dashed",   w: 160, h: 80 },
      { kind: "object-store",  label: "Object storage",  tier: "data",     recipe: "box",      w: 180, h: 90 },
      { kind: "search",        label: "Search index",    tier: "data",     recipe: "box",      w: 180, h: 90 },
      { kind: "queue",         label: "Message queue",   tier: "async",    recipe: "queue",    w: 200, h: 70, dividers: 3 },
      { kind: "stream",        label: "Event stream",    tier: "async",    recipe: "queue",    w: 260, h: 70, dividers: 5 },
      { kind: "external-api",  label: "Third-party API", tier: "external", recipe: "dotted",   w: 200, h: 90 },
      { kind: "boundary",      label: "Region / VPC",    tier: "layout",   recipe: "boundary", w: 520, h: 340 },
    ];
    ```
  - `toSkeleton(def, center: {x, y}, instanceId: string): ExcalidrawElementSkeleton[]`:
    - Common props: `strokeColor "#1e1e1e"`, `backgroundColor TIER_FILL[tier]`, `fillStyle "solid"`, `strokeWidth 2`, `roughness 1`, `groupIds [instanceId]`, `customData: { sdb: { kind, instanceId } }`. Top-left = `center - (w/2, h/2)`.
    - box / rounded / dashed / dotted: one rectangle with `label: { text, fontSize: 20, fontFamily: FONT_FAMILY.Excalifont }`. Rounded uses `roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS }`. Dashed uses `strokeStyle "dashed"`. Dotted uses `strokeStyle "dotted"`.
    - ellipse / diamond: that shape with the label.
    - cylinder: body rectangle (`y + capH/2`, height `h - capH/2`, with the label), then a top ellipse (`capH = h * 0.28`, same fill) listed AFTER the body so it draws on top.
    - queue: rectangle (no label), plus `dividers` vertical `line` elements evenly spaced (`points [[0,0],[0,h]]`), plus a free `text` element under the rectangle (`y + h + 8`) holding the label.
    - stack: two rectangles offset (+12,-12) and (+6,-6) behind, then the front rectangle with the label.
    - boundary: rectangle, `strokeStyle "dashed"`, `strokeColor "#868e96"`, transparent fill, `roundness` adaptive, plus a free `text` at the top-left inside (+16,+12) at fontSize 16. **No** group ids here, so dropping things inside a boundary doesn't move them with it.
  - The element that should receive arrow bindings (the labeled container, or the front rectangle for queue and stack) gets `id: \`${instanceId}-main\``. Other parts get `${instanceId}-{n}`.
- **MIRROR**: TEST_STRUCTURE (node)
- **IMPORTS**: `import { FONT_FAMILY, ROUNDNESS } from "@excalidraw/excalidraw"; import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";`
- **GOTCHA**: Check in `data/transform.d.ts` that `label` accepts `fontFamily`, and that skeletons accept `groupIds`, `customData`, and `roughness`. If `label.fontFamily` isn't accepted, set `currentItemFontFamily` on appState before inserting instead. `convertToExcalidrawElements` measures text, which needs canvas, so test `toSkeleton` output only, not the conversion, in Vitest. If importing `@excalidraw/excalidraw` in the node test environment fails (it touches `window` at import), move the `FONT_FAMILY`/`ROUNDNESS` numeric values into `catalog.ts` as local constants with a comment pointing at `constants.d.ts`.
- **VALIDATE**: `toSkeleton.test.ts` checks: every def yields at least one skeleton; all elements of a non-boundary def share `groupIds[0] === instanceId`; the bounding box is centered on `center` (±1px); cylinder ordering is body before cap; queue yields `dividers + 2` elements; every element carries `customData.sdb.kind`.

### Task 8: Component palette in the Excalidraw sidebar
- **ACTION**: Let users place components by clicking or dragging.
- **IMPLEMENT**:
  - `src/board/insert.ts`:
    ```ts
    export function insertSkeletons(api: ExcalidrawImperativeAPI, skeletons: ExcalidrawElementSkeleton[]) {
      const created = convertToExcalidrawElements(skeletons, { regenerateIds: false });
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), ...created],
        appState: {
          selectedElementIds: Object.fromEntries(created.map((el) => [el.id, true])),
          selectedGroupIds: Object.fromEntries(created.flatMap((el) => el.groupIds).map((g) => [g, true])),
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      api.setActiveTool({ type: "selection" });
    }
    ```
    The `instanceId` comes from `nanoid(10)` per insert, so `regenerateIds: false` is safe and keeps the `-main` id predictable.
  - `geometry.ts`: `sceneCenter({ width, height, scrollX, scrollY, zoom })` returns `{ x: width / 2 / zoom.value - scrollX, y: height / 2 / zoom.value - scrollY }`.
  - `ComponentPalette`: tiles grouped by tier with section labels. Previews are generated once on mount by running `exportToSvg({ elements: convertToExcalidrawElements(toSkeleton(def, {x:0,y:0}, "preview")), appState: { exportBackground: false, viewBackgroundColor: "transparent" }, files: null, exportPadding: 8 })` for each def, then caching `svg.outerHTML` in a module-level Map. Each tile is a `<button draggable>` that calls `insertSkeletons(api, toSkeleton(def, sceneCenter(api.getAppState()), nanoid(10)))` on click, and on `dragstart` sets `e.dataTransfer.setData("application/x-sdb-component", def.kind)` with `effectAllowed = "copy"`.
  - Drop handling in BoardCanvas: wrap `<Excalidraw>` in a div with `onDragOverCapture` (if `types` includes an `application/x-sdb-*` MIME: `preventDefault()`, `dropEffect = "copy"`) and `onDropCapture` (for our MIMEs: `preventDefault()`, `stopPropagation()`, `const p = viewportCoordsToSceneCoords({ clientX, clientY }, api.getAppState())`, then insert at `p`).
  - Sidebar: as a child of `<Excalidraw>`, `<Sidebar name="sdb" docked={docked} onDock={setDocked}>` containing `<Sidebar.Header/>`, then `<Sidebar.Tabs>` with `<Sidebar.TabTriggers>` (Components, Sketches) and `<Sidebar.Tab tab="components">` / `<Sidebar.Tab tab="sketches">`. Trigger: `renderTopRightUI={() => <Sidebar.Trigger name="sdb" tab="components" title="Components and sketches" icon={<Shapes size={18}/>} />}`. Docked by default when `window.innerWidth >= 1024`.
- **MIRROR**: DESIGN.md §4 palette tiles, §6 motion
- **IMPORTS**: `convertToExcalidrawElements, exportToSvg, viewportCoordsToSceneCoords, CaptureUpdateAction, Sidebar` from `@excalidraw/excalidraw`; `Shapes` from `lucide-react`
- **GOTCHA**: Use the CAPTURE phase (`onDropCapture`). Excalidraw's own drop handler sits on an inner element and would otherwise see the event first. Never set `text/plain` on drag data, or Excalidraw turns it into a text element. Only intercept our MIME types and `.excalidraw` files, so image file drops still reach Excalidraw.
- **VALIDATE**: Click "Database", and a yellow cylinder labeled "Database" appears centered and selected. Drag "Message queue" to a spot, and it lands under the cursor. Draw an arrow from the service to the database, then move the database: the arrow follows (bound to `-main`). One Ctrl+Z removes the whole inserted component.

### Task 9: Sketch shelf
- **ACTION**: Import paper-sketch photos and reuse them.
- **IMPLEMENT**:
  - `importSketch.ts`:
    - `ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]`. Reject others with a message (HEIC gets the copy from DESIGN.md).
    - For raster files: `createImageBitmap(file)`, then `fitWithin(w, h, 2400)`. If downscaling is needed, draw onto a `canvas` and call `toBlob("image/webp", 0.85)`. Otherwise keep the original blob.
    - `id = hex(await crypto.subtle.digest("SHA-1", await blob.arrayBuffer()))` (cast to `FileId`).
    - `dataURL = await getDataURL(blob)`. `StoredFile = { id, mimeType, dataURL, created: Date.now(), name: file.name, width, height }`, then `putFiles([stored])`.
  - Insert sketch: `api.addFiles([stored])`, then `insertSkeletons(api, [{ type: "image", fileId: stored.id, x, y, width: dw, height: dh, customData: { sdb: { kind: "sketch" } } }])`, where `(dw, dh) = fitWithin(width, height, 640)`, centered on the viewport center or the drop point.
  - `SketchShelf`: a dashed drop zone (its own `onDrop` for files) plus a "Choose files" ghost button (`<input type="file" multiple accept=...>`). Grid of `listShelf()` items, newest first, re-fetched on `shelfEvents` "change". Click inserts. Drag sets `application/x-sdb-sketch` to the file id. The remove button is shown only when `!isFileReferenced(id)` (computed when the tab opens).
  - Images that users paste or drop straight onto the canvas reach the shelf through `useAutosave`'s file persistence (Task 5) automatically.
- **MIRROR**: ERROR_HANDLING (inline message under the drop zone)
- **IMPORTS**: `getDataURL` from `@excalidraw/excalidraw`; `fitWithin` from `../lib/geometry`
- **GOTCHA**: Verify that the `image` skeleton type and its `fileId` field exist in `data/transform.d.ts`. Call `addFiles` BEFORE inserting the element, or the image renders as a broken placeholder until reload. Large phone photos (4000px or more, 5MB or more) must be downscaled or IndexedDB fills fast.
- **VALIDATE**: `importSketch.test.ts` (pure parts) covers `fitWithin` math and MIME acceptance. Manually: drop a 4000×3000 JPG on the shelf, and the stored dataURL is WebP with a long side of 2400px or less. Insert it on two boards; the remove button stays hidden; delete both boards; the remove button shows.

### Task 10: Main menu, import as new board, backup and restore
- **ACTION**: Wire export, import, and workspace backup.
- **IMPLEMENT**:
  - `UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: false } }}`
  - `<MainMenu>`: `DefaultItems.SaveAsImage`, `DefaultItems.Export`, `MainMenu.Item` "Import .excalidraw as new board", `MainMenu.Separator`, `MainMenu.Item` "Download backup", `MainMenu.Item` "Restore from backup", `MainMenu.Separator`, `DefaultItems.ChangeCanvasBackground`, `DefaultItems.ClearCanvas`, `DefaultItems.Help`.
  - Import as new board: a file picker for `.excalidraw,.json,.png,.svg`, then `loadFromBlob(file, null, null)`, then `putFiles(Object.values(restored.files))`, then `createBoard({ name: file.name without its extension, scene: { data: JSON.parse(serializeAsJSON(restored.elements, restored.appState, {}, "local")) } })`, then select it. Also route `.excalidraw` files dropped onto the canvas here (in `onDropCapture`, check `file.name.endsWith(".excalidraw")` or `file.type === MIME_TYPES.excalidraw`).
  - `backup.ts`: `exportBackup()` returns `Blob(JSON.stringify({ format: "sdb-backup", version: 1, exportedAt, boards: [{ meta, scene }], files: StoredFile[] }))`, downloaded as `sdb-backup-YYYY-MM-DD.json` through a temporary `<a download>`. `importBackup(blob)` validates `format` and `version`, runs `putFiles(files)`, and for each board: if the id exists, gives it a new id and a " (restored)" name suffix; otherwise keeps it. Returns `{ added, renamed }`, which is shown via `api.setToast({ message })`.
  - On first run, call `navigator.storage?.persist?.()` once (store a flag in localStorage) so the browser is less likely to evict data.
- **MIRROR**: REPOSITORY_PATTERN, ERROR_HANDLING
- **IMPORTS**: `MainMenu, loadFromBlob, serializeAsJSON, MIME_TYPES` from `@excalidraw/excalidraw`
- **GOTCHA**: `DefaultItems.Export` saves the CURRENT board to disk. That's intended. With `loadScene: false`, dropping a `.excalidraw` file would still replace the scene unless it's intercepted, so the drop routing above is required, not optional.
- **VALIDATE**: `backup.test.ts`: export, clear stores, import, and the boards and files are identical. Importing again yields "(restored)" copies. Manually: Save as image → PNG with "Embed scene" on, then import that PNG as a new board, and it opens editable.

### Task 11: Top bar and theme
- **ACTION**: Finish the chrome.
- **IMPLEMENT**:
  - `useTheme()`: pref is `"light" | "dark" | "system"` in `localStorage['sdb.theme']`, default `"system"`. Resolve it against `matchMedia("(prefers-color-scheme: dark)")` with a change listener. Set `document.documentElement.dataset.theme` to the resolved value (remove the attribute for system). Pass the resolved theme to `<Excalidraw theme>`.
  - `TopBar`: rail toggle (`PanelLeft` icon, `aria-expanded`), inline board-name editor (same rules as the rail rename, and it calls `renameBoard`), save status (`<span role="status" aria-live="polite">` with mono text plus the teal dot that pulses only while saving), and a theme toggle (cycles system → light → dark, with `Monitor`/`Sun`/`Moon` icons and an aria-label naming the NEXT state).
- **MIRROR**: DESIGN.md §4 top bar, §6 motion
- **GOTCHA**: Saved times use `Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" })`. Don't announce every save to screen readers. Update the live region only on transitions into saved or error, not saving.
- **VALIDATE**: Theme changes apply to both the chrome and the Excalidraw UI. The pref survives a reload. The status reads "Saving" with a pulse while you draw, then "Saved HH:MM".

### Task 12: Empty states, responsive, and accessibility pass
- **ACTION**: Make it hold up at every width and with a keyboard.
- **IMPLEMENT**: `EmptyState` per DESIGN.md (left-aligned, a static sample diagram rendered with `exportToSvg` from 3 catalog defs plus 2 arrows, one primary button). Excalidraw `<WelcomeScreen>` with `WelcomeScreen.Center` holding the custom copy, plus `WelcomeScreen.Hints.ToolbarHint` and `WelcomeScreen.Hints.MenuHint`. Below 768px the rail becomes a drawer: `position: fixed`, `transform: translateX(-100%)` → `0`, a scrim, close on Escape and on scrim click, with focus moved into the drawer when it opens and returned on close. 768–1023px: rail collapsed by default, `localStorage['sdb.railOpen']`. Every icon button gets an `aria-label` and a 44px hit area.
- **MIRROR**: DESIGN.md §5 responsive, §9 bans
- **GOTCHA**: Excalidraw has its own mobile layout below about 730px. Don't fight it; just make sure the top bar doesn't cover its toolbar (the canvas cell starts below the top bar, so it won't).
- **VALIDATE**: At 375×812 there's no horizontal scroll, the drawer opens and closes, and you can still draw. Tab order from the rail goes search → New board → rows → kebabs. All controls are reachable without a mouse.

### Task 13: Full validation
- **ACTION**: Run everything. Fix and rerun until clean.
- **VALIDATE**: All commands in "Validation Commands" below, plus the manual checklist.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| listBoards ordering | create A, then B | [B, A] | |
| saveViewport | pan only | updatedAt unchanged | yes |
| duplicateBoard | board with 3 elements | new id, same element count, name "X copy" | |
| deleteBoard | id | meta, scene, and thumb keys gone | |
| putFiles dedupe | same id twice | one entry | yes |
| removeFromShelf | file referenced by a scene | throws | yes |
| backup round-trip | 2 boards + 1 file | identical after clear and import | |
| backup conflict | import twice | second import adds "(restored)" copies | yes |
| backup invalid | `{ format: "other" }` | rejects with a clear error | yes |
| nextBoardName | ["Sketch Oct 24"] on Oct 24 | "Sketch Oct 24 (2)" | yes |
| formatRelative | 90s ago | "2 min ago" (or the locale equivalent) | |
| sceneCenter | zoom 2, scroll (100, 50), 800×600 | { x: 100, y: 100 } | |
| fitWithin | 4000×3000, max 2400 | 2400×1800 | |
| fitWithin | 800×600, max 2400 | unchanged | yes |
| toSkeleton cylinder | database def | body before cap, shared groupId, centered | |
| toSkeleton queue | queue def (3 dividers) | 5 elements | |
| toSkeleton boundary | boundary def | no groupIds | yes |
| BoardRail search | "chat" | only matching rows | |
| BoardRail rename | Escape | original name restored | yes |
| BoardRail delete | click Delete, then Cancel | board still listed | yes |

### Edge Cases Checklist
- [ ] Empty input: blank board name reverts; empty board makes no thumbnail; no boards shows EmptyState
- [ ] Maximum size input: 20MB photo is downscaled; 200-element board saves under 50ms (check in the Performance panel)
- [ ] Invalid types: HEIC or PDF dropped on the shelf shows an inline message; malformed backup JSON is rejected
- [ ] Concurrent access: two tabs on the same board. Last write wins (documented, not solved in v1)
- [ ] Storage failure: simulate a quota error by temporarily throwing in saveScene; status shows "Not saved, retrying"; the next change retries
- [ ] Private window: IndexedDB may be unavailable; show an inline banner "Boards can't be saved in this window"

---

## Validation Commands

### Static Analysis
```bash
npm run typecheck
```
EXPECT: zero type errors

```bash
npm run lint
```
EXPECT: zero errors

### Unit Tests
```bash
npm test
```
EXPECT: all pass

### Production Build
```bash
npm run build
```
EXPECT: `dist/` produced, `dist/fonts/` present (copied from `public/fonts`)

### Browser Validation
```bash
npm run dev
```
EXPECT: http://localhost:5173 loads with no console errors and no network requests to external hosts

### Manual Validation
- [ ] Create 3 boards; rename, duplicate, and delete; reload and everything persists
- [ ] Insert every palette component by click; each is labeled, tier-colored, and selected as a group
- [ ] Drag a component to a precise spot; it lands under the cursor at zoom 50% and 200%
- [ ] Arrow from Service to Database stays bound after moving either one
- [ ] Drop a phone photo on the shelf; insert it on a board; reload; the image is still there
- [ ] Paste an image from the clipboard onto the canvas; it appears in the shelf
- [ ] Save as image (PNG, embed scene) → Import as new board → editable
- [ ] Drop a `.excalidraw` file on the canvas; it becomes a new board and the current board is untouched
- [ ] Download backup → clear site data → Restore from backup → all boards and sketches are back
- [ ] Light, dark, and system themes; no violet left in the chrome
- [ ] 375px wide: no horizontal scroll, drawer works, drawing works
- [ ] Keyboard only: create, rename, and delete a board; open the sidebar; insert a component (Enter on a tile)
- [ ] DevTools offline mode: reload, and the app and fonts still load (after the first load of the dev server)

---

## Acceptance Criteria
- [ ] All 13 tasks completed
- [ ] typecheck, lint, test, and build all pass
- [ ] Unit tests in the table above are written and passing
- [ ] UI matches DESIGN.md (tokens, type, motion, bans)
- [ ] No network requests to third-party hosts at runtime

## Completion Checklist
- [ ] Conventions from "Patterns to Mirror" followed in every file
- [ ] Every catch sets visible state or rethrows; no silent failures
- [ ] Only console.warn/console.error with the "[sdb]" prefix
- [ ] Tests co-located, node vs jsdom environment chosen per file
- [ ] Colors only via tokens.css custom properties (canvas content colors only in catalog.ts)
- [ ] No scope beyond "NOT Building"
- [ ] `@excalidraw/excalidraw` pinned to 0.18.1

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Browser evicts IndexedDB, or site data gets cleared | Medium | High (data loss) | `storage.persist()`, Download backup, and (optional) a reminder toast if there's been no backup in 14 days |
| Skeleton API rejects a field (label fontFamily, groupIds on lines, image type) | Medium | Medium | Check `data/transform.d.ts` in Task 7 before writing recipes; fall back to setting `currentItemFontFamily` or post-processing with `newElementWith` |
| Drag-drop conflicts with Excalidraw's own drop handling | Medium | Medium | Capture-phase handlers, custom MIME types only, never `text/plain` |
| Large photos bloat storage | High | Medium | Downscale to 2400px WebP at q0.85; content-hash dedupe |
| Excalidraw CSS variable names differ from DESIGN.md §7 | Low | Low | Verify against `dist/prod/index.css` in Task 3 |
| Canvas selection outline stays violet | High | Low | Accepted (renderer constant), noted in DESIGN.md |
| Multiple tabs editing the same board overwrite each other | Low | Medium | Documented last-write-wins; a v2 candidate is a BroadcastChannel lock |
| Future Excalidraw upgrade breaks APIs | Medium | Medium | Exact version pin; upgrade deliberately with this plan's API list as the checklist |

## Implementation Notes (2026-10-24)

Status: all 13 tasks implemented. Typecheck, 91 unit/component tests and the production build pass; lint passes when run with the intended rules (see the last item).

Deviations from the plan, and why:
- **React 18.3.1, not 19.** Excalidraw 0.18.1 depends on `@radix-ui/react-tabs@1.0.2`, whose peer range stops at React 18. `@types/react` pinned to 18 to match.
- **Toolchain resolved to** Vite 8.3, Vitest 5, TypeScript 6.0, ESLint 10, typescript-eslint 8.72.
- **`FONT_FAMILY.Excalifont` (5) and `ROUNDNESS.ADAPTIVE_RADIUS` (3) are mirrored** in `src/palette/toSkeleton.ts`, because the Excalidraw package can't be imported in Node tests (the plan's documented fallback).
- **Boundary is grouped** (frame plus caption share a group) so it moves as one piece. Things dropped inside it stay independent because they are never added to that group.
- **Worker pool and stack recipe:** the three offset rectangles fit inside `w × h`, so the whole component stays centered on the drop point.
- **Sidebar structure:** the tab triggers sit inside `Sidebar.Header` within `Sidebar.Tabs` (the same structure as Excalidraw's DefaultSidebar). Tab panels are made scrollable in `app.css`.
- **Click-to-insert** centers on the visible canvas (leaving out an undocked sidebar) and cascades repeated inserts by 28px.
- **`SaveStatus` gained `load-error`**, so a board that fails to load says so and never autosaves over stored data.
- **Pure sketch helpers** live in `src/sketches/sketchFile.ts`, separate from `importSketch.ts` (which needs the browser and Excalidraw), so they can be tested in Node.
- **The shelf refreshes "in use"** after each board save (`shelfEvents` "usage"), so the remove button reflects the current boards.
- **Empty state** also offers "Restore from backup", because a cleared browser has no board menu to restore from.
- **`eslint.config.js` is empty.** The ECC `config-protection` hook blocks writing lint configs. Lint was run through the ESLint Node API with the intended rules instead (no problems found). The intended config is in the session summary and needs to be added by hand or with the hook disabled.

## Notes
- Engine choice: Excalidraw over tldraw (whose SDK needs a license key in production builds) and over React Flow (no freehand, no hand-drawn look). The user picked the hand-drawn whiteboard look, which is Excalidraw's native style, and it's MIT-licensed.
- Export, PNG/SVG rendering, undo/redo, the image tool, pasting, and the color picker all come from Excalidraw. The app adds only boards, persistence, the palette, the shelf, and backup.
- File ids are content hashes (ours via SHA-1, matching Excalidraw's default), so the same sketch is stored once however many boards use it.
- Confidence for a single-pass implementation: 8/10. The open unknowns are the exact skeleton fields (Task 7 and Task 9 gotchas), and both have a documented fallback.
