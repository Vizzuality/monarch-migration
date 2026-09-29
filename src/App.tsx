import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map/maplibre-worker';

import { breedingGrounds, buildModel, computeFrame, YEAR_DAYS } from './data/model';
import { BREEDING_HEATMAP, MAP_STYLE } from './map/basemaps';
import { cameraAt, type Camera } from './map/camera';
import { DeckOverlay } from './map/DeckOverlay';
import { buildLayers } from './map/layers';
import { Caption, Legend } from './ui/Panels';
import { Timeline } from './ui/Timeline';

// At 1× a full year plays in ~60 seconds.
const DAYS_PER_SECOND = 6;
const CAMERA_BLEND_MS = 1800;
// Keeps the action clear of the caption, legend and timeline panels.
const PADDING = { top: 20, bottom: 150, left: 380, right: 320 };

const model = buildModel();

const ease = (x: number) => x * x * (3 - 2 * x);

function blendCamera(from: Camera, to: Camera, u: number): Camera {
  const k = ease(u);
  const lerp = (key: keyof Camera) => from[key] + (to[key] - from[key]) * k;
  return {
    longitude: lerp('longitude'),
    latitude: lerp('latitude'),
    zoom: lerp('zoom'),
    pitch: lerp('pitch'),
    bearing: lerp('bearing'),
  };
}

export default function App() {
  const [day, setDay] = useState(20);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [follow, setFollow] = useState(true);
  const [manualCamera, setManualCamera] = useState<Camera>(() => cameraAt(20));
  const [blendStart, setBlendStart] = useState<number | null>(null);

  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const scrubbingRef = useRef(false);
  playingRef.current = playing;
  speedRef.current = speed;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current && !scrubbingRef.current) {
        setDay((d) => (d + dt * DAYS_PER_SECOND * speedRef.current) % YEAR_DAYS);
      }
      setClock(now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') setDay((d) => (d + 7) % YEAR_DAYS);
      else if (e.code === 'ArrowLeft') setDay((d) => (d - 7 + YEAR_DAYS) % YEAR_DAYS);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  let camera: Camera = manualCamera;
  if (follow) {
    const target = cameraAt(day);
    const u = blendStart === null ? 1 : Math.min(1, (clock * 1000 - blendStart) / CAMERA_BLEND_MS);
    camera = u < 1 ? blendCamera(manualCamera, target, u) : target;
  }

  const onMove = (e: ViewStateChangeEvent) => {
    if (e.originalEvent) {
      setFollow(false);
      setManualCamera(e.viewState);
    } else if (!follow) {
      setManualCamera(e.viewState);
    }
  };

  const enableFollow = () => {
    if (follow) return;
    setManualCamera(camera);
    setBlendStart(performance.now());
    setFollow(true);
  };

  // MapLibre reparses GeoJSON on a worker, so refresh the breeding grounds once per day, not per frame.
  const today = Math.floor(day);
  const breeding = useMemo(() => breedingGrounds(model, today + 0.5), [today]);

  const frame = computeFrame(model, day, clock);
  const layers = buildLayers({ model, frame, day, zoom: camera.zoom });

  return (
    <div className="app">
      <Map
        {...camera}
        padding={PADDING}
        onMove={onMove}
        mapStyle={MAP_STYLE}
        maxPitch={70}
        attributionControl={{ compact: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Source id="breeding" type="geojson" data={breeding}>
          <Layer id="breeding-heatmap" type="heatmap" paint={BREEDING_HEATMAP} />
        </Source>
        <DeckOverlay layers={layers} />
      </Map>
      <div className="vignette" />
      <Caption day={day} frame={frame} />
      <Legend follow={follow} onFollow={enableFollow} />
      <Timeline
        activity={model.activity}
        day={day}
        playing={playing}
        speed={speed}
        onTogglePlay={togglePlay}
        onSpeed={setSpeed}
        onScrub={setDay}
        onScrubStart={() => (scrubbingRef.current = true)}
        onScrubEnd={() => (scrubbingRef.current = false)}
      />
    </div>
  );
}
