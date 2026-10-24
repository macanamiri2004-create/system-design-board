// Test helpers for the storage layer. Import "fake-indexeddb/auto" before this module.
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import { clear } from "idb-keyval";
import type { StoredFile, StoredScene } from "../types";
import { boardsStore, filesStore } from "./db";

export async function resetStores() {
  await clear(boardsStore());
  await clear(filesStore());
}

/** A scene holding the given elements. Shapes are partial: storage only reads type, fileId and isDeleted. */
export function sceneWith(elements: Record<string, unknown>[]): StoredScene {
  return { data: { type: "excalidraw", version: 2, elements } as unknown as ImportedDataState };
}

export function fakeFile(id: string, created = 1): StoredFile {
  return { id, mimeType: "image/png", dataURL: `data:image/png;base64,${id}`, created } as StoredFile;
}
