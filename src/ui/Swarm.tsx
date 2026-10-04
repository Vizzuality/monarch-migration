import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

import { YEAR_DAYS } from '../data/calendar';
import type { RGB } from '../data/color';
import { mulberry32 } from '../data/random';
import type { SwarmMember } from '../monarch/types';

// The trail runs this far behind the playhead, as tall as the space under the bar.
const LENGTH = 160;
// Seconds a dot takes to fly the length of the trail, give or take.
const FLIGHT = 3.2;
// How far a dot weaves up and down on its way, in px.
const WEAVE = 4;
// Share of the trail a dot covers when its butterfly isn't flying: a short, slow hop.
const HOP = 0.25;

interface Dot {
  /** 0 at the top of the trail, 1 at the bottom. */
  y: number;
  radius: number;
  /** Flights per second. Each flies at its own pace, so they never leave in step. */
  pace: number;
  offset: number;
  phase: [number, number];
  /** Which flight it is on, and the color and share of the trail it took off with. */
  flight: number;
  color: RGB;
  reach: number;
}

const reachOf = (m: SwarmMember) => (m.flying ? 1 : HOP);

function scatter(members: SwarmMember[]): Dot[] {
  const rng = mulberry32(2203);
  return members.map((m) => ({
    y: rng(),
    radius: 0.35 + rng() * 0.6,
    pace: 1 / (FLIGHT * (0.7 + rng() * 0.6)),
    offset: rng(),
    phase: [rng() * Math.PI * 2, rng() * Math.PI * 2],
    flight: -1,
    color: m.color,
    reach: reachOf(m),
  }));
}

interface Props {
  day: number;
  census: (day: number) => SwarmMember[];
}

/**
 * The population trailing behind the playhead: one dot per sampled Lineage takes off from
 * the playhead in its color for the day and flies back along the trail, fading as it goes.
 * Butterflies in flight cover the whole trail; the rest only hop, so the trail stretches
 * with the migration. It keeps flying while paused.
 */
export function Swarm({ day, census }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dayRef = useRef(day);
  dayRef.current = day;
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dots = scatter(census(dayRef.current));

    let frame = requestAnimationFrame(function paint(now) {
      frame = requestAnimationFrame(paint);
      const clock = now / 1000;
      const dpr = devicePixelRatio;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      const height = canvas.clientHeight;
      const members = census(dayRef.current);

      dots.forEach((dot, i) => {
        let age: number;
        let color: RGB;
        let reach: number;
        if (reduced) {
          age = dot.offset;
          color = members[i].color;
          reach = reachOf(members[i]);
        } else {
          const progress = clock * dot.pace + dot.offset;
          const flight = Math.floor(progress);
          // A dot keeps the day it took off on, so the trail shows the days just gone.
          if (flight !== dot.flight) {
            dot.flight = flight;
            dot.color = members[i].color;
            dot.reach = reachOf(members[i]);
          }
          age = progress - flight;
          color = dot.color;
          reach = dot.reach;
        }
        // Lingers by the playhead before speeding off, so the trail is densest there.
        const x = LENGTH * (1 - reach * age ** 1.6);
        const y = dot.y * height + (reduced ? 0 : WEAVE * Math.sin(age * 9 + dot.phase[0]) * Math.sin(age * 4 + dot.phase[1]));
        const alpha = 1 - age;

        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [census, reduced]);

  return (
    <div className="swarm" aria-hidden="true">
      <canvas ref={canvasRef} style={{ left: `${(day / YEAR_DAYS) * 100}%`, width: LENGTH, marginLeft: -LENGTH }} />
    </div>
  );
}
