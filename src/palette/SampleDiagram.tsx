import { convertToExcalidrawElements, exportToSvg } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { useEffect, useState } from "react";
import { findComponent } from "./catalog";
import { mainId, toSkeleton } from "./toSkeleton";

const CHAIN = ["client", "service", "database"] as const;
const SPACING = 260;

let cached: string | null = null;

async function buildSample(): Promise<string> {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  CHAIN.forEach((kind, i) => {
    const def = findComponent(kind);
    if (def) skeletons.push(...toSkeleton(def, { x: i * SPACING, y: 0 }, `sample-${kind}`));
  });
  for (let i = 0; i < CHAIN.length - 1; i++) {
    skeletons.push({
      type: "arrow",
      x: i * SPACING + 90,
      y: 0,
      strokeColor: "#1e1e1e",
      strokeWidth: 2,
      roughness: 1,
      start: { id: mainId(`sample-${CHAIN[i]}`) },
      end: { id: mainId(`sample-${CHAIN[i + 1]}`) },
    });
  }
  const svg = await exportToSvg({
    elements: convertToExcalidrawElements(skeletons, { regenerateIds: false }),
    appState: { exportBackground: false, exportWithDarkMode: false, viewBackgroundColor: "transparent" },
    files: null,
    exportPadding: 8,
  });
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  return svg.outerHTML;
}

/** A small static client, service and database chain, drawn by Excalidraw itself. */
export function SampleDiagram() {
  const [markup, setMarkup] = useState(cached);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    buildSample().then(
      (svg) => {
        cached = svg;
        if (alive) setMarkup(svg);
      },
      (err: unknown) => console.warn("[sdb] sample diagram failed", err),
    );
    return () => {
      alive = false;
    };
  }, []);

  // Markup generated locally by exportToSvg from the static catalog.
  return markup ? <div dangerouslySetInnerHTML={{ __html: markup }} /> : null;
}
