import { motion, type Transition, type Variants } from 'motion/react';

import { chapterMiddle, stacked, YEAR_DAYS, type Chapter, type Photo } from '../data/calendar';
import { mulberry32 } from '../data/random';

export const CARD_SIZE = 65;

// The rising Album is what gets interrupted while scrubbing, so it stays a spring.
const RISE: Transition = { type: 'spring', stiffness: 260, damping: 28 };
// The cards only fan out once the Album is up, one after the other.
const FAN_DELAY = 0.1;
const FAN_STAGGER = 0.07;

function rngFor(photo: Photo) {
  let seed = 0;
  for (const c of photo.id) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) | 0;
  return mulberry32(seed);
}

/** Where a photo lands in its Album's stack, the same on every reload. The first card stays near the middle. */
export function cardPose(photo: Photo, index: number) {
  const rng = rngFor(photo);
  const side = rng() < 0.5 ? -1 : 1;
  if (index === 0) return { x: 0, y: 0, rotate: (rng() - 0.5) * 6 };
  return { x: side * (8 + rng() * 12), y: -(2 + rng() * 10), rotate: side * (4 + rng() * 5) };
}

/** How far a sunk Album's first card leans, more than when it's active. */
function sunkTilt(photo: Photo) {
  const rng = rngFor(photo);
  const side = rng() < 0.5 ? -1 : 1;
  return side * (5 + rng() * 4);
}

/** Where the card of `photo` is on screen right now, for the Lightbox to grow from. */
export function cardOnScreen(photo: Photo) {
  const el = document.querySelector<HTMLElement>(`[data-photo="${photo.id}"]`);
  if (!el) return null;
  // A rotated card's bounding box grows, but keeps its centre.
  const box = el.getBoundingClientRect();
  // Read off the card rather than its pose, since it leans differently sunk and active and may be mid-way.
  const transform = getComputedStyle(el).transform;
  const { a, b } = new DOMMatrix(transform === 'none' ? undefined : transform);
  return { x: box.left + box.width / 2, y: box.top + box.height / 2, size: CARD_SIZE, rotate: (Math.atan2(b, a) * 180) / Math.PI };
}

export type CardOnScreen = NonNullable<ReturnType<typeof cardOnScreen>>;

export function cardsOnScreen(chapter: Chapter) {
  const cards: Record<string, CardOnScreen> = {};
  for (const photo of chapter.album!) {
    const card = cardOnScreen(photo);
    if (!card) return null;
    cards[photo.id] = card;
  }
  return cards;
}

const ALBUM_Y = {
  // Sunk behind the timeline with only the top of the Cover showing.
  rest: 29,
  // Still tucked a little into the timeline, so the active Album lifts rather than leaps.
  active: 6,
};

/**
 * Where every card of `chapter`'s Album will lie once it settles, raised or sunk, with `cover` on top, for the
 * Lightbox to shrink back into. Worked out from the poses rather than read off the cards, since the Album may be
 * about to rise or sink.
 */
export function cardsAt(chapter: Chapter, cover: string, raised: boolean) {
  const el = document.querySelector<HTMLElement>(`[data-album="${chapter.title}"]`);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  const transform = getComputedStyle(el).transform;
  const { f: lifted } = new DOMMatrix(transform === 'none' ? undefined : transform);
  const x = box.left + box.width / 2;
  const y = box.top - lifted + (raised ? ALBUM_Y.active : ALBUM_Y.rest) + box.height / 2;
  const photos = stacked(chapter.album!, cover);
  const under = sunkTilt(photos[0]);
  const cards: Record<string, CardOnScreen> = {};
  photos.forEach((photo, index) => {
    const pose = raised ? cardPose(photo, index) : { x: 0, y: 0, rotate: under };
    cards[photo.id] = { x: x + pose.x, y: y + pose.y, size: CARD_SIZE, rotate: pose.rotate };
  });
  return cards;
}

const album: Variants = {
  rest: { y: ALBUM_Y.rest, transition: RISE },
  active: { y: ALBUM_Y.active, transition: RISE },
};

interface Props {
  chapters: Chapter[];
  active: Chapter;
  /** Each Album's Cover, by Chapter title, for those whose Cover isn't their first photo. */
  covers: Record<string, string>;
  /** The Albums whose photos are out in the Lightbox, by Chapter title, whose stacks stay empty until they're back. */
  away: string[];
  onOpen: (chapter: Chapter) => void;
}

export function Albums({ chapters, active, covers, away, onOpen }: Props) {
  return (
    <div className="albums">
      {chapters.map((chapter, i) => {
        if (!chapter.album?.length) return null;
        const isActive = chapter === active;
        const photos = stacked(chapter.album, covers[chapter.title]);
        const out = away.includes(chapter.title);
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
            {photos.map((photo, index) => (
              // Keyed by its place too, so a card moved by a new Cover lands straight in its new pose while it's away.
              <Card
                key={`${photo.id}-${index}`}
                photo={photo}
                index={index}
                count={photos.length}
                under={sunkTilt(photos[0])}
                away={out}
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
  /** How the Cover leans while the Album is sunk, for the others to hide under it. */
  under: number;
  away: boolean;
}

function Card({ photo, index, count, under, away }: CardProps) {
  const pose = cardPose(photo, index);
  const variants: Variants = {
    // Every card hides under the Cover, so a sunk Album shows a single photo.
    rest: index === 0 ? { ...pose, rotate: under, opacity: 1 } : { x: 0, y: 0, rotate: under, opacity: 0, transition: { duration: 0.25 } },
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
