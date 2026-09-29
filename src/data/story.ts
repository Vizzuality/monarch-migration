import { YEAR_DAYS } from './model';

export interface Chapter {
  from: number;
  title: string;
  body: string;
}

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

export function chapterAt(day: number): Chapter {
  let current = CHAPTERS[0];
  for (const c of CHAPTERS) if (day >= c.from) current = c;
  return current;
}

export const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** Day-of-year where each month starts (non-leap year). */
export const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

export function formatDay(day: number) {
  const d = new Date(2025, 0, 1 + Math.floor(((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS));
  return dateFormat.format(d);
}
