export type RGB = [number, number, number];

/** Color at `at` along `stops` (sorted by `at`), clamped at both ends. */
export function gradient(stops: { at: number; color: RGB }[], at: number): RGB {
  let i = 0;
  while (i < stops.length - 2 && stops[i + 1].at <= at) i++;
  const a = stops[i];
  const b = stops[i + 1];
  const u = Math.min(1, Math.max(0, (at - a.at) / (b.at - a.at)));
  return [0, 1, 2].map((c) => Math.round(a.color[c] + (b.color[c] - a.color[c]) * u)) as RGB;
}

/**
 * A stable per-individual variation of `color`, so a swarm or a herd reads as
 * many animals rather than one flat fill: a little darker or lighter, and a
 * touch warmer or cooler.
 */
export function tint(color: RGB, id: number): RGB {
  const a = Math.sin(id * 12.9898) * 43758.5453;
  const b = Math.sin(id * 78.233) * 12345.6789;
  const light = (a - Math.floor(a)) * 2 - 1;
  const warm = (b - Math.floor(b)) * 2 - 1;
  const k = 1 + light * 0.26;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [c(color[0] * k + warm * 18), c(color[1] * k), c(color[2] * k - warm * 18)];
}
