import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { RefObject } from 'react';
import { useControl } from 'react-map-gl/maplibre';

// MapLibre 6 moved `map.transform` onto an internal camera, but deck.gl 9.4
// still reads `map.transform.elevation` to lift its camera when terrain is on,
// and crashes without it. Only that field is read in overlaid mode.
function shimTransform(map: MaplibreMap) {
  if ('transform' in map) return;
  Object.defineProperty(map, 'transform', {
    get: () => ({ elevation: map.getCameraTargetElevation() }),
  });
}

/** Hands the overlay to `overlayRef`, so the frame loop can give it new layers without a render. */
export function DeckOverlay({ overlayRef }: { overlayRef: RefObject<MapboxOverlay | null> }) {
  overlayRef.current = useControl(({ map }) => {
    shimTransform(map.getMap());
    return new MapboxOverlay({ layers: [] });
  });
  return null;
}
