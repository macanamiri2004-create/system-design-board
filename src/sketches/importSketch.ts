import { getDataURL } from "@excalidraw/excalidraw";
import type { FileId } from "@excalidraw/excalidraw/element/types";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";
import { fitWithin, type Size } from "../lib/geometry";
import { putFiles } from "../storage/files";
import type { StoredFile } from "../types";
import { checkSketchFile, MAX_STORED_SIDE, SketchImportError, toHex } from "./sketchFile";

/** Natural size of an image source; SVGs without an intrinsic size fall back to 4:3. */
export async function measureImage(src: string): Promise<Size> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img.naturalWidth > 0 && img.naturalHeight > 0
    ? { width: img.naturalWidth, height: img.naturalHeight }
    : { width: 400, height: 300 };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))), type, quality),
  );
}

async function downscale(file: File): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await createImageBitmap(file);
  try {
    const original = { width: bitmap.width, height: bitmap.height };
    const target = fitWithin(original.width, original.height, MAX_STORED_SIDE);
    if (target.width === original.width && target.height === original.height) return { blob: file, size: original };
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);
    return { blob: await canvasToBlob(canvas, "image/webp", 0.85), size: target };
  } finally {
    bitmap.close();
  }
}

/** Validates, downscales, content-hashes and stores one sketch. Re-importing the same image is a no-op. */
export async function importSketch(file: File): Promise<StoredFile> {
  const problem = checkSketchFile(file);
  if (problem) throw new SketchImportError(problem);

  let blob: Blob = file;
  let size: Size;
  if (file.type === "image/svg+xml") {
    const url = URL.createObjectURL(file);
    try {
      size = await measureImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } else {
    ({ blob, size } = await downscale(file));
  }

  const stored: StoredFile = {
    id: toHex(await crypto.subtle.digest("SHA-1", await blob.arrayBuffer())) as FileId,
    mimeType: (blob.type || file.type) as BinaryFileData["mimeType"],
    dataURL: await getDataURL(blob),
    created: Date.now(),
    name: file.name,
    width: size.width,
    height: size.height,
  };
  await putFiles([stored]);
  return stored;
}
