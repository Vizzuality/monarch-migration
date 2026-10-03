import { animate, motion, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { mulberry32, type Rng } from '../data/random';
import { ASPECT, Butterfly, FEET_X, type Pose } from './Butterfly';
import { flightPath } from './flight';
import { isFree, type Perch, type Point } from './perches';

const FIRST_MOVE_MS = 6500;
const MOVE_EVERY_MS = 6000;
const MOVE_JITTER_MS = 2000;

/** Somewhere a flock can settle: the spots to land on and the air around them. */
export interface Roost {
  /** Names the place. A new key sends the whole flock over to it. */
  key: string;
  perches: Perch[];
  /** Somewhere in the air near `from`, for a butterfly with nowhere to land. */
  air: (from: Point, rng: Rng) => Point;
}

interface Bird {
  id: number;
  seed: number;
  trip: number;
  /** Index into the perches of roost `on`, or null while it flutters above. */
  perch: number | null;
  on: string;
  to: Point;
  /** Where it first fades in. Later trips start wherever it happens to be. */
  spawn: Point;
  delay: number;
  /** How many times longer than usual the trip takes, along a wider, lazier path. */
  pace: number;
  size: number;
  wings: CSSProperties;
}

const key = (b: Bird) => `${b.id}:${b.trip}`;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = <T,>(rng: Rng, items: T[]) => items[Math.floor(rng() * items.length)];

function freePerches(perches: Perch[], taken: Perch[], except?: number) {
  return perches.map((_, i) => i).filter((i) => i !== except && isFree(perches[i], taken));
}

function takenBy(birds: Bird[], perches: Perch[], except?: Bird) {
  return birds.filter((b) => b !== except && b.perch !== null).map((b) => perches[b.perch!]);
}

// Monarchs mix bursts of flapping with glides, so some butterflies flap and glide while
// others flap steadily. Each one also gets its own beat and stroke depth.
function wingStyle(rng: Rng) {
  const glides = rng() < 0.6;
  return {
    '--flight': glides ? 'wingbeat-glide' : 'wingbeat',
    '--beat': `${glides ? 0.9 + rng() * 0.5 : 0.18 + rng() * 0.12}s`,
    '--depth': -0.45 - rng() * 0.4,
    '--lag': `${-0.02 - rng() * 0.03}s`,
    '--rest': `${5 + rng() * 4}s`,
    '--rest-delay': `${1 + rng() * 3}s`,
  } as CSSProperties;
}

/** Sends `b` off on its next trip: onto a free perch if there is one, otherwise into the air. */
function nextTrip(b: Bird, roost: Roost, taken: Perch[], rng: Rng, delay: number, pace = 1): Bird {
  const free = freePerches(roost.perches, taken);
  if (!free.length) return { ...b, perch: null, on: roost.key, to: roost.air(b.to, rng), trip: b.trip + 1, delay, pace };
  const perch = pick(rng, free);
  return { ...b, perch, on: roost.key, to: roost.perches[perch], trip: b.trip + 1, delay, pace };
}

/** Sends the whole flock to perches on a new roost, bringing in newcomers until there are `size`. */
function settle(birds: Bird[], roost: Roost, size: number, rng: Rng, landed: Set<string>): Bird[] {
  const { perches } = roost;
  const next: Bird[] = [];
  for (const b of birds) {
    // Each leaves at its own moment and some take the long way round, so they come down one
    // by one. One caught mid-air just turns.
    const delay = landed.has(key(b)) ? rng() * 0.3 : 0;
    next.push(nextTrip(b, roost, takenBy(next, perches), rng, delay, 1 + rng() ** 1.5 * 1.6));
  }
  for (let id = next.length; id < size; id++) {
    const anchor = pick(rng, perches);
    const side = rng() < 0.5 ? 1 : -1;
    // Appears close by, a little above and to one side of a perch.
    const spawn = { x: anchor.x + side * (36 + rng() * 30), y: anchor.y - (26 + rng() * 26) };
    const bird: Bird = { id, seed: hash(`${id}`), trip: -1, perch: null, on: roost.key, to: spawn, spawn, delay: 0, pace: 1, size: 8 + rng() * 4, wings: wingStyle(rng) };
    next.push(nextTrip(bird, roost, takenBy(next, perches), rng, (id - birds.length) * 0.35 + rng() * 0.25));
  }
  return next;
}

/**
 * `size` monarchs that land on the perches of `roost`, and every few seconds one of them
 * hops over to another free perch. They outlive the roost: given a new one each flies
 * straight from its perch to one on the new roost. Any that find no free perch flutter
 * about until one frees up. While `roost` is null they finish their trips and wait.
 */
export function Flock({ roost, size }: { roost: Roost | null; size: number }) {
  const [birds, setBirds] = useState<Bird[]>([]);
  const birdsRef = useRef(birds);
  birdsRef.current = birds;
  const landed = useRef(new Set<string>());
  const rngRef = useRef<Rng | null>(null);
  const roostRef = useRef(roost);
  if (roost) roostRef.current = roost;
  const list = roost?.perches ?? [];
  // A roost that keeps its key can still move its perches about, and the butterflies on them
  // follow. Once the perches fall on other lines the same perch can sit somewhere else
  // entirely, so the flock settles again.
  const lines = list.map((p) => p.line).join();
  const ready = roost !== null && list.length > 0;

  useEffect(() => {
    const current = roostRef.current;
    if (!ready || !current) return;
    const rng = mulberry32(hash(current.key));
    rngRef.current = rng;
    setBirds((birds) => settle(birds, current, size, rng, landed.current));
  }, [ready, roost?.key, lines, size]);

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

  const arrive = (id: number, trip: number) => {
    setBirds((birds) => {
      const b = birds.find((c) => c.id === id);
      if (!b || b.trip !== trip) return birds;
      if (b.perch !== null) {
        landed.current.add(key(b));
        return birds;
      }
      const current = roostRef.current!;
      const next = nextTrip(b, { ...current, perches: ready ? current.perches : [] }, takenBy(birds, current.perches, b), mulberry32(b.seed + trip), 0);
      return birds.map((c) => (c === b ? next : c));
    });
  };

  return (
    <>
      {birds.map((b) => (
        <FlyingButterfly key={b.id} bird={b} to={b.perch !== null && b.on === roost?.key ? (list[b.perch] ?? b.to) : b.to} onArrive={() => arrive(b.id, b.trip)} />
      ))}
    </>
  );
}

function FlyingButterfly({ bird, to, onArrive }: { bird: Bird; to: Point; onArrive: () => void }) {
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
    const f = flightPath(from, target, mulberry32(bird.seed + bird.trip), { startRotate: rotate.get(), fromRest: landedTrip === bird.trip - 1, pace: bird.pace });
    const options = { duration: f.duration, delay: bird.delay, ease: 'linear' as const, times: f.times };
    const fade = bird.trip === 0 ? animate(opacity, [0, 1, 1], { ...options, times: [0, 0.15, 1] }) : animate(opacity, 1, { duration: 0.3 });
    const flight = [animate(x, f.x, options), animate(y, f.y, options), animate(rotate, f.rotate, options)];
    let stopped = false;
    Promise.all(flight).then(() => {
      if (stopped) return;
      if (bird.perch !== null) setLandedTrip(bird.trip);
      onArriveRef.current();
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
  }, [pose, to.x, to.y]);

  return (
    <motion.div className="butterfly-flight" style={{ x, y, rotate, opacity }}>
      <div style={{ transform: `scaleX(${face})` }}>
        <Butterfly pose={pose} size={bird.size} style={{ left: -FEET_X * bird.size, top: 1 - bird.size * ASPECT, ...bird.wings }} />
      </div>
    </motion.div>
  );
}
