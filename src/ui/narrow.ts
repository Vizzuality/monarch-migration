import { useSyncExternalStore } from 'react';

/** A phone held upright. Keep in step with the `max-width` media query in styles.css. */
const NARROW = window.matchMedia('(max-width: 768px)');

export const isNarrow = () => NARROW.matches;

const subscribe = (onChange: () => void) => {
  NARROW.addEventListener('change', onChange);
  return () => NARROW.removeEventListener('change', onChange);
};

/** Whether the screen is narrow enough for the stripped-down layout: no Albums, no legend, a bare timeline. */
export const useNarrow = () => useSyncExternalStore(subscribe, isNarrow);
