import { YEAR_DAYS } from '../data/calendar';
import { tint, type RGB } from '../data/color';
import { around, gauss, inZone, mulberry32, unit, type LngLat, type Rng } from '../data/random';
import { bucketTrips, flight, positionOnTrip, type Trip } from '../data/trips';
import { GENERATIONS, metamorphosisColor, type Generation } from './generations';
import { COLONIES, FLYWAY, ZONES } from './geo';
import type { Activity, Frame, Ring, Simulation, SwarmMember } from './types';

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

interface Lineage {
  colony: number;
  home: LngLat;
  trips: Trip[];
  phase: number;
}

function pickColony(rng: Rng) {
  let r = rng();
  for (let i = 0; i < COLONIES.length; i++) {
    r -= COLONIES[i].weight;
    if (r <= 0) return i;
  }
  return COLONIES.length - 1;
}

function buildLineages(count: number, seed: number): { lineages: Lineage[]; trips: Trip[] } {
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
      const trip: Trip = { lineage: id, group: leg.gen, path, timestamps, start: leg.start, end: leg.end };
      trips.push(trip);
      return trip;
    });

    lineages.push({ colony, home, trips: lineageTrips, phase: rng() * Math.PI * 2 });
  }

  return { lineages, trips };
}

type State =
  | { kind: 'rest' }
  | { kind: 'fly'; trip: Trip }
  | { kind: 'egg'; at: LngLat; since: number; until: number; prevGen: Generation; nextGen: Generation };

function stateAt(lineage: Lineage, t: number): State {
  const { trips } = lineage;
  if (t < trips[0].start || t >= trips[trips.length - 1].end) return { kind: 'rest' };
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    if (t < trip.start) {
      const prev = trips[i - 1];
      return {
        kind: 'egg',
        at: prev.path[prev.path.length - 1],
        since: prev.end,
        until: trip.start,
        prevGen: prev.group as Generation,
        nextGen: trip.group as Generation,
      };
    }
    if (t < trip.end) return { kind: 'fly', trip };
  }
  return { kind: 'rest' };
}

/** Fliers belong to their trip's Generation, eggs and caterpillars to their mother's, colonies to the Super generation. */
function generationOf(s: State): Generation {
  if (s.kind === 'fly') return s.trip.group as Generation;
  if (s.kind === 'egg') return s.prevGen;
  return 0;
}

function computeActivity(lineages: Lineage[]): Activity {
  const dominant: Generation[] = [];
  const butterflies: number[][] = [];
  for (let d = 0; d < YEAR_DAYS; d++) {
    const t = d + 0.5;
    const adults = GENERATIONS.map(() => 0);
    for (const lineage of lineages) {
      const state = stateAt(lineage, t);
      if (state.kind !== 'egg') adults[generationOf(state)]++;
    }
    dominant.push(adults.indexOf(Math.max(...adults)) as Generation);
    butterflies.push(adults.map((c) => c / lineages.length));
  }
  return { dominant, butterflies };
}

const RING_DAYS = 3;
const RING_SIZE = 76_000;

// Each mother lays her eggs one per plant across a patch of milkweed. A handful
// of specks stands in for the hundreds she really lays.
const CLUTCH = 6;
const CLUTCH_SPREAD = 0.6;
const LAYING_DAYS = 4;

/** Where the `k`-th egg of lineage `i` goes. Egg 0 sits right where the mother landed: it's the one that becomes the next generation. */
function eggSpot(at: LngLat, i: number, k: number): LngLat {
  if (k === 0) return at;
  const angle = unit(i * 12.9898 + k * 78.233) * Math.PI * 2;
  const r = CLUTCH_SPREAD * Math.sqrt(unit(i * 39.346 + k * 11.135));
  return [at[0] + Math.cos(angle) * r, at[1] + Math.sin(angle) * r * 0.75];
}

/**
 * Every lineage's position at day `t`, followed by the eggs of lineages that
 * are between generations.
 * Buffers are fresh each call: deck.gl skips the upload when it gets the same typed array back.
 */
