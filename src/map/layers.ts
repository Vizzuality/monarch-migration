import type { Layer } from '@deck.gl/core';
import { TripsLayer } from '@deck.gl/geo-layers';
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';

import { tint } from '../data/color';
import type { LngLat } from '../data/random';
import type { Trip } from '../data/trips';
import type { Frame, Migration, Ring, Simulation } from '../migrations/types';

/**
 * Plain alpha blending: overlaps deepen toward the animals' own color
 * instead of adding up to white.
 */
const BLEND = {
  blend: true,
  blendColorOperation: 'add',
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one-minus-src-alpha',
  blendAlphaOperation: 'add',
  blendAlphaSrcFactor: 'one',
  blendAlphaDstFactor: 'one-minus-src-alpha',
  depthWriteEnabled: false,
  depthCompare: 'always',
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const TRAIL_STYLES = [
  // Faint long memory of the routes, so the shape of the flyway builds up.
  // Kept very low: hundreds of paths overlap in the corridor.
  { id: 'routes-memory', trailLength: 12, opacity: 0.05, width: 1, rounded: false },
  // Comet tails.
  { id: 'trails', trailLength: 4, opacity: 0.28, width: 1.5, rounded: true },
];

// One layer per bucket and style. Out-of-window buckets stay mounted with
// `visible: false` so their GPU buffers survive until they're needed again.
// Ids carry the migration so a switch never diffs one herd's buffers against another's.
function tripLayers(migration: Migration, sim: Simulation, day: number): Layer[] {
  return TRAIL_STYLES.flatMap((style) =>
    sim.buckets.map(
      (bucket, i) =>
        new TripsLayer<Trip>({
          id: `${migration.id}-${style.id}-${i}`,
          data: bucket.trips,
          visible: day >= bucket.from && day <= bucket.to + style.trailLength,
          getPath: (d) => d.path,
          getTimestamps: (d) => d.timestamps,
          getColor: (d) => tint(migration.groups[d.group], d.lineage),
          widthUnits: 'pixels',
          getWidth: style.width,
          capRounded: style.rounded,
          jointRounded: style.rounded,
          opacity: style.opacity,
          trailLength: style.trailLength,
          fadeTrail: true,
          currentTime: day,
          parameters: BLEND,
        }),
    ),
  );
}

interface LayerInput {
  migration: Migration;
  sim: Simulation;
  frame: Frame;
  day: number;
  zoom: number;
}

export function buildLayers({ migration, sim, frame, day, zoom }: LayerInput): Layer[] {
  const points = {
    length: frame.length,
    attributes: {
      getPosition: { value: frame.positions, size: 2 },
      getFillColor: { value: frame.colors, size: 4, normalized: true },
      getRadius: { value: frame.radii, size: 1 },
    },
  };

  const [near, far] = migration.closeUp;
  const closeUp = clamp01((zoom - near) / (far - near));

  return [
    new TextLayer({
      id: `${migration.id}-place-labels`,
      data: migration.placeLabels,
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getSize: (d) => d.size,
      getColor: [255, 236, 214, Math.round(70 * (1 - closeUp))],
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      characterSet: 'auto',
      updateTriggers: { getColor: closeUp },
    }),

    new PathLayer<LngLat[]>({
      id: `${migration.id}-rivers`,
      data: migration.rivers ?? [],
      getPath: (d) => d,
      getColor: [120, 220, 255, 90],
      widthUnits: 'pixels',
      getWidth: 1.5,
      jointRounded: true,
      capRounded: true,
      parameters: BLEND,
    }),

    ...tripLayers(migration, sim, day),

    new ScatterplotLayer<Ring>({
      id: 'rings',
      data: frame.rings,
      getPosition: (d) => d.position,
      getRadius: (d) => d.size * (0.08 + 0.92 * d.progress),
      getLineColor: (d) => [...d.color, Math.round(200 * (1 - d.progress) ** 2)],
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      parameters: BLEND,
    }),

    new ScatterplotLayer({
      id: 'animals',
      data: points,
      radiusUnits: 'pixels',
      opacity: 1,
      parameters: BLEND,
    }),

    new TextLayer({
      id: `${migration.id}-site-labels`,
      data: migration.sites,
      getPosition: (d) => d.position,
      getText: (d) => d.name.toUpperCase(),
      getSize: 11,
      getColor: [255, 236, 214, Math.round(200 * closeUp)],
      getTextAnchor: (d) => d.anchor,
      getPixelOffset: (d) => d.offset,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      characterSet: 'auto',
      outlineWidth: 3,
      outlineColor: [10, 8, 12, Math.round(200 * closeUp)],
      fontSettings: { sdf: true },
      updateTriggers: { getColor: closeUp },
    }),
  ];
}
