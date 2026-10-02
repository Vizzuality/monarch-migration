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
}

export interface Activity {
  /** How many butterflies of each generation are on the move each day. */
  moving: Float32Array[];
  /** The Dominant generation of each day, or -1 when there is none. */
  dominant: Int8Array;
  /** 0–1 per day: how strongly the Dominant generation is on the move, relative to its own peak. */
  strength: Float32Array;
}

export interface Simulation {
  buckets: TripBucket[];
  activity: Activity;
  /** Every butterfly at day `t`. `clock` is wall time in seconds, for idle motion. */
  frame: (t: number, clock: number) => Frame;
  /** Points for the heatmap on day `t`: where the eggs and caterpillars are. */
  hotspots: (t: number) => GeoJSON.FeatureCollection<GeoJSON.Point>;
}
