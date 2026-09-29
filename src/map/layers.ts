import type { Layer } from '@deck.gl/core';
import { TripsLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';

import { COLONIES, PLACE_LABELS } from '../data/geo';
import { GENERATIONS, tint } from '../data/generations';
import type { Frame, Model, Ring, Trip } from '../data/model';

/**
 * Plain alpha blending: overlaps deepen toward the butterflies' own color
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
function tripLayers(model: Model, day: number): Layer[] {
  return TRAIL_STYLES.flatMap((style) =>
    model.buckets.map(
      (bucket, i) =>
        new TripsLayer<Trip>({
          id: `${style.id}-${i}`,
          data: bucket.trips,
          visible: day >= bucket.from && day <= bucket.to + style.trailLength,
          getPath: (d) => d.path,
          getTimestamps: (d) => d.timestamps,
          getColor: (d) => tint(GENERATIONS[d.gen].color, d.lineage),
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
  model: Model;
  frame: Frame;
  day: number;
  zoom: number;
}

export function buildLayers({ model, frame, day, zoom }: LayerInput): Layer[] {
  const points = {
    length: frame.length,
    attributes: {
      getPosition: { value: frame.positions, size: 2 },
      getFillColor: { value: frame.colors, size: 4, normalized: true },
      getRadius: { value: frame.radii, size: 1 },
    },
  };

  const closeUp = clamp01((zoom - 6.2) / 1.2);

  return [
    new TextLayer({
      id: 'place-labels',
      data: PLACE_LABELS,
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getSize: (d) => d.size,
      getColor: [255, 236, 214, Math.round(70 * (1 - closeUp))],
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      characterSet: 'auto',
      updateTriggers: { getColor: closeUp },
    }),

    ...tripLayers(model, day),

    new ScatterplotLayer<Ring>({
      id: 'emergence-rings',
      data: frame.rings,
      getPosition: (d) => d.position,
      getRadius: (d) => 6000 + d.progress * 70000,
      getLineColor: (d) => [...d.color, Math.round(200 * (1 - d.progress) ** 2)],
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      parameters: BLEND,
    }),

    new ScatterplotLayer({
      id: 'butterflies',
      data: points,
      radiusUnits: 'pixels',
      opacity: 1,
      parameters: BLEND,
    }),

    new TextLayer({
      id: 'colony-labels',
      data: COLONIES,
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
