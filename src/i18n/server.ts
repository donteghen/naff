import { cookies } from "next/headers";
import { LANGUAGES, type Language } from "@/lib/constants";
import { translate, type MessageKey } from "./index";

export const LANGUAGE_COOKIE = "lang";

/** The visitor's chosen language. French by default. */
export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LANGUAGE_COOKIE)?.value;
  if (chosen && (LANGUAGES as readonly string[]).includes(chosen)) return chosen as Language;
  return "fr";
}

export async function getTranslator() {
  const language = await getLanguage();
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values);
  const tx = (key: string, values?: Record<string, string | number>) => translate(language, key, values);
  return { t, tx, language };
}
