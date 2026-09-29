import { COLONIES, FLYWAY, ZONES, type LngLat, type Zone } from './geo';
import { EGG_COLOR, GENERATIONS, type Generation, type RGB } from './generations';

/**
 * Synthetic migration model.
 *
 * Every "lineage" is one chain of mothers and daughters: a super-generation
 * butterfly leaves a colony in spring, three short-lived generations relay
 * north over the summer, and the last one's offspring fly back to the very
 * same colony in autumn. Dates follow published phenology (departure early
 * March, arrival around Día de Muertos); positions are invented so the flow
 * looks good.
 */

export const YEAR_DAYS = 365;

export interface Trip {
  lineage: number;
  gen: Generation;
  path: LngLat[];
  timestamps: number[];
  start: number;
  end: number;
}

export interface Lineage {
  colony: number;
  home: LngLat;
  trips: Trip[];
  phase: number;
}

export interface Activity {
  /** flying[gen][day] */
  flying: Float32Array[];
  eggs: Float32Array;
  resting: Float32Array;
  max: number;
}

export interface TripBucket {
  trips: Trip[];
  from: number;
  to: number;
}

export interface Model {
  lineages: Lineage[];
  trips: Trip[];
  buckets: TripBucket[];
  activity: Activity;
}

const BUCKET_DAYS = 10;

