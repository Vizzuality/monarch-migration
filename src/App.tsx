import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMaxParallelImageRequests, setMaxParallelImageRequests } from 'maplibre-gl';
import Map, { Layer, Source, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map/maplibre-worker';

import logo from './assets/vizzuality.svg';
import { YEAR_DAYS } from './data/calendar';
import { MAP_STYLE } from './map/basemaps';
import { cameraPath, framingBoost } from './map/camera';
import { DeckOverlay } from './map/DeckOverlay';
import { buildLayers } from './map/layers';
import { pathTiles, pinTileZoom, tilesSettled } from './map/preload';
import { stashTiles } from './map/tile-stash';
import { buildModel } from './monarch/model';
import { HOTSPOT_PAINT, KEYFRAMES, START_DAY } from './monarch/scene';
import { ChapterText } from './ui/ChapterText';
import { DayReadout } from './ui/DayReadout';
import { Legend } from './ui/Legend';
import { Loader } from './ui/Loader';
import { Timeline } from './ui/Timeline';

// A full year plays in ~2 minutes.
const DAYS_PER_SECOND = 3;
// Keeps the action clear of the chapter text and the timeline.
const PADDING = { top: 20, bottom: 150, left: 380, right: 320 };
// A tile that fails gets skipped rather than hold the story back.
const SAMPLE_TIMEOUT_MS = 5000;
// MapLibre sizes each source's tile cache as one screenful per zoom level kept.
// The preload leaves the whole year's tiles in it (a few hundred), so it must never evict.
const TILE_CACHE_SCREENS = 64;
// Share of the progress bar for downloading, the rest is for drawing every tile once.
const DOWNLOAD_SHARE = 0.85;
const PRELOAD_PARALLEL_IMAGES = 256;

const sim = buildModel();
const cameraAt = cameraPath(KEYFRAMES);
const viewportBoost = () => framingBoost(window.innerWidth, window.innerHeight, PADDING);

export default function App() {
  const [day, setDay] = useState(START_DAY);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);
  // While loading, the camera walks the path instead of following `day`.
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [previewDay, setPreviewDay] = useState(START_DAY);
  const [zoomBoost, setZoomBoost] = useState(viewportBoost);

  const playingRef = useRef(playing);
  const scrubbingRef = useRef(false);
  const loadingRef = useRef(loading);
  const zoomBoostRef = useRef(zoomBoost);
  playingRef.current = playing;
  loadingRef.current = loading;
  zoomBoostRef.current = zoomBoost;
  const mapRef = useRef<MapRef>(null);
  const preloadRun = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current && !scrubbingRef.current && !loadingRef.current) {
        setDay((d) => (d + dt * DAYS_PER_SECOND) % YEAR_DAYS);
      }
      setClock(now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onResize = () => setZoomBoost(viewportBoost());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loadingRef.current) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') setDay((d) => (d + 7) % YEAR_DAYS);
      else if (e.code === 'ArrowLeft') setDay((d) => (d - 7 + YEAR_DAYS) % YEAR_DAYS);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const preload = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // StrictMode loads the map twice in dev. Two walks would fight over the
    // camera and abort each other's tiles, so only the latest one runs.
    const run = ++preloadRun.current;
    const stale = () => run !== preloadRun.current;

    pinTileZoom(map);
    const boost = zoomBoostRef.current;
    const framedAt = (d: number) => {
      const cam = cameraAt(d);
      return { ...cam, zoom: cam.zoom + boost };
    };
    const { samples, urls } = pathTiles(map, framedAt, PADDING, START_DAY);
    // Downloading first lets the walk below run at decode speed instead of network latency.
    await stashTiles(urls, (done) => setProgress((DOWNLOAD_SHARE * done) / urls.length));
    if (stale()) return;

    // Showing each camera once is what puts its tiles in MapLibre's cache;
    // the stash alone would still leave a frame or two of hole while one decodes.
    // The tiles are local by now, so the network throttle only slows decoding.
    const parallel = getMaxParallelImageRequests();
    setMaxParallelImageRequests(PRELOAD_PARALLEL_IMAGES);
    try {
      for (const [i, sample] of samples.entries()) {
        setPreviewDay(sample);
        await tilesSettled(map, SAMPLE_TIMEOUT_MS);
        if (stale()) return;
        setProgress(DOWNLOAD_SHARE + ((1 - DOWNLOAD_SHARE) * (i + 1)) / samples.length);
      }
    } finally {
      setMaxParallelImageRequests(parallel);
    }
    setPreviewDay(START_DAY);
    await tilesSettled(map, SAMPLE_TIMEOUT_MS);
    await document.fonts.ready;
    if (stale()) return;
    setProgress(1);
    setLoading(false);
  }, []);

  const shot = cameraAt(loading ? previewDay : day);
  const camera = { ...shot, zoom: shot.zoom + zoomBoost };

  // MapLibre reparses GeoJSON on a worker, so refresh the hotspots once per day, not per frame.
  const today = Math.floor(day);
  const hotspots = useMemo(() => sim.hotspots(today + 0.5), [today]);
  const dominant = sim.activity.dominant[today];

  const frame = sim.frame(day, clock);
  // Nothing to see under the loader, so spare it the trails.
  const layers = loading ? [] : buildLayers({ sim, frame, day, zoom: shot.zoom });

  return (
    <div className="app">
      <Map
        ref={mapRef}
        {...camera}
        padding={PADDING}
        interactive={false}
        mapStyle={MAP_STYLE}
        maxPitch={70}
        maxTileCacheZoomLevels={TILE_CACHE_SCREENS}
        onLoad={preload}
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
      <div className="story">
        <ChapterText day={day} />
        <DayReadout day={day} dominant={dominant} />
      </div>
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
      <Loader progress={progress} visible={loading} />
    </div>
  );
}
