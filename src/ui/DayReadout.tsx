import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useRef } from 'react';

import { dateOf, YEAR_DAYS } from '../data/calendar';
import { GENERATIONS, type Generation } from '../monarch/generations';

const ROLL_S = 0.2;

interface Roll {
  direction: 1 | -1;
  /** A new day arrived before the last roll finished: jump instead of falling behind. */
  instant: boolean;
}

const roll: Variants = {
  enter: ({ direction, instant }: Roll) => ({ y: `${direction * 100}%`, opacity: 0, transition: { duration: instant ? 0 : ROLL_S } }),
  center: ({ instant }: Roll) => ({ y: 0, opacity: 1, transition: { duration: instant ? 0 : ROLL_S, ease: 'easeOut' } }),
  exit: ({ direction, instant }: Roll) => ({ y: `${direction * -100}%`, opacity: 0, transition: { duration: instant ? 0 : ROLL_S, ease: 'easeIn' } }),
};

function useRoll(today: number): Roll {
  const last = useRef({ day: today, at: 0, roll: { direction: 1, instant: false } as Roll });
  if (last.current.day !== today) {
    const now = performance.now();
    const ahead = (today - last.current.day + YEAR_DAYS) % YEAR_DAYS;
    last.current = {
      day: today,
      at: now,
      roll: { direction: ahead < YEAR_DAYS / 2 ? 1 : -1, instant: now - last.current.at < ROLL_S * 1000 },
    };
  }
  return last.current.roll;
}

function Slot({ value, roll: r }: { value: string; roll: Roll }) {
  return (
    <span className="slot">
      {/* `custom` on the presence reaches the exiting copy too, so it leaves in the new direction. */}
      <AnimatePresence initial={false} custom={r}>
        <motion.span key={value} custom={r} variants={roll} initial="enter" animate="center" exit="exit">
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function DayReadout({ day, dominant }: { day: number; dominant: Generation }) {
  const today = Math.floor(day);
  const r = useRoll(today);
  const { date, month } = dateOf(today);
  // Keyed from the right, so the units digit keeps its slot when the tens appear.
  const digits = String(date).split('').reverse();

  return (
    <div className="readout">
      <p className="readout-date" aria-label={`${date} ${month}`}>
        <span className="digits">
          {digits
            .map((digit, place) => <Slot key={place} value={digit} roll={r} />)
            .reverse()}
        </span>{' '}
        <Slot value={month} roll={r} />
      </p>
      <div className="readout-generation">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={dominant}
            style={{ color: `rgb(${GENERATIONS[dominant].color})` }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' } }}
          >
            {GENERATIONS[dominant].name}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
