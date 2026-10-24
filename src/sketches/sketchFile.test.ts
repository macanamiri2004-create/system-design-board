import { describe, expect, it } from "vitest";
import { checkSketchFile, toHex } from "./sketchFile";

describe("checkSketchFile", () => {
  it.each([
    ["scan.png", "image/png"],
    ["photo.jpg", "image/jpeg"],
    ["export.webp", "image/webp"],
    ["diagram.svg", "image/svg+xml"],
    ["loop.gif", "image/gif"],
  ])("accepts %s", (name, type) => {
    expect(checkSketchFile({ name, type })).toBeNull();
  });

  it("explains HEIC by type or by extension", () => {
    const message = "HEIC isn't supported. Export the photo as JPG or PNG.";
    expect(checkSketchFile({ name: "IMG_0042.HEIC", type: "" })).toBe(message);
    expect(checkSketchFile({ name: "photo", type: "image/heif" })).toBe(message);
  });

  it("names the file it rejects", () => {
    expect(checkSketchFile({ name: "notes.pdf", type: "application/pdf" })).toBe(
      "notes.pdf isn't a supported image. Use PNG, JPG, WebP, GIF or SVG.",
    );
  });
});

describe("toHex", () => {
  it("encodes bytes as zero-padded lowercase hex", () => {
    expect(toHex(new Uint8Array([0, 15, 16, 255]).buffer)).toBe("000f10ff");
  });
});
