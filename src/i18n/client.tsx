"use client";

import { createContext, useContext } from "react";
import type { Language } from "@/lib/constants";
import { translate, type MessageKey } from "./index";

const LanguageContext = createContext<Language>("fr");

export function I18nProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const language = useContext(LanguageContext);
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values);
  const tx = (key: string, values?: Record<string, string | number>) => translate(language, key, values);
  return { t, tx, language };
}
