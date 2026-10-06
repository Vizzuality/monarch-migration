import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';

import playIcon from '../assets/play.svg';
import { MONTH_LENGTHS, MONTHS, YEAR_DAYS } from '../data/calendar';
import type { StoryDay } from '../monarch/story';
import type { Activity, SwarmMember } from '../monarch/types';
import { useNarrow } from './narrow';
import { Swarm } from './Swarm';
import { barShape } from './timeline-bar';

interface Props {
  activity: Activity;
  census: (day: number) => SwarmMember[];
  day: number;
  story: StoryDay;
  playing: boolean;
  onTogglePlay: () => void;
  onScrub: (day: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.5" y="3" width="4" height="14" rx="1.5" fill="#050507" />
      <rect x="11.5" y="3" width="4" height="14" rx="1.5" fill="#050507" />
    </svg>
  );
}

export function Timeline({ activity, census, day, story, playing, onTogglePlay, onScrub, onScrubStart, onScrubEnd }: Props) {
  const bar = useMemo(() => barShape(activity), [activity]);
  // A phone gets a bare bar: the same colors, without the thinning, the months or the Swarm.
  const narrow = useNarrow();
  const trackRef = useRef<HTMLDivElement>(null);

  const scrubTo = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(Math.min(YEAR_DAYS - 0.01, Math.max(0, ((clientX - rect.left) / rect.width) * YEAR_DAYS)));
  };

  const { date, month } = story.date;
  const color = `rgb(${story.dominant.color})`;

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
        aria-valuenow={story.today}
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
