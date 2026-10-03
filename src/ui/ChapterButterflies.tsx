import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState, type RefObject } from 'react';

import type { Rng } from '../data/random';
import { Flock, type Roost } from './Flock';
import { measureTitle, type Perch, type Point } from './perches';

const FLOCK = 8;

interface Perches {
  title: string;
  list: Perch[];
  /** Width of the title column; butterflies with nowhere to land flutter above it. */
  width: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Somewhere in the air near `from`, at about the same height, never far from the title. */
function hoverPoint(from: Point, perches: Perch[], width: number, rng: Rng): Point {
  const top = Math.min(...perches.map((p) => p.y));
  return { x: clamp(from.x + (rng() - 0.5) * 110, -20, width + 20), y: clamp(from.y - 10 - (rng() - 0.5) * 50, top - 110, top + 50) };
}

/**
 * Eight monarchs that land on the chapter title and hop between its letters. When the
 * chapter changes each flies straight from its letter to one on the new title.
 */
export function ChapterButterflies({ title, body, anchorRef }: { title: string; body: string; anchorRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const [perches, setPerches] = useState<Perches>({ title: '', list: [], width: 0 });

  // The new title is measured before it is on screen, so the flock can head for it at once.
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    const measure = () => {
      const anchor = anchorRef.current;
      if (alive && anchor) setPerches({ title, list: measureTitle(title, body, anchor), width: anchor.offsetWidth });
    };
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      alive = false;
      window.removeEventListener('resize', measure);
    };
  }, [reduced, title, body, anchorRef]);

  // Perches measured on the outgoing title must not be used for the incoming one.
  const roost = useMemo<Roost | null>(
    () =>
      perches.title === title
        ? { key: title, perches: perches.list, air: (from, rng) => hoverPoint(from, perches.list, perches.width, rng) }
        : null,
    [perches, title],
  );

  if (reduced) return null;
  return <Flock roost={roost} size={FLOCK} />;
}
