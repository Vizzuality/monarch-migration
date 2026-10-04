import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

import { YEAR_DAYS } from '../data/calendar';
import { mulberry32 } from '../data/random';
import type { SwarmMember } from '../monarch/types';

// The trail runs this far ahead of the playhead, as tall as the space under the bar.
const LENGTH = 160;
// Seconds a dot takes to fly the length of the trail, give or take.
const FLIGHT = 3.2;
// How far a dot weaves up and down on its way, in px.
const WEAVE = 4;
// Share of the trail a dot covers when its butterfly isn't flying: a short, slow hop.
const HOP = 0.25;
// Dot radius in px: butterflies come in all sizes, eggs and caterpillars are specks.
const BUTTERFLY = { min: 0.85, max: 1.7 };
const LARVA = { min: 0.6, max: 0.8 };

interface Dot {
  /** 0 at the top of the trail, 1 at the bottom. */
  y: number;
  /** Where its size falls in its stage's range, so it keeps its build from one flight to the next. */
  build: number;
  /** Flights per second. Each flies at its own pace, so they never leave in step. */
  pace: number;
  offset: number;
  phase: [number, number];
  /** Which flight it is on, and what it took off as. */
  flight: number;
  member: SwarmMember;
}

const reachOf = (m: SwarmMember) => (m.state === 'flying' ? 1 : HOP);

function radiusOf(m: SwarmMember, build: number) {
  const { min, max } = m.state === 'developing' ? LARVA : BUTTERFLY;
  return min + (max - min) * build;
}

function scatter(members: SwarmMember[]): Dot[] {
  const rng = mulberry32(2203);
  return members.map((m) => ({
    y: rng(),
    build: rng() ** 1.5,
    pace: 1 / (FLIGHT * (0.7 + rng() * 0.6)),
    offset: rng(),
    phase: [rng() * Math.PI * 2, rng() * Math.PI * 2],
    flight: -1,
    member: m,
  }));
}

interface Props {
  day: number;
  census: (day: number) => SwarmMember[];
}

/**
 * The population streaming ahead of the playhead: one dot per sampled Lineage takes off from
 * the playhead in its color for the day and flies forward along the trail, fading as it goes.
 * Butterflies in flight cover the whole trail; the rest only hop, so the trail stretches
 * with the migration. Eggs and caterpillars are specks; butterflies vary in size.
 * It keeps flying while paused.
 */
export function Swarm({ day, census }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLCanvasElement>(null);
  const dayRef = useRef(day);
  dayRef.current = day;
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const wrap = wrapRef.current;
    const wrapCtx = wrap?.getContext('2d');
    if (!canvas || !ctx || !wrap || !wrapCtx) return;
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
        let member: SwarmMember;
        if (reduced) {
          age = dot.offset;
          member = members[i];
        } else {
          const progress = clock * dot.pace + dot.offset;
          const flight = Math.floor(progress);
          // A dot keeps the day it took off on, so a new color streams out from the playhead.
          if (flight !== dot.flight) {
            dot.flight = flight;
            dot.member = members[i];
          }
          age = progress - flight;
          member = dot.member;
        }
        const { color } = member;
        // Lingers by the playhead before speeding off, so the trail is densest there.
        const x = LENGTH * reachOf(member) * age ** 1.6;
        const y = dot.y * height + (reduced ? 0 : WEAVE * Math.sin(age * 9 + dot.phase[0]) * Math.sin(age * 4 + dot.phase[1]));
        const alpha = 1 - age;

        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, radiusOf(member, dot.build), 0, Math.PI * 2);
        ctx.fill();
      });

      if (wrap.width !== w || wrap.height !== h) {
        wrap.width = w;
        wrap.height = h;
      }
      wrapCtx.clearRect(0, 0, w, h);
      wrapCtx.drawImage(canvas, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [census, reduced]);

  return (
    <div className="swarm" aria-hidden="true">
      <canvas ref={canvasRef} style={{ left: `${(day / YEAR_DAYS) * 100}%`, width: LENGTH }} />
      {/* The same trail a whole year back, so what runs past December carries on into January. */}
      <canvas ref={wrapRef} style={{ left: `${(day / YEAR_DAYS - 1) * 100}%`, width: LENGTH }} />
    </div>
  );
}
