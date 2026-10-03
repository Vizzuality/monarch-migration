import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useRef } from 'react';

import { chapterAt } from '../data/calendar';
import { CHAPTERS } from '../monarch/story';
import { ChapterButterflies } from './ChapterButterflies';

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

const block: Variants = {
  leave: { opacity: 0, y: -4, transition: { duration: 0.4, ease: 'easeIn' } },
};

const line: Variants = {
  enter: { opacity: 0, y: 6 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT, delay } }),
};

export function ChapterText({ day }: { day: number }) {
  const chapter = chapterAt(CHAPTERS, day);
  const anchor = useRef<HTMLDivElement>(null);
  return (
    // The butterflies sit outside the chapter so they stay on screen while it changes.
    <div className="chapter">
      {/* "wait" lets the old chapter finish leaving, then shows only the latest one,
          however many were crossed while scrubbing. */}
      <AnimatePresence mode="wait">
        <Chapter key={chapter.title} title={chapter.title} body={chapter.body} />
      </AnimatePresence>
      {/* The chapter grows upwards from its bottom edge, so that is the only place to hang
          the butterflies from that stays put while the chapter changes. */}
      <div ref={anchor} className="chapter-anchor">
        <ChapterButterflies title={chapter.title} body={chapter.body} anchorRef={anchor} />
      </div>
    </div>
  );
}

function Chapter({ title, body }: { title: string; body: string }) {
  return (
    <motion.div variants={block} initial="enter" animate="show" exit="leave">
      <motion.h1 variants={line} custom={0}>
        {title}
      </motion.h1>
      <motion.p variants={line} custom={0.15}>
        {body}
      </motion.p>
    </motion.div>
  );
}
