import { describe, expect, it } from 'vitest';

import { YEAR_DAYS } from '../data/calendar';
import { buildModel } from './model';
import { CHAPTERS, storyAt } from './story';

const { activity } = buildModel();

describe('the story on a given day', () => {
  it('wraps the day around the year', () => {
    expect(storyAt(activity, -1).today).toBe(YEAR_DAYS - 1);
    expect(storyAt(activity, YEAR_DAYS).today).toBe(0);
    expect(storyAt(activity, 41.9).today).toBe(41);
  });

  it('reads the date off the day of the year', () => {
    expect(storyAt(activity, 0).date).toEqual({ date: 1, month: 'January' });
    expect(storyAt(activity, 59).date).toEqual({ date: 1, month: 'March' });
    expect(storyAt(activity, YEAR_DAYS - 1).date).toEqual({ date: 31, month: 'December' });
  });

  it('turns to each Chapter on its first day', () => {
    CHAPTERS.forEach((chapter, i) => {
      expect(storyAt(activity, chapter.from).chapter).toBe(chapter);
      if (i > 0) expect(storyAt(activity, chapter.from - 0.01).chapter).toBe(CHAPTERS[i - 1]);
    });
    expect(storyAt(activity, YEAR_DAYS - 0.01).chapter).toBe(CHAPTERS[CHAPTERS.length - 1]);
  });

  it("has the day's Dominant generation", () => {
    for (let d = 0; d < YEAR_DAYS; d++) expect(storyAt(activity, d + 0.5).dominant.id).toBe(activity.dominant[d]);
  });
});
