import { LngLat, type CoveringTilesOptions, type Map as MaplibreMap, type OverscaledTileID, type PaddingOptions } from 'maplibre-gl';

import { YEAR_DAYS } from '../data/calendar';
import { PINNED_SOURCES } from './basemaps';
import type { Camera } from './camera';

const SCAN_STEP = 0.1; // days

/** Makes every pinned source draw its one zoom, near the camera or on the horizon. */
export function pinTileZoom(map: MaplibreMap) {
  for (const { id, zoom } of PINNED_SOURCES) {
    const source = map.getSource(id);
    if (source) source.calculateTileZoom = () => zoom;
  }
  map.triggerRepaint();
}

/**
 * Every tile the year needs, and as few cameras as will show each of them at
 * least once, in playback order from `startDay`.
 *
 * MapLibre only works out the tiles for the camera it is showing, so this swaps
 * a copy of its internal transform in and moves that instead. Internal API: if
 * a MapLibre upgrade breaks it, the preload walks fewer cameras and the map
 * fetches what is missing as it plays.
 */
export function pathTiles(map: MaplibreMap, cameraAt: (day: number) => Camera, padding: PaddingOptions, startDay: number) {
  const camera = (map as unknown as { _camera: { transform: Transform } })._camera;
  const live = camera.transform;
  const probe = live.clone();
  const terrain = map.terrain;
  const views: { day: number; urls: string[] }[] = [];

  camera.transform = probe;
  try {
    probe.setPadding(padding);
    for (let t = 0; t < YEAR_DAYS; t += SCAN_STEP) {
      const day = (startDay + t) % YEAR_DAYS;
      const cam = cameraAt(day);
      probe.setCenter(new LngLat(cam.longitude, cam.latitude));
      probe.setZoom(cam.zoom);
      probe.setPitch(cam.pitch);
      probe.setBearing(cam.bearing);
      if (terrain) probe.setElevation(terrain.getElevationForLngLat(probe.center, probe as never));

      const urls: string[] = [];
      for (const { zoom, tiles } of PINNED_SOURCES) {
        // `terrain` is read but missing from the public type; without it tiles behind hills get culled.
        const options = { tileSize: 256, minzoom: 0, maxzoom: zoom, terrain, calculateTileZoom: () => zoom } as CoveringTilesOptions;
        for (const tile of map.coveringTiles(options)) urls.push(tileUrl(tiles, tile));
      }
      views.push({ day, urls });
    }
  } finally {
    camera.transform = live;
  }

  const chosen = coverAll(views);
  return {
    samples: chosen.sort((a, b) => a - b).map((i) => views[i].day),
    urls: [...new Set(views.flatMap((v) => v.urls))],
  };
}

/**
 * Greedy set cover: keep taking the view that shows the most tiles not yet
 * shown. Gains only shrink, so a view whose stale gain still tops the rest
 * after a recount is the best one, which skips most of the recounting.
 */
function coverAll(views: { urls: string[] }[]): number[] {
  const seen = new Set<string>();
  const unseen = (i: number) => views[i].urls.reduce((n, url) => n + (seen.has(url) ? 0 : 1), 0);
  const queue = views.map((v, i) => ({ i, gain: new Set(v.urls).size }));
  const chosen: number[] = [];
  while (queue.length) {
    queue.sort((a, b) => b.gain - a.gain);
    const top = queue[0];
    top.gain = unseen(top.i);
    if (queue.length > 1 && top.gain < queue[1].gain) continue;
    queue.shift();
    if (top.gain === 0) break;
    chosen.push(top.i);
    for (const url of views[top.i].urls) seen.add(url);
  }
  return chosen;
}

interface Transform {
  clone(): Transform;
  center: LngLat;
  setPadding(p: PaddingOptions): void;
  setCenter(c: LngLat): void;
  setZoom(z: number): void;
  setPitch(p: number): void;
  setBearing(b: number): void;
  setElevation(e: number): void;
};

const tileUrl = (template: string, { canonical: { z, x, y } }: OverscaledTileID) =>
  template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Resolves once every source has its tiles for the camera the map was just
 * moved to, or after `timeout` ms. The deck layers keep the map repainting, so
 * `idle` never fires; poll instead. Two frames first, so the map has rendered
 * the new camera and asked for its tiles before the first check.
 */
export async function tilesSettled(map: MaplibreMap, timeout: number) {
  await nextFrame();
  await nextFrame();
  const until = performance.now() + timeout;
  while (!map.areTilesLoaded() && performance.now() < until) await nextFrame();
}
