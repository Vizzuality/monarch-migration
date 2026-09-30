import { useMemo, useRef } from 'react';

import { MONTH_STARTS, MONTHS, YEAR_DAYS } from '../data/calendar';
import type { RGB } from '../data/color';
import type { Activity } from '../migrations/types';

const SPEEDS = [0.5, 1, 2, 4];
const H = 100;

interface Props {
  activity: Activity;
  colors: RGB[];
  lineColor: RGB;
  day: number;
  playing: boolean;
  speed: number;
  onTogglePlay: () => void;
  onSpeed: (speed: number) => void;
  onScrub: (day: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

function stackedAreas(activity: Activity) {
  const base = new Float32Array(YEAR_DAYS);
  const y = (v: number) => H - (v / activity.max) * (H - 6);
  return activity.moving.map((series, group) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let d = 0; d < YEAR_DAYS; d++) {
      bottom.push(`${d},${y(base[d]).toFixed(2)}`);
      base[d] += series[d];
      top.push(`${d},${y(base[d]).toFixed(2)}`);
    }
    return { group, d: `M${top.join('L')}L${bottom.reverse().join('L')}Z` };
  });
}

function overlayLine(activity: Activity) {
  const max = Math.max(...activity.line);
  const pts: string[] = [];
  for (let d = 0; d < YEAR_DAYS; d++) pts.push(`${d},${(H - (activity.line[d] / max) * (H * 0.45)).toFixed(2)}`);
  return `M${pts.join('L')}`;
}

export function Timeline({ activity, colors, lineColor, day, playing, speed, onTogglePlay, onSpeed, onScrub, onScrubStart, onScrubEnd }: Props) {
  const areas = useMemo(() => stackedAreas(activity), [activity]);
  const line = useMemo(() => overlayLine(activity), [activity]);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrubTo = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(Math.min(YEAR_DAYS - 0.01, Math.max(0, ((clientX - rect.left) / rect.width) * YEAR_DAYS)));
  };

  const pct = (day / YEAR_DAYS) * 100;

  return (
    <div className="timeline panel">
      <div className="timeline-controls">
        <button className="play" onClick={onTogglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M7 5l12 7-12 7z" fill="currentColor" />
            </svg>
          )}
        </button>
        <div className="speeds">
          {SPEEDS.map((s) => (
            <button key={s} className={s === speed ? 'active' : ''} onClick={() => onSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-body">
        <div
          className="track"
          ref={trackRef}
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
          <svg viewBox={`0 0 ${YEAR_DAYS} ${H}`} preserveAspectRatio="none" className="chart">
            <defs>
              {colors.map((color, i) => (
                <linearGradient key={i} id={`grad-${i}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0.35" />
                </linearGradient>
              ))}
              <clipPath id="played">
                <rect x="0" y="0" width={day} height={H} />
              </clipPath>
            </defs>
            {MONTH_STARTS.map((m) => (
              <line key={m} x1={m} x2={m} y1={0} y2={H} className="month-line" vectorEffect="non-scaling-stroke" />
            ))}
            <g opacity="0.28">
              {areas.map((a) => (
                <path key={a.group} d={a.d} fill={`url(#grad-${a.group})`} />
              ))}
            </g>
            <g clipPath="url(#played)">
              {areas.map((a) => (
                <path key={a.group} d={a.d} fill={`url(#grad-${a.group})`} />
              ))}
            </g>
            <path d={line} className="overlay-line" stroke={`rgba(${lineColor}, 0.55)`} vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="playhead" style={{ left: `${pct}%` }} />
          <div className="playhead-dot" style={{ left: `${pct}%` }} />
        </div>
        <div className="months">
          {MONTHS.map((m, i) => (
            <span key={m} style={{ left: `${(MONTH_STARTS[i] / YEAR_DAYS) * 100}%` }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
