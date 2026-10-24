import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawLinearElement } from "@excalidraw/excalidraw/element/types";
import type { Point } from "../lib/geometry";
import { TIER_FILL, type ComponentDef } from "./catalog";

// Values of FONT_FAMILY.Excalifont and ROUNDNESS.ADAPTIVE_RADIUS (dist/types/excalidraw/constants.d.ts).
// Mirrored because the Excalidraw package can't be imported in Node tests.
export const EXCALIFONT = 5;
export const ADAPTIVE_RADIUS = 3 as const;

const MARKER_INK = "#1e1e1e";
const BOUNDARY_GREY = "#868e96";
const LABEL_SIZE = 20;
const CAPTION_SIZE = 16;
const STACK_OFFSET = 6;

export type SdbCustomData = { sdb: { kind: string; instanceId: string } };

/** The element arrows should bind to: the labeled container, or the front rectangle. */
export const mainId = (instanceId: string) => `${instanceId}-main`;

/**
 * Builds Excalidraw skeletons for one component centered on `center`. Every part shares one group
 * (`instanceId`) so the component selects, moves and undoes as a unit.
 */
export function toSkeleton(def: ComponentDef, center: Point, instanceId: string): ExcalidrawElementSkeleton[] {
  const x = center.x - def.w / 2;
  const y = center.y - def.h / 2;
  const customData: SdbCustomData = { sdb: { kind: def.kind, instanceId } };
  let part = 0;
  const nextId = () => `${instanceId}-${part++}`;

  const shared = {
    strokeColor: MARKER_INK,
    backgroundColor: TIER_FILL[def.tier],
    fillStyle: "solid" as const,
    strokeWidth: 2,
    roughness: 1,
    groupIds: [instanceId],
    customData,
  };
  const rounded = { roundness: { type: ADAPTIVE_RADIUS } } as const;
  const label = {
    text: def.label,
    fontSize: LABEL_SIZE,
    fontFamily: EXCALIFONT,
    strokeColor: MARKER_INK,
    groupIds: [instanceId],
    customData,
  };
  const caption = (cx: number, cy: number, size: number, align: "left" | "center", color = MARKER_INK) =>
    ({
      type: "text",
      id: nextId(),
      x: cx,
      y: cy,
      text: def.label,
      fontSize: size,
      fontFamily: EXCALIFONT,
      textAlign: align,
      strokeColor: color,
      groupIds: [instanceId],
      customData,
    }) satisfies ExcalidrawElementSkeleton;

  switch (def.recipe) {
    case "box":
    case "rounded":
    case "dashed":
    case "dotted":
      return [
        {
          type: "rectangle",
          id: mainId(instanceId),
          x,
          y,
          width: def.w,
          height: def.h,
          ...shared,
          ...(def.recipe === "box" ? { roundness: null } : rounded),
          ...(def.recipe === "dashed" ? { strokeStyle: "dashed" as const } : {}),
          ...(def.recipe === "dotted" ? { strokeStyle: "dotted" as const } : {}),
          label,
        },
      ];

    case "ellipse":
    case "diamond":
      return [{ type: def.recipe, id: mainId(instanceId), x, y, width: def.w, height: def.h, ...shared, label }];

    case "cylinder": {
      const capH = Math.round(def.h * 0.28);
      return [
        {
          type: "rectangle",
          id: mainId(instanceId),
          x,
          y: y + capH / 2,
          width: def.w,
          height: def.h - capH / 2,
          ...shared,
          roundness: null,
          label: { ...label, verticalAlign: "middle" },
        },
        // Listed after the body so it draws on top and hides the body's top edge.
        { type: "ellipse", id: nextId(), x, y, width: def.w, height: capH, ...shared },
      ];
    }

    case "queue": {
      const count = def.dividers ?? 3;
      const dividers: ExcalidrawElementSkeleton[] = Array.from({ length: count }, (_, i) => ({
        type: "line",
        id: nextId(),
        x: x + (def.w * (i + 1)) / (count + 1),
        y,
        points: [
          [0, 0],
          [0, def.h],
        ] as unknown as ExcalidrawLinearElement["points"],
        ...shared,
        backgroundColor: "transparent",
      }));
      return [
        { type: "rectangle", id: mainId(instanceId), x, y, width: def.w, height: def.h, ...shared, roundness: null },
        ...dividers,
        caption(center.x, y + def.h + 8, LABEL_SIZE, "center"),
      ];
    }

    case "stack": {
      const w = def.w - STACK_OFFSET * 2;
      const h = def.h - STACK_OFFSET * 2;
      return [
        { type: "rectangle", id: nextId(), x: x + STACK_OFFSET * 2, y, width: w, height: h, ...shared, ...rounded },
        {
          type: "rectangle",
          id: nextId(),
          x: x + STACK_OFFSET,
          y: y + STACK_OFFSET,
          width: w,
          height: h,
          ...shared,
          ...rounded,
        },
        {
          type: "rectangle",
          id: mainId(instanceId),
          x,
          y: y + STACK_OFFSET * 2,
          width: w,
          height: h,
          ...shared,
          ...rounded,
          label,
        },
      ];
    }

    case "boundary":
      return [
        {
          type: "rectangle",
          id: mainId(instanceId),
          x,
          y,
          width: def.w,
          height: def.h,
          ...shared,
          ...rounded,
          strokeColor: BOUNDARY_GREY,
          strokeStyle: "dashed",
          backgroundColor: "transparent",
        },
        caption(x + 16, y + 12, CAPTION_SIZE, "left", BOUNDARY_GREY),
      ];
  }
}
