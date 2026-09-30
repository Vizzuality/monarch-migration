import { YEAR_DAYS } from '../../data/calendar';
import { gradient, tint, type RGB } from '../../data/color';
import { gauss, mulberry32, type LngLat, type Rng, type Zone } from '../../data/random';
import { bucketTrips, flight, positionOnTrip, type Trip } from '../../data/trips';
import type { Activity, Frame, Ring, Simulation } from '../types';
import { RIVERS, ZONES } from './geo';
import { CALF_COAT, CALF_COLOR, CALVES_REAL, SPECIES, WATER_COLOR, type SpeciesId } from './species';

/**
 * Synthetic Serengeti–Mara model.
 *
 * Unlike the monarchs, the same animals walk the whole loop: every dot is a
 * group that grazes, treks to the next grazing area and grazes again, and is
 * back on the southern plains by year end. Wildebeest mothers drop a calf in
 * February that follows them from then on. Dates follow the published
 * migration calendar (calving in February, Grumeti in June–July, Mara from
 * July to September, back south in November); positions are invented inside
 * the real grazing areas.
 */

interface Calf {
  born: number;
  /** Infinity for the ones that make it through the year. */
  dies: number;
  angle: number;
}

interface Animal {
  species: SpeciesId;
  home: LngLat;
  trips: Trip[];
  phase: number;
  calf: Calf | null;
}

interface Leg {
  waypoints: LngLat[];
  start: number;
  end: number;
  wander: number;
}

/** Chains legs from `home`, each one starting where and after the previous one ended. */
function itinerary(home: LngLat) {
  const legs: Leg[] = [];
  let at = home;
  let free = 1;
  const go = (start: number, days: number, via: LngLat[], to: LngLat, wander = 0.035) => {
    const s = Math.max(start, free);
    const e = Math.min(s + days, 356);
    legs.push({ waypoints: [at, ...via, to], start: s, end: e, wander });
    at = to;
    free = e + 1;
    return e;
  };
  return { legs, go };
}

// How much of each grazing area the herd fills: lower packs the columns tighter.
const HERD_SPREAD = 0.6;
// How far an animal strays from its lane, as a share of the area.
const STRAY = 0.12;

/**
 * A point in `zone` at the animal's lane, a spot in the herd it keeps all
 * year. Neighbors stay neighbors from one area to the next, so the columns
 * run side by side instead of crisscrossing.
 */
function inLane(rng: Rng, zone: Zone, lane: LngLat): LngLat {
  for (let shrink = 1; ; shrink *= 0.8) {
    const p: LngLat = [
      zone.center[0] + (lane[0] * shrink * HERD_SPREAD + gauss(rng) * STRAY) * zone.spread[0] * 0.5,
      zone.center[1] + (lane[1] * shrink * HERD_SPREAD + gauss(rng) * STRAY) * zone.spread[1] * 0.5,
    ];
    if (!zone.land || zone.land(p)) return p;
  }
}

// Zebras set off about ten days before the wildebeest.
const LEAD: Record<SpeciesId, number> = { 0: 0, 1: -10, 2: 0 };

