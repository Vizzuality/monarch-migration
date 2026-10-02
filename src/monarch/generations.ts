import { gradient, type RGB } from '../data/color';

export type Generation = 0 | 1 | 2 | 3;

/** Generation 0 is the long-lived Super generation: it flies south in autumn, winters in Mexico and starts the spring flight. */
export const GENERATIONS: { id: Generation; name: string; description: string; color: RGB }[] = [
  {
    id: 0,
    name: 'Super generation',
    description: 'Flies up to 4,000 km to a forest it has never seen, spends the winter there and heads north in spring.',
    color: [255, 139, 56],
  },
  {
    id: 1,
    name: 'Generation 1',
    description: 'Born on milkweed in Texas and Oklahoma, it moves on into the Midwest.',
    color: [162, 71, 247],
  },
  {
    id: 2,
    name: 'Generation 2',
    description: 'Reaches the Great Lakes, southern Canada and New England.',
    color: [233, 216, 148],
  },
  {
    id: 3,
    name: 'Generation 3',
    description: 'Spreads across the north in high summer. Its offspring will be the next Super generation.',
    color: [129, 120, 255],
  },
];

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

export function metamorphosisColor(stage: number, adult: RGB): RGB {
  return gradient([...METAMORPHOSIS, { at: 1, color: adult }], stage);
}
