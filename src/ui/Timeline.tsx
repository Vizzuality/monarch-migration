import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';

import playIcon from '../assets/play.svg';
import { dateOf, MONTH_LENGTHS, MONTHS, YEAR_DAYS } from '../data/calendar';
import { GENERATIONS, type Generation } from '../monarch/generations';
import type { Activity, SwarmMember } from '../monarch/types';
import { useNarrow } from './narrow';
import { Swarm } from './Swarm';

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

/**
 * Each day in the color of the Generation with the most butterflies. The band thins in a straight line towards
 * the middle of the bar around each handover, and its color only fades right at the handover itself.
 */
function barShape({ butterflies, dominant }: Activity) {
  const at = (d: number) => `${(((d + 0.5) / YEAR_DAYS) * 100).toFixed(3)}%`;
  // Each day's stop sits at its middle, and each handover at the start of a new Dominant generation's first day.
  const handovers = dominant.flatMap((g, d) => (d > 0 && g !== dominant[d - 1] ? [d] : []));
  const days = butterflies.map((share, d) => {
    const [first, second] = [...share].sort((a, b) => b - a);
    return {
      color: GENERATIONS[share.indexOf(first)].color,
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

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.5" y="3" width="4" height="14" rx="1.5" fill="#050507" />
      <rect x="11.5" y="3" width="4" height="14" rx="1.5" fill="#050507" />
    </svg>
  );
}

export function Timeline({ activity, census, day, dominant, playing, onTogglePlay, onScrub, onScrubStart, onScrubEnd }: Props) {
  const bar = useMemo(() => barShape(activity), [activity]);
  // A phone gets a bare bar: the same colors, without the thinning, the months or the Swarm.
  const narrow = useNarrow();
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
        <div className="bar">
          <div className="bar-fill" style={narrow ? { backgroundImage: bar.backgroundImage } : bar} />
        </div>
        {!narrow && (
          <>
            <div className="months" style={{ gridTemplateColumns: MONTH_LENGTHS.map((l) => `${l}fr`).join(' ') }}>
              {MONTHS.map((m) => (
                <span key={m} className="month">
                  {m}
                </span>
              ))}
            </div>
            <Swarm day={day} census={census} />
          </>
        )}
        <motion.div
          className="playhead"
          style={{ left: `${(day / YEAR_DAYS) * 100}%` }}
          initial={false}
          animate={{ color }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}