function herdLegs(rng: Rng, species: SpeciesId, home: LngLat, lane: LngLat) {
  const at = (zone: Zone) => inLane(rng, zone, lane);
  const lead = LEAD[species] + gauss(rng) * 3;
  const { legs, go } = itinerary(home);

  const settled = go(6 + rng() * 12, 6 + rng() * 4, [], at(ZONES.plains), 0.06);
  go(68 + rng() * 14 + lead, 8 + rng() * 6, [], at(ZONES.plainsWest), 0.05);

  // Most go by the Western Corridor, the rest straight up the middle. The
  // split follows the lane, so the two columns peel apart instead of crossing.
  // Lane cutoffs are normal quantiles: 0.52 leaves 70 % to the west, 0.25 leaves 60 %.
  const west = lane[0] < (species === 1 ? 0.25 : 0.52);
  if (west) {
    go(105 + gauss(rng) * 6 + lead, 20 + rng() * 10, [at(ZONES.moru)], at(ZONES.corridor));
    go(165 + gauss(rng) * 8 + lead, 5 + rng() * 5, [], at(ZONES.grumetiNorth), 0.03);
    go(190 + gauss(rng) * 6 + lead, 14 + rng() * 6, [at({ center: [34.62, -1.86], spread: [0.2, 0.1] })], at(ZONES.kogatende));
  } else {
    go(105 + gauss(rng) * 6 + lead, 20 + rng() * 10, [at(ZONES.seronera)], at(ZONES.banagi));
    go(165 + gauss(rng) * 8 + lead, 5 + rng() * 5, [], at(ZONES.ikorongo), 0.03);
    go(190 + gauss(rng) * 6 + lead, 10 + rng() * 6, [], at(ZONES.kogatende));
  }

  // Into Kenya across the Mara, and for many, back and forth again.
  // The westernmost 35 % end up in the Mara Triangle, across the river.
  const triangle = lane[0] < -0.39;
  go(216 + gauss(rng) * 9 + lead, 3 + rng() * 3, [], at(triangle ? ZONES.triangle : ZONES.mara), 0.03);
  if (rng() < 0.45) {
    go(250 + gauss(rng) * 8 + lead, 3 + rng() * 3, [], at(triangle ? ZONES.mara : ZONES.kogatende), 0.03);
  }

  // Home down the east side, through Lobo.
  go(292 + gauss(rng) * 8 + lead, 30 + rng() * 10, [at(ZONES.lobo), at(ZONES.east), at(ZONES.gol)], home, 0.03);

  return { legs, settled };
}

function gazelleLegs(rng: Rng, home: LngLat, lane: LngLat) {
  const at = (zone: Zone) => inLane(rng, zone, lane);
  const { legs, go } = itinerary(home);
  go(8 + rng() * 14, 6 + rng() * 4, [], at(ZONES.plains), 0.06);
  go(85 + gauss(rng) * 6, 10 + rng() * 6, [], at(lane[0] < 0 ? ZONES.moru : ZONES.plainsWest), 0.05);
  go(128 + gauss(rng) * 6, 12 + rng() * 6, [], at(ZONES.seronera));
  go(200 + gauss(rng) * 10, 6 + rng() * 4, [], at(ZONES.seronera), 0.06);
  go(300 + gauss(rng) * 8, 16 + rng() * 6, [], at(ZONES.gol));
  go(335 + gauss(rng) * 4, 8 + rng() * 2, [], home, 0.04);
  return legs;
}

// Steps for the spline: the legs here are a few tenths of a degree, not the
// thousands of kilometers the butterflies cover.
const MAX_STEP = 0.05;

interface Crossing {
  position: LngLat;
  t: number;
}

function intersect(a: LngLat, b: LngLat, c: LngLat, d: LngLat): number | null {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (den === 0) return null;
  const u = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const v = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return u >= 0 && u < 1 && v >= 0 && v <= 1 ? u : null;
}

const RIVER_BOUNDS = RIVERS.map((river) => ({
  river,
  minX: Math.min(...river.map((p) => p[0])),
  maxX: Math.max(...river.map((p) => p[0])),
  minY: Math.min(...river.map((p) => p[1])),
  maxY: Math.max(...river.map((p) => p[1])),
}));

/** Where and when `trip` wades across a river. */
function crossingsOf(trip: Trip): Crossing[] {
  const out: Crossing[] = [];
  const { path, timestamps } = trip;
  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k];
    const b = path[k + 1];
    for (const r of RIVER_BOUNDS) {
      if (Math.max(a[0], b[0]) < r.minX || Math.min(a[0], b[0]) > r.maxX) continue;
      if (Math.max(a[1], b[1]) < r.minY || Math.min(a[1], b[1]) > r.maxY) continue;
      for (let j = 0; j < r.river.length - 1; j++) {
        const u = intersect(a, b, r.river[j], r.river[j + 1]);
        if (u === null) continue;
        out.push({
          position: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
          t: timestamps[k] + (timestamps[k + 1] - timestamps[k]) * u,
        });
      }
    }
  }
  return out;
}

