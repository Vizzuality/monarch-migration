import { addProtocol, type RasterDEMSourceSpecification, type StyleSpecification } from 'maplibre-gl';

import { stashed } from './tile-stash';

const IMAGERY_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/**
 * Every source draws tiles of one zoom whatever the camera does, so the whole
 * year's tiles can be loaded before the story starts and none change on screen.
 */
export const PINNED_SOURCES = [{ id: 'esri-imagery', zoom: 7, tiles: IMAGERY_TILES }];

// Sea level everywhere, in terrarium encoding: (R * 256 + G + B / 256) - 32768.
addProtocol('flat', async () => {
  const canvas = new OffscreenCanvas(256, 256);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgb(128, 0, 0)';
  ctx.fillRect(0, 0, 256, 256);
  return { data: await createImageBitmap(canvas) };
});

/**
 * The map is flat, but terrain stays on: MapLibre then drapes tiles as
 * textures it reuses every frame instead of redrawing them, which keeps
 * playback smooth, and honours the pinned tile zoom at any pitch. One
 * generated tile stretched over the world is all the elevation it needs.
 */
const FLAT_DEM: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  tiles: ['flat://{z}/{x}/{y}'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 0,
};

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
    'flat-dem': FLAT_DEM,
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
  terrain: { source: 'flat-dem' },
};
