import { createContext, memo, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { Butterfly, FEET_X, type Pose } from './Butterfly';
import { useFlight, type Bird, type Body, type Flight } from './Flock';
import { flickScale, flyingScale, perchedScale } from './wings';

interface Entry {
  bird: Bird;
  flight: Flight;
  pose: Pose;
  /** When it last took off or landed, which restarts its wingbeat. */
  since: number;
}

const Painting = createContext<Map<number, Entry> | null>(null);

/** A butterfly drawn on the surrounding FlockCanvas instead of as an SVG of its own. */
export const CanvasButterfly: Body = memo(function CanvasButterfly({ bird, to, onArrive }) {
  const flight = useFlight(bird, to, onArrive);
  const painting = useContext(Painting)!;
  useLayoutEffect(() => {
    const last = painting.get(bird.id);
    painting.set(bird.id, { bird, flight, pose: flight.pose, since: last?.pose === flight.pose ? last.since : performance.now() });
  });
  useEffect(() => () => void painting.delete(bird.id), [bird.id]);
  return null;
});

// Room round the butterfly's viewBox, in its units, for wings swung down below the body.
const PAD = 50;
const LARGEST = 12;
const FLYING = steps(-0.9, 1, 16);
const PERCHED = steps(0.1, 1, 10);

function steps(from: number, to: number, count: number) {
  return Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));
}

const nearest = (scales: number[], s: number) => Math.round(((s - scales[0]) / (scales[scales.length - 1] - scales[0])) * (scales.length - 1));

interface Sprites {
  /** Both wings at each of the FLYING scales. */
  flying: HTMLCanvasElement[];
  /** The near wing at each of the PERCHED scales, the far one open. */
  perched: HTMLCanvasElement[];
  width: number;
  height: number;
}

const STYLES = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity'];

/**
 * Pictures of `model` with its wings at every scale the canvas draws, so the canvas never
 * renders the SVG and its masks again. The model's stylesheet colours are copied onto the
 * picture, which has no stylesheet of its own.
 */
async function bake(model: SVGSVGElement): Promise<Sprites> {
  const { width, height } = model.viewBox.baseVal;
  const scale = (LARGEST * devicePixelRatio * 1.5) / width;
  const picture = model.cloneNode(true) as SVGSVGElement;
  const live = model.querySelectorAll('*');
  picture.querySelectorAll('*').forEach((el, i) => {
    const style = getComputedStyle(live[i]);
    for (const name of STYLES) el.setAttribute(name, style.getPropertyValue(name));
    el.removeAttribute('class');
  });
  const style = getComputedStyle(model);
  picture.setAttribute('fill', style.fill);
  picture.removeAttribute('style');
  picture.setAttribute('viewBox', `${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`);
  picture.setAttribute('width', `${(width + 2 * PAD) * scale}`);
  picture.setAttribute('height', `${(height + 2 * PAD) * scale}`);
  const near = [...model.querySelectorAll('.butterfly-wings-near')].map((el) => [...live].indexOf(el));
  const far = [...model.querySelectorAll('.butterfly-wings-far')].map((el) => [...live].indexOf(el));
  const all = picture.querySelectorAll('*');
  // The CSS wingbeat scales the wings about this point; see Butterfly.
  const flap = (s: number) => `translate(72 57) scale(1 ${s}) translate(-72 -57)`;

  const render = async (nearScale: number, farScale: number) => {
    near.forEach((i) => all[i].setAttribute('transform', flap(nearScale)));
    far.forEach((i) => all[i].setAttribute('transform', flap(farScale)));
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(picture))}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((width + 2 * PAD) * scale);
    canvas.height = Math.ceil((height + 2 * PAD) * scale);
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
  const flying: HTMLCanvasElement[] = [];
  for (const s of FLYING) flying.push(await render(s, s));
  const perched: HTMLCanvasElement[] = [];
  for (const s of PERCHED) perched.push(await render(s, 1));
  return { flying, perched, width, height };
}

/**
 * One canvas covering the window that draws every CanvasButterfly inside it, placed relative
 * to `origin` as the SVG butterflies would be. `startled` is when the flock was last startled
 * into flicking its wings.
 */
export function FlockCanvas({ origin, startled, children }: { origin: RefObject<HTMLElement | null>; startled: number; children: ReactNode }) {
  const [painting] = useState(() => new Map<number, Entry>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const [sprites, setSprites] = useState<Sprites | null>(null);
  const startledRef = useRef(startled);
  startledRef.current = startled;

  useEffect(() => {
    const model = modelRef.current?.querySelector('svg');
    if (!model) return;
    let alive = true;
    bake(model).then((s) => alive && setSprites(s));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!sprites || !canvas || !ctx) return;
    const { width, height } = sprites;
    const feet = FEET_X * width;
    let frame = requestAnimationFrame(function paint() {
      frame = requestAnimationFrame(paint);
      const dpr = devicePixelRatio;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const at = origin.current?.getBoundingClientRect();
      if (!at) return;
      const box = canvas.getBoundingClientRect();
      const now = performance.now();
      for (const { bird, flight, pose, since } of painting.values()) {
        const opacity = flight.opacity.get();
        if (opacity <= 0) continue;
        const t = (now - since) / 1000;
        const { wings } = bird;
        let sprite: HTMLCanvasElement;
        if (pose === 'flying') {
          sprite = sprites.flying[nearest(FLYING, flyingScale(wings, t))];
        } else {
          // Each flicks a moment after the last, as in the CSS it replaces.
          const flick = flickScale((now - startledRef.current) / 1000 - (wings.restDelay * 0.12 - 0.02));
          sprite = sprites.perched[nearest(PERCHED, flick ?? perchedScale(wings, t))];
        }
        const k = bird.size / width;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(at.left - box.left + flight.x.get(), at.top - box.top + flight.y.get());
        ctx.rotate((flight.rotate.get() * Math.PI) / 180);
        ctx.scale(flight.face, 1);
        ctx.globalAlpha = opacity;
        ctx.drawImage(sprite, (-PAD - feet) * k, 1 - (height + PAD) * k, (width + 2 * PAD) * k, (height + 2 * PAD) * k);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [sprites, origin, painting]);

  return (
    <Painting.Provider value={painting}>
      <canvas ref={canvasRef} className="flock-canvas" />
      {!sprites && (
        <div ref={modelRef} className="flock-model" aria-hidden>
          <Butterfly pose="perched" size={88} />
        </div>
      )}
      {children}
    </Painting.Provider>
  );
}
