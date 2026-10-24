import { CaptureUpdateAction, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

/** Drag payload types. Never set text/plain on these drags: Excalidraw would turn it into a text element. */
export const COMPONENT_MIME = "application/x-sdb-component";
export const SKETCH_MIME = "application/x-sdb-sketch";

/** Adds elements to the scene as one undoable step and selects them. */
export function insertSkeletons(api: ExcalidrawImperativeAPI, skeletons: ExcalidrawElementSkeleton[]) {
  const created = convertToExcalidrawElements(skeletons, { regenerateIds: false });
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...created],
    appState: {
      selectedElementIds: Object.fromEntries(created.map((el) => [el.id, true as const])),
      selectedGroupIds: Object.fromEntries(created.flatMap((el) => el.groupIds).map((id) => [id, true])),
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  api.setActiveTool({ type: "selection" });
  return created;
}
