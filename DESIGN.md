# Design System: SDB — System Design Board

A personal, local-first whiteboard for system-design sketches. Two visual voices share the screen: a precise, machined app frame (rail, top bar, palette) and a loose, hand-drawn canvas (Excalidraw). The contrast between the two is the signature, so the frame stays quiet and the sketches stay loud.

There is no marketing page and no hero section. The app opens straight onto the last board you worked on.

---

## 1. Visual Theme & Atmosphere

A quiet drafting-studio tool. The frame feels like a well-made drafting table: thin ruled lines, graphite type, one blueprint-teal accent. Everything outside the canvas recedes so the drawings carry the color and the personality.

| Dial | Setting | Why |
|---|---|---|
| Density | 5, "Daily App Balanced" | A working tool with a board list and a component palette, not a gallery and not a cockpit. |
| Variance | 3, "Predictable Symmetric" | Lower than the skill default of 8 on purpose. Tool chrome needs muscle memory: controls never move. The asymmetry lives in what you draw. |
| Motion | 4, "Fluid CSS" | Short transitions on the frame only. Nothing ambient competes with the canvas while you sketch. |

Mood words: graphite, ruled paper, blueprint, marker on whiteboard, calm.

---

## 2. Color Palette & Roles

One neutral family (Zinc) for all chrome, in both themes. One accent. Status red is used only for destructive and error states.

### Light theme

- **Drafting Paper** (`#FAFAFA`) — App background and the default canvas `viewBackgroundColor`.
- **Pure Sheet** (`#FFFFFF`) — Board rail, top bar, sidebar panels, menus, dialogs.
- **Graphite Ink** (`#18181B`) — Primary text and icons.
- **Pencil Grey** (`#71717A`) — Secondary text, timestamps, metadata, placeholder text.
- **Ruled Line** (`#E4E4E7`) — 1px dividers, input borders, tile borders.
- **Hover Wash** (`#F4F4F5`) — Row hover, pressed ghost buttons.
- **Blueprint Teal** (`#1F7A8C`) — **The single accent.** Primary button fill, active board marker, focus rings, links, Excalidraw's `--color-primary`. Saturation 64%.
- **Teal Wash** (`#E3F1F4`) — Selected-row background, accent at low weight.
- **Brick Red** (`#B42318`) — Destructive buttons, inline errors, "not saved" status. Never decorative.

### Dark theme

- **Night Table** (`#09090B`, Zinc-950) — App background.
- **Night Sheet** (`#18181B`, Zinc-900) — Rail, top bar, panels, dialogs.
- **Raised Sheet** (`#27272A`, Zinc-800) — Hover wash, menus over panels.
- **Chalk Ink** (`#FAFAFA`) — Primary text.
- **Ash Grey** (`#A1A1AA`) — Secondary text and metadata.
- **Night Rule** (`#27272A`) — Dividers and borders.
- **Blueprint Teal, lifted** (`#4FB3C4`) — Accent in dark mode. Saturation 50%.
- **Teal Wash, dark** (`rgba(79, 179, 196, 0.14)`) — Selected-row background.
- **Brick Red, lifted** (`#F97066`) — Errors and destructive actions.

Excalidraw renders its own dark mode by inverting the canvas, so canvas content colors below are defined once and are not re-specified for dark.

### Canvas content palette (drawings, not chrome)

These are fills for system-design components placed from the palette. They are taken from Excalidraw's own built-in color picker, so anything you recolor by hand stays in the same family. They encode meaning (which tier a component belongs to), so they are not accents and the one-accent rule does not apply to them.

- **Marker Ink** (`#1E1E1E`) — Stroke for every component and every label.
- **Edge Tint** (`#A5D8FF`) — Client, Mobile app, DNS, CDN, Load balancer, API gateway.
- **Compute Tint** (`#B2F2BB`) — Service, Worker pool, Auth service.
- **Data Tint** (`#FFEC99`) — Database, Cache, Object storage, Search index.
- **Async Tint** (`#FFC9C9`) — Message queue, Event stream.
- **External** (no fill, dotted Marker Ink stroke) — Third-party APIs.
- **Boundary Grey** (`#868E96`, dashed, no fill) — Region, VPC, or trust boundaries.

