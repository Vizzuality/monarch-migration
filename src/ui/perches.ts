export interface Point {
  x: number;
  y: number;
}

export interface Perch extends Point {
  line: number;
}

// The forked tops of u, v, w, y and the slants of capitals leave nowhere level to stand.
const LANDS = /[abcdehiklmnorstxzEFZ]/;
// Discretionary ligatures are on, so these pairs are drawn as one glyph whose top the
// canvas, which draws letters one at a time, can't see.
const LIGATURES = /Th|f[filt]|[sc]t/g;
// A letter on a lower line has the line above hanging right over it; only a descender
// reaches down far enough to leave no room.
const DESCENDS = /[gjpqy]/;

/**
 * Where a butterfly can land on `title`: level spots on the top of the ink of each fitting
 * letter that has room above it. Points are relative to `frame`.
 */
export function measurePerches(title: HTMLElement, frame: HTMLElement): Perch[] {
  const text = title.firstChild;
  if (!(text instanceof Text)) return [];

  const style = getComputedStyle(title);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.font = font;
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = ctx.measureText('x');

  const origin = frame.getBoundingClientRect();
  const range = document.createRange();
  const letters: { index: number; char: string; rect: DOMRect }[] = [];
  const value = text.data;
  for (let i = 0; i < value.length; i++) {
    if (!value[i].trim()) continue;
    range.setStart(text, i);
    range.setEnd(text, i + 1);
    const rect = range.getClientRects()[0];
    if (rect) letters.push({ index: i, char: value[i], rect });
  }

  const tops = [...new Set(letters.map((l) => Math.round(l.rect.top)))].sort((a, b) => a - b);
  const lineOf = (rect: DOMRect) => tops.indexOf(Math.round(rect.top));

  const ligated = new Set<number>();
  for (const m of value.matchAll(LIGATURES)) for (let i = 0; i < m[0].length; i++) ligated.add(m.index + i);

  const perches: Perch[] = [];
  letters.forEach((l) => {
    if (!LANDS.test(l.char) || ligated.has(l.index)) return;
    const line = lineOf(l.rect);
    const top = inkTop(canvas, font, l.char, l.rect.width, ascent, descent);
    const level = top.flatMap((_, c) => (isLevel(top, c) ? [c] : []));
    if (!level.length) return;
    const first = level[0];
    const last = level[level.length - 1];
    // A wide letter takes a butterfly at each end of its top, a narrow one in the middle.
    const spots = last - first >= MIN_GAP ? [first, last] : [level[Math.floor(level.length / 2)]];
    for (const c of spots) perches.push({ line, x: l.rect.left - origin.left + c - PAD, y: l.rect.top - origin.top + top[c] });
  });
  const hangsOver = (p: Perch) =>
    letters.some((l) => lineOf(l.rect) === p.line - 1 && DESCENDS.test(l.char) && l.rect.left - origin.left <= p.x && l.rect.right - origin.left >= p.x);
  // Spots too close to their neighbour are dropped, so every one left can be taken at once.
  const spaced: Perch[] = [];
  for (const p of perches) if (!hangsOver(p) && isFree(p, spaced)) spaced.push(p);
  return spaced;
}

/** Perches for `text` as it will sit as the title in `frame`, before it is on screen. */
export function measureTitle(text: string, frame: HTMLElement): Perch[] {
  const probe = document.createElement('h1');
  probe.textContent = text;
  probe.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; visibility: hidden';
  frame.prepend(probe);
  try {
    return measurePerches(probe, frame);
  } finally {
    probe.remove();
  }
}

const PAD = 4;
const FOOTING = 3;

/**
 * Column by column, how far below the top of the line the ink of `char` begins, NaN where
 * there is none. Columns are offset by PAD so a glyph overhanging its box is still read.
 */
function inkTop(canvas: HTMLCanvasElement, font: string, char: string, advance: number, ascent: number, descent: number) {
  canvas.width = Math.ceil(advance) + 2 * PAD;
  canvas.height = Math.ceil(ascent + descent);
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.fillText(char, PAD, ascent);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return Array.from({ length: width }, (_, c) => {
    for (let r = 0; r < height; r++) if (data[(r * width + c) * 4 + 3] > 128) return r;
    return NaN;
  });
}

/** Whether the top is level enough around column `c` for a butterfly to stand on. */
function isLevel(top: number[], c: number) {
  return Math.abs(top[c - FOOTING] - top[c]) <= 2 && Math.abs(top[c + FOOTING] - top[c]) <= 2;
}

const MIN_GAP = 18;

/** Whether `p` is clear of every perch in `taken`: on another line, or far enough along this one. */
export function isFree(p: Perch, taken: Perch[]) {
  return taken.every((t) => t.line !== p.line || Math.abs(t.x - p.x) >= MIN_GAP);
}
