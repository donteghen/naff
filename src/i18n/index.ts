import type { Language } from "@/lib/constants";
import { en } from "./en";
import { fr } from "./fr";

// French is the reference dictionary: English must have exactly the same keys (checked by TypeScript in en.ts).
export type MessageKey = keyof typeof fr;
export type Dictionary = Record<MessageKey, string>;

const dictionaries: Record<Language, Dictionary> = { fr, en };

/** Translate a key, replacing {placeholders} with values. Unknown keys are returned as-is. */
export function translate(language: Language, key: string, values?: Record<string, string | number>): string {
  let text: string = dictionaries[language][key as MessageKey] ?? fr[key as MessageKey] ?? key;
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;
/** For keys built at runtime, e.g. `status.${order.status}` or an error key coming from the server. */
export type TranslateDynamic = (key: string, values?: Record<string, string | number>) => string;
