import { motion, useReducedMotion } from 'motion/react';
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

// The play triangle cut down the middle into two halves, each with the same four corners as a pause bar,
// so one morphs into the other. The round stroke softens the corners.
const PLAY = 'M6 4.3 L12.2 8.15 L12.2 15.85 L6 19.7 Z M12.2 8.15 L18.4 12 L18.4 12 L12.2 15.85 Z';
const PAUSE = 'M6.6 4.8 L9 4.8 L9 19.2 L6.6 19.2 Z M15 4.8 L17.4 4.8 L17.4 19.2 L15 19.2 Z';

function PlayPauseIcon({ playing }: { playing: boolean }) {
  const reduced = useReducedMotion();
  return (
    <svg className="play-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <motion.path
        initial={false}
        animate={{ d: playing ? PAUSE : PLAY }}
        transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.35, bounce: 0.25 }}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
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
        <PlayPauseIcon playing={playing} />
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
        // Not pointerup: a cancelled or stolen capture never sends one, and the story would stay paused.
        onLostPointerCapture={onScrubEnd}
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
