// All business logic runs in IST (UTC+05:30) regardless of server time zone.
export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const IST_OFFSET = 330 * MIN;

/** {y, m (1-12), d, hh, mm, dow (0=Sun), ymd:'YYYY-MM-DD', minOfDay} in IST */
export function ist(ts) {
  const d = new Date(Number(ts) + IST_OFFSET);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  const hh = d.getUTCHours(), mm = d.getUTCMinutes();
  const ymd = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { y, m, d: day, hh, mm, dow: d.getUTCDay(), ymd, minOfDay: hh * 60 + mm };
}

/** Epoch ms for an IST wall-clock time on a YYYY-MM-DD date. */
export function istAt(ymd, hh = 0, mm = 0) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET;
}

export function addDaysYmd(ymd, n) {
  return ist(istAt(ymd, 12) + n * DAY).ymd;
}
