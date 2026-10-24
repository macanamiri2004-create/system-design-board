// Copies Excalidraw's font files into public/ so the canvas works offline.
// Runs before `npm run dev` and `npm run build` (see package.json).
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../node_modules/@excalidraw/excalidraw/dist/prod/fonts", import.meta.url));
const dest = fileURLToPath(new URL("../public/fonts", import.meta.url));

if (!existsSync(src)) {
  console.error("[sdb] Excalidraw fonts not found at", src);
  process.exit(1);
}

cpSync(src, dest, { recursive: true });
