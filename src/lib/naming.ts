const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayYearFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });

/** "Sketch Oct 24", then "Sketch Oct 24 (2)", "Sketch Oct 24 (3)", … */
export function nextBoardName(existing: readonly string[], now: Date): string {
  const base = `Sketch ${dayFormat.format(now)}`;
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Compact past-relative time for metadata: "just now", "2m ago", "3h ago", "yesterday", "4d ago", "Oct 24". */
export function formatRelative(timestamp: number, now: number): string {
  // Past-only: a timestamp slightly ahead of a stale `now` reads "just now", never "in 1m".
  const seconds = Math.min(0, Math.round((timestamp - now) / 1000));
  const abs = Math.abs(seconds);
  const sign = Math.sign(seconds) || 1;
  // Round the magnitude: Math.round(-1.5) is -1, which would read 90s ago as "1m ago".
  const inUnits = (unitSeconds: number) => sign * Math.round(abs / unitSeconds);
  if (abs < 45) return "just now";
  if (abs < 45 * 60) return relativeFormat.format(inUnits(60), "minute");
  if (abs < 22 * 3600) return relativeFormat.format(inUnits(3600), "hour");
  if (abs < 26 * 86400) return relativeFormat.format(inUnits(86400), "day");
  const date = new Date(timestamp);
  return date.getFullYear() === new Date(now).getFullYear() ? dayFormat.format(date) : dayYearFormat.format(date);
}
