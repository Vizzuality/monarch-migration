import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map/maplibre-worker';

import { YEAR_DAYS } from './data/calendar';
import { MAP_STYLE } from './map/basemaps';
import { cameraPath, type Camera } from './map/camera';
import { DeckOverlay } from './map/DeckOverlay';
import { buildLayers } from './map/layers';
import { migrationById, simulationOf } from './migrations';
import { Caption, Legend } from './ui/Panels';
import { Timeline } from './ui/Timeline';

// At 1× a full year plays in ~60 seconds.
const DAYS_PER_SECOND = 6;
const CAMERA_BLEND_MS = 1800;
// Keeps the action clear of the caption, legend and timeline panels.
const PADDING = { top: 20, bottom: 150, left: 380, right: 320 };

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

const initialMigration = migrationById(new URLSearchParams(window.location.search).get('m'));

export default function App() {
  const [migration, setMigration] = useState(initialMigration);
  const [day, setDay] = useState(initialMigration.startDay);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [follow, setFollow] = useState(true);
  const [manualCamera, setManualCamera] = useState<Camera>(() => cameraPath(initialMigration.keyframes)(initialMigration.startDay));
  const [blendStart, setBlendStart] = useState<number | null>(null);

  const sim = simulationOf(migration);
  const cameraAt = useMemo(() => cameraPath(migration.keyframes), [migration]);

  useEffect(() => {
    document.title = migration.pageTitle;
  }, [migration]);

  // Keeps the date, so the switch compares both migrations on the same day of the year.
  const switchMigration = (id: string) => {
    const next = migrationById(id);
    if (next === migration) return;
    const url = new URL(window.location.href);
    url.searchParams.set('m', next.id);
    window.history.replaceState(null, '', url);
    setMigration(next);
    setManualCamera(cameraPath(next.keyframes)(day));
    setBlendStart(null);
    setFollow(true);
  };

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

  // MapLibre reparses GeoJSON on a worker, so refresh the hotspots once per day, not per frame.
  const today = Math.floor(day);
  const hotspots = useMemo(() => sim.hotspots(today + 0.5), [sim, today]);

  const frame = sim.frame(day, clock);
  const layers = buildLayers({ migration, sim, frame, day, zoom: camera.zoom });

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
        <Source id="hotspots" type="geojson" data={hotspots}>
          <Layer id="hotspots-heatmap" type="heatmap" paint={migration.hotspotPaint} />
        </Source>
        <DeckOverlay layers={layers} />
      </Map>
      <div className="vignette" />
      <Caption migration={migration} day={day} frame={frame} onSwitch={switchMigration} />
      <Legend migration={migration} follow={follow} onFollow={enableFollow} />
      <Timeline
        activity={sim.activity}
        colors={migration.groups}
        lineColor={migration.lineColor}
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
