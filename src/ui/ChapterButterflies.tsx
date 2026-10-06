import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState, type RefObject } from 'react';

import type { Rng } from '../data/random';
import { Flock, type Roost } from './Flock';
import { CanvasButterfly, FlockCanvas } from './FlockCanvas';
import { isFree, measureTitle, type Perch, type Point } from './perches';

// Short titles like "The relay" have only six to eight spots, and a butterfly can only hop
// to a free one.
const FLOCK = 6;
// The title size the butterflies' sizes and flights were tuned on, at 1440x900.
const TUNED_ON = 90;
// Below this the smallest butterfly would be under 6px, too small to tell its wings apart.
const MIN_SCALE = 0.75;

interface Perches {
  title: string;
  list: Perch[];
  /** Width of the title column; butterflies with nowhere to land flutter above it. */
  width: number;
  /** How big the butterflies and their flights are next to the ones tuned on TUNED_ON. */
  scale: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Somewhere in the air near `from`, at about the same height, never far from the title. */
function hoverPoint(from: Point, perches: Perch[], width: number, scale: number, rng: Rng): Point {
  const top = Math.min(...perches.map((p) => p.y));
  return {
    x: clamp(from.x + (rng() - 0.5) * 110 * scale, -20 * scale, width + 20 * scale),
    y: clamp(from.y - (10 + (rng() - 0.5) * 50) * scale, top - 110 * scale, top + 50 * scale),
  };
}

/**
 * Six monarchs that land on the chapter title and hop between its letters. When the
 * chapter changes each flies straight from its letter to one on the new title.
 */
export function ChapterButterflies({ title, body, anchorRef }: { title: string; body: string; anchorRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const [perches, setPerches] = useState<Perches>({ title: '', list: [], width: 0, scale: 1 });

  // The new title is measured before it is on screen, so the flock can head for it at once.
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    const measure = () => {
      const anchor = anchorRef.current;
      if (!alive || !anchor) return;
      const scale = Math.max(MIN_SCALE, parseFloat(getComputedStyle(anchor).fontSize) / TUNED_ON);
      setPerches({ title, list: measureTitle(title, body, anchor), width: anchor.offsetWidth, scale });
    };
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      alive = false;
      window.removeEventListener('resize', measure);
    };
  }, [reduced, title, body, anchorRef]);

  // Perches measured on the outgoing title must not be used for the incoming one. While the
  // title keeps its line breaks the perches just move with it, but once it wraps differently
  // the same perch can sit on another letter.
  const roost = useMemo<Roost<Perch> | null>(
    () =>
      perches.title === title
        ? {
            key: title,
            shape: perches.list.map((p) => p.line).join(),
            perches: perches.list,
            free: isFree,
            air: (from, rng) => hoverPoint(from, perches.list, perches.width, perches.scale, rng),
          }
        : null,
    [perches, title],
  );

  if (reduced) return null;
  return (
    <FlockCanvas origin={anchorRef} scale={perches.scale}>
      <Flock roost={roost} size={FLOCK} body={CanvasButterfly} />
    </FlockCanvas>
  );
}