function computeFrame(lineages: Lineage[], t: number, clock: number): Frame {
  const n = lineages.length;
  const capacity = n * (1 + CLUTCH);
  const positions = new Float32Array(capacity * 2);
  const colors = new Uint8Array(capacity * 4);
  const radii = new Float32Array(capacity);
  let length = n;

  const write = (j: number, pos: LngLat, color: RGB, alpha: number, radius: number) => {
    positions[j * 2] = pos[0];
    positions[j * 2 + 1] = pos[1];
    colors[j * 4] = color[0];
    colors[j * 4 + 1] = color[1];
    colors[j * 4 + 2] = color[2];
    colors[j * 4 + 3] = alpha;
    radii[j] = radius;
  };
  const rings: Ring[] = [];

  lineages.forEach((lineage, i) => {
    const s = stateAt(lineage, t);
    let pos: LngLat;
    let color: RGB;
    let alpha: number;
    let radius: number;

    if (s.kind === 'fly') {
      pos = positionOnTrip(s.trip, t);
      color = GENERATIONS[s.trip.group].color;
      alpha = 190;
      radius = 2.2;
      const age = t - s.trip.start;
      if (age < RING_DAYS && s.trip !== lineage.trips[0]) {
        rings.push({ position: s.trip.path[0], progress: age / RING_DAYS, color, size: RING_SIZE });
      }
    } else if (s.kind === 'egg') {
      const age = t - s.since;
      const stage = age / (s.until - s.since);
      const laid = Math.min(CLUTCH, Math.floor((age / LAYING_DAYS) * CLUTCH) + 1);
      // Tinted like the butterfly it turns into, so the hatch has no color jump.
      const adult = tint(GENERATIONS[s.nextGen].color, i);
      for (let k = 0; k < laid; k++) {
        // Most eggs and caterpillars don't make it; only egg 0 carries the lineage on.
        const survival = k === 0 ? 1 : Math.max(0, 1 - stage / 0.9);
        write(length++, eggSpot(s.at, i, k), metamorphosisColor(stage, adult), Math.round(150 * survival), 1.3);
      }
      // The mother fades out where she landed as she lays: she dies after this.
      pos = s.at;
      color = GENERATIONS[s.prevGen].color;
      alpha = Math.round(190 * Math.max(0, 1 - age / LAYING_DAYS));
      radius = 2.2;
    } else {
      const w = clock * 2.3 + lineage.phase;
      pos = [lineage.home[0] + Math.cos(w) * 0.012, lineage.home[1] + Math.sin(w * 1.37) * 0.009];
      color = GENERATIONS[0].color;
      alpha = 105;
      radius = 1.5;
    }

    write(i, pos, tint(color, i), alpha, radius);
  });

  return { length, positions, colors, radii, rings };
}

/** Where eggs and caterpillars are on day `t`, one point per lineage between generations. */
function breedingGrounds(lineages: Lineage[], t: number) {
  const features = [];
  for (const lineage of lineages) {
    const s = stateAt(lineage, t);
    if (s.kind === 'egg') {
      features.push({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: s.at } });
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

// One Lineage in this many joins the Swarm.
const SWARM_EVERY = 2;

/** The sampled Lineages on day `t`, colored as the map draws them. Index `i` is the Lineage's id, which seeds its tint. */
function census(sample: { lineage: Lineage; i: number }[], t: number): SwarmMember[] {
  return sample.map(({ lineage, i }) => {
    const s = stateAt(lineage, t);
    if (s.kind === 'fly') return { color: tint(GENERATIONS[s.trip.group].color, i), state: 'flying' };
    if (s.kind === 'egg') {
      return { color: metamorphosisColor((t - s.since) / (s.until - s.since), tint(GENERATIONS[s.nextGen].color, i)), state: 'developing' };
    }
    return { color: tint(GENERATIONS[0].color, i), state: 'resting' };
  });
}

export function buildModel(count = 800, seed = 1102): Simulation {
  const { lineages, trips } = buildLineages(count, seed);
  const sample = lineages.map((lineage, i) => ({ lineage, i })).filter(({ i }) => i % SWARM_EVERY === 0);
  return {
    buckets: bucketTrips(trips),
    activity: computeActivity(lineages),
    frame: (t, clock) => computeFrame(lineages, t, clock),
    hotspots: (t) => breedingGrounds(lineages, t),
    swarm: (t) => census(sample, t),
  };
}
