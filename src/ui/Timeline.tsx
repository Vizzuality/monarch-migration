import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef, type CSSProperties } from 'react';

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

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.561 3.408a1.83 1.83 0 0 0-2.76 1.524v14.136a1.83 1.83 0 0 0 2.76 1.524l11.213-7.069a1.8 1.8 0 0 0 0-3.046L7.561 3.409Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.5" y="3" width="4" height="14" rx="1.5" fill="currentColor" />
      <rect x="11.5" y="3" width="4" height="14" rx="1.5" fill="currentColor" />
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
  const fill = <div className="bar-fill" style={narrow ? { backgroundImage: bar.backgroundImage } : bar} />;
  const columns = { gridTemplateColumns: MONTH_LENGTHS.map((l) => `${l}fr`).join(' ') };

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
            {playing ? <PauseIcon /> : <PlayIcon />}
          </motion.span>
        </AnimatePresence>
      </button>

      <div
        className="track"
        ref={trackRef}
        style={{ '--past': `${(day / YEAR_DAYS) * 100}%` } as CSSProperties}
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
        {!narrow && (
          <div className="cells" style={columns}>
            {MONTHS.map((m) => (
              <span key={m} />
            ))}
          </div>
        )}
        {/* The Past is the same bar switched off, cut off where the playhead is. */}
        <div className="bar">{fill}</div>
        <div className="bar past" aria-hidden="true">
          {fill}
        </div>
        {!narrow && (
          <>
            <div className="months" style={columns}>
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
