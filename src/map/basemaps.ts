import type { StyleSpecification } from 'maplibre-gl';

import { stashed } from './tile-stash';

const IMAGERY_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/**
 * Every source draws tiles of one zoom whatever the camera does, so the whole
 * year's tiles can be loaded before the story starts and none change on screen.
 */
export const PINNED_SOURCES = [{ id: 'esri-imagery', zoom: 6, tiles: IMAGERY_TILES }];

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [stashed(IMAGERY_TILES)],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri-imagery',
      // Toned down so the additive trails still glow on top of bright imagery.
      paint: { 'raster-brightness-max': 0.7, 'raster-saturation': -0.25 },
    },
  ],
};
