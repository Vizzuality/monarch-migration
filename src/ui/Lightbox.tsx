import {
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTransform,
  type Transition,
} from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import arrow from '../assets/arrow.svg';
import { stacked, type Chapter, type Photo } from '../data/calendar';
import type { CardOnScreen } from './Albums';

const MORPH: Transition = { type: 'spring', stiffness: 220, damping: 30 };
// The card's outline and shadow, faded out as it grows so it lands on the card exactly like it.
const CARD_EDGE = { borderColor: 'rgba(0, 0, 0, 1)', boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.8)', borderRadius: 14 };
const PHOTO_EDGE = { borderColor: 'rgba(0, 0, 0, 0)', boxShadow: '0px -2px 5px rgba(0, 0, 0, 0)', borderRadius: 14 };
const STRIP_EDGE = { borderColor: 'rgba(0, 0, 0, 1)', boxShadow: '0px -2px 5px rgba(0, 0, 0, 0)', borderRadius: 10 };
const PHOTO_ASPECT = 3 / 4;
// Between the photo and the text next to it.
const CAPTION_GAP = 51;
const CAPTION_WIDTH = 383;
// The same margin above the switcher and below the Strip, growing with the window's height. The timeline is behind
// the blur, so the Strip lies over it.
const MARGIN = { min: 24, share: 0.035, max: 48 };
// Between the switcher and the photo, and the photo and the Strip.
const GAP = 24;
// The height of the switcher's covers; its buttons overhang it.
const SWITCHER_HEIGHT = 28;
const STRIP_PHOTO = 56;
const STRIP_GAP = 12;
// Room around the Strip's photos for the marked one's outline.
const STRIP_OUTLINE = 6;
// The blur itself is animated rather than faded: some browsers drop a backdrop-filter while its element's opacity animates.
const CLEAR = { backgroundColor: 'rgba(5, 5, 7, 0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' };
const DIMMED = { backgroundColor: 'rgba(5, 5, 7, 0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' };
// The close hint sits up and to the right of the pointer.
const HINT_OFFSET = { x: 24, y: -43 };
// How far the photo leans towards the pointer, in degrees, and how deep it looks while doing it.
const TILT = 6;
const TILT_PERSPECTIVE = 1000;
const TILT_SPRING = { stiffness: 150, damping: 20 };
// How far the photo slides inside its frame, as a share of its size, and how much it's zoomed to keep its edges hidden.
const PARALLAX = 0.025;
const PARALLAX_ZOOM = 1 + 2 * PARALLAX + 0.01;
// How far the shadow falls away from the light, in pixels.
const SHADOW_THROW = 28;

const margin = () => Math.min(MARGIN.max, Math.max(MARGIN.min, Math.round(window.innerHeight * MARGIN.share)));

function framed() {
  const height = window.innerHeight - SWITCHER_HEIGHT - STRIP_PHOTO - 2 * margin() - 2 * GAP;
  const width = height * PHOTO_ASPECT;
  // Keeps the photo and its caption on screen together when the window is narrow.
  const left = Math.max(16, Math.min((window.innerWidth - width) / 2, window.innerWidth - width - CAPTION_GAP - CAPTION_WIDTH - 16));
  return { left, top: margin() + SWITCHER_HEIGHT + GAP, width, height, rotate: 0, ...PHOTO_EDGE };
}

type Frame = ReturnType<typeof framed>;

const stripWidth = (count: number) => count * STRIP_PHOTO + (count - 1) * STRIP_GAP;

/**
 * Clips the stage at the timeline, so the photos grow out of and sink back behind it like their cards, except for a
 * window where the Strip lies over it.
 */
function stageClip(frame: Frame, count: number) {
  const timeline = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-height'));
  const edge = window.innerHeight - timeline;
  const left = frame.left + frame.width / 2 - stripWidth(count) / 2 - STRIP_OUTLINE;
  const right = left + stripWidth(count) + 2 * STRIP_OUTLINE;
  const bottom = frame.top + frame.height + GAP + STRIP_PHOTO + STRIP_OUTLINE;
  return `polygon(0 0, 100% 0, 100% ${edge}px, ${right}px ${edge}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${edge}px, 0 ${edge}px)`;
}

function inStrip(frame: Frame, index: number, count: number) {
  return {
    left: frame.left + frame.width / 2 - stripWidth(count) / 2 + index * (STRIP_PHOTO + STRIP_GAP),
    top: frame.top + frame.height + GAP,
    width: STRIP_PHOTO,
    height: STRIP_PHOTO,
    rotate: 0,
    ...STRIP_EDGE,
  };
}

