import type { ZodError } from "zod";
import { debugLog } from "./debug";

/**
 * An expected error that is safe to show to the user.
 * `message` is a translation key, e.g. "errors.forbidden".
 */
export class AppError extends Error {
  values?: Record<string, string | number>;
  constructor(message: string, values?: Record<string, string | number>) {
    super(message);
    this.name = "AppError";
    this.values = values;
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; values?: Record<string, string | number>; fields?: Record<string, string> };

/** Field name -> translation key, from a failed Zod validation. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fields[key]) fields[key] = issue.message.startsWith("errors.") ? issue.message : "errors.invalid";
  }
  return fields;
}

/** Invalid form input. Carries one translation key per invalid field. */
export class ValidationError extends AppError {
  fields: Record<string, string>;
  constructor(errorOrFields: ZodError | Record<string, string>) {
    super("errors.checkForm");
    this.fields = errorOrFields instanceof Error ? zodFieldErrors(errorOrFields as ZodError) : errorOrFields;
  }
}

/**
 * Runs a server action body and turns errors into a result the form can display.
 * Unexpected errors are logged and hidden behind a generic message.
 * `name` and `input` are only used for the debug log (DEBUG_LOG=true).
 */
export async function runAction<T>(name: string, input: unknown, body: () => Promise<T>): Promise<ActionResult<T>> {
  const startedAt = Date.now();
  const result = await runBody(body);
  debugLog("action", name, input, result, startedAt);
  return result;
}

async function runBody<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message, fields: error.fields };
    if (error instanceof AppError) return { ok: false, error: error.message, values: error.values };
    // Next.js uses thrown errors for redirect() and notFound(); let them through.
    if (error instanceof Error && "digest" in error && String(error.digest).startsWith("NEXT_")) throw error;
    console.error(error);
    return { ok: false, error: "errors.unexpected" };
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}
