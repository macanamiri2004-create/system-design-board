export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

type ViewState = { width: number; height: number; scrollX: number; scrollY: number; zoom: { value: number } };

/** The scene coordinate at the middle of the visible canvas. */
export function sceneCenter(view: ViewState): Point {
  return {
    x: view.width / 2 / view.zoom.value - view.scrollX,
    y: view.height / 2 / view.zoom.value - view.scrollY,
  };
}

/** Scales a size down (never up) so its longest side is at most `max`, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, max: number): Size {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
