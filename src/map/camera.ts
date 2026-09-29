import { YEAR_DAYS } from '../data/model';

export interface Camera {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

const k = (day: number, longitude: number, latitude: number, zoom: number, pitch: number, bearing: number) => ({
  day,
  camera: { longitude, latitude, zoom, pitch, bearing },
});

/** Cinematic camera path through the year: close on the colonies in winter, wide over the continent in summer. */
const KEYFRAMES = [
  k(0, -100.16, 19.62, 8.2, 58, -28),
  k(44, -100.16, 19.62, 7.9, 56, 14),
  k(70, -99.8, 21.6, 6.0, 52, 6),
  k(95, -97.8, 27.2, 4.7, 46, 0),
  k(135, -94, 34, 4.25, 42, -6),
  k(185, -87.5, 40.8, 4.05, 40, -12),
  k(235, -84.5, 43, 4.15, 42, -16),
  k(265, -90.5, 37.2, 3.75, 40, -8),
  k(292, -97.8, 29.6, 4.15, 46, 4),
  k(314, -100.1, 21.2, 6.0, 54, 12),
  k(332, -100.16, 19.62, 8.0, 58, -6),
  k(YEAR_DAYS, -100.16, 19.62, 8.2, 58, -28),
];

const CHANNELS = ['longitude', 'latitude', 'zoom', 'pitch', 'bearing'] as const;

// Monotone cubic (PCHIP) tangents, wrapped around the year. A per-segment ease
// brings the camera to a full stop at every keyframe; these keep it gliding
// through them and only settle where a channel turns around, without overshoot.
const LOOP = KEYFRAMES.slice(0, -1);
const TANGENTS = LOOP.map((_, i) => {
  const n = LOOP.length;
  const prev = LOOP[(i - 1 + n) % n];
  const cur = LOOP[i];
  const next = LOOP[(i + 1) % n];
  const h0 = (cur.day - prev.day + YEAR_DAYS) % YEAR_DAYS;
  const h1 = (next.day - cur.day + YEAR_DAYS) % YEAR_DAYS || YEAR_DAYS;
  const out = {} as Camera;
  for (const key of CHANNELS) {
    const d0 = (cur.camera[key] - prev.camera[key]) / h0;
    const d1 = (next.camera[key] - cur.camera[key]) / h1;
    if (d0 * d1 <= 0) out[key] = 0;
    else {
      const w0 = 2 * h1 + h0;
      const w1 = h1 + 2 * h0;
      out[key] = (w0 + w1) / (w0 / d0 + w1 / d1);
    }
  }
  return out;
});

export function cameraAt(day: number): Camera {
  const d = ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
  let i = 0;
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].day <= d) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const ta = TANGENTS[i % LOOP.length];
  const tb = TANGENTS[(i + 1) % LOOP.length];
  const h = b.day - a.day;
  const u = (d - a.day) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  const out = {} as Camera;
  for (const key of CHANNELS) {
    out[key] =
      (2 * u3 - 3 * u2 + 1) * a.camera[key] +
      (u3 - 2 * u2 + u) * h * ta[key] +
      (-2 * u3 + 3 * u2) * b.camera[key] +
      (u3 - u2) * h * tb[key];
  }
  return out;
}
