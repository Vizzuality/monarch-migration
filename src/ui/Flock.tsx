import { animate, motion, useMotionValue, type MotionValue } from 'motion/react';
import { memo, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';

import { mulberry32, type Rng } from '../data/random';
import { ASPECT, Butterfly, FEET_X, type Pose } from './Butterfly';
import { flightPath } from './flight';
import type { Point, Spot } from './perches';
import { randomWings, wingVars, type Wings } from './wings';

const FIRST_MOVE_MS = 6500;
const MOVE_EVERY_MS = 6000;
const MOVE_JITTER_MS = 2000;

/** Somewhere a flock can settle: the spots to land on and the air around them. */
export interface Roost<P extends Spot = Spot> {
  /** Names the place. A new key sends the whole flock over to it. */
  key: string;
  /**
   * A roost can move its perches about under the same key, and the butterflies on them
   * follow. When it changes shape enough that the same perch sits somewhere else entirely,
   * a new `shape` makes the flock settle again.
   */
  shape?: string;
  perches: P[];
  /** Whether `p` leaves room for butterflies already standing on `taken`. */
  free: (p: P, taken: P[]) => boolean;
  /** Somewhere in the air near `from`, for a butterfly with nowhere to land. */
  air: (from: Point, rng: Rng) => Point;
}

export interface Bird {
  id: number;
  seed: number;
  trip: number;
  /** Index into the perches of roost `on`, or null while it flutters above. */
  perch: number | null;
  on: string;
  to: Spot;
  /** Where it first fades in. Later trips start wherever it happens to be. */
  spawn: Point;
  delay: number;
  /** How many times longer than usual the trip takes, along a wider, lazier path. */
  pace: number;
  size: number;
  wings: Wings;
}

/** How a flock shows each of its butterflies. It calls `onArrive` at the end of every trip. */
export type Body = ComponentType<{ bird: Bird; to: Spot; onArrive: (id: number, trip: number) => void }>;

const key = (b: Bird) => `${b.id}:${b.trip}`;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = <T,>(rng: Rng, items: T[]) => items[Math.floor(rng() * items.length)];

function freePerches<P extends Spot>({ perches, free }: Roost<P>, taken: P[]) {
  return perches.map((_, i) => i).filter((i) => free(perches[i], taken));
}

function takenBy<P extends Spot>(birds: Bird[], perches: P[], except?: Bird) {
  return birds.filter((b) => b !== except && b.perch !== null).map((b) => perches[b.perch!]);
}

/** Sends `b` off on its next trip: onto a free perch if there is one, otherwise into the air. */
function nextTrip<P extends Spot>(b: Bird, roost: Roost<P>, taken: P[], rng: Rng, delay: number, pace = 1): Bird {
  const free = freePerches(roost, taken);
  if (!free.length) return { ...b, perch: null, on: roost.key, to: roost.air(b.to, rng), trip: b.trip + 1, delay, pace };
  const perch = pick(rng, free);
  return { ...b, perch, on: roost.key, to: roost.perches[perch], trip: b.trip + 1, delay, pace };
}

interface Options {
  size: number;
  /** Smallest and largest butterfly, in pixels across. */
  sizes: [number, number];
  /** Seconds between one newcomer and the next. */
  stagger: number;
  /** Seconds over which a settled flock leaves for a new roost. */
  departure: number;
}

/** Sends the whole flock to perches on a new roost, bringing in newcomers until there are `size`. */
function settle<P extends Spot>(birds: Bird[], roost: Roost<P>, { size, sizes, stagger, departure }: Options, rng: Rng, landed: Set<string>): Bird[] {
  const { perches } = roost;
  const next: Bird[] = [];
  for (const b of birds) {
    // Each leaves at its own moment and some take the long way round, so they come down one
    // by one. One caught mid-air just turns.
    const delay = landed.has(key(b)) ? rng() * departure : 0;
    next.push(nextTrip(b, roost, takenBy(next, perches), rng, delay, 1 + rng() ** 1.5 * 1.6));
  }
  for (let id = next.length; id < size; id++) {
    const anchor = pick(rng, perches);
    const side = rng() < 0.5 ? 1 : -1;
    // Appears close by, a little off a perch on the side it faces and to one side of it.
    const along = side * (36 + rng() * 30);
    const off = 26 + rng() * 26;
    const tilt = ((anchor.angle ?? 0) * Math.PI) / 180;
    const spawn = { x: anchor.x + along * Math.cos(tilt) + off * Math.sin(tilt), y: anchor.y + along * Math.sin(tilt) - off * Math.cos(tilt) };
    const bird: Bird = { id, seed: hash(`${id}`), trip: -1, perch: null, on: roost.key, to: spawn, spawn, delay: 0, pace: 1, size: sizes[0] + rng() * (sizes[1] - sizes[0]), wings: randomWings(rng) };
    next.push(nextTrip(bird, roost, takenBy(next, perches), rng, (id - birds.length) * stagger + rng() * 0.25));
  }
  return next;
}

/**
 * `size` monarchs that land on the perches of `roost`, and every few seconds one of them
 * hops over to another free perch. They outlive the roost: given a new one each flies
 * straight from its perch to one on the new roost. Any that find no free perch flutter
 * about until one frees up. While `roost` is null they finish their trips and wait.
 */
export function Flock<P extends Spot>({
  roost,
  size,
  sizes = [8, 12],
  stagger = 0.35,
  departure = 0.3,
  body: Body = DomButterfly,
}: { roost: Roost<P> | null; body?: Body } & Partial<Options> & Pick<Options, 'size'>) {
  const [birds, setBirds] = useState<Bird[]>([]);
  const birdsRef = useRef(birds);
  birdsRef.current = birds;
  const landed = useRef(new Set<string>());
  const rngRef = useRef<Rng | null>(null);
  const roostRef = useRef(roost);
  if (roost) roostRef.current = roost;
  const list = roost?.perches ?? [];
  const ready = roost !== null && list.length > 0;
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const current = roostRef.current;
    if (!ready || !current) return;
    const rng = mulberry32(hash(current.key));
    rngRef.current = rng;
    setBirds((birds) => settle(birds, current, { size, sizes, stagger, departure }, rng, landed.current));
  }, [ready, roost?.key, roost?.shape, size]);

  useEffect(() => {
    const rng = rngRef.current;
    if (!ready || !rng) return;
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      const current = roostRef.current!;
      const birds = birdsRef.current;
      const resting = birds.filter((b) => b.perch !== null && landed.current.has(key(b)));
      if (resting.length) {
        const bird = pick(rng, resting);
        // Counting its own perch as taken keeps it from hopping on the spot.
        const next = nextTrip(bird, current, [...takenBy(birds, current.perches, bird), current.perches[bird.perch!]], rng, 0);
        if (next.perch !== null) setBirds(birds.map((b) => (b === bird ? next : b)));
      }
      timer = setTimeout(move, MOVE_EVERY_MS + rng() * MOVE_JITTER_MS);
    };
    timer = setTimeout(move, FIRST_MOVE_MS + rng() * MOVE_JITTER_MS);
    return () => clearTimeout(timer);
  }, [ready, roost?.key]);

  // Stable, so a butterfly only renders again when its own trip changes.
  const arrive = useCallback((id: number, trip: number) => {
    setBirds((birds) => {
      const b = birds.find((c) => c.id === id);
      if (!b || b.trip !== trip) return birds;
      if (b.perch !== null) {
        landed.current.add(key(b));
        return birds;
      }
      const current = roostRef.current!;
      const next = nextTrip(b, { ...current, perches: readyRef.current ? current.perches : [] }, takenBy(birds, current.perches, b), mulberry32(b.seed + trip), 0);
      return birds.map((c) => (c === b ? next : c));
    });
  }, []);

  return (
    <>
      {birds.map((b) => (
        <Body key={b.id} bird={b} to={b.perch !== null && b.on === roost?.key ? (list[b.perch] ?? b.to) : b.to} onArrive={arrive} />
      ))}
    </>
  );
}

