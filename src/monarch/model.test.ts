import { describe, expect, it } from 'vitest';

import { YEAR_DAYS } from '../data/calendar';
import { buildModel } from './model';
import type { Frame, Trip } from './types';

const COUNT = 800;
const sim = buildModel(COUNT);
const trips = sim.buckets.flatMap((b) => b.trips);
const days = Array.from({ length: YEAR_DAYS * 2 }, (_, i) => i / 2 + 0.25);

const slotColor = (frame: Frame, slot: number) => [...frame.colors.slice(slot * 4, slot * 4 + 3)];

describe('a Lineage on the map and in the Swarm', () => {
  it('has the same color in both, every day', () => {
    for (const t of days) {
      const frame = sim.frame(t, 0);
      for (const member of sim.swarm(t)) {
        expect(slotColor(frame, member.lineage), `lineage ${member.lineage} on day ${t}`).toEqual(member.color);
      }
    }
  });

  it("flies in its trip's color", () => {
    const flying = trips.filter((trip) => trip.lineage % 2 === 0);
    expect(flying.length).toBeGreaterThan(0);
    for (const trip of flying) {
      const t = (trip.start + trip.end) / 2;
      const member = sim.swarm(t).find((m) => m.lineage === trip.lineage)!;
      expect(member.state).toBe('flying');
      expect(member.color).toEqual(trip.color);
      expect(slotColor(sim.frame(t, 0), trip.lineage)).toEqual(trip.color);
    }
  });

  it('has exactly one living member every day', () => {
    const byLineage = new Map<number, Trip[]>();
    for (const trip of trips) byLineage.set(trip.lineage, [...(byLineage.get(trip.lineage) ?? []), trip]);
    expect(byLineage.size).toBe(COUNT);
    for (const legs of byLineage.values()) {
      legs.sort((a, b) => a.start - b.start);
      // One butterfly's trip ends before her daughter's begins: the eggs and caterpillars fill the gap.
      legs.slice(1).forEach((leg, k) => expect(leg.start).toBeGreaterThanOrEqual(legs[k].end));
    }
    for (const t of days) {
      const frame = sim.frame(t, 0);
      expect(frame.length).toBeGreaterThanOrEqual(COUNT);
      for (const member of sim.swarm(t)) {
        // A butterfly resting in its Colony is drawn as part of it instead.
        if (member.state !== 'resting') expect(frame.colors[member.lineage * 4 + 3], `lineage ${member.lineage} on day ${t}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('a Colony on the map', () => {
  const midwinter = 20;
  const midsummer = 200;

  it('holds every one of its butterflies in midwinter and none in midsummer', () => {
    for (const colony of sim.frame(midwinter, 0).colonies) expect(colony.share).toBe(1);
    for (const colony of sim.frame(midsummer, 0).colonies) expect(colony.share).toBe(0);
  });

  it('takes in the butterflies resting there, which leave no dot of their own', () => {
    const frame = sim.frame(midwinter, 0);
    for (const member of sim.swarm(midwinter)) {
      expect(member.state).toBe('resting');
      expect(frame.colors[member.lineage * 4 + 3]).toBe(0);
    }
  });

  it('grows through the autumn arrivals and drains through the spring departures', () => {
    const shares = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, k) => sim.frame(from + k, 0).colonies.reduce((sum, c) => sum + c.share, 0));
    const autumn = shares(300, 364);
    const spring = shares(40, 120);
    autumn.slice(1).forEach((s, k) => expect(s).toBeGreaterThanOrEqual(autumn[k]));
    spring.slice(1).forEach((s, k) => expect(s).toBeLessThanOrEqual(spring[k]));
  });
});
