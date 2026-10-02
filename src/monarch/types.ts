import type { RGB } from '../data/color';
import type { LngLat } from '../data/random';
import type { TripBucket } from '../data/trips';

export interface Ring {
  position: LngLat;
  progress: number;
  color: RGB;
  /** Final radius in meters. */
  size: number;
}

export interface Frame {
  length: number;
  positions: Float32Array;
  colors: Uint8Array;
  radii: Float32Array;
  rings: Ring[];
  /** One value per `STATS` entry, already scaled to real butterflies. */
  stats: number[];
}

export interface Activity {
  /** How many butterflies of each generation are on the move each day. */
  moving: Float32Array[];
  max: number;
}

export interface Simulation {
  buckets: TripBucket[];
  activity: Activity;
  /** Every butterfly at day `t`. `clock` is wall time in seconds, for idle motion. */
  frame: (t: number, clock: number) => Frame;
  /** Points for the heatmap on day `t`: where the eggs and caterpillars are. */
  hotspots: (t: number) => GeoJSON.FeatureCollection<GeoJSON.Point>;
}

export interface LegendItem {
  name: string;
  tag?: string;
  description: string;
  color: RGB;
  /** Drawn as a small dot instead of a full-size one. */
  mark?: 'small';
}
