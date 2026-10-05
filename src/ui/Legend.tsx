import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import type { AnimationItem } from 'lottie-web';
import { useEffect, useRef, useState } from 'react';

import { GENERATIONS } from '../monarch/generations';

const card: Variants = {
  closed: { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } },
  open: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut', delayChildren: 0.05, staggerChildren: 0.04 } },
};

const item: Variants = {
  closed: { opacity: 0, y: 6, transition: { duration: 0.2 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export function Legend() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLSpanElement>(null);
  const book = useRef<AnimationItem | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

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
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
          <motion.div id="legend-card" className="legend-card" variants={card} initial="closed" animate="open" exit="closed">
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
      <button
        className={`legend-button${open ? ' open' : ''}`}
        aria-label={open ? 'Hide the generations' : 'Show the generations'}
        aria-expanded={open}
        aria-controls="legend-card"
        onClick={() => setOpen(!open)}
      >
        <span className="legend-book" ref={bookRef} />
      </button>
    </div>
  );
}
