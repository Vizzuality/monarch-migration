import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import type { AnimationItem } from 'lottie-web';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { GENERATIONS } from '../monarch/generations';
import { Flock, type Roost } from './Flock';
import { CanvasButterfly, FlockCanvas } from './FlockCanvas';
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

const FLOCK = 10;
const BUTTON = 56;
// The card hangs this far past the top right corner of the button.
const CARD_OVERHANG = 15;
const CARD_RADIUS = 52;

// Small enough that not even a wingtip shows past the button.
const BALL = ballSpots({ x: BUTTON / 2, y: BUTTON / 2 }, 18, 14, 10);

const nearby = (from: Point, rng: () => number) => ({ x: from.x + (rng() - 0.5) * 60, y: from.y + (rng() - 0.5) * 60 });

export function Legend() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  // Every open and close gets its own key, so the flock doesn't fly the same way each time.
  const [toggles, setToggles] = useState(0);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLSpanElement>(null);
  const book = useRef<AnimationItem | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
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
    return { key: `card:${toggles}`, perches: outlineSpots(box, CARD_RADIUS, 6), free: apart(40), air: nearby };
  }, [open, cardSize, toggles]);

  // The player and the 1.4 MB animation load after the first paint, so they stay out of the main bundle.
  useEffect(() => {
    let cancelled = false;
    Promise.all([import('lottie-web/build/player/lottie_light'), import('../assets/book.json')]).then(([{ default: lottie }, { default: animationData }]) => {
      if (cancelled || !bookRef.current) return;
      const item = lottie.loadAnimation({ container: bookRef.current, renderer: 'svg', loop: false, autoplay: false, animationData });
      item.goToAndStop(openRef.current ? item.totalFrames - 1 : 0, true);
      book.current = item;
    });
    return () => {
      cancelled = true;
      book.current?.destroy();
      book.current = null;
    };
  }, []);

  // Opening plays the book forwards, closing plays it backwards from wherever it is.
  useEffect(() => {
    const item = book.current;
    if (!item) return;
    if (reduced) {
      item.goToAndStop(open ? item.totalFrames - 1 : 0, true);
      return;
    }
    item.setDirection(open ? 1 : -1);
    item.play();
  }, [open, reduced]);

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
      {/* Between the card and the button: they stand on the card's outline and hide behind the button. */}
      {!reduced && (
        <FlockCanvas origin={ref}>
          <Flock roost={roost} size={FLOCK} sizes={[7, 11]} stagger={0.05} departure={0.5} body={CanvasButterfly} />
        </FlockCanvas>
      )}
      <button
        className={`legend-button${open ? ' open' : ''}`}
        aria-label={open ? 'Hide the generations' : 'Show the generations'}
        aria-expanded={open}
        aria-controls="legend-card"
        onClick={() => toggle(!open)}
      >
        <span className="legend-book" ref={bookRef} />
      </button>
    </div>
  );
}
