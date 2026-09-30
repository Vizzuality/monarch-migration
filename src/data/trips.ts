import type { LngLat, Rng } from './random';

export interface Trip {
  /** The animal, or chain of animals, that flies or walks it. */
  lineage: number;
  /** Picks the trail color: a monarch generation, a Serengeti species. */
  group: number;
  path: LngLat[];
  timestamps: number[];
  start: number;
  end: number;
}

export interface TripBucket {
  trips: Trip[];
  from: number;
  to: number;
}

const BUCKET_DAYS = 10;

// TripsLayer runs every vertex through the GPU each frame, even the ones outside
// the trail window. Splitting trips by start date lets us hide whole buckets.
export function bucketTrips(trips: Trip[]): TripBucket[] {
  const buckets = new Map<number, TripBucket>();
  for (const trip of trips) {
    const key = Math.floor(trip.start / BUCKET_DAYS);
    const bucket = buckets.get(key) ?? { trips: [], from: Infinity, to: -Infinity };
    bucket.trips.push(trip);
    bucket.from = Math.min(bucket.from, trip.start);
    bucket.to = Math.max(bucket.to, trip.end);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].sort(([a], [b]) => a - b).map(([, b]) => b);
}

function catmullRom(p0: LngLat, p1: LngLat, p2: LngLat, p3: LngLat, t: number): LngLat {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

export const dist = (a: LngLat, b: LngLat) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Output vertices per wiggle cycle: fewer and the wander turns into a zigzag.
const VERTICES_PER_CYCLE = 14;

// Leaves and lands a little slower than it cruises.
const cruise = (u: number) => 0.65 * u + 0.35 * u * u * (3 - 2 * u);

/**
 * A smooth, wandering path through `waypoints`, timed from `start` to `end`.
 * `maxStep` is the spline sampling step in degrees: shorter legs need a finer one.
 */
export function flight(rng: Rng, waypoints: LngLat[], start: number, end: number, wander: number, maxStep = 0.3) {
  const pts = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const raw: LngLat[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const steps = Math.max(8, Math.ceil(dist(pts[i], pts[i + 1]) / maxStep));
    for (let s = 0; s < steps; s++) raw.push(catmullRom(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], s / steps));
  }
  raw.push(waypoints[waypoints.length - 1]);

  const cumulative = [0];
  for (let i = 1; i < raw.length; i++) cumulative.push(cumulative[i - 1] + dist(raw[i - 1], raw[i]));
  const length = cumulative[cumulative.length - 1] || 1;

  const amp = length * wander * (0.4 + rng());
  const f1 = 1 + rng() * 1.5;
  const f2 = 2.5 + rng() * 2;
  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;

  // Resample at even arc length, dense enough for the fastest wiggle.
  const count = Math.max(raw.length, Math.ceil(f2 * VERTICES_PER_CYCLE));
  const path: LngLat[] = [];
  const timestamps: number[] = [];
  let j = 0;
  for (let k = 0; k <= count; k++) {
    const u = k / count;
    const at = u * length;
    while (j < raw.length - 2 && cumulative[j + 1] < at) j++;
    const a = raw[j];
    const b = raw[j + 1];
    const seg = cumulative[j + 1] - cumulative[j] || 1;
    const w = Math.min(1, Math.max(0, (at - cumulative[j]) / seg));
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const x = a[0] + dx * w;
    const y = a[1] + dy * w;
    const offset = Math.sin(Math.PI * u) * amp * (Math.sin(2 * Math.PI * f1 * u + p1) + 0.25 * Math.sin(2 * Math.PI * f2 * u + p2));
    path.push([x - (dy / n) * offset, y + (dx / n) * offset]);
    timestamps.push(start + cruise(u) * (end - start));
  }
  return { path, timestamps };
}

export function positionOnTrip(trip: Trip, t: number): LngLat {
  const ts = trip.timestamps;
  let lo = 0;
  let hi = ts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) lo = mid;
    else hi = mid;
  }
  const span = ts[hi] - ts[lo] || 1;
  const k = Math.min(1, Math.max(0, (t - ts[lo]) / span));
  const a = trip.path[lo];
  const b = trip.path[hi];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
