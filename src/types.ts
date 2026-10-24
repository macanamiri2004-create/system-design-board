import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";

export type BoardId = string;

export type BoardMeta = {
  id: BoardId;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type Viewport = { scrollX: number; scrollY: number; zoom: number };

/** `data` is JSON.parse(serializeAsJSON(elements, appState, {}, "local")). Image files are stored separately. */
export type StoredScene = { data: ImportedDataState | null; viewport?: Viewport };

export type StoredFile = BinaryFileData & { name?: string; width?: number; height?: number };

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; error: Error }
  | { kind: "load-error"; error: Error };

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
