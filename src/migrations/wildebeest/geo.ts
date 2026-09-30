import type { LngLat, Zone } from '../../data/random';
import type { Label, Site } from '../types';

// River lines simplified from OpenStreetMap, downstream order. Crossings are
// detected against them, so the rings land where the herd meets the water.
export const MARA_RIVER: LngLat[] = [
  [35.224, -1.065], [35.204, -1.096], [35.175, -1.079], [35.177, -1.102], [35.141, -1.14], [35.096, -1.139],
  [35.037, -1.214], [35.041, -1.295], [35.029, -1.318], [34.991, -1.327], [34.99, -1.373], [35.017, -1.378],
  [35.064, -1.434], [35.033, -1.465], [35.016, -1.516], [35.029, -1.538], [35.003, -1.564], [34.938, -1.582],
  [34.854, -1.552], [34.837, -1.575], [34.771, -1.58], [34.741, -1.561], [34.661, -1.559], [34.643, -1.591],
  [34.588, -1.608], [34.576, -1.573], [34.548, -1.593], [34.537, -1.575], [34.565, -1.522], [34.556, -1.506],
  [34.41, -1.493], [34.367, -1.514], [34.351, -1.501], [34.347, -1.518], [34.324, -1.471],
];

export const GRUMETI_RIVER: LngLat[] = [
  [35.333, -1.844], [35.3, -1.818], [35.264, -1.82], [35.261, -1.843], [35.227, -1.864], [35.138, -1.863],
  [35.134, -1.891], [35.084, -1.933], [34.945, -1.924], [34.905, -1.944], [34.898, -1.925], [34.852, -1.945],
  [34.757, -2.036], [34.727, -2.033], [34.576, -2.145], [34.513, -2.25], [34.453, -2.254], [34.422, -2.238],
  [34.424, -2.218], [34.328, -2.224], [34.27, -2.179], [34.127, -2.164], [34.106, -2.136], [34.044, -2.133],
  [34.037, -2.114], [33.954, -2.072], [33.87, -2.099], [33.799, -2.085],
];

export const RIVERS = [MARA_RIVER, GRUMETI_RIVER];

type ZoneName =
  | 'plains'
  | 'plainsWest'
  | 'gol'
  | 'moru'
  | 'seronera'
  | 'corridor'
  | 'grumetiNorth'
  | 'banagi'
  | 'ikorongo'
  | 'kogatende'
  | 'mara'
  | 'triangle'
  | 'lobo'
  | 'east';

// Rough grazing areas. The `land` checks keep each one on its own side of the
// river it borders, so the herd only gets across by walking a crossing leg.
export const ZONES: Record<ZoneName, Zone> = {
  // Short-grass plains around Ndutu and Naabi Hill: the calving grounds.
  plains: { center: [35.06, -2.92], spread: [0.5, 0.24], land: ([x, y]) => x < 35.38 && y > -3.2 },
  // Where the herd spreads in March, toward Kakesio and Moru.
  plainsWest: { center: [34.84, -2.84], spread: [0.3, 0.2] },
  // Gol kopjes, the eastern edge of the plains.
  gol: { center: [35.3, -2.68], spread: [0.2, 0.14], land: ([x]) => x < 35.42 },
  moru: { center: [34.74, -2.62], spread: [0.18, 0.14] },
  seronera: { center: [34.84, -2.44], spread: [0.22, 0.14] },
  // Western Corridor, south of the Grumeti.
  corridor: { center: [34.34, -2.34], spread: [0.45, 0.1], land: ([x, y]) => x > 33.98 && y < -2.28 },
  // Grumeti reserves, across the river.
  grumetiNorth: { center: [34.34, -2.06], spread: [0.36, 0.1], land: ([x, y]) => x > 34.02 && y > -2.12 && y < -1.95 },
  // Banagi, central Serengeti south of the Grumeti.
  banagi: { center: [34.86, -2.14], spread: [0.2, 0.12], land: ([, y]) => y < -2.0 },
  // Ikorongo and the Wogakuria hills, north of the Grumeti.
  ikorongo: { center: [34.92, -1.8], spread: [0.22, 0.1], land: ([, y]) => y > -1.88 && y < -1.66 },
  // Northern Serengeti around Kogatende, south of the Mara.
  kogatende: { center: [34.86, -1.7], spread: [0.34, 0.08], land: ([, y]) => y < -1.63 },
  // Masai Mara, east of the river.
  mara: { center: [35.17, -1.42], spread: [0.2, 0.2], land: ([x, y]) => x > 35.09 && y > -1.6 && y < -1.2 },
  // Mara Triangle, between the river and the Oloololo escarpment.
  triangle: { center: [34.92, -1.42], spread: [0.1, 0.12], land: ([x, y]) => x < 34.99 && x > 34.8 && y > -1.53 },
  lobo: { center: [35.17, -1.98], spread: [0.16, 0.12], land: ([, y]) => y < -1.9 },
  // Eastern plains between Lobo and Gol.
  east: { center: [35.16, -2.36], spread: [0.2, 0.14] },
};

export const PLACE_LABELS: Label[] = [
  { text: 'SERENGETI', position: [34.62, -2.46], size: 15 },
  { text: 'MASAI MARA', position: [35.24, -1.28], size: 15 },
  { text: 'TANZANIA', position: [34.5, -2.95], size: 13 },
  { text: 'KENIA', position: [35.45, -1.15], size: 13 },
  { text: 'Lago Victoria', position: [33.75, -2.05], size: 11 },
  { text: 'Ngorongoro', position: [35.58, -3.18], size: 11 },
];

export const SITES: Site[] = [
  { name: 'Lago Ndutu', position: [34.997, -3.003], anchor: 'start', offset: [14, 0] },
  { name: 'Naabi Hill', position: [34.998, -2.833], anchor: 'start', offset: [14, 0] },
  { name: 'Moru Kopjes', position: [34.732, -2.619], anchor: 'end', offset: [-14, 0] },
  { name: 'Seronera', position: [34.819, -2.447], anchor: 'start', offset: [14, 0] },
  { name: 'Kirawira', position: [34.168, -2.186], anchor: 'end', offset: [-14, 0] },
  { name: 'Río Grumeti', position: [34.6, -2.125], anchor: 'start', offset: [14, -4] },
  { name: 'Kogatende', position: [35.003, -1.704], anchor: 'start', offset: [14, 0] },
  { name: 'Río Mara', position: [34.7, -1.56], anchor: 'middle', offset: [0, -14] },
  { name: 'Lobo', position: [35.127, -1.937], anchor: 'start', offset: [14, 0] },
];
