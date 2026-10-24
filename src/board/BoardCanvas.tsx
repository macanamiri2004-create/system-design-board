import { Excalidraw, MainMenu, Sidebar, viewportCoordsToSceneCoords, WelcomeScreen } from "@excalidraw/excalidraw";
import type { FileId } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { ArchiveRestore, Download, FileInput, Shapes } from "lucide-react";
import { isBoardFile } from "../io/boardFiles";
import { nanoid } from "nanoid";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type DragEvent } from "react";
import { fitWithin, sceneCenter, type Point } from "../lib/geometry";
import { readPref, writePref } from "../lib/prefs";
import { findComponent, type ComponentDef } from "../palette/catalog";
import { ComponentPalette } from "../palette/ComponentPalette";
import { mainId, toSkeleton } from "../palette/toSkeleton";
import { measureImage } from "../sketches/importSketch";
import { MAX_PLACED_SIDE } from "../sketches/sketchFile";
import { SketchShelf } from "../sketches/SketchShelf";
import { StorageError } from "../storage/errors";
import { getFiles } from "../storage/files";
import type { BoardMeta, ResolvedTheme, SaveStatus, StoredFile } from "../types";
import { COMPONENT_MIME, insertSkeletons, SKETCH_MIME } from "./insert";
import { loadBoard } from "./loadBoard";
import { useAutosave, type SavedKind } from "./useAutosave";

export type BoardCanvasHandle = {
  flush(): Promise<void>;
  api(): ExcalidrawImperativeAPI | null;
};

type Props = {
  board: BoardMeta;
  theme: ResolvedTheme;
  onStatus(status: SaveStatus): void;
  onSaved(kind: SavedKind): void;
  /** Opens a .excalidraw (or scene-embedded PNG/SVG) file as a new board; `file` is set for drops. */
  onImportBoard(file?: File): void;
  onDownloadBackup(): void;
  onRestoreBackup(): void;
};

const SIDEBAR = "sdb";
const DOCKED_KEY = "sdb.sidebarDocked";
const OPEN_KEY = "sdb.sidebarOpen";
const CASCADE_STEP = 28;

const UI_OPTIONS: ExcalidrawProps["UIOptions"] = {
  canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: false },
};

const isOurDrag = (types: readonly string[]) => types.includes(COMPONENT_MIME) || types.includes(SKETCH_MIME);

