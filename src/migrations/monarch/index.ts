import { YEAR_DAYS } from '../../data/calendar';
import { keyframe } from '../../map/camera';
import type { Migration } from '../types';
import { COLONIES, PLACE_LABELS } from './geo';
import { EGG_COLOR, GENERATIONS } from './generations';
import { buildModel } from './model';
import { CHAPTERS } from './story';

export const monarch: Migration = {
  id: 'monarca',
  name: 'Mariposa monarca',
  pageTitle: 'Monarcas · La gran migración',
  eyebrow: 'Danaus plexippus · Migración anual',
  title: 'La gran migración',
  subtitle: 'de la mariposa monarca',
  chapters: CHAPTERS,
  stats: [
    { label: 'En vuelo', color: GENERATIONS[1].color },
    { label: 'Huevos y orugas', color: EGG_COLOR },
    { label: 'En los bosques', color: GENERATIONS[0].color },
  ],
  legend: {
    title: 'Un año, cuatro generaciones',
    items: [
      ...GENERATIONS.map((g) => ({ name: g.name, tag: g.lifespan, description: g.description, color: g.color })),
      {
        name: 'Huevo → oruga → crisálida',
        description:
          'Unas 4 semanas sobre algodoncillo, de huevo crema a oruga y a crisálida jade. La bruma verde marca dónde crían; cada anillo, una eclosión.',
        color: EGG_COLOR,
        mark: 'small',
      },
    ],
    note: 'Datos simulados a partir de la fenología publicada de la población oriental.',
  },
  groups: GENERATIONS.map((g) => g.color),
  lineColor: [120, 255, 150],
  // Close on the colonies in winter, wide over the continent in summer.
  keyframes: [
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
  ],
  startDay: 20,
  closeUp: [6.2, 7.4],
  placeLabels: PLACE_LABELS,
  sites: COLONIES,
  // A soft milkweed-green haze over wherever eggs and caterpillars are.
  hotspotPaint: {
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
  },
  build: () => buildModel(),
};
