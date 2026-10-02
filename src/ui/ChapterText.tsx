import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useRef } from 'react';

import { chapterAt } from '../data/calendar';
import { CHAPTERS } from '../monarch/story';
import { ChapterButterflies } from './ChapterButterflies';

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

const block: Variants = {
  leave: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } },
};

const line: Variants = {
  enter: { opacity: 0, y: 12 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, delay } }),
};

export function ChapterText({ day }: { day: number }) {
  const chapter = chapterAt(CHAPTERS, day);
  return (
    // "wait" lets the old chapter finish leaving, then shows only the latest one,
    // however many were crossed while scrubbing.
    <AnimatePresence mode="wait">
      <Chapter key={chapter.title} title={chapter.title} body={chapter.body} />
    </AnimatePresence>
  );
}

function Chapter({ title, body }: { title: string; body: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <motion.div ref={frame} className="chapter" variants={block} initial="enter" animate="show" exit="leave">
      <motion.h1 ref={heading} variants={line} custom={0}>
        {title}
      </motion.h1>
      <motion.p variants={line} custom={0.08}>
        {body}
      </motion.p>
      <ChapterButterflies title={title} titleRef={heading} frameRef={frame} />
    </motion.div>
  );
}
