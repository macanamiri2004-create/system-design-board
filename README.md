# SDB — System Design Board

A local, hand-drawn whiteboard for system-design sketches, built on [Excalidraw](https://github.com/excalidraw/excalidraw).

- **Boards** — as many as you like, listed in the left rail with thumbnails, search, rename, duplicate and delete. Everything autosaves in this browser.
- **Components** — a palette of 17 system-design parts (client, CDN, load balancer, service, worker pool, database, cache, queue, event stream, third-party API, region boundary and more). Click to add one at the center of the view, or drag it onto the board. Arrows bind to them.
- **Sketch shelf** — drop photos or scans of paper sketches. Large photos are downscaled, identical images are stored once, and every sketch can be reused on any board.
- **Export** — Excalidraw's own PNG/SVG/clipboard export and `.excalidraw` save, from the menu.
- **Import** — open a `.excalidraw` file (or a PNG/SVG exported with "Embed scene") as a new board, from the menu or by dropping it on the canvas.
- **Backup** — Menu → Download backup saves every board and sketch to one JSON file; Restore from backup brings them back.

## Run it

Requires Node 20.19+ (tested on Node 24).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (copies Excalidraw's fonts into `public/fonts` first) |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and component tests (Vitest) |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint (needs `eslint.config.js`) |

## Where your data lives

Boards and sketches are stored in this browser's IndexedDB (`sdb-boards`, `sdb-files`) for `localhost:5173`. Clearing site data, or using another browser or port, starts empty. Use **Download backup** regularly.

## Design

Visual rules live in [DESIGN.md](DESIGN.md); tokens are in `src/styles/tokens.css`. The implementation plan is in `.claude/PRPs/plans/system-design-board.plan.md`.

## Project layout

```
src/
  App.tsx             shell: rail, top bar, canvas, import/backup actions
  board/              Excalidraw wrapper, loading, autosave, inserting elements
  palette/            component catalog, skeleton factory, palette UI, sample diagram
  sketches/           sketch import (validate, downscale, hash) and the shelf UI
  storage/            IndexedDB access: boards, files, backup, errors
  shell/              rail, top bar, dialogs, empty state
  hooks/ lib/ io/     board list and theme state, small helpers, file pick/download
```
