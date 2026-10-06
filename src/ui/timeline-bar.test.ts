import { describe, expect, it } from 'vitest';

import { YEAR_DAYS } from '../data/calendar';
import { buildModel } from '../monarch/model';
import { storyAt } from '../monarch/story';
import { barShape } from './timeline-bar';

const { activity } = buildModel();

describe('the timeline bar', () => {
  it("is each day in the color of the Dominant generation the readout shows", () => {
    const colors = [...barShape(activity).backgroundImage.matchAll(/rgba\(([\d,]+), [\d.]+\)/g)].map((m) => m[1]);
    expect(colors).toHaveLength(YEAR_DAYS);
    colors.forEach((color, d) => expect(color, `day ${d}`).toBe(String(storyAt(activity, d).dominant.color)));
  });
});