const clampLane = (x: number) => Math.max(-2.2, Math.min(2.2, x));

function buildHerd(seed: number) {
  const rng = mulberry32(seed);
  const animals: Animal[] = [];
  const trips: Trip[] = [];

  for (const species of SPECIES) {
    for (let n = 0; n < species.dots; n++) {
      const id = animals.length;
      const lane: LngLat = [clampLane(gauss(rng)), clampLane(gauss(rng))];
      const home = inLane(rng, ZONES.plains, lane);
      let legs: Leg[];
      let calf: Calf | null = null;
      if (species.id === 2) {
        legs = gazelleLegs(rng, home, lane);
      } else {
        const herd = herdLegs(rng, species.id, home, lane);
        legs = herd.legs;
        // Most births fall in a two-to-three-week window in February.
        if (species.id === 0 && rng() < 0.6) {
          const born = Math.min(62, Math.max(herd.settled + 1, 40 + gauss(rng) * 6));
          // Hyenas and lions take a good share of calves in the first weeks.
          const dies = rng() < 0.35 ? born + 3 + rng() * 40 : Infinity;
          calf = { born, dies, angle: rng() * Math.PI * 2 };
        }
      }
      const animalTrips = legs.map((leg) => {
        const { path, timestamps } = flight(rng, leg.waypoints, leg.start, leg.end, leg.wander, MAX_STEP);
        const trip: Trip = { lineage: id, group: species.id, path, timestamps, start: leg.start, end: leg.end };
        trips.push(trip);
        return trip;
      });
      animals.push({ species: species.id, home, trips: animalTrips, phase: rng() * Math.PI * 2, calf });
    }
  }
  return { animals, trips };
}

type State = { kind: 'graze'; at: LngLat } | { kind: 'move'; trip: Trip };

function stateAt(animal: Animal, t: number): State {
  const { trips } = animal;
  if (t < trips[0].start || t >= trips[trips.length - 1].end) return { kind: 'graze', at: animal.home };
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    if (t < trip.start) return { kind: 'graze', at: trips[i - 1].path[trips[i - 1].path.length - 1] };
    if (t < trip.end) return { kind: 'move', trip };
  }
  return { kind: 'graze', at: animal.home };
}

// Calves stop being calves late in the year: they fade into the herd before
// the next birthing season.
const WEANED_FROM = 300;
const WEANED_BY = 345;

const calfAlive = (calf: Calf | null, t: number): calf is Calf => !!calf && t >= calf.born && t < calf.dies && t < WEANED_BY;

function computeActivity(animals: Animal[]): Activity {
  const moving = SPECIES.map(() => new Float32Array(YEAR_DAYS));
  const calves = new Float32Array(YEAR_DAYS);
  let max = 0;
  for (let d = 0; d < YEAR_DAYS; d++) {
    const t = d + 0.5;
    for (const animal of animals) {
      if (stateAt(animal, t).kind === 'move') moving[animal.species][d]++;
      if (calfAlive(animal.calf, t)) calves[d]++;
    }
    let total = 0;
    for (const s of moving) total += s[d];
    max = Math.max(max, total);
  }
  return { moving, line: calves, max };
}

interface Event {
  position: LngLat;
  t: number;
}

/** Events with `t` in (from, to], from a list sorted by `t`. */
function eventsIn(events: Event[], from: number, to: number) {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].t <= from) lo = mid + 1;
    else hi = mid;
  }
  const out: Event[] = [];
  for (let i = lo; i < events.length && events[i].t <= to; i++) out.push(events[i]);
  return out;
}

const BIRTH_RING_DAYS = 2;
const CROSSING_RING_DAYS = 2.5;

