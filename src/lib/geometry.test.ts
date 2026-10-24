import { describe, expect, it } from "vitest";
import { fitWithin, sceneCenter } from "./geometry";

describe("sceneCenter", () => {
  it("accounts for zoom and scroll", () => {
    expect(sceneCenter({ width: 800, height: 600, scrollX: 100, scrollY: 50, zoom: { value: 2 } })).toEqual({
      x: 100,
      y: 100,
    });
  });

  it("is the canvas middle at rest", () => {
    expect(sceneCenter({ width: 800, height: 600, scrollX: 0, scrollY: 0, zoom: { value: 1 } })).toEqual({
      x: 400,
      y: 300,
    });
  });
});

describe("fitWithin", () => {
  it("scales down large images", () => {
    expect(fitWithin(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(1000, 4000, 2400)).toEqual({ width: 600, height: 2400 });
  });

  it("leaves small images alone", () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});
