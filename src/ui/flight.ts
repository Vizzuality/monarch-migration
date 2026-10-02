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
 */
export function flightPath(from: Point, to: Point, rng: Rng, startRotate = 0): Flight {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const arc = 14 + dist * 0.22 + rng() * 12;
  const wobble = 6 + rng() * 8;
  const bank = 8 + rng() * 8;
  const phase = rng() * Math.PI * 2;

  const flight: Flight = { x: [], y: [], rotate: [], times: [], duration: 1.4 + dist / 380 + rng() * 0.4 };
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    // Progress along the path: quick off the mark, slow over the letter.
    const u = 1 - (1 - t) ** 2.2;
    const calm = 1 - u;
    flight.times.push(t);
    flight.x.push(from.x + dx * u + Math.sin(phase + u * 9) * wobble * calm);
    flight.y.push(from.y + dy * u - Math.sin(Math.PI * u) * arc + Math.cos(phase + u * 13) * wobble * 0.6 * calm);
    // Eases out of whatever bank it had, in case it changed course mid-air.
    const blend = Math.min(1, t / 0.2);
    flight.rotate.push(startRotate * (1 - blend) + Math.cos(phase + u * 9) * bank * calm * blend);
  }
  return flight;
}
