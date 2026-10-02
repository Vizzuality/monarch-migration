import { useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

import { mulberry32, type Rng } from '../data/random';
import { ASPECT, Butterfly, FEET_X, type Pose } from './Butterfly';
import { flightPath } from './flight';
import { isFree, measurePerches, type Perch, type Point } from './perches';

// The title's own entrance runs for 0.5s; measuring before it ends would catch it mid-rise.
const SETTLE_MS = 550;
const FIRST_MOVE_MS = 6500;
const MOVE_EVERY_MS = 6000;
const MOVE_JITTER_MS = 2000;

interface Bird {
  id: number;
  seed: number;
  perch: number;
  trip: number;
  from: Point;
  delay: number;
  size: number;
  wings: CSSProperties;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = <T,>(rng: Rng, items: T[]) => items[Math.floor(rng() * items.length)];

function freePerches(perches: Perch[], taken: Perch[], except?: number) {
  return perches.map((_, i) => i).filter((i) => i !== except && isFree(perches[i], taken));
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

function flock(perches: Perch[], seed: number, rng: Rng): Bird[] {
  const birds: Bird[] = [];
  const count = rng() < 0.5 ? 2 : 3;
  for (let id = 0; id < count; id++) {
    const free = freePerches(perches, birds.map((b) => perches[b.perch]));
    if (!free.length) break;
    const perch = pick(rng, free);
    const side = rng() < 0.5 ? 1 : -1;
    const p = perches[perch];
    birds.push({
      id,
      seed: seed + id * 7919,
      perch,
      trip: 0,
      // Appears close by, a little above and to one side of its letter.
      from: { x: p.x + side * (36 + rng() * 30), y: p.y - (26 + rng() * 26) },
      delay: id * 0.35 + rng() * 0.25,
      size: 10 + rng() * 6,
      wings: wingStyle(rng),
    });
  }
  return birds;
}

/**
 * Two or three monarchs that flutter in and land on the chapter title once it has
 * settled, then every few seconds one of them hops over to another free letter.
 * Everything is seeded by the title, so a chapter always plays out the same way.
 */
export function ChapterButterflies({ title, titleRef, frameRef }: { title: string; titleRef: RefObject<HTMLElement | null>; frameRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const [perches, setPerches] = useState<Perch[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const perchesRef = useRef(perches);
  const birdsRef = useRef(birds);
  const landed = useRef(new Set<string>());
  const rngRef = useRef<Rng | null>(null);
  perchesRef.current = perches;
  birdsRef.current = birds;

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    const measure = () => {
      if (alive && titleRef.current && frameRef.current) setPerches(measurePerches(titleRef.current, frameRef.current));
    };
    const timer = setTimeout(() => document.fonts.ready.then(measure), SETTLE_MS);
    window.addEventListener('resize', measure);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [reduced, titleRef, frameRef]);

  const ready = perches.length > 0;
  useEffect(() => {
    if (!ready) return;
    const seed = hash(title);
    const rng = mulberry32(seed);
    rngRef.current = rng;
    setBirds(flock(perchesRef.current, seed, rng));
  }, [ready, title]);

  const flying = birds.length > 0;
  useEffect(() => {
    const rng = rngRef.current;
    if (!flying || !rng) return;
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      const all = perchesRef.current;
      const current = birdsRef.current;
      const resting = current.filter((b) => landed.current.has(`${b.id}:${b.trip}`));
      if (resting.length) {
        const bird = pick(rng, resting);
        const free = freePerches(all, current.filter((b) => b !== bird).map((b) => all[b.perch]), bird.perch);
        if (free.length) {
          const next = { ...bird, perch: pick(rng, free), trip: bird.trip + 1, from: all[bird.perch], delay: 0 };
          setBirds(current.map((b) => (b === bird ? next : b)));
        }
      }
      timer = setTimeout(move, MOVE_EVERY_MS + rng() * MOVE_JITTER_MS);
    };
    timer = setTimeout(move, FIRST_MOVE_MS + rng() * MOVE_JITTER_MS);
    return () => clearTimeout(timer);
  }, [flying]);

  if (reduced) return null;
  return (
    <>
      {birds.map((b) => (
        <FlyingButterfly key={b.id} bird={b} to={perches[b.perch]} onLand={() => landed.current.add(`${b.id}:${b.trip}`)} />
      ))}
    </>
  );
}

function FlyingButterfly({ bird, to, onLand }: { bird: Bird; to: Point; onLand: () => void }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [pose, setPose] = useState<Pose>('flying');
  const face = to.x >= bird.from.x ? 1 : -1;
  const toRef = useRef(to);
  toRef.current = to;

  useEffect(() => {
    setPose('flying');
    const f = flightPath(bird.from, toRef.current, mulberry32(bird.seed + bird.trip));
    const fadeIn = bird.trip === 0;
    const controls = animate(
      scope.current,
      { x: f.x, y: f.y, rotate: f.rotate, opacity: fadeIn ? [0, 1, 1] : 1 },
      {
        duration: f.duration,
        delay: bird.delay,
        ease: 'linear',
        times: f.times,
        opacity: fadeIn ? { duration: f.duration, delay: bird.delay, times: [0, 0.15, 1] } : { duration: 0 },
      },
    );
    controls.then(() => {
      setPose('perched');
      onLand();
    });
    return () => controls.stop();
    // A new trip is the only thing that starts a flight; a resize just moves the perch.
  }, [bird.trip]);

  useEffect(() => {
    if (pose === 'perched') animate(scope.current, { x: to.x, y: to.y }, { duration: 0 });
  }, [pose, to.x, to.y]);

  return (
    <div ref={scope} className="butterfly-flight" style={{ opacity: bird.trip === 0 ? 0 : 1 }}>
      <div style={{ transform: `scaleX(${face})` }}>
        <Butterfly pose={pose} size={bird.size} style={{ left: -FEET_X * bird.size, top: 1 - bird.size * ASPECT, ...bird.wings }} />
      </div>
    </div>
  );
}
