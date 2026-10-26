import { describe, expect, it } from 'vitest';

import { albumAfter, stacked, type Chapter, type Photo } from './calendar';

const photo = (id: string) => ({ id }) as Photo;
const chapter = (title: string, album?: Photo[]) => ({ from: 0, title, body: '', album }) as Chapter;

describe('moving between Albums', () => {
  const winter = chapter('winter', [photo('a')]);
  const awakening = chapter('awakening', [photo('b')]);
  const bare = chapter('bare');
  const homecoming = chapter('homecoming', [photo('c')]);
  const chapters = [winter, awakening, bare, homecoming];

  it('steps along the timeline', () => {
    expect(albumAfter(chapters, winter, 1)).toBe(awakening);
    expect(albumAfter(chapters, awakening, -1)).toBe(winter);
  });

  it('skips Chapters without an Album', () => {
    expect(albumAfter(chapters, awakening, 1)).toBe(homecoming);
    expect(albumAfter(chapters, homecoming, -1)).toBe(awakening);
  });

  it('wraps round the year', () => {
    expect(albumAfter(chapters, homecoming, 1)).toBe(winter);
    expect(albumAfter(chapters, winter, -1)).toBe(homecoming);
  });
});

describe('an Album stack', () => {
  const album = ['a', 'b', 'c', 'd'].map(photo);
  const ids = (photos: Photo[]) => photos.map((p) => p.id);

  it('starts with the first photo on top', () => {
    expect(ids(stacked(album, undefined))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('puts the Cover on top and keeps the rest in their own order', () => {
    expect(ids(stacked(album, 'c'))).toEqual(['c', 'a', 'b', 'd']);
  });
});
