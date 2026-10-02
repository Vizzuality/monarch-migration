import { gradient, type RGB } from '../data/color';

export type Generation = 0 | 1 | 2 | 3;

/** Generation 0 is the long-lived "super generation": it flies south in autumn, winters in Mexico and starts the spring flight. */
export const GENERATIONS: { id: Generation; name: string; lifespan: string; description: string; color: RGB }[] = [
  {
    id: 0,
    name: 'Súper generación',
    lifespan: '~8 meses',
    description: 'Vuela hasta 4.000 km a un bosque que nunca ha visto, pasa el invierno en él y en primavera arranca hacia el norte.',
    color: [236, 112, 34],
  },
  {
    id: 1,
    name: 'Generación 1',
    lifespan: '2–6 semanas',
    description: 'Nace sobre algodoncillo en Texas y Oklahoma y avanza hacia el Medio Oeste.',
    color: [232, 176, 74],
  },
  {
    id: 2,
    name: 'Generación 2',
    lifespan: '2–6 semanas',
    description: 'Llega a los Grandes Lagos, al sur de Canadá y a Nueva Inglaterra.',
    color: [222, 122, 118],
  },
  {
    id: 3,
    name: 'Generación 3',
    lifespan: '2–6 semanas',
    description: 'Se dispersa por el norte en pleno verano. Sus crías serán la próxima súper generación.',
    color: [238, 218, 180],
  },
];

// Palette taken from the butterfly and its host plant: wing orange, marigold,
// milkweed blossom and the pale wing spots.

/**
 * Colors an egg passes through on its way to becoming a butterfly, keyed by
 * how far along it is (0 = just laid, 1 = about to hatch): cream egg,
 * yellow-banded caterpillar and jade chrysalis. The last stretch blends into
 * the adult's own color, so it hatches already looking like the generation
 * it becomes.
 */
export const METAMORPHOSIS: { at: number; color: RGB }[] = [
  { at: 0, color: [238, 230, 204] },
  { at: 0.2, color: [216, 204, 104] },
  { at: 0.5, color: [104, 184, 140] },
  { at: 0.85, color: [104, 184, 140] },
];

/** The chrysalis jade stands for the whole egg-to-adult stage in the legend and stats. */
export const EGG_COLOR: RGB = METAMORPHOSIS[2].color;

export function metamorphosisColor(stage: number, adult: RGB): RGB {
  return gradient([...METAMORPHOSIS, { at: 1, color: adult }], stage);
}
