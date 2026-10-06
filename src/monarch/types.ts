import type { RGB } from '../data/color';
import type { LngLat } from '../data/random';
import type { Bucket, Route } from '../data/trips';
import type { Generation } from './generations';

/** One leg of a Lineage's year, flown by one of its butterflies. */
export interface Trip extends Route {
  /** The id of the Lineage it belongs to. */
  lineage: number;
  generation: Generation;
  /** The butterfly's color, the same the map and the Swarm give it while it flies this leg. */
  color: RGB;
}

export type TripBucket = Bucket<Trip>;

export interface Ring {
  position: LngLat;
  progress: number;
  color: RGB;
  /** Final radius in meters. */
  size: number;
}

/** A Colony as the map draws it on one day. */
export interface ColonyGlow {
  position: LngLat;
  /** The share of the Colony's Lineages resting in it, counting the ones still melting in or already lifting off by how far along they are. */
  share: number;
  /** A slow swell around 1, so the Colony breathes. */
  breath: number;
  /** Full-strength diameter in meters. */
  size: number;
}

/**
 * Everything the map draws on one day. The first slots hold each Lineage's living member, in id
 * order; the scenery around it (the rest of a clutch, a mother fading where she laid, the glints over a Colony) follows.
 */
export interface Frame {
  length: number;
  positions: Float32Array;
  colors: Uint8Array;
  radii: Float32Array;
  rings: Ring[];
  colonies: ColonyGlow[];
}

export interface Activity {
  /** The Dominant generation of each day. */
  dominant: Generation[];
  /** The share of each day's population that is a butterfly of each Generation; the rest are eggs and caterpillars. */
  butterflies: number[][];
}

export type SwarmState = 'flying' | 'resting' | 'developing';

/** One Lineage of the Swarm on a given day. */
export interface SwarmMember {
  /** The Lineage's id, which is also its slot in the Frame. */
  lineage: number;
  color: RGB;
  state: SwarmState;
}

export interface Simulation {
  buckets: TripBucket[];
  activity: Activity;
  /** Every butterfly at day `t`. `clock` is wall time in seconds, for idle motion. */
  frame: (t: number, clock: number) => Frame;
  /** Points for the heatmap on day `t`: where the eggs and caterpillars are. */
  hotspots: (t: number) => GeoJSON.FeatureCollection<GeoJSON.Point>;
  /** The Swarm on day `t`: the same sample of Lineages every day, in the same order. */
  swarm: (t: number) => SwarmMember[];
}
