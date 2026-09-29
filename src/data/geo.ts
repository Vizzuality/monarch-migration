export type LngLat = [number, number];

/** Overwintering colonies inside the Monarch Butterfly Biosphere Reserve (Michoacán / Edomex). */
export const COLONIES: { name: string; position: LngLat; weight: number; anchor: 'start' | 'end'; offset: [number, number] }[] = [
  { name: 'El Rosario', position: [-100.268, 19.595], weight: 0.34, anchor: 'start', offset: [22, 6] },
  { name: 'Sierra Chincua', position: [-100.29, 19.675], weight: 0.24, anchor: 'end', offset: [-22, -6] },
  { name: 'Cerro Pelón', position: [-100.255, 19.385], weight: 0.18, anchor: 'end', offset: [-22, 0] },
  { name: 'Piedra Herrada', position: [-99.975, 19.28], weight: 0.12, anchor: 'start', offset: [22, 0] },
  { name: 'Cerro Altamirano', position: [-100.12, 19.97], weight: 0.12, anchor: 'start', offset: [22, 0] },
];

export interface Zone {
  center: LngLat;
  spread: LngLat;
  /** Rejects points that land in the sea. */
  land: (p: LngLat) => boolean;
}

export const ZONES: Record<'south' | 'central' | 'north', Zone> = {
  // Texas, Oklahoma, Louisiana
  south: { center: [-97.6, 31.6], spread: [2.6, 1.7], land: ([x, y]) => !(y < 29.8 && x > -95.5) && !(y < 28 && x > -97.3) },
  // Kansas → Ohio valley
  central: { center: [-90.5, 38.6], spread: [4.6, 1.7], land: () => true },
  // Great Lakes, Ontario, New England
  north: { center: [-82, 44.6], spread: [7, 1.9], land: ([x, y]) => x < -67.5 && y < 49.5 && !(x > -71 && y < 42) },
};

/** Autumn flyway: every super-generation butterfly squeezes through these gates. */
export const FLYWAY: { center: LngLat; spread: LngLat }[] = [
  { center: [-96.5, 38.2], spread: [2.8, 1.4] }, // Kansas / Missouri
  { center: [-98.6, 32.6], spread: [1.3, 0.9] }, // Central Texas
  { center: [-100.4, 28.7], spread: [0.6, 0.45] }, // Rio Grande (Eagle Pass)
  { center: [-100.1, 24.2], spread: [0.45, 0.45] }, // Sierra Madre Oriental
];

export const PLACE_LABELS: { text: string; position: LngLat; size: number }[] = [
  { text: 'MÉXICO', position: [-102.5, 23.5], size: 15 },
  { text: 'ESTADOS UNIDOS', position: [-98, 39.5], size: 15 },
  { text: 'CANADÁ', position: [-84, 51.5], size: 15 },
  { text: 'Golfo de México', position: [-90.5, 25.2], size: 11 },
  { text: 'Grandes Lagos', position: [-84.5, 45.2], size: 11 },
];
