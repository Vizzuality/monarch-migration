import type { HeatmapLayerSpecification } from 'maplibre-gl';

import { YEAR_DAYS } from '../data/calendar';
import { keyframe, type Keyframe } from '../map/camera';

export const START_DAY = 20;

// Close on the colonies in winter, wide over the continent in summer.
export const KEYFRAMES: Keyframe[] = [
  keyframe(0, -100.16, 19.62, 8.2, 58, -28),
  keyframe(44, -100.16, 19.62, 7.9, 56, 14),
  keyframe(70, -99.8, 21.6, 6.0, 52, 6),
  keyframe(95, -97.8, 27.2, 4.7, 46, 0),
  keyframe(135, -94, 34, 4.25, 42, -6),
  keyframe(185, -87.5, 40.8, 4.05, 40, -12),
  keyframe(235, -84.5, 43, 4.15, 42, -16),
  keyframe(265, -90.5, 37.2, 3.75, 40, -8),
  keyframe(292, -97.8, 29.6, 4.15, 46, 4),
  keyframe(314, -100.1, 21.2, 6.0, 54, 12),
  keyframe(332, -100.16, 19.62, 8.0, 58, -6),
  keyframe(YEAR_DAYS, -100.16, 19.62, 8.2, 58, -28),
];

/** Wide-shot labels fade out and colony labels fade in across this zoom range. */
export const CLOSE_UP: [number, number] = [6.2, 7.4];

// A soft milkweed-green haze over wherever eggs and caterpillars are.
export const HOTSPOT_PAINT: HeatmapLayerSpecification['paint'] = {
  'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 3, 14, 8, 90],
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.25, 8, 0.6],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(104, 184, 140, 0)',
    0.3,
    'rgba(120, 180, 110, 0.18)',
    0.7,
    'rgba(140, 196, 110, 0.34)',
    1,
    'rgba(176, 214, 128, 0.46)',
  ],
  'heatmap-opacity': 0.85,
};
