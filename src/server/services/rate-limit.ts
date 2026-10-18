import { AppError } from "../errors";
import { RateLimit } from "../models/RateLimit";

// Fixed-window counters stored in MongoDB, so limits hold across all Vercel instances.

function windowKey(name: string, windowMinutes: number) {
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = Math.floor(Date.now() / windowMs);
  return { key: `${name}:${windowStart}`, expiresAt: new Date((windowStart + 1) * windowMs) };
}

/** Throws when `name` already reached `max` counted events in the current window. */
export async function assertNotBlocked(name: string, max: number, windowMinutes: number) {
  const { key } = windowKey(name, windowMinutes);
  const counter = await RateLimit.findOne({ key }).lean();
  if (counter && counter.count >= max) throw new AppError("errors.tooManyAttempts");
}

/** Counts one event (e.g. a failed login) for `name` in the current window. */
export async function countEvent(name: string, windowMinutes: number) {
  const { key, expiresAt } = windowKey(name, windowMinutes);
  await RateLimit.updateOne({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true });
}

/** Counts the event first, then throws when it goes over `max`. */
export async function consumeAttempt(name: string, max: number, windowMinutes: number) {
  const { key, expiresAt } = windowKey(name, windowMinutes);
  const counter = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, new: true },
  );
  if (counter.count > max) throw new AppError("errors.tooManyAttempts");
}
