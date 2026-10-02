import type { Chapter } from '../data/calendar';
import type { RGB } from '../data/color';
import { EGG_COLOR, GENERATIONS } from './generations';
import type { LegendItem } from './types';

export const EYEBROW = 'Danaus plexippus · Migración anual';
export const TITLE = 'La gran migración';
export const SUBTITLE = 'de la mariposa monarca';

/** One entry per `Frame.stats` value. */
export const STATS: { label: string; color: RGB }[] = [
  { label: 'En vuelo', color: GENERATIONS[1].color },
  { label: 'Huevos y orugas', color: EGG_COLOR },
  { label: 'En los bosques', color: GENERATIONS[0].color },
];

export const LEGEND: { title: string; items: LegendItem[]; note: string } = {
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
};

/** Day-of-year chapters shown in the caption card. */
export const CHAPTERS: Chapter[] = [
  {
    from: 0,
    title: 'Hibernación',
    body: 'Millones de monarcas cubren los oyameles de Michoacán, apiñadas en racimos para resistir el frío de la montaña.',
  },
  {
    from: 55,
    title: 'Despertar',
    body: 'Con los días más largos, la súper generación se aparea y despega hacia el norte en busca de algodoncillo.',
  },
  {
    from: 85,
    title: 'Primeros huevos',
    body: 'Las viajeras ponen sus huevos en Texas y Oklahoma y mueren. El relevo pasa a sus hijas.',
  },
  {
    from: 115,
    title: 'Generación 1',
    body: 'Viven apenas unas semanas y empujan la ola hacia el Medio Oeste.',
  },
  {
    from: 170,
    title: 'Generación 2',
    body: 'Las nietas alcanzan los Grandes Lagos, el sur de Canadá y Nueva Inglaterra.',
  },
  {
    from: 215,
    title: 'Generación 3',
    body: 'Pleno verano en el norte. Las bisnietas se dispersan y ponen los huevos de la próxima súper generación.',
  },
  {
    from: 250,
    title: 'La súper generación',
    body: 'Nacen sin madurar sexualmente, viven ocho meses y ponen rumbo al suroeste. Ninguna ha estado nunca en México.',
  },
  {
    from: 290,
    title: 'El embudo de Texas',
    body: 'Toda la población converge en un corredor estrecho que cruza el Río Bravo y sigue la Sierra Madre Oriental.',
  },
  {
    from: 305,
    title: 'Regreso a casa',
    body: 'Llegan hacia el Día de Muertos al mismo bosque que dejaron sus tatarabuelas. El ciclo vuelve a empezar.',
  },
];
