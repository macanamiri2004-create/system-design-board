import { exportToBlob, getDataURL, getNonDeletedElements, getSceneVersion, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveScene, saveThumbnail, saveViewport } from "../storage/boards";
import { toStorageError } from "../storage/errors";
import { emitUsageChange, putFiles } from "../storage/files";
import type { BoardId, SaveStatus, StoredFile, Viewport } from "../types";

const SCENE_DEBOUNCE_MS = 400;
const VIEWPORT_DEBOUNCE_MS = 1000;
const THUMBNAIL_INTERVAL_MS = 8000;

type OnChange = NonNullable<ExcalidrawProps["onChange"]>;
type Snapshot = { elements: Parameters<OnChange>[0]; appState: Parameters<OnChange>[1]; files: Parameters<OnChange>[2] };

export type SavedKind = "scene" | "thumbnail";

/**
 * Persists an Excalidraw board as it changes: content after a 400ms pause, viewport after 1s,
 * new image files immediately, and a small thumbnail at most every 8s.
 */
export function useAutosave(boardId: BoardId, onSaved: (kind: SavedKind) => void) {
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const latest = useRef<Snapshot | null>(null);
  const loaded = useRef(false);
  const lastVersion = useRef<number | null>(null);
  const dirty = useRef(false);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viewportTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastViewportKey = useRef("");
  const pendingViewport = useRef<Viewport | null>(null);
  const persistedFileIds = useRef(new Set<string>());
  const lastThumbnailAt = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const report = useCallback(
    (err: unknown, what: string) => {
      console.error(`[sdb] ${what} failed`, { boardId, err });
      setStatus({ kind: "error", error: toStorageError(err) });
    },
    [boardId],
  );

  const writeThumbnail = useCallback(
    async ({ elements, appState, files }: Snapshot) => {
      const visible = getNonDeletedElements(elements);
      if (visible.length === 0 || Date.now() - lastThumbnailAt.current < THUMBNAIL_INTERVAL_MS) return;
      lastThumbnailAt.current = Date.now();
      try {
        const blob = await exportToBlob({
          elements: visible,
          appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
          files,
          mimeType: "image/webp",
          quality: 0.8,
          maxWidthOrHeight: 320,
        });
        await saveThumbnail(boardId, await getDataURL(blob));
        onSavedRef.current("thumbnail");
      } catch (err) {
        // A missing thumbnail is cosmetic: log it, don't flag the board as unsaved.
        console.warn("[sdb] thumbnail failed", { boardId, err });
      }
    },
    [boardId],
  );

  const saveSceneNow = useCallback(async () => {
    const snapshot = latest.current;
    if (!dirty.current || !snapshot) return;
    dirty.current = false;
    setStatus({ kind: "saving" });
    try {
      const data = JSON.parse(serializeAsJSON(snapshot.elements, snapshot.appState, {}, "local")) as ImportedDataState;
      await saveScene(boardId, data);
      setStatus({ kind: "saved", at: Date.now() });
      onSavedRef.current("scene");
      emitUsageChange();
      void writeThumbnail(snapshot);
    } catch (err) {
      dirty.current = true; // retried on the next change
      report(err, "saveScene");
    }
  }, [boardId, report, writeThumbnail]);

  const saveViewportNow = useCallback(async () => {
    const viewport = pendingViewport.current;
    if (!viewport) return;
    pendingViewport.current = null;
    try {
      await saveViewport(boardId, viewport);
    } catch (err) {
      report(err, "saveViewport");
    }
  }, [boardId, report]);

  /** Runs any pending work now. Saves are queued, so they never overlap or land out of order. */
  const flush = useCallback((): Promise<void> => {
    clearTimeout(sceneTimer.current);
    clearTimeout(viewportTimer.current);
    queue.current = queue.current.then(saveViewportNow).then(saveSceneNow);
    return queue.current;
  }, [saveSceneNow, saveViewportNow]);

  /** Call once the stored scene is in the editor, so loading doesn't count as an edit. */
  const markLoaded = useCallback((version: number, fileIds: readonly string[]) => {
    lastVersion.current = version;
    for (const id of fileIds) persistedFileIds.current.add(id);
    loaded.current = true;
  }, []);

  const onChange = useCallback<OnChange>(
    (elements, appState, files) => {
      if (!loaded.current) return;
      latest.current = { elements, appState, files };

      const version = getSceneVersion(elements);
      if (version !== lastVersion.current) {
        lastVersion.current = version;
        dirty.current = true;
        clearTimeout(sceneTimer.current);
        sceneTimer.current = setTimeout(() => {
          queue.current = queue.current.then(saveSceneNow);
        }, SCENE_DEBOUNCE_MS);
      }

      const fresh = Object.values(files).filter((f) => !persistedFileIds.current.has(f.id)) as StoredFile[];
      if (fresh.length > 0) {
        for (const f of fresh) persistedFileIds.current.add(f.id);
        putFiles(fresh).catch((err) => {
          for (const f of fresh) persistedFileIds.current.delete(f.id);
          report(err, "putFiles");
        });
      }

      const viewport = { scrollX: appState.scrollX, scrollY: appState.scrollY, zoom: appState.zoom.value };
      const key = `${viewport.scrollX}|${viewport.scrollY}|${viewport.zoom}`;
      if (key !== lastViewportKey.current) {
        lastViewportKey.current = key;
        pendingViewport.current = viewport;
        clearTimeout(viewportTimer.current);
        viewportTimer.current = setTimeout(() => {
          queue.current = queue.current.then(saveViewportNow);
        }, VIEWPORT_DEBOUNCE_MS);
      }
    },
    [report, saveSceneNow, saveViewportNow],
  );

  // Flush when the tab is hidden or closed, and when this board unmounts (switching boards).
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      void flush();
    };
  }, [flush]);

  return { status, onChange, flush, markLoaded, setStatus };
}
