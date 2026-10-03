import type { Rng } from '../data/random';

/** How one butterfly beats its wings, in seconds and wing scales. */
export interface Wings {
  /** Flaps in bursts with glides between, rather than steadily. */
  glides: boolean;
  beat: number;
  /** How far the wings swing down, as a negative scale. */
  depth: number;
  /** How far the far wing trails the near one. */
  lag: number;
  /** How long a perched butterfly's slow open and close takes, and how long it waits first. */
  rest: number;
  restDelay: number;
}

// Monarchs mix bursts of flapping with glides, so some butterflies flap and glide while
// others flap steadily. Each one also gets its own beat and stroke depth.
export function randomWings(rng: Rng): Wings {
  const glides = rng() < 0.6;
  return {
    glides,
    beat: glides ? 0.9 + rng() * 0.5 : 0.18 + rng() * 0.12,
    depth: -0.45 - rng() * 0.4,
    lag: -0.02 - rng() * 0.03,
    rest: 5 + rng() * 4,
    restDelay: 1 + rng() * 3,
  };
}

type Keyframes = [at: number, scale: number][];

// A steady beat; three beats then a glide on half-open wings; a perched butterfly's one slow
// open and close; and the start of a flick. NaN is the butterfly's own depth.
const BEAT: Keyframes = [[0, 1], [0.5, NaN], [1, 1]];
const GLIDE: Keyframes = [[0, 1], [0.07, NaN], [0.14, 1], [0.21, NaN], [0.28, 1], [0.35, NaN], [0.42, 1], [0.5, 0.3], [0.86, 0.3], [1, 1]];
const REST: Keyframes = [[0, 1], [0.8, 1], [0.88, 0.2], [1, 1]];
const FLICK: Keyframes = [[0, 1], [0.45, 0.1], [1, 1]];
export const FLICK_SECONDS = 0.45;

// Close to CSS ease-in-out, run between every pair of keyframes.
const ease = (t: number) => t * t * (3 - 2 * t);

function play(frames: Keyframes, t: number, depth: number) {
  const at = t - Math.floor(t);
  let i = 1;
  while (i < frames.length - 1 && frames[i][0] < at) i++;
  const [t0, a] = frames[i - 1];
  const [t1, b] = frames[i];
  const from = Number.isNaN(a) ? depth : a;
  const to = Number.isNaN(b) ? depth : b;
  return from + (to - from) * ease((at - t0) / (t1 - t0));
}

/** The near wing's scale `t` seconds into a flight. */
export function flyingScale(w: Wings, t: number) {
  return play(w.glides ? GLIDE : BEAT, Math.max(0, t) / w.beat, w.depth);
}

/** The near wing's scale `t` seconds after landing; the far wing stays open. */
export function perchedScale(w: Wings, t: number) {
  return t < w.restDelay ? 1 : play(REST, (t - w.restDelay) / w.rest, 0);
}

/** The near wing's scale `t` seconds into a startled flick, or null once it is over. */
export function flickScale(t: number) {
  return t < 0 || t >= FLICK_SECONDS ? null : play(FLICK, t / FLICK_SECONDS, 0);
}
