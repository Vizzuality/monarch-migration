import type { RasterDEMSourceSpecification, StyleSpecification } from 'maplibre-gl';

import { stashed } from './tile-stash';

const IMAGERY_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * Every source draws tiles of one zoom whatever the camera does, so the whole
 * year's tiles can be loaded before the story starts and none change on screen.
 */
export const PINNED_SOURCES = [
  { id: 'esri-imagery', zoom: 6, tiles: IMAGERY_TILES },
  { id: 'terrain-dem', zoom: 6, tiles: TERRAIN_TILES },
];

/** AWS Terrain Tiles (Mapzen terrarium encoding), free and keyless. */
const TERRAIN_DEM: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  tiles: [stashed(TERRAIN_TILES)],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
  attribution: 'Terrain Tiles: Mapzen, AWS Open Data',
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
    'terrain-dem': TERRAIN_DEM,
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
  // Flat, but kept: with terrain on, MapLibre drapes tiles as textures it reuses
  // every frame, and honours the pinned tile zoom at any pitch.
  terrain: { source: 'terrain-dem', exaggeration: 0 },
};
