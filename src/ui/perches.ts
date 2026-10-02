export interface Point {
  x: number;
  y: number;
}

export interface Perch extends Point {
  /** Character index in the title, to keep butterflies off neighbouring letters. */
  index: number;
  line: number;
}

// Letters whose top is wide and round near the middle of the glyph. Ascenders, the forked
// tops of u, v, w, y and ligature candidates like Th would leave the feet in mid-air.
const ON_TOP = /[acemnorsxz]/;
const ON_LINE_END = /[acegmnopqrsxz]/;

/**
 * Where a butterfly can land on `title`: the top of the ink of each fitting letter on the
 * first line, where nothing sits above, and of the last letter of every line, which has
 * the ragged edge beside it. Points are relative to `frame`.
 */
export function measurePerches(title: HTMLElement, frame: HTMLElement): Perch[] {
  const text = title.firstChild;
  if (!(text instanceof Text)) return [];

  const style = getComputedStyle(title);
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return [];
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const ascent = ctx.measureText('x').fontBoundingBoxAscent;

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

  const perches: Perch[] = [];
  letters.forEach((l, k) => {
    const line = lineOf(l.rect);
    const next = letters[k + 1];
    const endsLine = !next || lineOf(next.rect) !== line;
    if (!((line === 0 && ON_TOP.test(l.char)) || (endsLine && ON_LINE_END.test(l.char)))) return;
    const ink = ctx.measureText(l.char);
    perches.push({
      index: l.index,
      line,
      x: l.rect.left - origin.left + (ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2,
      y: l.rect.top - origin.top + ascent - ink.actualBoundingBoxAscent,
    });
  });
  return perches;
}

const MIN_GAP = 44;

/** Whether `p` is clear of every perch in `taken`: not the next letter over, nor close by on the same line. */
export function isFree(p: Perch, taken: Perch[]) {
  return taken.every((t) => Math.abs(t.index - p.index) > 1 && (t.line !== p.line || Math.abs(t.x - p.x) >= MIN_GAP));
}
