/** The season is the real ISO week the app is running in — nothing is hardcoded. */
export function currentSeason(now = new Date()) {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day, 0, 0, 0),
  );
  const end = new Date(start.getTime() + 7 * 86400000);

  const target = new Date(start);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstMonday = new Date(firstThursday);
  firstMonday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7));
  const week = Math.floor((target.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;

  return { week, year: start.getUTCFullYear(), startsAt: start.toISOString(), endsAt: end.toISOString() };
}
