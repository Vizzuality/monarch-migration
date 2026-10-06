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
      for (let i = 0; i < COUNT; i++) expect(frame.colors[i * 4 + 3], `lineage ${i} on day ${t}`).toBeGreaterThan(0);
    }
  });
});
