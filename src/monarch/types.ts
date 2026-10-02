import type { HeatmapLayerSpecification } from 'maplibre-gl';

import type { Chapter } from '../data/calendar';
import type { RGB } from '../data/color';
import type { LngLat } from '../data/random';
import type { TripBucket } from '../data/trips';
import type { Keyframe } from '../map/camera';

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
  /** One value per `Migration.stats` entry, already scaled to real animals. */
  stats: number[];
}

export interface Activity {
  /** Stacked areas under the timeline, one per trail group: how many are on the move each day. */
  moving: Float32Array[];
  /** The dashed line over them: eggs for the monarchs, calves for the herd. */
  line: Float32Array;
  max: number;
}

export interface Simulation {
  buckets: TripBucket[];
  activity: Activity;
  /** Every animal at day `t`. `clock` is wall time in seconds, for idle motion. */
  frame: (t: number, clock: number) => Frame;
  /** Points for the heatmap on day `t`: where the young are. */
  hotspots: (t: number) => GeoJSON.FeatureCollection<GeoJSON.Point>;
}

export interface LegendItem {
  name: string;
  tag?: string;
  description: string;
  color: RGB;
  /** Drawn as a small dot or as a ring instead of a full-size dot. */
  mark?: 'small' | 'ring';
}

export interface Label {
  text: string;
  position: LngLat;
  size: number;
}

export interface Site {
  name: string;
  position: LngLat;
  anchor: 'start' | 'middle' | 'end';
  offset: [number, number];
}

export interface Migration {
  id: string;
  /** Short name for the switcher. */
  name: string;
  pageTitle: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  chapters: Chapter[];
  stats: { label: string; color: RGB }[];
  legend: { title: string; items: LegendItem[]; note: string };
  /** Trail and timeline color per `Trip.group`. */
  groups: RGB[];
  lineColor: RGB;
  keyframes: Keyframe[];
  startDay: number;
  /** Wide-shot labels fade out and site labels fade in across this zoom range. */
  closeUp: [number, number];
  placeLabels: Label[];
  sites: Site[];
  /** Traced faintly on the map, where crossings matter to the story. */
  rivers?: LngLat[][];
  hotspotPaint: HeatmapLayerSpecification['paint'];
  build: () => Simulation;
}
