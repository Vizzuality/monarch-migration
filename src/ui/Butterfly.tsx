import { useId, type CSSProperties, type ReactNode } from 'react';

export type Pose = 'flying' | 'perched';

// Side view of a monarch facing right, wings folded up over a near-level body. The wings
// and body are drawn hanging from a twig and tilted upright; legs and antennae are drawn
// already upright. The feet touch the bottom edge of the viewBox at FEET_X.
const X0 = 12;
const Y0 = -21;
const W = 88;
const H = 101;
export const ASPECT = H / W;
export const FEET_X = (75 - X0) / W;
const TILT = 'rotate(40 75 60)';

const FOREWING = 'M72 55C62 30 38 12 16 9C11 8.5 9 12 11 16C13 28 16 40 19 48C38 52 58 58 72 60Z';
const HINDWING = 'M70 58C52 52 30 48 18 50C12 54 12 64 15 74C19 85 27 92 35 92C46 92 58 84 66 76C70 70 72 64 70 58Z';

// The monarch's black veins and margins, cut out of the wings so the map shows through,
// with the white spots of the margin left standing inside them.
const FOREWING_MARGIN = 'M16 9C11 8.5 9 12 11 16C13 28 16 40 19 48';
const FOREWING_COSTA = 'M50 25C40 17 30 12.5 16 9';
const FOREWING_VEINS = 'M70 56C58 38 42 22 24 14M68 57C54 44 38 32 20 24M67 58C52 50 36 42 18 36M66 59C50 56 34 50 19 45';
const FOREWING_SPOTS: [number, number, number][] = [
  [13, 20, 0.9], [14, 26, 0.9], [15.5, 32, 0.9], [17, 38, 0.9], [18.5, 44, 0.9],
  [20, 14, 1.1], [24.5, 15, 1.1], [21, 19, 1],
];
const HINDWING_MARGIN = 'M18 52C12 56 12 64 15 74C19 85 27 92 35 92C46 92 58 84 66 76';
const HINDWING_VEINS = 'M68 62C52 58 34 56 18 58M68 63C52 64 34 68 18 72M68 64C54 70 40 78 26 86M69 65C60 74 50 84 40 90M70 66C66 74 60 80 54 85';
const HINDWING_SPOTS: [number, number, number][] = [
  [15.5, 60, 0.9], [16.5, 68, 0.9], [19, 76, 0.9], [23, 83, 0.9], [29, 88, 0.9], [36, 89.5, 0.9], [44, 88, 0.9], [52, 84, 0.9],
];

function WingMask({ id, wing, margin, veins, spots, extra, gap }: { id: string; wing: string; margin: string; veins: string; spots: [number, number, number][]; extra?: ReactNode; gap?: string }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <path d={wing} fill="white" />
      <g fill="none" stroke="black" strokeLinecap="round">
        <path d={margin} strokeWidth="7" />
        <path d={veins} strokeWidth="1.5" />
        {extra}
        {gap && <path d={gap} strokeWidth="2" />}
      </g>
      {/* A hairline of the wing edge stays, so the dark margin reads as a band and not as the edge. */}
      <path d={wing} fill="none" stroke="white" strokeWidth="1.4" />
      {spots.map(([cx, cy, r]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={r} fill="white" />
      ))}
    </mask>
  );
}

// A wingbeat swings the wings about the body's long axis. The CSS scaleY runs in a frame
// where that axis is level, so the wings fold up over the back and sweep down below it.
const BODY_ANGLE = 63.7;

function Wings({ id, className }: { id: string; className: string }) {
  return (
    <g transform={`rotate(${-BODY_ANGLE} 72 57)`}>
      <g className={`butterfly-wings ${className}`}>
        <g transform={`rotate(${BODY_ANGLE} 72 57)`}>
          <path d={HINDWING} mask={`url(#${id}-hind)`} />
          <path d={FOREWING} mask={`url(#${id}-fore)`} />
        </g>
      </g>
    </g>
  );
}

export function Butterfly({ pose, size, style }: { pose: Pose; size: number; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="butterfly" data-pose={pose} viewBox={`0 0 ${W} ${H}`} width={size} height={size * ASPECT} style={style} aria-hidden>
      <defs>
        <WingMask
          id={`${id}-fore`}
          wing={FOREWING}
          margin={FOREWING_MARGIN}
          veins={FOREWING_VEINS}
          spots={FOREWING_SPOTS}
          extra={
            <>
              <path d={FOREWING_COSTA} strokeWidth="4" />
              <circle cx="18" cy="15" r="6" fill="black" stroke="none" />
            </>
          }
        />
        {/* The forewing sits in front; a hairline gap keeps the two apart. */}
        <WingMask id={`${id}-hind`} wing={HINDWING} margin={HINDWING_MARGIN} veins={HINDWING_VEINS} spots={HINDWING_SPOTS} gap={FOREWING} />
      </defs>
      <g transform={`translate(${-X0} ${-Y0})`}>
        <g className="butterfly-lines">
          <path d="M73.5 62.5L70 72L68 80M76.5 63L79.5 72L82 80" />
          <path d="M82 55C87 47 92 38 98 31M83 56C89 51 94 45 98 41" />
        </g>
        <circle cx="98.2" cy="30.7" r="1.1" />
        <circle cx="98.3" cy="40.8" r="1.1" />
        <g transform={TILT}>
          <Wings id={id} className="butterfly-wings-far" />
          <Wings id={id} className="butterfly-wings-near" />
          <path d="M72.5 64C69.5 70 66 76 63 82C62 84 64 85 65 83.5C68 78 71 72 74.5 66.5Z" />
          <ellipse cx="75" cy="60" rx="2.8" ry="4.8" transform="rotate(20 75 60)" />
          <circle cx="77.8" cy="54" r="2.5" />
        </g>
      </g>
    </svg>
  );
}
