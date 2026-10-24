import { loadFromBlob, MIME_TYPES, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import { putFiles } from "../storage/files";
import type { StoredFile, StoredScene } from "../types";

export const BOARD_FILE_ACCEPT = ".excalidraw,.json,.png,.svg,application/vnd.excalidraw+json";

/** True for files that hold a whole Excalidraw scene (as opposed to a sketch image). */
export function isBoardFile(file: { name: string; type: string }): boolean {
  return /\.excalidraw$/i.test(file.name) || file.type === MIME_TYPES.excalidraw;
}

export function boardNameFromFile(fileName: string): string {
  return fileName.replace(/\.(excalidraw|json|png|svg)$/i, "").trim();
}

/**
 * Reads a .excalidraw file, or a PNG/SVG exported with "Embed scene", into a board scene.
 * Images in the file are added to the sketch shelf.
 */
export async function readBoardFile(file: File): Promise<{ name: string; scene: StoredScene }> {
  const restored = await loadFromBlob(file, null, null);
  await putFiles(Object.values(restored.files ?? {}) as StoredFile[]);
  const data = JSON.parse(serializeAsJSON(restored.elements, restored.appState, {}, "local")) as ImportedDataState;
  return { name: boardNameFromFile(file.name), scene: { data } };
}

/** Opens the system file picker. Must be called from a user gesture. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `sdb-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