Component strokes are 2px ("bold" in Excalidraw), roughness 1 ("artist"), fill style solid. Solid fills keep composite shapes (database cylinder, queue dividers) legible where hachure lines would cross.

---

## 3. Typography Rules

- **UI: Geist Variable** — Self-hosted via `@fontsource-variable/geist`. All chrome text. Hierarchy comes from weight and color, not size jumps.
- **Mono: Geist Mono Variable** — Self-hosted via `@fontsource-variable/geist-mono`. Timestamps, save status, counts, keyboard hints.
- **Canvas: Excalifont** — Excalidraw's hand-drawn face (`FONT_FAMILY.Excalifont`). Used for every label the palette places on the canvas. It belongs to the drawing, never to the chrome.

| Role | Font | Size / line height | Weight | Color |
|---|---|---|---|---|
| Board name (top bar) | Geist | 15px / 20px | 600 | Graphite Ink |
| Board row name (rail) | Geist | 14px / 20px | 500 | Graphite Ink |
| Body, buttons, inputs | Geist | 14px / 20px | 400–500 | Graphite Ink |
| Section label | Geist | 12px / 16px, tracking 0.04em | 600 | Pencil Grey |
| Metadata, save status | Geist Mono | 12px / 16px | 400 | Pencil Grey |
| Palette tile caption | Geist | 13px / 16px | 500 | Graphite Ink |
| Canvas labels | Excalifont | 20px | — | Marker Ink |

Paragraph copy (empty states, dialogs) is capped at 60ch.

**Banned:** Inter, `system-ui` as the primary face, and every serif. This is a software UI.

---

## 4. Component Stylings

- **Top bar** — 52px tall, Pure Sheet, 1px Ruled Line along the bottom. Left: rail toggle (icon button), then the board name as inline-editable text (click to edit, Enter to commit, Escape to revert, empty input reverts). Right: save status in Geist Mono ("Saved 14:05", "Saving", or "Not saved, retrying" in Brick Red), then the theme toggle.
- **Board rail** — 264px wide, Pure Sheet, 1px Ruled Line on its right edge. Top: search input, then a full-width primary "New board" button. Below: a flat list, not cards. Each row is 64px tall: a 4:3 thumbnail (56px wide, 1px Ruled Line border, 6px radius), the board name, and the updated time in mono. The active row gets a Teal Wash background and a 600-weight name. Row actions (Rename, Duplicate, Delete) live behind a kebab button that shows on hover and on keyboard focus.
- **Buttons** —
  - Primary: Blueprint Teal fill, white text, 36px tall, 8px radius, 14px/500.
  - Ghost: transparent, Graphite Ink text, Hover Wash on hover.
  - Destructive: Brick Red fill, white text. Used only in the delete-confirm dialog.
  - Icon: 36px visual square with a 44px hit area.
  - All buttons: `translateY(1px)` on active as tactile push feedback. No glow, no gradient, no shadow.
