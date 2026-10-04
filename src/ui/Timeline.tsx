import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';

import playIcon from '../assets/play.svg';
import { dateOf, MONTH_LENGTHS, MONTHS, YEAR_DAYS } from '../data/calendar';
import { GENERATIONS, type Generation } from '../monarch/generations';
import type { Activity, SwarmMember } from '../monarch/types';
import { Swarm } from './Swarm';

// Days a change of Dominant generation takes to blend on the bar, centred on the change.
const FADE_DAYS = 14;

interface Props {
  activity: Activity;
  census: (day: number) => SwarmMember[];
  day: number;
  dominant: Generation;
  playing: boolean;
  onTogglePlay: () => void;
  onScrub: (day: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

/** Each Dominant generation's color, blended into the next one around the day it takes over. */
function barGradient({ dominant }: Activity) {
  const at = (d: number) => `${((d / YEAR_DAYS) * 100).toFixed(3)}%`;
  const stops = [`rgb(${GENERATIONS[dominant[0]].color}) 0%`];
  for (let d = 1; d < YEAR_DAYS; d++) {
    if (dominant[d] === dominant[d - 1]) continue;
    stops.push(`rgb(${GENERATIONS[dominant[d - 1]].color}) ${at(d - FADE_DAYS / 2)}`);
    stops.push(`rgb(${GENERATIONS[dominant[d]].color}) ${at(d + FADE_DAYS / 2)}`);
  }
  stops.push(`rgb(${GENERATIONS[dominant[YEAR_DAYS - 1]].color}) 100%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

function PlayheadDot() {
  return (
    <svg className="dot" width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.5" fill="currentColor" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.5" y="3" width="4" height="14" rx="1.5" fill="#050507" />
      <rect x="11.5" y="3" width="4" height="14" rx="1.5" fill="#050507" />
    </svg>
  );
}

export function Timeline({ activity, census, day, dominant, playing, onTogglePlay, onScrub, onScrubStart, onScrubEnd }: Props) {
  const bar = useMemo(() => barGradient(activity), [activity]);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrubTo = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(Math.min(YEAR_DAYS - 0.01, Math.max(0, ((clientX - rect.left) / rect.width) * YEAR_DAYS)));
  };

  const { date, month } = dateOf(day);
  const color = `rgb(${GENERATIONS[dominant].color})`;

  return (
    <div className="timeline">
      <button className="play" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
        <AnimatePresence initial={false}>
          <motion.span
            key={playing ? 'pause' : 'play'}
            className="play-icon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {playing ? <PauseIcon /> : <img src={playIcon} width="20" height="20" alt="" />}
          </motion.span>
        </AnimatePresence>
      </button>

      <div
        className="track"
        ref={trackRef}
        role="slider"
        aria-label="Day of the year"
        aria-valuemin={0}
        aria-valuemax={YEAR_DAYS - 1}
        aria-valuenow={Math.floor(day)}
        aria-valuetext={`${date} ${month}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onScrubStart();
          scrubTo(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubTo(e.clientX);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          onScrubEnd();
        }}
      >
        <div className="bar" style={{ backgroundImage: bar }} />
        <div className="months" style={{ gridTemplateColumns: MONTH_LENGTHS.map((l) => `${l}fr`).join(' ') }}>
          {MONTHS.map((m) => (
            <span key={m} className="month">
              {m}
            </span>
          ))}
        </div>
        <Swarm day={day} census={census} />
        <motion.div
          className="playhead"
          style={{ left: `${(day / YEAR_DAYS) * 100}%` }}
          initial={false}
          animate={{ color }}
          transition={{ duration: 0.4 }}
        >
          <PlayheadDot />
        </motion.div>
      </div>
    </div>
  );
}
