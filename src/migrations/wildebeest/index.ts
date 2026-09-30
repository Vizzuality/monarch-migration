import { YEAR_DAYS } from '../../data/calendar';
import { keyframe } from '../../map/camera';
import type { Migration } from '../types';
import { PLACE_LABELS, RIVERS, SITES } from './geo';
import { buildModel } from './model';
import { CALF_COLOR, SPECIES, WATER_COLOR } from './species';
import { CHAPTERS } from './story';

export const wildebeest: Migration = {
  id: 'nus',
  name: 'Ñus del Serengeti',
  pageTitle: 'Ñus · La gran migración',
  eyebrow: 'Connochaetes taurinus · Ciclo anual',
  title: 'La gran migración',
  subtitle: 'de los ñus del Serengeti',
  chapters: CHAPTERS,
  stats: [
    { label: 'En marcha', color: SPECIES[0].color },
    { label: 'Crías', color: CALF_COLOR },
    { label: 'Pastando', color: SPECIES[1].color },
  ],
  legend: {
    title: 'Tres especies, un circuito',
    items: [
      ...SPECIES.map((s) => ({ name: s.name, tag: s.population, description: s.description, color: s.color })),
      {
        name: 'Cría de ñu',
        description: 'Nace de color canela y se vuelve gris azulado en unos dos meses. La bruma verde marca dónde paren; cada anillo, un nacimiento.',
        color: CALF_COLOR,
        mark: 'small',
      },
      {
        name: 'Cruce de río',
        description: 'Cada anillo azul es un grupo que cruza el Grumeti o el Mara.',
        color: WATER_COLOR,
        mark: 'ring',
      },
    ],
    note: 'Datos simulados a partir del calendario publicado del ciclo Serengeti–Mara.',
  },
  groups: SPECIES.map((s) => s.color),
  lineColor: CALF_COLOR,
  // Close on the calving grounds and the river crossings, wider on the treks between them.
  keyframes: [
    keyframe(0, 35.02, -2.88, 9.0, 58, -20),
    keyframe(40, 35.0, -2.93, 9.5, 60, 8),
    keyframe(75, 34.9, -2.82, 9.0, 55, -4),
    keyframe(112, 34.72, -2.58, 8.5, 50, -14),
    keyframe(145, 34.45, -2.3, 8.7, 52, -24),
    keyframe(170, 34.4, -2.18, 9.3, 58, -34),
    keyframe(198, 34.75, -1.9, 8.4, 48, -12),
    keyframe(225, 34.95, -1.58, 9.3, 58, 12),
    keyframe(262, 35.05, -1.48, 8.8, 54, 28),
    keyframe(300, 35.12, -1.95, 8.2, 46, 12),
    keyframe(335, 35.12, -2.6, 8.6, 52, -6),
    keyframe(YEAR_DAYS, 35.02, -2.88, 9.0, 58, -20),
  ],
  startDay: 20,
  closeUp: [8.3, 8.9],
  placeLabels: PLACE_LABELS,
  sites: SITES,
  rivers: RIVERS,
  // A fresh-grass green haze over wherever calves are being born.
  hotspotPaint: {
    'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 7, 18, 10, 90],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 7, 0.3, 10, 0.7],
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
