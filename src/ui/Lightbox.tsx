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
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import arrow from '../assets/arrow.svg';
import type { Chapter } from '../data/calendar';
import type { CardOnScreen } from './Albums';

const MORPH: Transition = { type: 'spring', stiffness: 220, damping: 30 };
// The card's outline and shadow, faded out as it grows so it lands on the card exactly like it.
const CARD_EDGE = { borderColor: 'rgba(0, 0, 0, 1)', boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.8)' };
const PHOTO_EDGE = { borderColor: 'rgba(0, 0, 0, 0)', boxShadow: '0px -2px 5px rgba(0, 0, 0, 0)' };
// The photo takes this share of the viewport's height, at 3:4.
const PHOTO_HEIGHT = 0.72;
const PHOTO_ASPECT = 3 / 4;
// Between the photo and the text next to it.
const CAPTION_GAP = 51;
const CAPTION_WIDTH = 383;
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

function framed() {
  // The photo is clipped at the timeline, so on a short window it shrinks to stay clear of it.
  const timeline = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-height'));
  const height = Math.min(window.innerHeight * PHOTO_HEIGHT, window.innerHeight - 2 * (timeline + 16));
  const width = height * PHOTO_ASPECT;
  // Keeps the photo and its caption on screen together when the window is narrow.
  const left = Math.max(16, Math.min((window.innerWidth - width) / 2, window.innerWidth - width - CAPTION_GAP - CAPTION_WIDTH - 16));
  return { left, top: (window.innerHeight - height) / 2, width, height, rotate: 0, ...PHOTO_EDGE };
}

const onCard = ({ x, y, size, rotate }: CardOnScreen) => ({
  left: x - size / 2,
  top: y - size / 2,
  width: size,
  height: size,
  rotate,
  ...CARD_EDGE,
});

interface Props {
  chapter: Chapter;
  index: number;
  /** The card the photo grows out of. The one it shrinks back into comes through AnimatePresence's `custom`. */
  from: CardOnScreen;
  onIndex: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ chapter, index, from, onIndex, onClose }: Props) {
  const photos = chapter.album!;
  const photo = photos[index];
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const [frame, setFrame] = useState(framed);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
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

  // Closing drops the photo flat as it shrinks, so it lands on its card the way the card lies.
  useEffect(() => {
    if (!present) flatten();
  }, [present]);

  // Before the photo is measured, or it would grow inside a closed, invisible dialog.
  useLayoutEffect(() => {
    const el = dialog.current;
    if (!el) return;
    el.showModal();
    // Rather than the first arrow, so Space doesn't flip the photo.
    el.focus();
  }, []);

  useEffect(() => {
    const onResize = () => setFrame(framed());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const step = (by: number) => onIndex((index + by + photos.length) % photos.length);

  const geometry = {
    // With less motion the photo fades in place instead of growing out of the card.
    from: (card: CardOnScreen) => (reduced ? { ...frame, opacity: 0 } : { ...onCard(card), opacity: 1 }),
    to: (card: CardOnScreen | null | undefined) => (reduced || !card ? { ...frame, opacity: 0 } : { ...onCard(card), opacity: 1 }),
  };

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
      onKeyDown={(e) => {
        if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
          e.preventDefault();
          if (photos.length > 1) step(e.code === 'ArrowRight' ? 1 : -1);
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

      {/* Clipped at the timeline, so the photo grows out of and sinks back behind it like its card. */}
      <div className="lightbox-stage">
        <motion.div
          className="lightbox-photo"
          custom={from}
          variants={{ from: geometry.from, shown: { ...frame, opacity: 1 }, to: geometry.to }}
          initial="from"
          animate="shown"
          exit="to"
          transition={MORPH}
          style={{ rotateX, rotateY, transformPerspective: TILT_PERSPECTIVE, filter: canTilt ? shadow : undefined }}
          onAnimationComplete={(definition) => definition === 'shown' && setLanded(true)}
          onClick={onClose}
          onPointerMove={(e) => {
            setHint({ x: e.clientX, y: e.clientY });
            if (tilting) lean(e.clientX, e.clientY);
          }}
          onPointerLeave={() => {
            setHint(null);
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
      </div>

      <motion.div
        className="lightbox-caption"
        style={{ left: frame.left + frame.width + CAPTION_GAP, top: frame.top, height: frame.height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        {photos.length > 1 && (
          <div className="lightbox-arrows">
            <button aria-label="Previous photo" onClick={() => step(-1)}>
              <img src={arrow} width="38" height="38" alt="" />
            </button>
            <button aria-label="Next photo" onClick={() => step(1)}>
              <img src={arrow} width="38" height="38" alt="" className="flip" />
            </button>
          </div>
        )}
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
