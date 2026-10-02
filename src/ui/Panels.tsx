import { chapterAt, formatDay } from '../data/calendar';
import type { RGB } from '../data/color';
import { CHAPTERS, EYEBROW, LEGEND, STATS, SUBTITLE, TITLE } from '../monarch/story';
import type { Frame, LegendItem } from '../monarch/types';

const compact = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumSignificantDigits: 2 });

export function Caption({ day, frame }: { day: number; frame: Frame }) {
  const chapter = chapterAt(CHAPTERS, day);
  return (
    <div className="caption panel">
      <div className="eyebrow">{EYEBROW}</div>
      <h1>
        {TITLE} <span>{SUBTITLE}</span>
      </h1>
      <div className="date">{formatDay(day)}</div>
      <div className="chapter" key={chapter.title}>
        <h2>{chapter.title}</h2>
        <p>{chapter.body}</p>
      </div>
      <div className="stats">
        {STATS.map((s, i) => (
          <Stat key={s.label} label={s.label} value={frame.stats[i]} color={s.color} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: RGB }) {
  return (
    <div className="stat">
      <div className="stat-value" style={{ color: `rgb(${color})` }}>
        {compact.format(value)}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Mark({ item }: { item: LegendItem }) {
  const rgb = `rgb(${item.color})`;
  return <i className={item.mark} style={{ background: rgb, boxShadow: `0 0 ${item.mark === 'small' ? 8 : 10}px ${rgb}` }} />;
}

export function Legend() {
  return (
    <div className="legend panel">
      <h3>{LEGEND.title}</h3>
      <ul>
        {LEGEND.items.map((item) => (
          <li key={item.name}>
            <Mark item={item} />
            <div>
              <strong>
                {item.name} {item.tag && <em>{item.tag}</em>}
              </strong>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="note">{LEGEND.note}</p>
    </div>
  );
}
