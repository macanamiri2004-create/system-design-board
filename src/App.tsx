import { useCallback, useEffect, useRef, useState } from "react";
import { BoardCanvas, type BoardCanvasHandle } from "./board/BoardCanvas";
import type { SavedKind } from "./board/useAutosave";
import { useBoards } from "./hooks/useBoards";
import { useTheme } from "./hooks/useTheme";
import { BOARD_FILE_ACCEPT, backupFileName, downloadBlob, pickFile, readBoardFile } from "./io/boardFiles";
import { readPref, writePref } from "./lib/prefs";
import { SampleDiagram } from "./palette/SampleDiagram";
import { BoardRail } from "./shell/BoardRail";
import { EmptyState } from "./shell/EmptyState";
import { TopBar } from "./shell/TopBar";
import { createBackup, parseBackup, restoreBackup } from "./storage/backup";
import { StorageError } from "./storage/errors";
import type { BoardId, SaveStatus } from "./types";

const RAIL_KEY = "sdb.railOpen";
const PERSIST_KEY = "sdb.persistRequested";
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

function initialRailOpen(): boolean {
  if (isMobile()) return false;
  const stored = readPref(RAIL_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(min-width: 1024px)").matches;
}

/** Current time, refreshed every minute, for relative timestamps. */
function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function App() {
  const theme = useTheme();
  const boards = useBoards();
  const now = useNow();
  const canvasRef = useRef<BoardCanvasHandle>(null);
  const railRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [railOpen, setRailOpen] = useState(initialRailOpen);
  const [railError, setRailError] = useState<string | null>(null);
  const { active, activeId, refresh, refreshThumbnails, select, create, rename, duplicate, remove } = boards;

  // Ask once for persistent storage so the browser is less likely to evict boards under disk pressure.
  useEffect(() => {
    if (readPref(PERSIST_KEY)) return;
    writePref(PERSIST_KEY, "1");
    navigator.storage?.persist?.().catch((err: unknown) => console.warn("[sdb] storage.persist failed", err));
  }, []);

  /** Shows a message on the canvas, or in the rail when no board is open. */
  const notify = useCallback((message: string, isError = false) => {
    const api = canvasRef.current?.api();
    if (api) api.setToast({ message, closable: true, duration: isError ? 8000 : 4000 });
    else if (isError) setRailError(message);
  }, []);

  const setRail = useCallback((open: boolean) => {
    setRailOpen(open);
    if (!isMobile()) writePref(RAIL_KEY, String(open));
  }, []);

  const closeDrawer = useCallback(() => {
    if (!isMobile()) return;
    setRailOpen(false);
    document.querySelector<HTMLButtonElement>('[aria-controls="board-rail"]')?.focus();
  }, []);

  // A closed rail (collapsed column or off-screen drawer) must not hold keyboard focus.
  useEffect(() => {
    if (railRef.current) railRef.current.inert = !railOpen;
  }, [railOpen]);

  // Mobile drawer: move focus in on open, close on Escape.
  useEffect(() => {
    if (!railOpen || !isMobile()) return;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen, closeDrawer]);

  /** Saves the open board's pending changes before anything replaces it. */
  const afterFlush = useCallback(async (action: () => unknown) => {
    await canvasRef.current?.flush();
    await action();
  }, []);

  const onSelect = (id: BoardId) => {
    if (id !== activeId) void afterFlush(() => select(id));
    closeDrawer();
  };

  const onCreate = () => {
    setRailError(null);
    void afterFlush(() => create());
    closeDrawer();
  };

  const onDuplicate = (id: BoardId) => void afterFlush(() => duplicate(id));

  const onSaved = useCallback(
    (kind: SavedKind) => {
      if (kind === "scene") void refresh();
      else if (activeId) void refreshThumbnails([activeId]);
    },
    [activeId, refresh, refreshThumbnails],
  );

  const importBoard = useCallback(
    async (dropped?: File) => {
      // pickFile runs before any await so the file dialog keeps the menu click's user gesture.
      const file = dropped ?? (await pickFile(BOARD_FILE_ACCEPT));
      if (!file) return;
      try {
        const { name, scene } = await readBoardFile(file);
        await afterFlush(() => create({ name: name || undefined, scene }));
      } catch (err) {
        console.error("[sdb] importBoard failed", { name: file.name, err });
        notify(`Couldn't open ${file.name}. Use a .excalidraw file, or a PNG or SVG exported with "Embed scene".`, true);
      }
    },
    [afterFlush, create, notify],
  );

  const downloadBackup = useCallback(async () => {
    try {
      await canvasRef.current?.flush();
      const backup = await createBackup();
      downloadBlob(new Blob([JSON.stringify(backup)], { type: "application/json" }), backupFileName());
      notify(`Backup saved: ${backup.boards.length} boards, ${backup.files.length} sketches.`);
    } catch (err) {
      console.error("[sdb] downloadBackup failed", err);
      notify("Couldn't create a backup.", true);
    }
  }, [notify]);

  const restoreFromBackup = useCallback(async () => {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      await canvasRef.current?.flush();
      const { added, renamed } = await restoreBackup(backup);
      const list = await refresh();
      if (!activeId && list[0]) select(list[0].id);
      setRailError(null);
      notify(`Restored ${added} boards${renamed ? `, ${renamed} as copies of boards you already had` : ""}.`);
    } catch (err) {
      console.error("[sdb] restoreBackup failed", { name: file.name, err });
      notify(err instanceof StorageError && err.kind === "invalid" ? `${err.message}.` : "Couldn't restore that backup.", true);
    }
  }, [activeId, notify, refresh, select]);

  const storageNotice =
    boards.error?.kind === "unavailable"
      ? "Boards can't be saved in this window."
      : boards.error
        ? `${boards.error.message}. Try again.`
        : null;

  return (
    <div className="shell" data-rail={railOpen ? "open" : "closed"}>
      <aside className="shell__rail" ref={railRef}>
        <BoardRail
          boards={boards.boards}
          thumbnails={boards.thumbnails}
          activeId={activeId}
          now={now}
          notice={storageNotice ?? railError}
          searchRef={searchRef}
          onSelect={onSelect}
          onCreate={onCreate}
          onRename={(id, name) => void rename(id, name)}
          onDuplicate={onDuplicate}
          onDelete={(id) => void remove(id)}
        />
      </aside>
      <button type="button" className="shell__scrim" aria-label="Close board list" tabIndex={-1} onClick={closeDrawer} />

      <header className="shell__top">
        <TopBar
          board={active}
          status={status}
          railOpen={railOpen}
          themePref={theme.pref}
          onToggleRail={() => setRail(!railOpen)}
          onRename={(name) => active && void rename(active.id, name)}
          onCycleTheme={theme.cycle}
        />
      </header>

      <main className="shell__canvas">
        {active ? (
          <BoardCanvas
            key={active.id}
            ref={canvasRef}
            board={active}
            theme={theme.resolved}
            onStatus={setStatus}
            onSaved={onSaved}
            onImportBoard={(file) => void importBoard(file)}
            onDownloadBackup={() => void downloadBackup()}
            onRestoreBackup={() => void restoreFromBackup()}
          />
        ) : boards.boards?.length === 0 ? (
          <EmptyState onCreate={onCreate} onRestore={() => void restoreFromBackup()} sample={<SampleDiagram />} />
        ) : (
          <div className="canvas-loading" aria-label="Loading board" />
        )}
      </main>
    </div>
  );
}
