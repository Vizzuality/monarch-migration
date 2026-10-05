import { motion, type Transition, type Variants } from 'motion/react';

import { chapterMiddle, YEAR_DAYS, type Chapter, type Photo } from '../data/calendar';
import { mulberry32 } from '../data/random';

export const CARD_SIZE = 65;

// The rising Album is what gets interrupted while scrubbing, so it stays a spring.
const RISE: Transition = { type: 'spring', stiffness: 260, damping: 28 };
// The cards only fan out once the Album is up, one after the other.
const FAN_DELAY = 0.1;
const FAN_STAGGER = 0.07;

/** Where a photo lands in its Album's stack, the same on every reload. The first card stays near the middle. */
export function cardPose(photo: Photo, index: number) {
  let seed = 0;
  for (const c of photo.id) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) | 0;
  const rng = mulberry32(seed);
  const side = rng() < 0.5 ? -1 : 1;
  if (index === 0) return { x: 0, y: 0, rotate: (rng() - 0.5) * 6 };
  return { x: side * (8 + rng() * 12), y: -(2 + rng() * 10), rotate: side * (4 + rng() * 5) };
}

/** Where the card of `photo` is on screen, for the Lightbox to grow from or shrink back into. */
export function cardOnScreen(photo: Photo, index: number) {
  const el = document.querySelector<HTMLElement>(`[data-photo="${photo.id}"]`);
  if (!el) return null;
  // A rotated card's bounding box grows, but keeps its centre.
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2, size: CARD_SIZE, rotate: cardPose(photo, index).rotate };
}

export type CardOnScreen = NonNullable<ReturnType<typeof cardOnScreen>>;

const album: Variants = {
  // Sunk behind the timeline with only the top of the first photo showing.
  rest: { y: 29, transition: RISE },
  // Still tucked a little into the timeline, so the active Album lifts rather than leaps.
  active: { y: 6, transition: RISE },
};

interface Props {
  chapters: Chapter[];
  active: Chapter;
  /** The photo out in the Lightbox, whose card stays empty until it comes back. */
  away: string | null;
  onOpen: (chapter: Chapter) => void;
}

export function Albums({ chapters, active, away, onOpen }: Props) {
  return (
    <div className="albums">
      {chapters.map((chapter, i) => {
        if (!chapter.album?.length) return null;
        const isActive = chapter === active;
        return (
          <motion.button
            key={chapter.title}
            className={`album${isActive ? ' active' : ''}`}
            style={{ left: `${(chapterMiddle(chapters, i) / YEAR_DAYS) * 100}%` }}
            data-album={chapter.title}
            aria-label={`Open photos: ${chapter.title}`}
            variants={album}
            initial={false}
            animate={isActive ? 'active' : 'rest'}
            onClick={() => onOpen(chapter)}
          >
            {chapter.album.map((photo, index) => (
              <Card
                key={photo.id}
                photo={photo}
                index={index}
                count={chapter.album!.length}
                under={cardPose(chapter.album![0], 0).rotate}
                away={photo.id === away}
              />
            ))}
          </motion.button>
        );
      })}
    </div>
  );
}

interface CardProps {
  photo: Photo;
  index: number;
  count: number;
  /** How the first card of the Album is turned, for the others to hide under it. */
  under: number;
  away: boolean;
}

function Card({ photo, index, count, under, away }: CardProps) {
  const pose = cardPose(photo, index);
  const variants: Variants = {
    // Every card hides under the first one, so a sunk Album shows a single photo.
    rest: index === 0 ? { ...pose, opacity: 1 } : { x: 0, y: 0, rotate: under, opacity: 0, transition: { duration: 0.25 } },
    active: { ...pose, opacity: 1, transition: { ...RISE, delay: index === 0 ? 0 : FAN_DELAY + (index - 1) * FAN_STAGGER } },
  };
  return (
    <motion.span
      className="card"
      data-photo={photo.id}
      variants={variants}
      style={{ zIndex: count - index, visibility: away ? 'hidden' : 'visible' }}
    >
      <img src={photo.thumb} alt="" draggable={false} />
    </motion.span>
  );
}
