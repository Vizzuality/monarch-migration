export type LngLat = [number, number];

export type Rng = () => number;

// Seeded so every reload shows the same migration.
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gauss = (rng: Rng) => {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};

export const around = (rng: Rng, [x, y]: LngLat, [sx, sy]: LngLat): LngLat => [x + gauss(rng) * sx * 0.5, y + gauss(rng) * sy * 0.5];

export interface Zone {
  center: LngLat;
  spread: LngLat;
  /** Rejects points that land in the sea. */
  land?: (p: LngLat) => boolean;
}

export function inZone(rng: Rng, zone: Zone): LngLat {
  for (;;) {
    const p = around(rng, zone.center, zone.spread);
    if (!zone.land || zone.land(p)) return p;
  }
}

/** A stable pseudo-random number in [0, 1) for `x`, for per-frame work that can't carry an Rng. */
export const unit = (x: number) => {
  const v = Math.sin(x) * 43758.5453;
  return v - Math.floor(v);
};
