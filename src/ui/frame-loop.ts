import { useEffect, useRef } from 'react';

type Tick = (now: number) => void;

// One requestAnimationFrame for everything that moves, so the map, the trails and the canvases
// all draw the same frame. The playback clock runs first, so everyone else reads this frame's day.
const first = new Set<Tick>();
const rest = new Set<Tick>();
let raf = 0;

function run(now: number) {
  for (const tick of first) tick(now);
  for (const tick of rest) tick(now);
  raf = first.size || rest.size ? requestAnimationFrame(run) : 0;
}

export function onFrame(tick: Tick, { early = false } = {}) {
  const set = early ? first : rest;
  set.add(tick);
  if (!raf) raf = requestAnimationFrame(run);
  return () => {
    set.delete(tick);
  };
}

/** Calls `tick` on every frame, always with the latest render's closure. */
export function useFrame(tick: Tick, options?: { early?: boolean }) {
  const ref = useRef(tick);
  ref.current = tick;
  const early = options?.early ?? false;
  useEffect(() => onFrame((now) => ref.current(now), { early }), [early]);
}
