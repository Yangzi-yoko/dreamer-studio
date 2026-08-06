import { formatDate, isHoliday, isWeekend, parseDate } from './date.utils';

describe('date.utils', () => {
  it('formats and parses YYYY-MM-DD', () => {
    const d = parseDate('2026-08-06');
    expect(formatDate(d)).toBe('2026-08-06');
  });
  it('detects weekend', () => {
    expect(isWeekend(parseDate('2026-08-08'))).toBe(true); // Saturday
    expect(isWeekend(parseDate('2026-08-06'))).toBe(false); // Thursday
  });
  it('detects national holiday', () => {
    expect(isHoliday(parseDate('2026-10-01'))).toBe(true); // National Day
    expect(isHoliday(parseDate('2026-08-06'))).toBe(false);
  });
});
