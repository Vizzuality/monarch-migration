import { EGG_COLOR, GENERATIONS } from '../data/generations';
import type { Frame } from '../data/model';
import { chapterAt, formatDay } from '../data/story';

const nf = new Intl.NumberFormat('es-ES');

// Each simulated lineage stands in for this many real butterflies, so the counters read at a believable scale.
const BUTTERFLIES_PER_DOT = 30_000;

export function Caption({ day, frame }: { day: number; frame: Frame }) {
  const chapter = chapterAt(day);
  return (
    <div className="caption panel">
      <div className="eyebrow">Danaus plexippus · Migración anual</div>
      <h1>
        La gran migración <span>de la mariposa monarca</span>
      </h1>
      <div className="date">{formatDay(day)}</div>
      <div className="chapter" key={chapter.title}>
        <h2>{chapter.title}</h2>
        <p>{chapter.body}</p>
      </div>
      <div className="stats">
        <Stat label="En vuelo" value={frame.flying} color={GENERATIONS[1].color} />
        <Stat label="Huevos y orugas" value={frame.eggs} color={EGG_COLOR} />
        <Stat label="En los bosques" value={frame.resting} color={GENERATIONS[0].color} />
      </div>
    </div>
  );
}

function formatMillions(n: number) {
  if (n === 0) return '0';
  if (n < 1e6) return '<1M';
  return `${nf.format(Math.round(n / 1e6))}M`;
}

function Stat({ label, value, color }: { label: string; value: number; color: number[] }) {
  return (
    <div className="stat">
      <div className="stat-value" style={{ color: `rgb(${color})` }}>
        {formatMillions(value * BUTTERFLIES_PER_DOT)}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Legend({ follow, onFollow }: { follow: boolean; onFollow: () => void }) {
  return (
    <div className="legend panel">
      <h3>Un año, cuatro generaciones</h3>
      <ul>
        {GENERATIONS.map((g) => (
          <li key={g.id}>
            <i style={{ background: `rgb(${g.color})`, boxShadow: `0 0 10px rgb(${g.color})` }} />
            <div>
              <strong>
                {g.name} <em>{g.lifespan}</em>
              </strong>
              <p>{g.description}</p>
            </div>
          </li>
        ))}
        <li>
          <i className="small" style={{ background: `rgb(${EGG_COLOR})`, boxShadow: `0 0 8px rgb(${EGG_COLOR})` }} />
          <div>
            <strong>Huevo → oruga → crisálida</strong>
            <p>Unas 4 semanas sobre algodoncillo, de huevo crema a oruga y a crisálida jade. La bruma verde marca dónde crían; cada anillo, una eclosión.</p>
          </div>
        </li>
      </ul>
      <button className={`follow ${follow ? 'active' : ''}`} onClick={onFollow}>
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path d="M4 7h11l5-3v16l-5-3H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {follow ? 'Cámara cinemática' : 'Volver a cámara cinemática'}
      </button>
      <p className="note">Datos simulados a partir de la fenología publicada de la población oriental.</p>
    </div>
  );
}