export const BoardCanvas = forwardRef<BoardCanvasHandle, Props>(function BoardCanvas(
  { board, theme, onStatus, onSaved, onImportBoard, onDownloadBackup, onRestoreBackup },
  ref,
) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [docked, setDocked] = useState(() => readPref(DOCKED_KEY) !== "false");
  const lastInsert = useRef<(Point & { step: number }) | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autosave = useAutosave(board.id, onSaved);
  const { markLoaded, setStatus } = autosave;

  // Created once per mount (the parent keys this component by board id).
  const [initialData] = useState(() =>
    loadBoard(board.id).then(
      (loaded) => {
        markLoaded(loaded.version, loaded.fileIds);
        const openSidebar = readPref(OPEN_KEY) !== "false" && window.innerWidth >= 1024;
        return {
          ...loaded.initialData,
          appState: {
            ...loaded.initialData.appState,
            openSidebar: openSidebar ? { name: SIDEBAR, tab: "components" } : null,
          },
        };
      },
      (err: unknown) => {
        // Never mark as loaded: saving stays off so an empty editor can't overwrite the stored board.
        console.error("[sdb] loadBoard failed", { boardId: board.id, err });
        setStatus({ kind: "load-error", error: new StorageError("Couldn't load this board", "unavailable", { cause: err }) });
        return { elements: [] };
      },
    ),
  );

  useImperativeHandle(ref, () => ({ flush: autosave.flush, api: () => api }), [autosave.flush, api]);

  useEffect(() => {
    onStatus(autosave.status);
  }, [autosave.status, onStatus]);

  /**
   * Center of the visible canvas, nudged diagonally when several things are added without moving the view.
   * An undocked sidebar floats over the canvas, so its width is left out.
   */
  const nextInsertPoint = useCallback((): Point | null => {
    if (!api) return null;
    const appState = api.getAppState();
    const overlay = appState.openSidebar && !docked ? wrapperRef.current?.querySelector(".sidebar") : null;
    const covered = overlay ? overlay.getBoundingClientRect().width : 0;
    const center = sceneCenter({ ...appState, width: Math.max(appState.width - covered, appState.width / 3) });
    const prev = lastInsert.current;
    const same = prev && Math.abs(prev.x - center.x) < 1 && Math.abs(prev.y - center.y) < 1;
    const step = same ? (prev.step + 1) % 6 : 0;
    lastInsert.current = { ...center, step };
    return { x: center.x + step * CASCADE_STEP, y: center.y + step * CASCADE_STEP };
  }, [api, docked]);

  const insertComponent = useCallback(
    (def: ComponentDef, at?: Point) => {
      const point = at ?? nextInsertPoint();
      if (!api || !point) return;
      insertSkeletons(api, toSkeleton(def, point, nanoid(10)));
    },
    [api, nextInsertPoint],
  );

  const insertSketch = useCallback(
    async (file: StoredFile, at?: Point) => {
      const point = at ?? nextInsertPoint();
      if (!api || !point) return;
      try {
        // Images pasted straight onto a canvas reach the shelf without a recorded size.
        const natural =
          file.width && file.height ? { width: file.width, height: file.height } : await measureImage(file.dataURL);
        const size = fitWithin(natural.width, natural.height, MAX_PLACED_SIDE);
        const instanceId = nanoid(10);
        // The file must be registered before the element that shows it, or it renders as a broken placeholder.
        api.addFiles([file]);
        insertSkeletons(api, [
          {
            type: "image",
            id: mainId(instanceId),
            fileId: file.id as FileId,
            status: "saved",
            x: point.x - size.width / 2,
            y: point.y - size.height / 2,
            width: size.width,
            height: size.height,
            customData: { sdb: { kind: "sketch", instanceId } },
          },
        ]);
      } catch (err) {
        console.error("[sdb] insertSketch failed", { fileId: file.id, err });
        api.setToast({ message: "Couldn't place that sketch.", closable: true, duration: 4000 });
      }
    },
    [api, nextInsertPoint],
  );

  const onDragOverCapture = (e: DragEvent<HTMLDivElement>) => {
    if (!isOurDrag(e.dataTransfer.types)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDropCapture = (e: DragEvent<HTMLDivElement>) => {
    // Excalidraw would load a dropped .excalidraw file over the current board; open it as a new board instead.
    const boardFile = [...e.dataTransfer.files].find(isBoardFile);
    if (boardFile) {
      e.preventDefault();
      e.stopPropagation();
      onImportBoard(boardFile);
      return;
    }
    if (!isOurDrag(e.dataTransfer.types)) return;
    e.preventDefault();
    e.stopPropagation();
    // Dropped back onto the sidebar: treat as cancelled.
    if (!api || (e.target as HTMLElement).closest(".sidebar")) return;
    const point = viewportCoordsToSceneCoords({ clientX: e.clientX, clientY: e.clientY }, api.getAppState());
    const def = findComponent(e.dataTransfer.getData(COMPONENT_MIME));
    if (def) insertComponent(def, point);
    const sketchId = e.dataTransfer.getData(SKETCH_MIME);
    if (sketchId) {
      getFiles([sketchId]).then(
        (files) => {
          const file = files[sketchId];
          if (file) void insertSketch(file, point);
        },
        (err: unknown) => console.error("[sdb] getFiles failed", { sketchId, err }),
      );
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="board-canvas"
      onDragOverCapture={onDragOverCapture}
      onDropCapture={onDropCapture}
    >
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={initialData}
        onChange={autosave.onChange}
        theme={theme}
        name={board.name}
        UIOptions={UI_OPTIONS}
        renderTopRightUI={(isMobile) => (
          // Icon only on phones, where Excalidraw's tool strip needs the width.
          <Sidebar.Trigger
            name={SIDEBAR}
            tab="components"
            title="Components and sketches"
            icon={<Shapes size={16} aria-hidden />}
          >
            {isMobile ? null : "Components"}
          </Sidebar.Trigger>
        )}
      >
        <WelcomeScreen>
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Heading>
              Drag a component from the palette, or drop a photo of a paper sketch.
            </WelcomeScreen.Center.Heading>
          </WelcomeScreen.Center>
        </WelcomeScreen>
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.Item icon={<FileInput size={16} aria-hidden />} onSelect={() => onImportBoard()}>
            Import .excalidraw as new board
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.Item icon={<Download size={16} aria-hidden />} onSelect={onDownloadBackup}>
            Download backup
          </MainMenu.Item>
          <MainMenu.Item icon={<ArchiveRestore size={16} aria-hidden />} onSelect={onRestoreBackup}>
            Restore from backup
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
        <Sidebar
          name={SIDEBAR}
          className="sdb-sidebar"
          docked={docked}
          onDock={(next) => {
            setDocked(next);
            writePref(DOCKED_KEY, String(next));
          }}
          onStateChange={(state) => writePref(OPEN_KEY, String(state?.name === SIDEBAR))}
        >
          {/* Same structure as Excalidraw's DefaultSidebar: tab triggers live in the header, above the panels. */}
          <Sidebar.Tabs>
            <Sidebar.Header>
              <Sidebar.TabTriggers>
                <Sidebar.TabTrigger tab="components">Components</Sidebar.TabTrigger>
                <Sidebar.TabTrigger tab="sketches">Sketches</Sidebar.TabTrigger>
              </Sidebar.TabTriggers>
            </Sidebar.Header>
            <Sidebar.Tab tab="components">
              <ComponentPalette onInsert={(def) => insertComponent(def)} />
            </Sidebar.Tab>
            <Sidebar.Tab tab="sketches">
              <SketchShelf onInsert={(file) => void insertSketch(file)} />
            </Sidebar.Tab>
          </Sidebar.Tabs>
        </Sidebar>
      </Excalidraw>
    </div>
  );
});
