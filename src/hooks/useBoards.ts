import { useCallback, useEffect, useState } from "react";
import { readPref, writePref } from "../lib/prefs";
import {
  createBoard,
  deleteBoard,
  duplicateBoard,
  getThumbnails,
  listBoards,
  renameBoard,
} from "../storage/boards";
import { toStorageError, type StorageError } from "../storage/errors";
import type { BoardId, BoardMeta, StoredScene } from "../types";

const ACTIVE_KEY = "sdb.activeBoard";

export function useBoards() {
  const [boards, setBoards] = useState<BoardMeta[] | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<BoardId, string>>({});
  const [activeId, setActiveId] = useState<BoardId | null>(null);
  const [error, setError] = useState<StorageError | null>(null);

  const fail = useCallback((err: unknown, what: string) => {
    console.error(`[sdb] ${what} failed`, err);
    setError(toStorageError(err));
  }, []);

  const refresh = useCallback(async (): Promise<BoardMeta[]> => {
    try {
      const list = await listBoards();
      setBoards(list);
      setError(null);
      return list;
    } catch (err) {
      fail(err, "listBoards");
      setBoards((prev) => prev ?? []);
      return [];
    }
  }, [fail]);

  const refreshThumbnails = useCallback(
    async (ids: readonly BoardId[]) => {
      try {
        const found = await getThumbnails(ids);
        setThumbnails((prev) => ({ ...prev, ...found }));
      } catch (err) {
        fail(err, "getThumbnails");
      }
    },
    [fail],
  );

  const select = useCallback((id: BoardId | null) => {
    setActiveId(id);
    writePref(ACTIVE_KEY, id);
  }, []);

  // Initial load. State is only set in the promise callbacks, after the effect has run.
  useEffect(() => {
    let cancelled = false;
    listBoards().then(
      (list) => {
        if (cancelled) return;
        setBoards(list);
        const stored = readPref(ACTIVE_KEY);
        setActiveId(list.find((b) => b.id === stored)?.id ?? list[0]?.id ?? null);
        void refreshThumbnails(list.map((b) => b.id));
      },
      (err: unknown) => {
        if (cancelled) return;
        fail(err, "listBoards");
        setBoards([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fail, refreshThumbnails]);

  const create = useCallback(
    async (opts?: { name?: string; scene?: StoredScene }) => {
      try {
        const meta = await createBoard(opts);
        await refresh();
        select(meta.id);
        return meta;
      } catch (err) {
        fail(err, "createBoard");
        return null;
      }
    },
    [fail, refresh, select],
  );

  const rename = useCallback(
    async (id: BoardId, name: string) => {
      try {
        await renameBoard(id, name);
        await refresh();
      } catch (err) {
        fail(err, "renameBoard");
      }
    },
    [fail, refresh],
  );

  const duplicate = useCallback(
    async (id: BoardId) => {
      try {
        const copy = await duplicateBoard(id);
        await refresh();
        if (copy) {
          select(copy.id);
          await refreshThumbnails([copy.id]);
        }
      } catch (err) {
        fail(err, "duplicateBoard");
      }
    },
    [fail, refresh, refreshThumbnails, select],
  );

  const remove = useCallback(
    async (id: BoardId) => {
      try {
        await deleteBoard(id);
        const list = await refresh();
        setThumbnails(({ [id]: _removed, ...rest }) => rest);
        if (id === activeId) select(list[0]?.id ?? null);
      } catch (err) {
        fail(err, "deleteBoard");
      }
    },
    [activeId, fail, refresh, select],
  );

  const active = boards?.find((b) => b.id === activeId) ?? null;

  return {
    boards,
    thumbnails,
    active,
    activeId,
    error,
    loading: boards === null,
    refresh,
    refreshThumbnails,
    select,
    create,
    rename,
    duplicate,
    remove,
  };
}
