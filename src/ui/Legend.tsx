import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import bookClosed from '../assets/book-closed.svg';
import bookOpen from '../assets/book-open.svg';
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="legend-button"
        aria-label={open ? 'Hide the generations' : 'Show the generations'}
        aria-expanded={open}
        aria-controls="legend-card"
        onClick={() => setOpen(!open)}
      >
        <img className="legend-icon" src={open ? bookOpen : bookClosed} alt="" />
      </button>
    </div>
  );
}