function simulate(animals: Animal[], trips: Trip[]): Simulation {
  const weight = SPECIES.map((s) => s.real / s.dots);
  const calfCount = animals.filter((a) => a.calf).length;
  const calfWeight = CALVES_REAL / Math.max(1, calfCount);

  const births: Event[] = animals
    .filter((a) => a.calf)
    .map((a) => {
      const s = stateAt(a, a.calf!.born);
      return { position: s.kind === 'graze' ? s.at : a.home, t: a.calf!.born };
    })
    .sort((a, b) => a.t - b.t);
  const crossings: Event[] = trips
    .filter((trip) => trip.group !== 2)
    .flatMap(crossingsOf)
    .sort((a, b) => a.t - b.t);

  const frame = (t: number, clock: number): Frame => {
    const capacity = animals.length + calfCount;
    const positions = new Float32Array(capacity * 2);
    const colors = new Uint8Array(capacity * 4);
    const radii = new Float32Array(capacity);
    let length = animals.length;

    const write = (j: number, pos: LngLat, color: RGB, alpha: number, radius: number) => {
      positions[j * 2] = pos[0];
      positions[j * 2 + 1] = pos[1];
      colors[j * 4] = color[0];
      colors[j * 4 + 1] = color[1];
      colors[j * 4 + 2] = color[2];
      colors[j * 4 + 3] = alpha;
      radii[j] = radius;
    };

    let moving = 0;
    let grazing = 0;
    let calves = 0;

    animals.forEach((animal, i) => {
      const s = stateAt(animal, t);
      const color = tint(SPECIES[animal.species].color, i);
      let pos: LngLat;
      if (s.kind === 'move') {
        pos = positionOnTrip(s.trip, t);
        write(i, pos, color, 200, 2.2);
        moving += weight[animal.species];
      } else {
        // An unhurried amble around the grazing spot.
        const w = clock * 0.5 + animal.phase;
        pos = [s.at[0] + Math.cos(w) * 0.004, s.at[1] + Math.sin(w * 1.31) * 0.003];
        write(i, pos, color, 165, 2);
        grazing += weight[animal.species];
      }

      const { calf } = animal;
      if (!calf || t < calf.born || t >= calf.dies + 2 || t >= WEANED_BY) return;
      const age = t - calf.born;
      const fade = Math.min(1, age / 0.5) * (t > calf.dies ? 1 - (t - calf.dies) / 2 : 1) * (t > WEANED_FROM ? 1 - (t - WEANED_FROM) / (WEANED_BY - WEANED_FROM) : 1);
      // Tucked in at its mother's flank.
      const at: LngLat = [pos[0] + Math.cos(calf.angle) * 0.007, pos[1] + Math.sin(calf.angle) * 0.005];
      write(length++, at, tint(gradient(CALF_COAT, age), i + 7), Math.round(190 * fade), 1.2 + 0.6 * Math.min(1, age / 120));
      if (calfAlive(calf, t)) calves += calfWeight;
    });

    const rings: Ring[] = [
      ...eventsIn(births, t - BIRTH_RING_DAYS, t).map((e) => ({
        position: e.position,
        progress: (t - e.t) / BIRTH_RING_DAYS,
        color: CALF_COLOR,
        size: 2500,
      })),
      ...eventsIn(crossings, t - CROSSING_RING_DAYS, t).map((e) => ({
        position: e.position,
        progress: (t - e.t) / CROSSING_RING_DAYS,
        color: WATER_COLOR,
        size: 6000,
      })),
    ];

    return { length, positions, colors, radii, rings, stats: [moving, calves, grazing] };
  };

  /** Where the newborns are: a calf under three weeks old, one point per mother. */
  const hotspots = (t: number) => {
    const features = [];
    for (const animal of animals) {
      const { calf } = animal;
      if (!calfAlive(calf, t) || t - calf.born > 21) continue;
      const s = stateAt(animal, t);
      const at = s.kind === 'graze' ? s.at : positionOnTrip(s.trip, t);
      features.push({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: at } });
    }
    return { type: 'FeatureCollection' as const, features };
  };

  return { buckets: bucketTrips(trips), activity: computeActivity(animals), frame, hotspots };
}

export function buildModel(seed = 1502): Simulation {
  const { animals, trips } = buildHerd(seed);
  return simulate(animals, trips);
}
