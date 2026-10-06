import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMaxParallelImageRequests, setMaxParallelImageRequests } from 'maplibre-gl';
import Map, { Layer, Source, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map/maplibre-worker';

import logo from './assets/vizzuality.svg';
import { YEAR_DAYS, type Chapter } from './data/calendar';
import { MAP_STYLE } from './map/basemaps';
import { cameraPath, framingBoost } from './map/camera';
import { DeckOverlay } from './map/DeckOverlay';
import { buildLayers } from './map/layers';
import { pathTiles, pinTileZoom, tilesSettled } from './map/preload';
import { stashTiles } from './map/tile-stash';
import { buildModel } from './monarch/model';
import { HOTSPOT_PAINT, KEYFRAMES, START_DAY } from './monarch/scene';
import { CHAPTERS, storyAt } from './monarch/story';
import { Albums, cardOnScreen, type CardOnScreen } from './ui/Albums';
import { ChapterText } from './ui/ChapterText';
import { DayReadout } from './ui/DayReadout';
import { Legend } from './ui/Legend';
import { Lightbox } from './ui/Lightbox';
import { Loader } from './ui/Loader';
import { isNarrow, useNarrow } from './ui/narrow';
import { Timeline } from './ui/Timeline';

// A full year plays in ~2 minutes.
const DAYS_PER_SECOND = 3;
// Keeps the action clear of the chapter text and the timeline. The keyframes were framed with it.
const PADDING = { top: 20, bottom: 150, left: 380, right: 320 };
// On a phone the chapter text fills the bottom of the screen, so the action goes above it, under the logo.
const narrowPadding = (height: number) => ({ top: 70, bottom: Math.round(height * 0.4), left: 16, right: 16 });
// How many zoom levels a phone may pull back to show about as much of the migration as a laptop.
const NARROW_ZOOM_OUT = 1.5;
// A tile that fails gets skipped rather than hold the story back.
const SAMPLE_TIMEOUT_MS = 5000;
// MapLibre sizes each source's tile cache as one screenful per zoom level kept.
// The preload leaves the whole year's tiles in it (a few hundred), so it must never evict.
const TILE_CACHE_SCREENS = 64;
// Share of the progress bar for downloading, the rest is for drawing every tile once.
const DOWNLOAD_SHARE = 0.85;
const PRELOAD_PARALLEL_IMAGES = 256;

const PHOTOS = CHAPTERS.flatMap((c) => c.album ?? []).flatMap((p) => [p.thumb, p.src]);
// Holding on to them keeps them decoded, so a card never grows into the Lightbox half drawn.
const decoded: HTMLImageElement[] = [];

async function loadPhotos(onProgress: (done: number) => void) {
  let done = 0;
  await Promise.all(
    PHOTOS.map(async (url) => {
      const img = new Image();
      img.src = url;
      decoded.push(img);
      // A photo that fails just shows up late, like a tile.
      await img.decode().catch(() => {});
      onProgress(++done);
    }),
  );
}

interface Viewing {
  chapter: Chapter;
  index: number;
  from: CardOnScreen;
}

const sim = buildModel();
const cameraAt = cameraPath(KEYFRAMES);

function framing() {
  const { innerWidth: width, innerHeight: height } = window;
  const narrow = isNarrow();
  const padding = narrow ? narrowPadding(height) : PADDING;
  return { padding, zoomBoost: framingBoost(width, height, padding, PADDING, narrow ? -NARROW_ZOOM_OUT : 0) };
}

export default function App() {
  const [day, setDay] = useState(START_DAY);
  const story = storyAt(sim.activity, day);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);
  // While loading, the camera walks the path instead of following `day`.
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [previewDay, setPreviewDay] = useState(START_DAY);
  const [{ padding, zoomBoost }, setFraming] = useState(framing);
  const narrow = useNarrow();
  const [viewing, setViewing] = useState<Viewing | null>(null);
  // Where the photo shrinks back to as the Lightbox closes, and whose card stays empty until it lands.
  const [returnTo, setReturnTo] = useState<CardOnScreen | null>(null);
  const [away, setAway] = useState<string | null>(null);

  const playingRef = useRef(playing);
  const scrubbingRef = useRef(false);
  const loadingRef = useRef(loading);
  const framingRef = useRef({ padding, zoomBoost });
  const viewingRef = useRef(viewing);
  playingRef.current = playing;
  loadingRef.current = loading;
  viewingRef.current = viewing;
  framingRef.current = { padding, zoomBoost };
  const mapRef = useRef<MapRef>(null);
  const preloadRun = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // Pausing for the Lightbox leaves `playing` alone, so closing it picks up where the reader left off.
      if (playingRef.current && !scrubbingRef.current && !loadingRef.current && !viewingRef.current) {
        setDay((d) => (d + dt * DAYS_PER_SECOND) % YEAR_DAYS);
      }
      setClock(now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onResize = () => setFraming(framing());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loadingRef.current || viewingRef.current) return;
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
    const { padding, zoomBoost } = framingRef.current;
    const framedAt = (d: number) => {
      const cam = cameraAt(d);
      return { ...cam, zoom: cam.zoom + zoomBoost };
    };
    const { samples, urls } = pathTiles(map, framedAt, padding, START_DAY);
    let tiles = 0;
    let photos = 0;
    const downloaded = () => setProgress((DOWNLOAD_SHARE * (tiles + photos)) / (urls.length + PHOTOS.length));
    const photosLoaded = loadPhotos((done) => ((photos = done), downloaded()));
    // Downloading first lets the walk below run at decode speed instead of network latency.
    await stashTiles(urls, (done) => ((tiles = done), downloaded()));
    await photosLoaded;
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

  const openAlbum = (chapter: Chapter) => {
    const from = cardOnScreen(chapter.album![0]);
    if (!from) return;
    // The card grows straight from where it sank, while the story jumps behind the blur.
    if (story.chapter !== chapter) setDay(chapter.from);
    setViewing({ chapter, index: 0, from });
    setAway(chapter.album![0].id);
  };

  const showPhoto = (index: number) => {
    if (!viewing) return;
    setViewing({ ...viewing, index });
    setAway(viewing.chapter.album![index].id);
  };

  const closeLightbox = () => {
    if (!viewing) return;
    setReturnTo(cardOnScreen(viewing.chapter.album![viewing.index]));
    setViewing(null);
  };

  const lightboxClosed = () => {
    const photo = away;
    setAway(null);
    const chapter = CHAPTERS.find((c) => c.album?.some((p) => p.id === photo));
    // The dialog is still in the DOM, keeping the page inert, until the frame after its exit.
    if (chapter) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-album="${chapter.title}"]`)?.focus());
  };

  const shot = cameraAt(loading ? previewDay : day);
  const camera = { ...shot, zoom: shot.zoom + zoomBoost };

  // MapLibre reparses GeoJSON on a worker, so refresh the hotspots once per day, not per frame.
  const hotspots = useMemo(() => sim.hotspots(story.today + 0.5), [story.today]);

  const frame = sim.frame(day, clock);
  // Nothing to see under the loader, so spare it the trails.
  const layers = loading ? [] : buildLayers({ sim, frame, day, zoom: shot.zoom });

  return (
    <div className="app">
      <Map
        ref={mapRef}
        {...camera}
        padding={padding}
        interactive={false}
        mapStyle={MAP_STYLE}
        maxPitch={70}
        maxTileCacheZoomLevels={TILE_CACHE_SCREENS}
        onLoad={preload}
        attributionControl={false}
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
        <ChapterText chapter={story.chapter} />
        <DayReadout story={story} />
      </div>
      {/* A phone has no room for them yet. */}
      {!narrow && <Legend />}
      {!narrow && <Albums chapters={CHAPTERS} active={story.chapter} away={away} onOpen={openAlbum} />}
      <Timeline
        activity={sim.activity}
        census={sim.swarm}
        day={day}
        story={story}
        playing={playing}
        onTogglePlay={togglePlay}
        onScrub={setDay}
        onScrubStart={() => (scrubbingRef.current = true)}
        onScrubEnd={() => (scrubbingRef.current = false)}
      />
      <AnimatePresence custom={returnTo} onExitComplete={lightboxClosed}>
        {viewing && (
          <Lightbox
            key="lightbox"
            chapter={viewing.chapter}
            index={viewing.index}
            from={viewing.from}
            onIndex={showPhoto}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
      <Loader progress={progress} visible={loading} />
    </div>
  );
}
