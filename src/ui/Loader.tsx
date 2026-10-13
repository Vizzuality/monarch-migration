import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties } from 'react';

import logo from '../assets/vizzuality.svg';
import photo from '../assets/photos/emerging.jpg';
import { STORY_TITLE } from '../monarch/story';

/**
 * Covers the map while it walks the camera path to load every tile up front.
 * The title fills in with cream as the story loads, then the cover fades out
 * onto the map, with its own logo already at the top.
 */
export function Loader({ progress, visible }: { progress: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loader"
          role="progressbar"
          aria-label="Loading the story"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <img className="loader-photo" src={photo} alt="" />
          <div className="loader-shade" />
          <img className="loader-logo" src={logo} width="107.484" height="24.0381" alt="Vizzuality" />
          <h1 className="loader-title">
            <span style={{ '--fill': `${progress * 100}%` } as CSSProperties}>{STORY_TITLE}</span>
          </h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
