// Pure helpers for sketch files (no browser or Excalidraw imports, so they run in Node tests).

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");
/** Longest side kept in storage. Phone photos are often 4000px and several MB. */
export const MAX_STORED_SIDE = 2400;
/** Longest side when a sketch is first placed on the canvas. */
export const MAX_PLACED_SIDE = 640;

/** A user-facing reason a file can't be used. */
export class SketchImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SketchImportError";
  }
}

/** Returns why a file can't be imported, or null if it can. */
export function checkSketchFile(file: { name: string; type: string }): string | null {
  if (/^image\/hei[cf]$/.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    return "HEIC isn't supported. Export the photo as JPG or PNG.";
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `${file.name} isn't a supported image. Use PNG, JPG, WebP, GIF or SVG.`;
  }
  return null;
}

export function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}
