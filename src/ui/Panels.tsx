import { chapterAt, formatDay } from '../data/calendar';
import type { RGB } from '../data/color';
import { MIGRATIONS } from '../migrations';
import type { Frame, LegendItem, Migration } from '../migrations/types';

const compact = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumSignificantDigits: 2 });

interface CaptionProps {
  migration: Migration;
  day: number;
  frame: Frame;
  onSwitch: (id: string) => void;
}

export function Caption({ migration, day, frame, onSwitch }: CaptionProps) {
  const chapter = chapterAt(migration.chapters, day);
  return (
    <div className="caption panel">
      <nav className="switcher" aria-label="Migración">
        {MIGRATIONS.map((m) => (
          <button key={m.id} className={m.id === migration.id ? 'active' : ''} aria-pressed={m.id === migration.id} onClick={() => onSwitch(m.id)}>
            {m.name}
          </button>
        ))}
      </nav>
      <div className="eyebrow">{migration.eyebrow}</div>
      <h1>
        {migration.title} <span>{migration.subtitle}</span>
      </h1>
      <div className="date">{formatDay(day)}</div>
      <div className="chapter" key={`${migration.id}-${chapter.title}`}>
        <h2>{chapter.title}</h2>
        <p>{chapter.body}</p>
      </div>
      <div className="stats">
        {migration.stats.map((s, i) => (
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
  if (item.mark === 'ring') return <i className="ring" style={{ borderColor: rgb, boxShadow: `0 0 8px ${rgb}` }} />;
  return <i className={item.mark} style={{ background: rgb, boxShadow: `0 0 ${item.mark === 'small' ? 8 : 10}px ${rgb}` }} />;
}

export function Legend({ migration, follow, onFollow }: { migration: Migration; follow: boolean; onFollow: () => void }) {
  return (
    <div className="legend panel">
      <h3>{migration.legend.title}</h3>
      <ul>
        {migration.legend.items.map((item) => (
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
      <button className={`follow ${follow ? 'active' : ''}`} onClick={onFollow}>
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path d="M4 7h11l5-3v16l-5-3H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {follow ? 'Cámara cinemática' : 'Volver a cámara cinemática'}
      </button>
      <p className="note">{migration.legend.note}</p>
    </div>
  );
}