- **Palette tiles** — Two-column grid inside Excalidraw's docked sidebar. Each tile is square, with a 1px Ruled Line border and 10px radius. The preview is the component's actual hand-drawn rendering (generated with `exportToSvg`, so it always matches what lands on the canvas), with the caption below. On hover the border darkens to `rgba(24, 24, 27, 0.3)` and the preview lifts 2px. Tiles are grouped under tier section labels: Edge, Compute, Data, Async, External, Layout.
- **Sketch shelf tiles** — Same grid as the palette. The image is cropped to a 4:3 tile with `object-fit: cover`. A remove button shows only when no board uses that sketch.
- **Inputs** — 36px tall, 1px Ruled Line border, 8px radius, Pure Sheet fill. Focus shows a 2px Blueprint Teal ring at 1px offset. A label sits above when one is needed; the rail search uses a visually hidden label. Errors appear below in Brick Red, 12px.
- **Dialogs** — Pure Sheet, 14px radius, max-width 420px, shadow `0 12px 32px -8px rgba(24, 24, 27, 0.18)` (tinted to Zinc, never pure black). The title states the consequence ("Delete 'Checkout flow'? This can't be undone."). Buttons are right-aligned, with the cancel action first.
- **Loaders** — Skeleton rows in the rail (thumbnail block plus two text bars) with a shimmer. While a board loads, the canvas area shows Drafting Paper with a faint dot grid. No spinners anywhere.
- **Empty states** —
  - *No boards yet:* a left-aligned composition in the upper-left third of the canvas area, max-width 520px. It holds a small static hand-drawn sample (client, then service, then database, joined by arrows), one line of copy, "Sketch your first architecture", and one primary button, "New board".
  - *Empty board:* Excalidraw's WelcomeScreen with custom center copy: "Drag a component from the palette, or drop a photo of a paper sketch."
  - *Empty sketch shelf:* a dashed Ruled Line drop zone reading "Drop scans or photos of your sketches" plus a ghost "Choose files" button.
  - *No search results:* "No boards match '{query}'" with a ghost "Clear search" button.
- **Errors** — Inline, next to where they happened. Storage failures surface in the top-bar save status. Unsupported files (for example HEIC) show a one-line message under the shelf drop zone: "HEIC isn't supported. Export the photo as JPG or PNG."

---

## 5. Layout Principles

- **Shell grid:** `grid-template-columns: var(--rail-w, 264px) minmax(0, 1fr)` and `grid-template-rows: 52px minmax(0, 1fr)`, at `min-height: 100dvh` (never `h-screen` or `100vh`). The rail spans both rows; the top bar and canvas share the right column.
- **Canvas cell:** must always have a non-zero width and height. Excalidraw renders nothing in a zero-sized container.
- **Component palette and sketch shelf:** live in a single Excalidraw `Sidebar` (docked on the right on desktop) with two tabs, so they never fight Excalidraw's own floating toolbars.
- **Spacing scale:** 4px base. Use 4, 8, 12, 16, 24, 32. Rail inner padding 12px. Sidebar inner padding 12px.
- **Radii:** 6px (thumbnails), 8px (buttons, inputs), 10px (tiles), 14px (dialogs).
- **Full-bleed:** the shell is not max-width contained. It is a tool and the canvas takes every pixel. Only dialogs and the empty-state composition are width-capped.
- **No overlap:** chrome never floats over drawings except Excalidraw's own toolbars and the mobile drawer.
- **Layout method:** CSS Grid for the shell and tile grids. No `calc()` percentage math.

### Responsive

- **≥ 1024px:** rail expanded by default, palette sidebar docked.
- **768–1023px:** rail collapsed by default, toggle in the top bar. Palette sidebar undocked (overlay).
- **< 768px:** the rail becomes an overlay drawer (slides in with `translateX`, Pure Sheet, scrim `rgba(9, 9, 11, 0.4)`). The top bar keeps the toggle, the board name (truncated), and the save status. Excalidraw switches to its own mobile UI.
- **Touch targets:** at least 44px on every interactive element.
- **No horizontal page scroll** at any width. Board names truncate with an ellipsis.

---

## 6. Motion & Interaction

Restrained. Motion explains a change in the frame. It never decorates.

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (the "drafting glide"). Durations 160–240ms. No linear easing.
- **Rail open and close:** `transform: translateX`, 220ms.
- **Board list mount:** rows stagger in at 30ms intervals (opacity 0 to 1, translateY 4px to 0). Only the first 10 rows animate.
- **Palette tile hover:** preview `translateY(-2px)`, 160ms.
- **Dialog:** opacity plus `scale(0.98)` to `scale(1)`, 180ms.
- **The one perpetual loop:** the save-status dot pulses (opacity 0.4 to 1, 1.2s, infinite) only while a save is in flight. This deliberately narrows the skill's "everything loops" rule: in a drawing tool, ambient motion next to the canvas is a distraction.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, all transitions drop to 0.01ms and the save dot is static.
- **Performance:** animate only `transform` and `opacity`. No `backdrop-filter` on anything over the canvas, because it forces a repaint on every canvas frame.
- **Drag and drop:** palette tiles and shelf images use the system `grab` and `grabbing` cursors. No custom cursors.

