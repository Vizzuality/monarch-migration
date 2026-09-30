import { YEAR_DAYS } from '../data/calendar';

export interface Camera {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface Keyframe {
  day: number;
  camera: Camera;
}

export const keyframe = (day: number, longitude: number, latitude: number, zoom: number, pitch: number, bearing: number): Keyframe => ({
  day,
  camera: { longitude, latitude, zoom, pitch, bearing },
});

const CHANNELS = ['longitude', 'latitude', 'zoom', 'pitch', 'bearing'] as const;

/**
 * A cinematic camera path through the year. `keyframes` start at day 0 and
 * end at YEAR_DAYS on the same shot, so the loop is seamless.
 */
export function cameraPath(keyframes: Keyframe[]) {
  // Monotone cubic (PCHIP) tangents, wrapped around the year. A per-segment ease
  // brings the camera to a full stop at every keyframe; these keep it gliding
  // through them and only settle where a channel turns around, without overshoot.
  const loop = keyframes.slice(0, -1);
  const tangents = loop.map((_, i) => {
    const n = loop.length;
    const prev = loop[(i - 1 + n) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
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

  return (day: number): Camera => {
    const d = ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
    let i = 0;
    while (i < keyframes.length - 2 && keyframes[i + 1].day <= d) i++;
    const a = keyframes[i];
    const b = keyframes[i + 1];
    const ta = tangents[i % loop.length];
    const tb = tangents[(i + 1) % loop.length];
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
  };
}
