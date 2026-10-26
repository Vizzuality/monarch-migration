import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMaxParallelImageRequests, setMaxParallelImageRequests } from 'maplibre-gl';
import Map, { Layer, Source, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map/maplibre-worker';

import logo from './assets/vizzuality.svg';
import { albumAfter, stacked, YEAR_DAYS, type Chapter } from './data/calendar';
import { MAP_STYLE } from './map/basemaps';
import { cameraPath, framingBoost } from './map/camera';
import { DeckOverlay } from './map/DeckOverlay';
import { buildLayers } from './map/layers';
import { pathTiles, pinTileZoom, tilesSettled } from './map/preload';
import { stashTiles } from './map/tile-stash';
import { buildModel } from './monarch/model';
import { HOTSPOT_PAINT, KEYFRAMES, START_DAY } from './monarch/scene';
import { CHAPTERS, storyAt } from './monarch/story';
import { Albums, cardsAt, cardsOnScreen, type CardOnScreen } from './ui/Albums';
import { ChapterText } from './ui/ChapterText';
import { DayReadout } from './ui/DayReadout';
import { Legend } from './ui/Legend';
import { Lightbox, type Returns } from './ui/Lightbox';
import { Loader } from './ui/Loader';
import { isNarrow, useNarrow } from './ui/narrow';
import { Timeline } from './ui/Timeline';

// A full year plays in ~2 minutes.
const DAYS_PER_SECOND = 3;
// The legend is hidden for now, until it is ready to show.
const SHOW_LEGEND = false;
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

const ALBUMS = CHAPTERS.filter((c) => c.album?.length);
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
  from: Record<string, CardOnScreen>;
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
  // Only for this visit: a reload puts every Album's first photo back on top.
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [away, setAway] = useState<string[]>([]);
  const returns: Returns = useRef({});
  const lastAlbum = useRef<Chapter | null>(null);

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
    const from = cardsOnScreen(chapter);
    if (!from) return;
    // The cards fly straight from where they sank, while the story jumps behind the blur.
    if (story.chapter !== chapter) setDay(chapter.from);
    const cover = stacked(chapter.album!, covers[chapter.title])[0];
    delete returns.current[chapter.title];
    setViewing({ chapter, index: chapter.album!.indexOf(cover), from });
    setAway([chapter.title]);
  };

  /** The photo showing becomes the Cover. */
  const leaveAlbum = () => {
    if (!viewing) return;
    const { chapter, index } = viewing;
    const cover = chapter.album![index].id;
    setCovers((c) => ({ ...c, [chapter.title]: cover }));
    lastAlbum.current = chapter;
    return { chapter, cover };
  };

  const showPhoto = (index: number) => {
    if (viewing) setViewing({ ...viewing, index });
  };

  // The Album left behind is back in its stack at once: it sank behind the blur, and nothing flies to it.
  const moveAlbum = (by: number) => {
    if (!viewing) return;
    leaveAlbum();
    openAlbum(albumAfter(CHAPTERS, viewing.chapter, by));
  };

  const closeLightbox = () => {
    const left = leaveAlbum();
    // Its Chapter is the one playing, so the cards fly back to the raised stack.
    if (left) returns.current[left.chapter.title] = cardsAt(left.chapter, left.cover, true);
    setViewing(null);
  };

  const lightboxClosed = () => {
    setAway([]);
    const chapter = lastAlbum.current;
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
        // deck.gl draws into maplibre's control corner, which is lifted with a z-index; isolating the map keeps
        // that lift inside it, so labels and trails stay under the timeline.
        style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}
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
      {SHOW_LEGEND && !narrow && <Legend />}
      {!narrow && <Albums chapters={CHAPTERS} active={story.chapter} covers={covers} away={away} onOpen={openAlbum} />}
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
      <AnimatePresence onExitComplete={lightboxClosed}>
        {viewing && (
          <Lightbox
            key="lightbox"
            chapter={viewing.chapter}
            index={viewing.index}
            from={viewing.from}
            returns={returns}
            previous={albumAfter(CHAPTERS, viewing.chapter, -1)}
            next={albumAfter(CHAPTERS, viewing.chapter, 1)}
            covers={covers}
            place={ALBUMS.indexOf(viewing.chapter) + 1}
            albums={ALBUMS.length}
            onIndex={showPhoto}
            onMove={moveAlbum}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
      <Loader progress={progress} visible={loading} />
    </div>
  );
}
