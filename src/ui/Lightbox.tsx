import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
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
// The close hint sits up and to the right of the pointer.
const HINT_OFFSET = { x: 24, y: -43 };

function framed() {
  const height = window.innerHeight * PHOTO_HEIGHT;
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.1 } }}
        transition={{ duration: 0.4 }}
      />

      <motion.div
        className="lightbox-photo"
        custom={from}
        variants={{ from: geometry.from, shown: { ...frame, opacity: 1 }, to: geometry.to }}
        initial="from"
        animate="shown"
        exit="to"
        transition={MORPH}
        onClick={onClose}
        onPointerMove={(e) => setHint({ x: e.clientX, y: e.clientY })}
        onPointerLeave={() => setHint(null)}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={photo.id}
            src={photo.src}
            alt={photo.alt}
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
      </motion.div>

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
