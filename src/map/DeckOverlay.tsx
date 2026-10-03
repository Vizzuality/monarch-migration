import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useControl } from 'react-map-gl/maplibre';

// MapLibre 6 moved `map.transform` onto an internal camera, but deck.gl 9.4
// still reads it for the near/far planes and crashes without it. Leaving those
// undefined makes deck fall back to its own; `elevation` covers terrain.
function shimTransform(map: MaplibreMap) {
  if ('transform' in map) return;
  Object.defineProperty(map, 'transform', {
    get: () => ({ elevation: map.getCameraTargetElevation() }),
  });
}

export function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(({ map }) => {
    shimTransform(map.getMap());
    return new MapboxOverlay(props);
  });
  overlay.setProps(props);
  return null;
}
