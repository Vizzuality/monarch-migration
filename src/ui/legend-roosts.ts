import type { Point, Spot } from './perches';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** The tilt that stands a butterfly on a surface facing `(nx, ny)`. */
const facing = (nx: number, ny: number) => (Math.atan2(nx, -ny) * 180) / Math.PI;

/**
 * `count` spots over a disc of `radius` around `center`, each facing away from the middle, so
 * butterflies standing on them make a ball of wings pointing every way. A butterfly reaches
 * `reach` out from its feet, so each spot sits back by half that: the wings, not the feet,
 * fill its place, and those in the middle stand across it. The spots crowd towards the
 * middle, which every butterfly leans away from.
 */
export function ballSpots(center: Point, radius: number, count: number, reach: number): Spot[] {
  return Array.from({ length: count }, (_, i) => {
    const r = radius * ((i + 0.5) / count) - reach / 2;
    const a = i * GOLDEN_ANGLE;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: center.x + r * nx, y: center.y + r * ny, angle: facing(nx, ny) };
  });
}

/**
 * Spots every `step` along the outline of a rectangle with rounded corners, each facing out,
 * so butterflies stand on top, cling to the sides and hang from the bottom.
 */
export function outlineSpots({ left, top, width, height }: { left: number; top: number; width: number; height: number }, radius: number, step: number): Spot[] {
  const r = Math.min(radius, width / 2, height / 2);
  const right = left + width;
  const bottom = top + height;
  const spots: Spot[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) spots.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, angle: facing(nx, ny) });
  };
  // Clockwise from the top left, each corner swept from `from` radians around its centre.
  const corner = (cx: number, cy: number, from: number) => {
    const n = Math.max(1, Math.round((Math.PI / 2) * (r / step)));
    for (let i = 0; i < n; i++) {
      const a = from + ((Math.PI / 2) * i) / n;
      spots.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), angle: facing(Math.cos(a), Math.sin(a)) });
    }
  };
  edge(left + r, top, right - r, top, 0, -1);
  corner(right - r, top + r, -Math.PI / 2);
  edge(right, top + r, right, bottom - r, 1, 0);
  corner(right - r, bottom - r, 0);
  edge(right - r, bottom, left + r, bottom, 0, 1);
  corner(left + r, bottom - r, Math.PI / 2);
  edge(left, bottom - r, left, top + r, -1, 0);
  corner(left + r, top + r, Math.PI);
  return spots;
}

/** Whether `p` is untaken and at least `gap` away from every spot in `taken`. */
export const apart = (gap: number) => (p: Spot, taken: Spot[]) => taken.every((t) => t !== p && Math.hypot(t.x - p.x, t.y - p.y) >= gap);
