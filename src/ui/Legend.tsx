import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import bookClosed from '../assets/book-closed.svg';
import glyphClosed from '../assets/book-glyph-closed.svg';
import glyphOpen from '../assets/book-glyph-open.svg';
import bookHover from '../assets/book-hover.svg';
import bookOpen from '../assets/book-open.svg';
import { GENERATIONS } from '../monarch/generations';
import { Flock, type Roost } from './Flock';
import { apart, ballSpots, outlineSpots } from './legend-roosts';
import type { Point } from './perches';

const card: Variants = {
  closed: { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } },
  open: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut', delayChildren: 0.05, staggerChildren: 0.04 } },
};

const item: Variants = {
  closed: { opacity: 0, y: 6, transition: { duration: 0.2 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const FLOCK = 100;
const BUTTON = 66;
// The card hangs this far past the top right corner of the button.
const CARD_OVERHANG = 15;
const CARD_RADIUS = 52;

const BALL = ballSpots({ x: BUTTON / 2, y: BUTTON / 2 }, 24, 125, 10);

const nearby = (from: Point, rng: () => number) => ({ x: from.x + (rng() - 0.5) * 60, y: from.y + (rng() - 0.5) * 60 });

export function Legend() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  // Every open and close gets its own key, so the flock doesn't fly the same way each time.
  const [toggles, setToggles] = useState(0);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const toggle = (next: boolean) => {
    setOpen(next);
    setToggles((n) => n + 1);
  };

  // The layout size ignores the scale the card grows in with, so it is known straight away.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (open && el) setCardSize({ width: el.offsetWidth, height: el.offsetHeight });
  }, [open]);

  const roost = useMemo<Roost | null>(() => {
    if (!open) return { key: `ball:${toggles}`, perches: BALL, free: apart(0), air: nearby };
    if (!cardSize) return null;
    const box = { left: BUTTON + CARD_OVERHANG - cardSize.width, top: -CARD_OVERHANG, ...cardSize };
    return { key: `card:${toggles}`, perches: outlineSpots(box, CARD_RADIUS, 6), free: apart(11), air: nearby };
  }, [open, cardSize, toggles]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) toggle(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="legend" ref={ref}>
      <AnimatePresence>
        {open && (
          <motion.div ref={cardRef} id="legend-card" className="legend-card" variants={card} initial="closed" animate="open" exit="closed">
            <ul>
              {GENERATIONS.map((g) => (
                <motion.li key={g.id} variants={item}>
                  <h2>
                    <i style={{ background: `rgb(${g.color})` }} />
                    {g.name}
                  </h2>
                  <p>{g.description}</p>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Between the card and the button: they stand on the card's outline and huddle under the book. */}
      {!reduced && (
        <div className="legend-flock">
          <Flock roost={roost} size={FLOCK} sizes={[7, 11]} stagger={0.05} departure={0.5} />
        </div>
      )}
      <button
        className={`legend-button${reduced ? '' : ' bare'}${open ? ' open' : ''}`}
        aria-label={open ? 'Hide the generations' : 'Show the generations'}
        aria-expanded={open}
        aria-controls="legend-card"
        onClick={() => toggle(!open)}
      >
        {reduced ? (
          <>
            <img className="rest" src={bookClosed} alt="" />
            <img className="hover" src={bookHover} alt="" />
            <img className="active" src={bookOpen} alt="" />
          </>
        ) : (
          // No disc: the book stands dark on the huddled butterflies, and cream on the open card.
          <>
            <img className="rest" src={glyphClosed} alt="" />
            <img className="active" src={glyphOpen} alt="" />
          </>
        )}
      </button>
    </div>
  );
}
