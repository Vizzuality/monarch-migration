import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map/maplibre-worker';

import logo from './assets/vizzuality.svg';
import { YEAR_DAYS } from './data/calendar';
import { MAP_STYLE } from './map/basemaps';
import { cameraPath } from './map/camera';
import { DeckOverlay } from './map/DeckOverlay';
import { buildLayers } from './map/layers';
import type { Generation } from './monarch/generations';
import { buildModel } from './monarch/model';
import { HOTSPOT_PAINT, KEYFRAMES, START_DAY } from './monarch/scene';
import { ChapterText } from './ui/ChapterText';
import { DayReadout } from './ui/DayReadout';
import { Legend } from './ui/Legend';
import { Timeline } from './ui/Timeline';

// A full year plays in ~2 minutes.
const DAYS_PER_SECOND = 3;
// Keeps the action clear of the chapter text and the timeline.
const PADDING = { top: 20, bottom: 150, left: 380, right: 320 };

const sim = buildModel();
const cameraAt = cameraPath(KEYFRAMES);

export default function App() {
  const [day, setDay] = useState(START_DAY);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);

  const playingRef = useRef(playing);
  const scrubbingRef = useRef(false);
  playingRef.current = playing;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current && !scrubbingRef.current) {
        setDay((d) => (d + dt * DAYS_PER_SECOND) % YEAR_DAYS);
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

  const camera = cameraAt(day);

  // MapLibre reparses GeoJSON on a worker, so refresh the hotspots once per day, not per frame.
  const today = Math.floor(day);
  const hotspots = useMemo(() => sim.hotspots(today + 0.5), [today]);
  const d = sim.activity.dominant[today];
  const dominant = d === -1 ? null : (d as Generation);

  const frame = sim.frame(day, clock);
  const layers = buildLayers({ sim, frame, day, zoom: camera.zoom });

  return (
    <div className="app">
      <Map
        {...camera}
        padding={PADDING}
        interactive={false}
        mapStyle={MAP_STYLE}
        maxPitch={70}
        attributionControl={{ compact: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Source id="hotspots" type="geojson" data={hotspots}>
          <Layer id="hotspots-heatmap" type="heatmap" paint={HOTSPOT_PAINT} />
        </Source>
        <DeckOverlay layers={layers} />
      </Map>
      <div className="vignette" />
      <img className="logo" src={logo} width="107.484" height="24.0381" alt="Vizzuality" />
      <ChapterText day={day} />
      <DayReadout day={day} dominant={dominant} />
      <Legend />
      <Timeline
        activity={sim.activity}
        day={day}
        dominant={dominant}
        playing={playing}
        onTogglePlay={togglePlay}
        onScrub={setDay}
        onScrubStart={() => (scrubbingRef.current = true)}
        onScrubEnd={() => (scrubbingRef.current = false)}
      />
    </div>
  );
}
