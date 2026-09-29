export type Generation = 0 | 1 | 2 | 3;

export type RGB = [number, number, number];

/** Generation 0 is the long-lived "super generation": it flies south in autumn, winters in Mexico and starts the spring flight. */
export const GENERATIONS: { id: Generation; name: string; lifespan: string; description: string; color: RGB }[] = [
  {
    id: 0,
    name: 'Súper generación',
    lifespan: '~8 meses',
    description: 'Vuela hasta 4.000 km a un bosque que nunca ha visto, pasa el invierno en él y en primavera arranca hacia el norte.',
    color: [255, 110, 20],
  },
  {
    id: 1,
    name: 'Generación 1',
    lifespan: '2–6 semanas',
    description: 'Nace sobre algodoncillo en Texas y Oklahoma y avanza hacia el Medio Oeste.',
    color: [255, 214, 64],
  },
  {
    id: 2,
    name: 'Generación 2',
    lifespan: '2–6 semanas',
    description: 'Llega a los Grandes Lagos, al sur de Canadá y a Nueva Inglaterra.',
    color: [72, 220, 200],
  },
  {
    id: 3,
    name: 'Generación 3',
    lifespan: '2–6 semanas',
    description: 'Se dispersa por el norte en pleno verano. Sus crías serán la próxima súper generación.',
    color: [190, 140, 255],
  },
];

export const EGG_COLOR: RGB = [120, 255, 150];
