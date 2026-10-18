import { config } from "./config";

const SECRET_KEYS = ["pin", "newPin", "currentPin", "code", "confirmPin", "tempPin"];

/** Replaces PINs and codes with "****" before logging. */
function mask(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const copy: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      copy[key] = SECRET_KEYS.includes(key) ? "****" : mask(inner);
    }
    return copy;
  }
  return value;
}

function short(value: unknown): string {
  const text = JSON.stringify(mask(value)) ?? "undefined";
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

/** One terminal line per server action or page load when DEBUG_LOG=true. */
export function debugLog(kind: "action" | "load", name: string, input: unknown, result: unknown, startedAt: number) {
  if (!config.debugLog()) return;
  console.log(`[${kind}] ${name} ${short(input)} → ${short(result)} (${Date.now() - startedAt}ms)`);
}

/** Wraps a page data loader so it shows up in the debug log. */
export async function load<T>(name: string, input: unknown, body: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await body();
    debugLog("load", name, input, result, startedAt);
    return result;
  } catch (error) {
    debugLog("load", name, input, { error: error instanceof Error ? error.message : String(error) }, startedAt);
    throw error;
  }
}
