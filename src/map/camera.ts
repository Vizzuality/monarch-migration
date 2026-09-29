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

const ease = (x: number) => x * x * (3 - 2 * x);

export function cameraAt(day: number): Camera {
  const d = ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
  let i = 0;
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].day <= d) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const u = ease((d - a.day) / (b.day - a.day));
  const lerp = (key: keyof Camera) => a.camera[key] + (b.camera[key] - a.camera[key]) * u;
  return {
    longitude: lerp('longitude'),
    latitude: lerp('latitude'),
    zoom: lerp('zoom'),
    pitch: lerp('pitch'),
    bearing: lerp('bearing'),
  };
}
