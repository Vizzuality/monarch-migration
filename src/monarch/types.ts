import type { RGB } from '../data/color';
import type { LngLat } from '../data/random';
import type { TripBucket } from '../data/trips';
import type { Generation } from './generations';

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
}

export interface Activity {
  /** The Dominant generation of each day. */
  dominant: Generation[];
}

export interface Simulation {
  buckets: TripBucket[];
  activity: Activity;
  /** Every butterfly at day `t`. `clock` is wall time in seconds, for idle motion. */
  frame: (t: number, clock: number) => Frame;
  /** Points for the heatmap on day `t`: where the eggs and caterpillars are. */
  hotspots: (t: number) => GeoJSON.FeatureCollection<GeoJSON.Point>;
}
