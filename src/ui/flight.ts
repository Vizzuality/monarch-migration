import type { Rng } from '../data/random';
import type { Point } from './perches';

export interface Flight {
  x: number[];
  y: number[];
  rotate: number[];
  times: number[];
  duration: number;
}

const SAMPLES = 40;

/**
 * A fluttering path from `from` to `to`, sampled finely enough to play back linearly:
 * the straight line between them bent into an arc over the top, with a sideways wobble
 * and a bank that die down on approach, so the butterfly slows and drops onto the perch.
 * Off a perch it eases into the air; already flying it carries on at speed, banking out of
 * `startRotate`. A `pace` above 1 makes for a longer, lazier trip. A perch tilted by
 * `endRotate` is approached from the side it faces, turning to stand on it at the end.
 */
export function flightPath(from: Point, to: Point, rng: Rng, { startRotate = 0, endRotate = 0, fromRest = false, pace = 1 } = {}): Flight {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  // A slower trip swings wider and weaves more, rather than playing back in slow motion.
  const arc = (14 + dist * 0.22 + rng() * 12) * (0.6 + 0.4 * pace);
  const wobble = 6 + rng() * 8;
  const bank = 8 + rng() * 8;
  const phase = rng() * Math.PI * 2;
  // The arc bulges out on the side the perch faces, straight up for one that is level.
  const tilt = (endRotate * Math.PI) / 180;
  const nx = Math.sin(tilt);
  const ny = -Math.cos(tilt);

  const flight: Flight = { x: [], y: [], rotate: [], times: [], duration: ((fromRest ? 1.8 : 1.4) + dist / 380 + rng() * 0.4) * pace };
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const s = fromRest ? t ** 1.6 : t;
    // Progress along the path: slow over the letter at the end.
    const u = 1 - (1 - s) ** 2.2;
    const calm = 1 - u;
    // The wobble and bank build up from nothing, so the first frame starts exactly at `from`.
    const rise = Math.sin((Math.PI / 2) * Math.min(1, t / 0.25));
    const bulge = Math.sin(Math.PI * u) * arc;
    // It flies upright and only turns to the perch's tilt on the final approach.
    const land = Math.max(0, (u - 0.6) / 0.4) ** 2;
    flight.times.push(t);
    flight.x.push(from.x + dx * u + bulge * nx + (Math.sin(phase + u * 9 * pace) - Math.sin(phase)) * wobble * calm * rise);
    flight.y.push(from.y + dy * u + bulge * ny + (Math.cos(phase + u * 13 * pace) - Math.cos(phase)) * wobble * 0.6 * calm * rise);
    flight.rotate.push(startRotate * (1 - rise) + endRotate * land + Math.cos(phase + u * 9 * pace) * bank * calm * rise);
  }
  return flight;
}
