export type CalendarDateParts = { year: number; month: number; day: number };

const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Numeric dates are day-first; an unambiguous month-first date is accepted too.
export function parsePastedDate(input: string): CalendarDateParts | null {
  let text = input.trim().replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  const iso = text.match(/^(\d{4}-\d{1,2}-\d{1,2})(?:T|\s+\d{1,2}:)/);
  if (iso) text = iso[1];
  const tokens = text.replace(/[,./\-]+/g, ' ').trim().split(/\s+/);
  let year: number, month: number, day: number;
  const namedMonth = tokens.findIndex((token) => /^[a-z]+$/i.test(token) && monthNames.includes(token.slice(0, 3).toLowerCase()));
  if (tokens.length === 3 && namedMonth >= 0) {
    month = monthNames.indexOf(tokens[namedMonth].slice(0, 3).toLowerCase()) + 1;
    const rest = tokens.filter((_, index) => index !== namedMonth);
    const yearIndex = rest.findIndex((token) => /^\d{4}$/.test(token));
    if (yearIndex < 0 || !/^\d{1,2}$/.test(rest[1 - yearIndex])) return null;
    year = Number(rest[yearIndex]); day = Number(rest[1 - yearIndex]);
  } else if (tokens.length === 3 && tokens.every((token) => /^\d+$/.test(token))) {
    if (tokens[0].length === 4) [year, month, day] = tokens.map(Number);
    else if (tokens[2].length === 4) {
      [day, month, year] = tokens.map(Number);
      if (month > 12 && day <= 12) [day, month] = [month, day];
    } else return null;
  } else if (/^\d{8}$/.test(text)) {
    return parsePastedDate(text.slice(0, 4) + '-' + text.slice(4, 6) + '-' + text.slice(6))
      ?? parsePastedDate(text.slice(0, 2) + '/' + text.slice(2, 4) + '/' + text.slice(4));
  } else return null;
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
  if (day > new Date(year, month, 0).getDate()) return null;
  return { year, month, day };
}
