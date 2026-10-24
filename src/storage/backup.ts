import { nanoid } from "nanoid";
import type { BoardMeta, StoredFile, StoredScene } from "../types";
import { listBoards, loadAllScenes, putBoard } from "./boards";
import { guard, StorageError } from "./errors";
import { listShelf, putFiles } from "./files";

export const BACKUP_FORMAT = "sdb-backup";
export const BACKUP_VERSION = 1;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  boards: { meta: BoardMeta; scene: StoredScene }[];
  files: StoredFile[];
};

/** Snapshot of every board and every sketch. Thumbnails are left out and regenerate on the next save. */
export function createBackup(now = new Date()): Promise<Backup> {
  return guard(async () => {
    const [metas, scenes, files] = await Promise.all([listBoards(), loadAllScenes(), listShelf()]);
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      boards: metas.map((meta) => ({ meta, scene: scenes.get(meta.id) ?? { data: null } })),
      files,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseBackup(text: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new StorageError("This file isn't valid JSON", "invalid", { cause: err });
  }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new StorageError("This file isn't an SDB backup", "invalid");
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new StorageError(`Unsupported backup version: ${String(parsed.version)}`, "invalid");
  }
  if (!Array.isArray(parsed.boards) || !Array.isArray(parsed.files)) {
    throw new StorageError("This backup is missing its boards or files", "invalid");
  }
  for (const entry of parsed.boards) {
    const meta = isRecord(entry) ? entry.meta : undefined;
    if (!isRecord(meta) || typeof meta.id !== "string" || typeof meta.name !== "string") {
      throw new StorageError("This backup has a board with no id or name", "invalid");
    }
  }
  return parsed as Backup;
}

/** Restores a backup alongside existing boards. Boards whose id already exists come back as "(restored)" copies. */
export function restoreBackup(backup: Backup): Promise<{ added: number; renamed: number }> {
  return guard(async () => {
    await putFiles(backup.files);
    const existing = new Set((await listBoards()).map((m) => m.id));
    let renamed = 0;
    for (const { meta, scene } of backup.boards) {
      if (existing.has(meta.id)) {
        renamed++;
        await putBoard({ ...meta, id: nanoid(), name: `${meta.name} (restored)` }, scene);
      } else {
        await putBoard(meta, scene);
      }
    }
    return { added: backup.boards.length, renamed };
  });
}