export interface Flight {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  /** 1 facing right, -1 facing left. */
  face: number;
  pose: Pose;
}

/** Flies `bird` along each new trip it is sent on, ending on `to`. */
export function useFlight(bird: Bird, to: Spot, onArrive: (id: number, trip: number) => void): Flight {
  const x = useMotionValue(bird.spawn.x);
  const y = useMotionValue(bird.spawn.y);
  const rotate = useMotionValue(0);
  const opacity = useMotionValue(0);
  const [face, setFace] = useState(1);
  // The last trip the butterfly finished. Deriving the pose from it means a new trip is
  // 'flying' in the very render that starts it, so the resize snap below can't cut it short.
  const [landedTrip, setLandedTrip] = useState(-1);
  const pose: Pose = bird.perch !== null && landedTrip === bird.trip ? 'perched' : 'flying';
  const toRef = useRef(to);
  toRef.current = to;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  useEffect(() => {
    // Picks up from wherever the last flight left off, even mid-air.
    const from = { x: x.get(), y: y.get() };
    const target = toRef.current;
    setFace(target.x >= from.x ? 1 : -1);
    const f = flightPath(from, target, mulberry32(bird.seed + bird.trip), { startRotate: rotate.get(), endRotate: target.angle ?? 0, fromRest: landedTrip === bird.trip - 1, pace: bird.pace });
    const options = { duration: f.duration, delay: bird.delay, ease: 'linear' as const, times: f.times };
    const fade = bird.trip === 0 ? animate(opacity, [0, 1, 1], { ...options, times: [0, 0.15, 1] }) : animate(opacity, 1, { duration: 0.3 });
    const flight = [animate(x, f.x, options), animate(y, f.y, options), animate(rotate, f.rotate, options)];
    let stopped = false;
    Promise.all(flight).then(() => {
      if (stopped) return;
      if (bird.perch !== null) setLandedTrip(bird.trip);
      onArriveRef.current(bird.id, bird.trip);
    });
    return () => {
      stopped = true;
      fade.stop();
      flight.forEach((a) => a.stop());
    };
    // A new trip is the only thing that starts a flight; a resize just moves the perch.
  }, [bird.trip]);

  useEffect(() => {
    if (pose !== 'perched') return;
    x.set(to.x);
    y.set(to.y);
    rotate.set(to.angle ?? 0);
  }, [pose, to.x, to.y, to.angle]);

  return { x, y, rotate, opacity, face, pose };
}

const DomButterfly = memo(function DomButterfly({ bird, to, onArrive }: { bird: Bird; to: Spot; onArrive: (id: number, trip: number) => void }) {
  const { x, y, rotate, opacity, face, pose } = useFlight(bird, to, onArrive);
  return (
    <motion.div className="butterfly-flight" style={{ x, y, rotate, opacity }}>
      <div style={{ transform: `scaleX(${face})` }}>
        <Butterfly pose={pose} size={bird.size} style={{ left: -FEET_X * bird.size, top: 1 - bird.size * ASPECT, ...wingVars(bird.wings) }} />
      </div>
    </motion.div>
  );
});
