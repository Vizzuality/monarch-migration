import { YEAR_DAYS } from '../data/calendar';
import { tint, type RGB } from '../data/color';
import { around, gauss, inZone, mulberry32, unit, type LngLat, type Rng } from '../data/random';
import { bucketTrips, flight, positionOnTrip } from '../data/trips';
import { GENERATIONS, metamorphosisColor, type Generation } from './generations';
import { COLONIES, FLYWAY, ZONES } from './geo';
import type { Activity, Frame, Ring, Simulation, SwarmMember, SwarmState, Trip } from './types';

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
  id: number;
  colony: number;
  home: LngLat;
  trips: Trip[];
  phase: number;
}

/** A butterfly of Generation `gen` in Lineage `id`: its Generation's color with the Lineage's own tint. */
function butterflyColor(gen: Generation, id: number): RGB {
  return tint(GENERATIONS[gen].color, id);
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
      const trip: Trip = { lineage: id, generation: leg.gen, color: butterflyColor(leg.gen, id), path, timestamps, start: leg.start, end: leg.end };
      trips.push(trip);
      return trip;
    });

    lineages.push({ id, colony, home, trips: lineageTrips, phase: rng() * Math.PI * 2 });
  }

  return { lineages, trips };
}

type EggState = { kind: 'egg'; at: LngLat; since: number; until: number; mother: Trip; next: Trip };
type State = { kind: 'rest' } | { kind: 'fly'; trip: Trip } | EggState;

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
        mother: prev,
        next: trip,
      };
    }
    if (t < trip.end) return { kind: 'fly', trip };
  }
  return { kind: 'rest' };
}

/** How far an egg is on its way to becoming a butterfly: 0 = just laid, 1 = about to hatch. */
function stageOf(s: EggState, t: number) {
  return (t - s.since) / (s.until - s.since);
}

interface Look {
  state: SwarmState;
  generation: Generation;
  color: RGB;
}

/**
 * How a Lineage's living member looks on day `t`, the same on the map and in the Swarm. Fliers belong to
 * their trip's Generation, eggs and caterpillars already shift towards the Generation they become, and
 * butterflies resting in the colonies belong to the Super generation.
 */
function lookOf(lineage: Lineage, s: State, t: number): Look {
  if (s.kind === 'fly') return { state: 'flying', generation: s.trip.generation, color: s.trip.color };
  if (s.kind === 'egg') {
    return { state: 'developing', generation: s.next.generation, color: metamorphosisColor(stageOf(s, t), s.next.color) };
  }
  return { state: 'resting', generation: 0, color: butterflyColor(0, lineage.id) };
}

function computeActivity(lineages: Lineage[]): Activity {
  const dominant: Generation[] = [];
  const butterflies: number[][] = [];
  for (let d = 0; d < YEAR_DAYS; d++) {
    const t = d + 0.5;
    const adults = GENERATIONS.map(() => 0);
    for (const lineage of lineages) {
      const look = lookOf(lineage, stateAt(lineage, t), t);
      if (look.state !== 'developing') adults[look.generation]++;
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

  lineages.forEach((lineage) => {
    const i = lineage.id;
    const s = stateAt(lineage, t);
    const { color } = lookOf(lineage, s, t);

    if (s.kind === 'fly') {
      write(i, positionOnTrip(s.trip, t), color, 190, 2.2);
      const age = t - s.trip.start;
      if (age < RING_DAYS && s.trip !== lineage.trips[0]) {
        rings.push({ position: s.trip.path[0], progress: age / RING_DAYS, color: GENERATIONS[s.trip.generation].color, size: RING_SIZE });
      }
    } else if (s.kind === 'egg') {
      const age = t - s.since;
      const stage = stageOf(s, t);
      // Egg 0 is the Lineage's living member: it's the one that becomes the next Generation.
      write(i, eggSpot(s.at, i, 0), color, 150, 1.3);
      // Most eggs and caterpillars don't make it, but they're tinted like the butterfly they'd turn into too.
      const laid = Math.min(CLUTCH, Math.floor((age / LAYING_DAYS) * CLUTCH) + 1);
      for (let k = 1; k < laid; k++) {
        write(length++, eggSpot(s.at, i, k), color, Math.round(150 * Math.max(0, 1 - stage / 0.9)), 1.3);
      }
      // The mother fades out where she landed as she lays: she dies after this.
      write(length++, s.at, s.mother.color, Math.round(190 * Math.max(0, 1 - age / LAYING_DAYS)), 2.2);
    } else {
      const w = clock * 2.3 + lineage.phase;
      write(i, [lineage.home[0] + Math.cos(w) * 0.012, lineage.home[1] + Math.sin(w * 1.37) * 0.009], color, 105, 1.5);
    }
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

/** The sampled Lineages on day `t`, looking as the map draws them. */
function census(sample: Lineage[], t: number): SwarmMember[] {
  return sample.map((lineage) => {
    const { state, color } = lookOf(lineage, stateAt(lineage, t), t);
    return { lineage: lineage.id, color, state };
  });
}

export function buildModel(count = 800, seed = 1102): Simulation {
  const { lineages, trips } = buildLineages(count, seed);
  const sample = lineages.filter(({ id }) => id % SWARM_EVERY === 0);
  return {
    buckets: bucketTrips(trips),
    activity: computeActivity(lineages),
    frame: (t, clock) => computeFrame(lineages, t, clock),
    hotspots: (t) => breedingGrounds(lineages, t),
    swarm: (t) => census(sample, t),
  };
}
