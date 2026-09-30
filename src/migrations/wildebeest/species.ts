import type { RGB } from '../../data/color';

export type SpeciesId = 0 | 1 | 2;

export const SPECIES: { id: SpeciesId; name: string; population: string; description: string; color: RGB; dots: number; real: number }[] = [
  {
    id: 0,
    name: 'Ñu azul',
    population: '~1,3 millones',
    description: 'Sigue las lluvias en un circuito de unos 1.000 km entre Tanzania y Kenia, sin parar nunca del todo.',
    color: [140, 178, 236],
    dots: 420,
    real: 1_300_000,
  },
  {
    id: 1,
    name: 'Cebra',
    population: '~200.000',
    description: 'Va unos días por delante: siega la hierba alta y deja al descubierto los brotes que prefieren los ñus.',
    color: [240, 238, 228],
    dots: 100,
    real: 200_000,
  },
  {
    id: 2,
    name: 'Gacela de Thomson',
    population: '~300.000',
    description: 'Come los brotes que dejan los ñus, pero se queda en el centro del Serengeti y no cruza los grandes ríos.',
    color: [220, 116, 72],
    dots: 80,
    real: 300_000,
  },
];

// The blue wildebeest is born fawn and turns slate grey in about two months.
export const CALF_COLOR: RGB = [246, 206, 146];
export const CALF_COAT: { at: number; color: RGB }[] = [
  { at: 0, color: CALF_COLOR },
  { at: 70, color: SPECIES[0].color },
];

export const WATER_COLOR: RGB = [120, 220, 255];

/** Calves born in the short February window. */
export const CALVES_REAL = 500_000;
