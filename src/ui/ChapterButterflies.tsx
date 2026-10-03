import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

import { mulberry32, type Rng } from '../data/random';
import { ASPECT, Butterfly, FEET_X, type Pose } from './Butterfly';
import { flightPath } from './flight';
import { isFree, measureTitle, type Perch, type Point } from './perches';

const FLOCK = 8;
const FIRST_MOVE_MS = 6500;
const MOVE_EVERY_MS = 6000;
const MOVE_JITTER_MS = 2000;
// Width of the title column; butterflies with nowhere to land flutter above it.
const FRAME_WIDTH = 560;

interface Bird {
  id: number;
  seed: number;
  trip: number;
  /** Index into the perches of title `on`, or null while it flutters above. */
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

interface Perches {
  title: string;
  list: Perch[];
}

const key = (b: Bird) => `${b.id}:${b.trip}`;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = <T,>(rng: Rng, items: T[]) => items[Math.floor(rng() * items.length)];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

/** Somewhere in the air near `from`, at about the same height, never far from the title. */
function hoverPoint(from: Point, perches: Perch[], rng: Rng): Point {
  const top = Math.min(...perches.map((p) => p.y));
  return { x: clamp(from.x + (rng() - 0.5) * 110, -20, FRAME_WIDTH + 20), y: clamp(from.y - 10 - (rng() - 0.5) * 50, top - 110, top + 50) };
}

/** Sends `b` off on its next trip: onto a free letter if there is one, otherwise into the air. */
function nextTrip(b: Bird, perches: Perch[], taken: Perch[], rng: Rng, delay: number, pace = 1): Bird {
  const free = freePerches(perches, taken);
  if (!free.length) return { ...b, perch: null, to: hoverPoint(b.to, perches, rng), trip: b.trip + 1, delay, pace };
  const perch = pick(rng, free);
  return { ...b, perch, to: perches[perch], trip: b.trip + 1, delay, pace };
}

/** Sends the whole flock to letters on a newly measured title, bringing in newcomers until there are FLOCK. */
function settle(birds: Bird[], { title, list: perches }: Perches, rng: Rng, landed: Set<string>): Bird[] {
  const next: Bird[] = [];
  for (const b of birds) {
    // Each leaves at its own moment, before the old title is quite gone, and some take the
    // long way round, so they come down one by one. One caught mid-air just turns.
    const delay = landed.has(key(b)) ? rng() * 0.3 : 0;
    next.push({ ...nextTrip(b, perches, takenBy(next, perches), rng, delay, 1 + rng() ** 1.5 * 1.6), on: title });
  }
  for (let id = next.length; id < FLOCK; id++) {
    const anchor = perches.length ? pick(rng, perches) : { x: rng() * FRAME_WIDTH, y: 0 };
    const side = rng() < 0.5 ? 1 : -1;
    // Appears close by, a little above and to one side of a letter.
    const spawn = { x: anchor.x + side * (36 + rng() * 30), y: anchor.y - (26 + rng() * 26) };
    const bird: Bird = { id, seed: hash(`${id}`), trip: -1, perch: null, on: title, to: spawn, spawn, delay: 0, pace: 1, size: 8 + rng() * 4, wings: wingStyle(rng) };
    next.push(nextTrip(bird, perches, takenBy(next, perches), rng, (id - birds.length) * 0.35 + rng() * 0.25));
  }
  return next;
}

/**
 * Eight monarchs that land on the chapter title, and every few seconds one of them hops
 * over to another free letter. They outlive the title: when the chapter changes each flies
 * straight from its letter to one on the new title. Any that find no free letter flutter
 * about until one frees up.
 */
export function ChapterButterflies({ title, body, anchorRef }: { title: string; body: string; anchorRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const [perches, setPerches] = useState<Perches>({ title: '', list: [] });
  const [birds, setBirds] = useState<Bird[]>([]);
  const birdsRef = useRef(birds);
  const landed = useRef(new Set<string>());
  const rngRef = useRef<Rng | null>(null);
  // Perches measured on the outgoing title must not be used for the incoming one.
  const ready = perches.title === title && perches.list.length > 0;
  const list = ready ? perches.list : [];
  const listRef = useRef(list);
  listRef.current = list;
  const titleRef = useRef(title);
  titleRef.current = title;
  birdsRef.current = birds;

  // The new title is measured before it is on screen, so the flock can head for it at once.
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    const measure = () => {
      if (alive && anchorRef.current) setPerches({ title, list: measureTitle(title, body, anchorRef.current) });
    };
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      alive = false;
      window.removeEventListener('resize', measure);
    };
  }, [reduced, title, body, anchorRef]);

  useEffect(() => {
    if (!ready) return;
    const rng = mulberry32(hash(title));
    rngRef.current = rng;
    setBirds((current) => settle(current, { title, list: listRef.current }, rng, landed.current));
  }, [ready, title]);

  useEffect(() => {
    const rng = rngRef.current;
    if (!ready || !rng) return;
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      const all = listRef.current;
      const current = birdsRef.current;
      const resting = current.filter((b) => b.perch !== null && landed.current.has(key(b)));
      if (resting.length) {
        const bird = pick(rng, resting);
        // Counting its own letter as taken keeps it from hopping on the spot.
        const next = { ...nextTrip(bird, all, [...takenBy(current, all, bird), all[bird.perch!]], rng, 0), on: titleRef.current };
        if (next.perch !== null) setBirds(current.map((b) => (b === bird ? next : b)));
      }
      timer = setTimeout(move, MOVE_EVERY_MS + rng() * MOVE_JITTER_MS);
    };
    timer = setTimeout(move, FIRST_MOVE_MS + rng() * MOVE_JITTER_MS);
    return () => clearTimeout(timer);
  }, [ready, title]);

  const arrive = (id: number, trip: number) => {
    setBirds((current) => {
      const b = current.find((c) => c.id === id);
      if (!b || b.trip !== trip) return current;
      if (b.perch !== null) {
        landed.current.add(key(b));
        return current;
      }
      const all = listRef.current;
      const next = { ...nextTrip(b, all, takenBy(current, all, b), mulberry32(b.seed + trip), 0), on: titleRef.current };
      return current.map((c) => (c === b ? next : c));
    });
  };

  if (reduced) return null;
  return (
    <>
      {birds.map((b) => (
        <FlyingButterfly key={b.id} bird={b} to={b.perch !== null && b.on === title ? (list[b.perch] ?? b.to) : b.to} onArrive={() => arrive(b.id, b.trip)} />
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
