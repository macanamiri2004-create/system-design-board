import { ImagePlus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { SKETCH_MIME } from "../board/insert";
import { ConfirmDialog } from "../shell/ConfirmDialog";
import { listShelf, referencedFileIds, removeFromShelf, shelfEvents } from "../storage/files";
import type { StoredFile } from "../types";
import { importSketch } from "./importSketch";
import { ACCEPT_ATTR, SketchImportError } from "./sketchFile";
import styles from "./SketchShelf.module.css";

type Props = { onInsert(file: StoredFile): void };

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

export function SketchShelf({ onInsert }: Props) {
  const [items, setItems] = useState<StoredFile[] | null>(null);
  const [used, setUsed] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<StoredFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const [list, refs] = await Promise.all([listShelf(), referencedFileIds()]);
      setItems(list);
      setUsed(refs);
    } catch (err) {
      console.error("[sdb] listShelf failed", err);
      setError("Couldn't read your sketches.");
      setItems((prev) => prev ?? []);
    }
  }, []);

  const reloadUsage = useCallback(async () => {
    try {
      setUsed(await referencedFileIds());
    } catch (err) {
      console.error("[sdb] referencedFileIds failed", err);
    }
  }, []);

  // Initial load, then follow shelf and board changes. State is only set from callbacks.
  useEffect(() => {
    let alive = true;
    Promise.all([listShelf(), referencedFileIds()]).then(
      ([list, refs]) => {
        if (!alive) return;
        setItems(list);
        setUsed(refs);
      },
      (err: unknown) => {
        if (!alive) return;
        console.error("[sdb] listShelf failed", err);
        setError("Couldn't read your sketches.");
        setItems([]);
      },
    );
    const onChange = () => void reload();
    const onUsage = () => void reloadUsage();
    shelfEvents.addEventListener("change", onChange);
    shelfEvents.addEventListener("usage", onUsage);
    return () => {
      alive = false;
      shelfEvents.removeEventListener("change", onChange);
      shelfEvents.removeEventListener("usage", onUsage);
    };
  }, [reload, reloadUsage]);

  const importFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const problems: string[] = [];
    for (const file of files) {
      try {
        await importSketch(file);
      } catch (err) {
        if (err instanceof SketchImportError) problems.push(err.message);
        else {
          console.error("[sdb] importSketch failed", { name: file.name, err });
          problems.push(`Couldn't import ${file.name}.`);
        }
      }
    }
    setBusy(false);
    if (problems.length > 0) setError(problems.join(" "));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    // Keep Excalidraw's own drop handler from also placing the image on the canvas.
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    void importFiles([...e.dataTransfer.files]);
  };

  return (
    <div className={styles.shelf}>
      <div
        className={styles.dropZone}
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <ImagePlus size={20} aria-hidden className={styles.dropIcon} />
        <p className={styles.dropText}>Drop scans or photos of your sketches</p>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Importing" : "Choose files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => {
            void importFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {items === null ? (
        <div className={styles.grid} aria-hidden>
          <span className={`skeleton ${styles.thumb}`} />
          <span className={`skeleton ${styles.thumb}`} />
        </div>
      ) : items.length > 0 ? (
        <>
          <p className={styles.hint}>Click a sketch to place it, or drag it onto the board.</p>
          <ul className={styles.grid} role="list" aria-label="Sketches">
            {items.map((file) => {
              const label = file.name ?? "Pasted image";
              return (
                <li key={file.id} className={styles.item}>
                  <button
                    type="button"
                    className={styles.tile}
                    draggable
                    aria-label={`Place ${label}`}
                    onClick={() => onInsert(file)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(SKETCH_MIME, file.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <img className={styles.thumb} src={file.dataURL} alt="" draggable={false} />
                    <span className={`mono ${styles.name}`}>{label}</span>
                  </button>
                  {!used.has(file.id) && (
                    <button
                      type="button"
                      className={`icon-btn ${styles.remove}`}
                      aria-label={`Remove ${label} from the shelf`}
                      onClick={() => setPendingRemove(file)}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`Remove “${pendingRemove?.name ?? "this sketch"}” from the shelf?`}
        body="No board uses it. This can't be undone."
        confirmLabel="Remove sketch"
        onConfirm={() => {
          const file = pendingRemove;
          setPendingRemove(null);
          if (!file) return;
          removeFromShelf(file.id).catch((err: unknown) => {
            console.error("[sdb] removeFromShelf failed", err);
            setError(err instanceof Error ? `${err.message}.` : "Couldn't remove that sketch.");
            void reload();
          });
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
