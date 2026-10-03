import type { RasterDEMSourceSpecification, StyleSpecification } from 'maplibre-gl';

/** AWS Terrain Tiles (Mapzen terrarium encoding), free and keyless. */
const TERRAIN_DEM: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
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
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
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
  terrain: { source: 'terrain-dem', exaggeration: 1.5 },
};