const onCard = ({ x, y, size, rotate }: CardOnScreen) => ({
  left: x - size / 2,
  top: y - size / 2,
  width: size,
  height: size,
  rotate,
  ...CARD_EDGE,
});

/**
 * The card `id` flies back into as the Lightbox closes. Read as it goes rather than as it renders, since the stack
 * it returns to is only known then. Photos left behind by moving to another Album find nothing and fade in place.
 */
const flyBack = (returns: Returns, chapter: Chapter, id: string, reduced: boolean | null) =>
  reduced ? null : returns.current[chapter.title]?.[id];

/** Where each Album's cards fly back to as the reader leaves it, by Chapter title, filled in just before it goes. */
export type Returns = RefObject<Record<string, Record<string, CardOnScreen> | null>>;

interface Props {
  chapter: Chapter;
  index: number;
  /** The cards the photos fly out of. */
  from: Record<string, CardOnScreen>;
  returns: Returns;
  previous: Chapter;
  next: Chapter;
  covers: Record<string, string>;
  onIndex: (index: number) => void;
  onMove: (by: number) => void;
  onClose: () => void;
}

export function Lightbox({ chapter, index, from, returns, previous, next, covers, onIndex, onMove, onClose }: Props) {
  const photos = chapter.album!;
  const photo = photos[index];
  const dialog = useRef<HTMLDialogElement>(null);
  const [frame, setFrame] = useState(framed);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const alone = next === chapter;
  const reduced = useReducedMotion();
  // The photo grows out of the card it opened on, and that card's place in the Strip only fades in.
  const [opened] = useState(photo.id);
  // Only the Album it opens on flies out; moving to another one swaps the photos in place.
  const [opening, setOpening] = useState(true);
  useEffect(() => setOpening(false), []);

  // Before the photo is measured, or it would grow inside a closed, invisible dialog.
  useLayoutEffect(() => {
    const el = dialog.current;
    if (!el) return;
    el.showModal();
    // Rather than the first Strip photo, so Space doesn't switch photos.
    el.focus();
  }, []);

  useEffect(() => {
    const onResize = () => setFrame(framed());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const step = (by: number) => onIndex((index + by + photos.length) % photos.length);

  return (
    <motion.dialog
      ref={dialog}
      className="lightbox"
      tabIndex={-1}
      aria-label={`Photos: ${chapter.title}`}
      onCancel={(e) => {
        // Esc closes through the same animation as a click.
        e.preventDefault();
        onClose();
      }}
      // Sideways through the photos, as the Strip lies; up and down through the Albums, which sit above it.
      onKeyDown={(e) => {
        if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
          e.preventDefault();
          if (photos.length > 1) step(e.code === 'ArrowRight' ? 1 : -1);
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          e.preventDefault();
          if (!alone) onMove(e.code === 'ArrowDown' ? 1 : -1);
        }
      }}
    >
      <motion.div
        className="lightbox-backdrop"
        onClick={onClose}
        initial={CLEAR}
        animate={DIMMED}
        exit={{ ...CLEAR, transition: { duration: 0.35, delay: 0.1 } }}
        transition={{ duration: 0.4 }}
      />

      <div className="lightbox-stage" style={{ clipPath: stageClip(frame, photos.length) }}>
        {/* All in one AnimatePresence: nesting another inside a propagating one duplicates its children's keys. */}
        <AnimatePresence propagate>
          {photos.map((p, i) => (
            <StripPhoto
              key={p.id}
              photo={p}
              slot={inStrip(frame, i, photos.length)}
              from={reduced || !opening || p.id === opened ? null : from[p.id]}
              backTo={() => (p.id === photo.id ? null : flyBack(returns, chapter, p.id, reduced))}
              marked={p.id === photo.id}
              onClick={() => onIndex(i)}
            />
          ))}
          <Spread
            key="spread"
            chapter={chapter}
            index={index}
            from={from}
            returns={returns}
            frame={frame}
            onClose={onClose}
            onHint={setHint}
          />
        </AnimatePresence>
      </div>

      <motion.div
        className="lightbox-switcher"
        style={{ top: margin(), height: SWITCHER_HEIGHT }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        {/* Each neighbour gets an equal side, so the current Album stays centred however long their names are. */}
        <span className="lightbox-switcher-side">
          {!alone && (
            <>
              <Neighbour chapter={previous} cover={covers[previous.title]} by={-1} onMove={onMove} />
              <span className="lightbox-divider" />
            </>
          )}
        </span>
        <span className="lightbox-album">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={chapter.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {chapter.title}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="lightbox-switcher-side next">
          {!alone && (
            <>
              <span className="lightbox-divider" />
              <Neighbour chapter={next} cover={covers[next.title]} by={1} onMove={onMove} />
            </>
          )}
        </span>
      </motion.div>

      {photos.length > 1 && (
        <motion.div
          className="lightbox-arrows"
          style={{ left: frame.left + frame.width / 2, top: frame.top + frame.height + GAP, height: STRIP_PHOTO }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <button aria-label="Previous photo" onClick={() => step(-1)}>
            <img src={arrow} width="38" height="38" alt="" />
          </button>
          {/* The Strip lies between them, in the stage underneath. */}
          <span style={{ width: stripWidth(photos.length) }} />
          <button aria-label="Next photo" onClick={() => step(1)}>
            <img src={arrow} width="38" height="38" alt="" className="flip" />
          </button>
        </motion.div>
      )}

      <motion.div
        className="lightbox-caption"
        style={{ left: frame.left + frame.width + CAPTION_GAP, top: frame.top, height: frame.height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={photo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            <h2>{photo.title}</h2>
            <p>{photo.description}</p>
            <small>Photo: {photo.credit}</small>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {hint && (
        <div className="lightbox-hint" style={{ left: hint.x + HINT_OFFSET.x, top: hint.y + HINT_OFFSET.y }} aria-hidden>
          Click to close the image
        </div>
      )}
    </motion.dialog>
  );
}

interface SpreadProps {
  chapter: Chapter;
  index: number;
  from: Record<string, CardOnScreen>;
  returns: Returns;
  frame: Frame;
  onClose: () => void;
  onHint: (at: { x: number; y: number } | null) => void;
}

/** The photo, flown out of the card it opens on and back into the stack showing when it closes. */
function Spread({ chapter, index, from, returns, frame, onClose, onHint }: SpreadProps) {
  const photos = chapter.album!;
  const photo = photos[index];
  // The card it opened on: moving to another Album doesn't change where it grew from.
  const [openedFrom] = useState(() => from[photo.id]);
  const reduced = useReducedMotion();
  const present = useIsPresent();
  // Only a mouse can lean the photo, and only once it has landed, so it never adds to the morph.
  const [canTilt] = useState(() => !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches);
  const [landed, setLanded] = useState(false);
  const tilting = canTilt && landed && present;
  // Where the pointer is over the photo, from -1 to 1 each way, and how strongly the light catches it.
  const across = useSpring(0, TILT_SPRING);
  const down = useSpring(0, TILT_SPRING);
  const shine = useSpring(0, TILT_SPRING);
  // The side under the pointer is pressed in.
  const rotateY = useTransform(across, (a) => a * TILT);
  const rotateX = useTransform(down, (d) => -d * TILT);
  // The photo sits a little behind the glass, so it slides against the lean.
  const photoX = useTransform(across, (a) => `${-a * PARALLAX * 100}%`);
  const photoY = useTransform(down, (d) => `${-d * PARALLAX * 100}%`);
  // Zoomed only while it can slide, so it matches its card again by the time it shrinks into it.
  const photoScale = useTransform(shine, [0, 1], [1, PARALLAX_ZOOM]);
  const lightX = useTransform(across, (a) => (a + 1) * 50);
  const lightY = useTransform(down, (d) => (d + 1) * 50);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0) 50%), linear-gradient(115deg, rgba(255, 255, 255, 0) 36%, rgba(255, 255, 255, 0.65) 47%, rgba(255, 255, 255, 0.15) 53%, rgba(255, 255, 255, 0) 64%) ${lightX}% ${lightY}% / 300% 300%`;
  // A rim of light along the edges nearest the pointer.
  const rim = useTransform(
    [across, down, shine],
    ([a, d, s]: number[]) => `inset ${-a * 4}px ${-d * 4}px 5px -2px rgba(255, 255, 255, ${0.55 * s})`,
  );
  const shadow = useTransform(
    [across, down, shine],
    ([a, d, s]: number[]) =>
      `drop-shadow(${-a * SHADOW_THROW}px ${18 - d * SHADOW_THROW}px 40px rgba(0, 0, 0, ${0.75 * s}))`,
  );

  const flatten = () => {
    across.set(0);
    down.set(0);
    shine.set(0);
  };

  const lean = (x: number, y: number) => {
    across.set(((x - frame.left) / frame.width) * 2 - 1);
    down.set(((y - frame.top) / frame.height) * 2 - 1);
    shine.set(1);
  };

  // Leaving drops the photo flat as it shrinks, so it lands on its card the way the card lies.
  useEffect(() => {
    if (!present) {
      flatten();
      onHint(null);
    }
  }, [present]);


  return (
    <>
      <motion.div
        className="lightbox-photo"
        variants={{
          // With less motion the photo fades in place instead of growing out of the card.
          from: reduced ? { ...frame, opacity: 0 } : { ...onCard(openedFrom), opacity: 1 },
          shown: { ...frame, opacity: 1 },
          to: () => {
            const card = flyBack(returns, chapter, photo.id, reduced);
            return card ? { ...onCard(card), opacity: 1 } : { ...frame, opacity: 0 };
          },
        }}
        initial="from"
        animate="shown"
        exit="to"
        transition={MORPH}
        style={{ rotateX, rotateY, transformPerspective: TILT_PERSPECTIVE, filter: canTilt ? shadow : undefined }}
        onAnimationComplete={(definition) => definition === 'shown' && setLanded(true)}
        onClick={onClose}
        onPointerMove={(e) => {
          if (!present) return;
          onHint({ x: e.clientX, y: e.clientY });
          if (tilting) lean(e.clientX, e.clientY);
        }}
        onPointerLeave={() => {
          onHint(null);
          flatten();
        }}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={photo.id}
            src={photo.src}
            alt={photo.alt}
            draggable={false}
            style={{ x: photoX, y: photoY, scale: photoScale }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        {canTilt && (
          <>
            <motion.div className="lightbox-glare" style={{ background: glareBackground, opacity: shine }} aria-hidden />
            <motion.div className="lightbox-rim" style={{ boxShadow: rim }} aria-hidden />
          </>
        )}
      </motion.div>
    </>
  );
}

interface StripPhotoProps {
  photo: Photo;
  slot: ReturnType<typeof inStrip>;
  /** The card it flies out of, or none to fade in where it is. */
  from: CardOnScreen | null;
  backTo: () => CardOnScreen | null | undefined;
  marked: boolean;
  onClick: () => void;
}

function StripPhoto({ photo, slot, from, backTo, marked, onClick }: StripPhotoProps) {
  return (
    <motion.button
      className={`lightbox-strip-photo${marked ? ' marked' : ''}`}
      aria-label={photo.title}
      aria-current={marked || undefined}
      // Out of the tab order: the arrows walk the Strip already, and Tab would land on photos mid-flight.
      tabIndex={-1}
      variants={{
        from: from ? { ...onCard(from), opacity: 1 } : { ...slot, opacity: 0 },
        shown: { ...slot, opacity: 1 },
        to: () => {
          const card = backTo();
          return card ? { ...onCard(card), opacity: 1 } : { ...slot, opacity: 0, transition: { duration: 0.2 } };
        },
      }}
      initial="from"
      animate="shown"
      exit="to"
      transition={MORPH}
      onClick={onClick}
    >
      <img src={photo.thumb} alt="" draggable={false} />
    </motion.button>
  );
}

interface NeighbourProps {
  chapter: Chapter;
  cover: string | undefined;
  by: number;
  onMove: (by: number) => void;
}

/** The previous or next Album in the switcher, by its Chapter and its Cover. */
function Neighbour({ chapter, cover, by, onMove }: NeighbourProps) {
  const [top] = stacked(chapter.album!, cover);
  const chevron = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={by < 0 ? 'M14.5 18L8.5 12L14.5 6' : 'M9.5 6L15.5 12L9.5 18'} />
    </svg>
  );
  return (
    <button
      className="lightbox-neighbour"
      aria-label={`${by < 0 ? 'Previous' : 'Next'} album: ${chapter.title}`}
      onClick={() => onMove(by)}
    >
      {by < 0 && chevron}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={chapter.title}
          className={`lightbox-neighbour-label${by > 0 ? ' next' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <img src={top.thumb} alt="" draggable={false} style={{ rotate: `${by * 6}deg` }} />
          {chapter.title}
        </motion.span>
      </AnimatePresence>
      {by > 0 && chevron}
    </button>
  );
}
