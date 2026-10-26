export const YEAR_DAYS = 365;

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Day-of-year where each month starts (non-leap year). */
export const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export const MONTH_LENGTHS = MONTH_STARTS.map((start, i) => (MONTH_STARTS[i + 1] ?? YEAR_DAYS) - start);

export function dateOf(day: number): { date: number; month: string } {
  const d = Math.floor(((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS);
  let m = 0;
  while (m < 11 && MONTH_STARTS[m + 1] <= d) m++;
  return { date: d - MONTH_STARTS[m] + 1, month: MONTH_NAMES[m] };
}

export interface Photo {
  /** Also seeds where the photo lands in its Album's stack. */
  id: string;
  src: string;
  thumb: string;
  title: string;
  description: string;
  /** What's in the picture, for screen readers. */
  alt: string;
  credit: string;
}

export interface Chapter {
  from: number;
  title: string;
  body: string;
  album?: Photo[];
}

/** The day halfway through the chapter at `index`, where its Album sits. */
export function chapterMiddle(chapters: Chapter[], index: number): number {
  const to = chapters[index + 1]?.from ?? YEAR_DAYS;
  return (chapters[index].from + to) / 2;
}

/** The Album `by` steps along the timeline from `chapter`'s, skipping Chapters without one and wrapping round the year. */
export function albumAfter(chapters: Chapter[], chapter: Chapter, by: number): Chapter {
  const withAlbum = chapters.filter((c) => c.album?.length);
  const at = withAlbum.indexOf(chapter);
  return withAlbum[(((at + by) % withAlbum.length) + withAlbum.length) % withAlbum.length];
}

/** An Album's photos as they lie in its stack: the Cover on top, the rest underneath in their own order. */
export function stacked(album: Photo[], cover: string | undefined): Photo[] {
  const top = album.find((p) => p.id === cover) ?? album[0];
  return [top, ...album.filter((p) => p !== top)];
}
