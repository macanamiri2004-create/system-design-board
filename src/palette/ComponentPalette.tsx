import { convertToExcalidrawElements, exportToSvg } from "@excalidraw/excalidraw";
import { useEffect, useReducer } from "react";
import { COMPONENT_MIME } from "../board/insert";
import { CATALOG, TIER_LABEL, TIER_ORDER, type ComponentDef } from "./catalog";
import styles from "./ComponentPalette.module.css";
import { toSkeleton } from "./toSkeleton";

// Previews are the real hand-drawn rendering of each component, generated once per session.
const previewCache = new Map<string, string>();
let building: Promise<void> | null = null;

async function buildPreviews(): Promise<void> {
  for (const def of CATALOG) {
    if (previewCache.has(def.kind)) continue;
    const elements = convertToExcalidrawElements(toSkeleton(def, { x: 0, y: 0 }, `preview-${def.kind}`), {
      regenerateIds: false,
    });
    const svg = await exportToSvg({
      elements,
      appState: { exportBackground: false, exportWithDarkMode: false, viewBackgroundColor: "transparent" },
      files: null,
      exportPadding: 6,
    });
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    previewCache.set(def.kind, svg.outerHTML);
  }
}

function usePreviews(): Map<string, string> {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    let alive = true;
    building ??= buildPreviews();
    building.then(
      () => alive && rerender(),
      (err: unknown) => console.warn("[sdb] palette previews failed", err),
    );
    return () => {
      alive = false;
    };
  }, []);
  return previewCache;
}

type Props = { onInsert(def: ComponentDef): void };

export function ComponentPalette({ onInsert }: Props) {
  const previews = usePreviews();

  return (
    <div className={styles.palette}>
      <p className={styles.hint}>Click to add at the center, or drag onto the board.</p>
      {TIER_ORDER.map((tier) => (
        <section key={tier} className={styles.section} aria-label={TIER_LABEL[tier]}>
          <h3 className="section-label">{TIER_LABEL[tier]}</h3>
          <div className={styles.grid}>
            {CATALOG.filter((def) => def.tier === tier).map((def) => {
              const svg = previews.get(def.kind);
              return (
                <button
                  key={def.kind}
                  type="button"
                  className={styles.tile}
                  draggable
                  aria-label={`Add ${def.label}`}
                  onClick={() => onInsert(def)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(COMPONENT_MIME, def.kind);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  {svg ? (
                    // Markup generated locally by exportToSvg from the static catalog above.
                    <span className={styles.preview} aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />
                  ) : (
                    <span className={`skeleton ${styles.preview}`} aria-hidden />
                  )}
                  <span className={styles.caption}>{def.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
