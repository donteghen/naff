// Douala is UTC+1 all year (no daylight saving), so date maths stays simple.
export const TIMEZONE = "Africa/Douala";
const DOUALA_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function localeTag(language: string) {
  return language === "fr" ? "fr-FR" : "en-GB";
}

/** "YYYY-MM-DD" for the given moment, in Douala time. */
export function dayKey(date: Date = new Date()): string {
  return new Date(date.getTime() + DOUALA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of a Douala day ("YYYY-MM-DD"), as a UTC date. */
export function startOfDay(key: string): Date {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() - DOUALA_OFFSET_MS);
}

/** Start (inclusive) and end (exclusive) of a range of Douala days, both "YYYY-MM-DD". */
export function dayRange(fromKey: string, toKey: string): { start: Date; end: Date } {
  return { start: startOfDay(fromKey), end: new Date(startOfDay(toKey).getTime() + DAY_MS) };
}

export function addDays(key: string, days: number): string {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** "2026-10-18T14:30" (Douala) for an <input type="datetime-local">. */
export function toLocalInput(date: Date): string {
  return new Date(date.getTime() + DOUALA_OFFSET_MS).toISOString().slice(0, 16);
}

/** Parses an <input type="datetime-local"> value as Douala time. */
export function fromLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(new Date(`${value}:00Z`).getTime() - DOUALA_OFFSET_MS);
}

export function formatTime(date: Date | string, language: string): string {
  return new Intl.DateTimeFormat(localeTag(language), { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function formatDateTime(date: Date | string, language: string): string {
  return new Intl.DateTimeFormat(localeTag(language), {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDate(date: Date | string, language: string): string {
  return new Intl.DateTimeFormat(localeTag(language), { timeZone: TIMEZONE, day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

/** "Today 16:30", or the date and time when it is another day. */
export function formatDayAndTime(date: Date | string, language: string, todayLabel: string): string {
  const value = new Date(date);
  if (dayKey(value) === dayKey()) return `${todayLabel} ${formatTime(value, language)}`;
  return formatDateTime(value, language);
}

/** Minutes between two dates, rounded. */
export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

/** "4 min", "5h 20", "2d 3h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${String(minutes % 60).padStart(2, "0")}`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
