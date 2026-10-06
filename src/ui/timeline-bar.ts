import { YEAR_DAYS } from '../data/calendar';
import { GENERATIONS } from '../monarch/generations';
import type { Activity } from '../monarch/types';

// How far the leading Generation has to be ahead of the next one, as a share of the butterflies of both,
// before its color starts to show on the bar and once it's fully solid.
const FADE_FROM = 0;
const FADE_TO = 0.7;

// Bands thin in a straight line over the TAPER_DAYS before and after each change of Dominant generation,
// long before their color fades, down to MIN_HEIGHT of the bar.
const TAPER_DAYS = 20;
const MIN_HEIGHT = 0.2;

function ramp(from: number, to: number, x: number) {
  return Math.min(1, Math.max(0, (x - from) / (to - from)));
}

function smoothstep(from: number, to: number, x: number) {
  const u = ramp(from, to, x);
  return u * u * (3 - 2 * u);
}

/**
 * Each day in the color of its Dominant generation. The band thins in a straight line towards
 * the middle of the bar around each handover, and its color only fades right at the handover itself.
 */
export function barShape({ butterflies, dominant }: Activity) {
  const at = (d: number) => `${(((d + 0.5) / YEAR_DAYS) * 100).toFixed(3)}%`;
  // Each day's stop sits at its middle, and each handover at the start of a new Dominant generation's first day.
  const handovers = dominant.flatMap((g, d) => (d > 0 && g !== dominant[d - 1] ? [d] : []));
  const days = butterflies.map((share, d) => {
    const first = share[dominant[d]];
    const second = Math.max(...share.filter((_, g) => g !== dominant[d]));
    return {
      color: GENERATIONS[dominant[d]].color,
      opacity: smoothstep(FADE_FROM, FADE_TO, (first - second) / (first + second || 1)),
      height: MIN_HEIGHT + (1 - MIN_HEIGHT) * ramp(0, TAPER_DAYS, Math.min(...handovers.map((h) => Math.abs(d + 0.5 - h)))),
    };
  });
  const stops = days.map(({ color, opacity }, d) => `rgba(${color}, ${opacity.toFixed(3)}) ${at(d)}`);
  // Half the height on each side of the middle, out at the ends of the year and back along the bottom.
  const edge = (sign: number) => (height: number) => `${(50 + sign * height * 50).toFixed(1)}%`;
  const top = days.map(({ height }, d) => `${at(d)} ${edge(-1)(height)}`);
  const bottom = days.map(({ height }, d) => `${at(d)} ${edge(1)(height)}`).reverse();
  const [first, last] = [days[0].height, days[days.length - 1].height];
  return {
    backgroundImage: `linear-gradient(to right, ${stops.join(', ')})`,
    clipPath: `polygon(0% ${edge(-1)(first)}, ${top.join(', ')}, 100% ${edge(-1)(last)}, 100% ${edge(1)(last)}, ${bottom.join(', ')}, 0% ${edge(1)(first)})`,
  };
}
