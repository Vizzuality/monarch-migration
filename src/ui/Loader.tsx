import { AnimatePresence, motion } from 'motion/react';

import logo from '../assets/vizzuality.svg';

/** Covers the map while it walks the camera path to load every tile up front. */
export function Loader({ progress, visible }: { progress: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="loader" exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <img src={logo} width="107.484" height="24.0381" alt="Vizzuality" />
          <div className="loader-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="loader-bar" style={{ transform: `scaleX(${progress})` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
