import { getSceneVersion, restore } from "@excalidraw/excalidraw";
import type { ExcalidrawInitialDataState, NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { loadScene } from "../storage/boards";
import { getFiles } from "../storage/files";
import type { BoardId } from "../types";

export type LoadedBoard = {
  initialData: ExcalidrawInitialDataState;
  version: number;
  fileIds: string[];
};

/** Reads a board from storage and shapes it for Excalidraw's `initialData`. */
export async function loadBoard(boardId: BoardId): Promise<LoadedBoard> {
  const stored = await loadScene(boardId);
  const restored = restore(stored?.data ?? null, null, null);
  const fileIds = restored.elements.flatMap((el) => (el.type === "image" && el.fileId ? [el.fileId] : []));
  const files = await getFiles(fileIds);
  const viewport = stored?.viewport;
  return {
    initialData: {
      elements: restored.elements,
      appState: viewport
        ? {
            ...restored.appState,
            scrollX: viewport.scrollX,
            scrollY: viewport.scrollY,
            zoom: { value: viewport.zoom as NormalizedZoomValue },
          }
        : restored.appState,
      files,
      scrollToContent: !viewport && restored.elements.length > 0,
    },
    version: getSceneVersion(restored.elements),
    fileIds,
  };
}
