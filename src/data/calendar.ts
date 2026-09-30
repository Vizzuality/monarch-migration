export const YEAR_DAYS = 365;

export const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** Day-of-year where each month starts (non-leap year). */
export const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

export function formatDay(day: number) {
  const d = new Date(2025, 0, 1 + Math.floor(((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS));
  return dateFormat.format(d);
}

export interface Chapter {
  from: number;
  title: string;
  body: string;
}

export function chapterAt(chapters: Chapter[], day: number): Chapter {
  let current = chapters[0];
  for (const c of chapters) if (day >= c.from) current = c;
  return current;
}