---

## 7. Excalidraw Theming Bridge

Excalidraw ships its own violet accent (`#6965DB`). Override it so the editor's UI (selected tool, sidebar tabs, dialog buttons) uses Blueprint Teal. The variable names below were checked against `node_modules/@excalidraw/excalidraw/dist/prod/index.css` for 0.18.1. The violet also lives in the selection, brand, and primary-container variables, and in a violet-tinted grey surface (`--color-surface-low: #ececf4`), so those are overridden too.

```css
.excalidraw {
  --color-primary: #1F7A8C;
  --color-primary-darker: #19677A;
  --color-primary-darkest: #145463;
  --color-primary-hover: #19677A;
  --color-primary-light: #E3F1F4;
  --color-primary-light-darker: #CFE6EB;
  --color-selection: #1F7A8C;
  --color-brand-hover: #19677A;
  --color-brand-active: #145463;
  --color-surface-primary-container: #E3F1F4;
  --color-on-primary-container: #0E3A43;
  --color-surface-low: #F4F4F5;
  --ui-font: "Geist Variable", ui-sans-serif, sans-serif;
}
.excalidraw.theme--dark {
  --color-primary: #4FB3C4;
  --color-primary-darker: #6CC2D0;
  --color-primary-darkest: #8ED1DC;
  --color-primary-hover: #6CC2D0;
  --color-primary-light: rgba(79, 179, 196, 0.18);
  --color-primary-light-darker: rgba(79, 179, 196, 0.26);
  --color-selection: #2B8A9C;
  --color-brand-hover: #6CC2D0;
  --color-brand-active: #8ED1DC;
  --color-surface-primary-container: #1D3D44;
  --color-on-primary-container: #D6EEF2;
}
```

The full token set lives in `src/styles/tokens.css`.

Known limit: the selection outline drawn on the canvas comes from Excalidraw's renderer, not CSS, so it may keep the default violet. That is accepted.

Excalidraw's built-in theme toggle is disabled (`UIOptions.canvasActions.toggleTheme: false`). The app owns the theme and passes it down through the `theme` prop.

---

## 8. Voice & Copy

- Plain, short, specific. Sentence case everywhere.
- Name things for what they are: "New board", "Download backup", "Import .excalidraw as new board".
- Destructive copy names the consequence: "This can't be undone."
- New boards are named from the date ("Sketch Oct 24"). Repeats get a suffix ("Sketch Oct 24 (2)").

---

## 9. Anti-Patterns (Banned)

- No emojis in UI copy, component labels, or board names the app generates.
- No Inter, no `system-ui` as the primary face, no serif fonts.
- No pure black (`#000000`) anywhere, including shadows. Shadows are tinted Zinc.
- No neon, no outer glows, no gradient fills, no gradient text.
- No Excalidraw default violet left in the chrome.
- No glassmorphism or `backdrop-filter` panels over the canvas.
- No spinners. Use skeletons.
- No custom mouse cursors.
- No centered hero or centered empty-state composition.
- No three-equal-column card rows. The palette is a two-column tile grid; the board list is a flat list.
- No filler text ("Scroll to explore") and no bouncing chevrons.
- No AI copy clichés ("Elevate", "Seamless", "Unleash", "Next-gen", "Supercharge").
- No placeholder names ("John Doe", "Acme", "Nexus") in samples. The empty-state sample diagram uses real component names only.
- No fake round numbers in UI. Counts are real.
- No remote image URLs. Every image is a local sketch the user imported.