// TripsLayer runs every vertex through the GPU each frame, even the ones outside
// the trail window. Splitting trips by start date lets us hide whole buckets.
function bucketTrips(trips: Trip[]): TripBucket[] {
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

// Seeded so every reload shows the same migration.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const gauss = (rng: Rng) => {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};

const around = (rng: Rng, [x, y]: LngLat, [sx, sy]: LngLat): LngLat => [x + gauss(rng) * sx * 0.5, y + gauss(rng) * sy * 0.5];

function inZone(rng: Rng, zone: Zone): LngLat {
  for (;;) {
    const p = around(rng, zone.center, zone.spread);
    if (zone.land(p)) return p;
  }
}

function pickColony(rng: Rng) {
  let r = rng();
  for (let i = 0; i < COLONIES.length; i++) {
    r -= COLONIES[i].weight;
    if (r <= 0) return i;
  }
  return COLONIES.length - 1;
}

function catmullRom(p0: LngLat, p1: LngLat, p2: LngLat, p3: LngLat, t: number): LngLat {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

const dist = (a: LngLat, b: LngLat) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function flight(rng: Rng, waypoints: LngLat[], start: number, end: number, wander: number) {
  const pts = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const raw: LngLat[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const steps = Math.max(4, Math.ceil(dist(pts[i], pts[i + 1]) / 0.8));
    for (let s = 0; s < steps; s++) raw.push(catmullRom(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], s / steps));
  }
  raw.push(waypoints[waypoints.length - 1]);

  const cumulative = [0];
  for (let i = 1; i < raw.length; i++) cumulative.push(cumulative[i - 1] + dist(raw[i - 1], raw[i]));
  const length = cumulative[cumulative.length - 1] || 1;

  const amp = length * wander * (0.4 + rng());
  const f1 = 1 + rng() * 2;
  const f2 = 3 + rng() * 4;
  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;

  const path: LngLat[] = [];
  const timestamps: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const u = cumulative[i] / length;
    const a = raw[Math.max(0, i - 1)];
    const b = raw[Math.min(raw.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const offset = Math.sin(Math.PI * u) * amp * (Math.sin(2 * Math.PI * f1 * u + p1) + 0.35 * Math.sin(2 * Math.PI * f2 * u + p2));
    path.push([raw[i][0] - (dy / n) * offset, raw[i][1] + (dx / n) * offset]);
    timestamps.push(start + u * (end - start));
  }
  return { path, timestamps };
}

export function buildModel(count = 2200, seed = 1102): Model {
  const rng = mulberry32(seed);
  const lineages: Lineage[] = [];
  const trips: Trip[] = [];

  for (let id = 0; id < count; id++) {
    const colony = pickColony(rng);
    const home = around(rng, COLONIES[colony].position, [0.12, 0.09]);

    const south = inZone(rng, ZONES.south);
    const central = inZone(rng, ZONES.central);
    const north = inZone(rng, ZONES.north);
    const late: LngLat = [north[0] + gauss(rng) * 2.2, Math.min(49.5, north[1] + gauss(rng) * 1.2 + 0.6)];

    let t = 68 + gauss(rng) * 6;
    const next = (min: number, spread: number) => (t += min + rng() * spread);

    const legs: { gen: Generation; waypoints: LngLat[]; start: number; end: number; wander: number }[] = [];

    const springStart = t;
    legs.push({
      gen: 0,
      waypoints: [home, around(rng, [-99.9, 23.2], [1.2, 1]), around(rng, [-99.3, 26.8], [1.6, 1]), south],
      start: springStart,
      end: next(20, 10),
      wander: 0.03,
    });
    const g1 = next(26, 8);
    legs.push({ gen: 1, waypoints: [south, central], start: g1, end: next(16, 10), wander: 0.07 });
    const g2 = next(26, 8);
    legs.push({ gen: 2, waypoints: [central, north], start: g2, end: next(14, 10), wander: 0.08 });
    const g3 = next(26, 8);
    legs.push({ gen: 3, waypoints: [north, late], start: g3, end: next(6, 10), wander: 0.15 });
    const g4 = next(20, 9);
    const gates = FLYWAY.map((g) => around(rng, g.center, g.spread));
    legs.push({ gen: 0, waypoints: [late, ...gates, home], start: g4, end: Math.min(350, next(46, 16)), wander: 0.025 });

    const lineageTrips = legs.map((leg) => {
      const { path, timestamps } = flight(rng, leg.waypoints, leg.start, leg.end, leg.wander);
      const trip: Trip = { lineage: id, gen: leg.gen, path, timestamps, start: leg.start, end: leg.end };
      trips.push(trip);
      return trip;
    });

    lineages.push({ colony, home, trips: lineageTrips, phase: rng() * Math.PI * 2 });
  }

  const model: Model = { lineages, trips, buckets: bucketTrips(trips), activity: { flying: [], eggs: new Float32Array(), resting: new Float32Array(), max: 0 } };
  model.activity = computeActivity(model);
  return model;
}

type State =
  | { kind: 'rest' }
  | { kind: 'fly'; trip: Trip }
  | { kind: 'egg'; at: LngLat };

function stateAt(lineage: Lineage, t: number): State {
  const { trips } = lineage;
  if (t < trips[0].start || t >= trips[trips.length - 1].end) return { kind: 'rest' };
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    if (t < trip.start) return { kind: 'egg', at: trips[i - 1].path[trips[i - 1].path.length - 1] };
    if (t < trip.end) return { kind: 'fly', trip };
  }
  return { kind: 'rest' };
}

function positionOnTrip(trip: Trip, t: number): LngLat {
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

function computeActivity(model: Model): Activity {
  const flying = GENERATIONS.map(() => new Float32Array(YEAR_DAYS));
  const eggs = new Float32Array(YEAR_DAYS);
  const resting = new Float32Array(YEAR_DAYS);
  let max = 0;
  for (let d = 0; d < YEAR_DAYS; d++) {
    const t = d + 0.5;
    for (const lineage of model.lineages) {
      const s = stateAt(lineage, t);
      if (s.kind === 'fly') flying[s.trip.gen][d]++;
      else if (s.kind === 'egg') eggs[d]++;
      else resting[d]++;
    }
    let total = 0;
    for (const g of flying) total += g[d];
    max = Math.max(max, total);
  }
  return { flying, eggs, resting, max };
}

export interface Ring {
  position: LngLat;
  progress: number;
  color: RGB;
}

export interface Frame {
  length: number;
  positions: Float32Array;
  colors: Uint8Array;
  radii: Float32Array;
  rings: Ring[];
  colonyCounts: number[];
  flying: number;
  eggs: number;
  resting: number;
}

export const RING_DAYS = 3;

/**
 * Every lineage's position at day `t`. `clock` is wall time in seconds, used for the flutter.
 * Buffers are fresh each call: deck.gl skips the upload when it gets the same typed array back.
 */
export function computeFrame(model: Model, t: number, clock: number): Frame {
  const n = model.lineages.length;
  const positions = new Float32Array(n * 2);
  const colors = new Uint8Array(n * 4);
  const radii = new Float32Array(n);
  const rings: Ring[] = [];
  const colonyCounts = COLONIES.map(() => 0);
  let flying = 0;
  let eggs = 0;
  let resting = 0;

  model.lineages.forEach((lineage, i) => {
    const s = stateAt(lineage, t);
    let pos: LngLat;
    let color: RGB;
    let alpha: number;
    let radius: number;

    if (s.kind === 'fly') {
      pos = positionOnTrip(s.trip, t);
      color = GENERATIONS[s.trip.gen].color;
      alpha = 175;
      radius = 2.2;
      flying++;
      const age = t - s.trip.start;
      if (age < RING_DAYS && s.trip !== lineage.trips[0]) {
        rings.push({ position: s.trip.path[0], progress: age / RING_DAYS, color });
      }
    } else if (s.kind === 'egg') {
      pos = s.at;
      color = EGG_COLOR;
      alpha = 110;
      radius = 1.3;
      eggs++;
    } else {
      const w = clock * 2.3 + lineage.phase;
      pos = [lineage.home[0] + Math.cos(w) * 0.012, lineage.home[1] + Math.sin(w * 1.37) * 0.009];
      color = GENERATIONS[0].color;
      alpha = 105;
      radius = 1.5;
      resting++;
      colonyCounts[lineage.colony]++;
    }

    positions[i * 2] = pos[0];
    positions[i * 2 + 1] = pos[1];
    colors[i * 4] = color[0];
    colors[i * 4 + 1] = color[1];
    colors[i * 4 + 2] = color[2];
    colors[i * 4 + 3] = alpha;
    radii[i] = radius;
  });

  return { length: n, positions, colors, radii, rings, colonyCounts, flying, eggs, resting };
}
