import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { del, getMany, setMany, values } from "idb-keyval";
import type { StoredFile, StoredScene } from "../types";
import { loadAllScenes } from "./boards";
import { filesStore } from "./db";
import { guard, StorageError } from "./errors";

/**
 * "change": the shelf gained or lost a file.
 * "usage": a board was saved, so which sketches are in use may have changed.
 */
export const shelfEvents = new EventTarget();

function emitChange() {
  shelfEvents.dispatchEvent(new Event("change"));
}

export function emitUsageChange() {
  shelfEvents.dispatchEvent(new Event("usage"));
}

/** Stores files that aren't stored yet. Ids are content hashes, so an existing id means identical content. */
export function putFiles(files: readonly StoredFile[]): Promise<string[]> {
  return guard(async () => {
    const unique = [...new Map(files.map((f) => [f.id, f])).values()];
    if (unique.length === 0) return [];
    const store = filesStore();
    const existing = await getMany<StoredFile | undefined>(
      unique.map((f) => f.id),
      store,
    );
    const missing = unique.filter((_, i) => !existing[i]);
    if (missing.length === 0) return [];
    await setMany(
      missing.map((f) => [f.id, f]),
      store,
    );
    emitChange();
    return missing.map((f) => f.id);
  });
}

export function getFiles(ids: readonly string[]): Promise<BinaryFiles> {
  return guard(async () => {
    const unique = [...new Set(ids)];
    const found = await getMany<StoredFile | undefined>(unique, filesStore());
    const out: BinaryFiles = {};
    for (const file of found) if (file) out[file.id] = file;
    return out;
  });
}

/** Every stored sketch, newest first. */
export function listShelf(): Promise<StoredFile[]> {
  return guard(async () => (await values<StoredFile>(filesStore())).sort((a, b) => b.created - a.created));
}

export function imageFileIds(scene: StoredScene): string[] {
  const elements = scene.data?.elements ?? [];
  return elements.flatMap((el) => (el.type === "image" && !el.isDeleted && el.fileId ? [el.fileId] : []));
}

/** File ids used by at least one board. */
export function referencedFileIds(): Promise<Set<string>> {
  return guard(async () => {
    const ids = new Set<string>();
    for (const scene of (await loadAllScenes()).values()) for (const id of imageFileIds(scene)) ids.add(id);
    return ids;
  });
}

export function removeFromShelf(id: string): Promise<void> {
  return guard(async () => {
    if ((await referencedFileIds()).has(id)) {
      throw new StorageError("This sketch is used on a board", "in-use");
    }
    await del(id, filesStore());
    emitChange();
  });
}
