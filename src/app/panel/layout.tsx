import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/client";
import { getLanguage } from "@/i18n/server";

export const metadata: Metadata = { title: "NAFF · Panel" };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();
  return <I18nProvider language={language}>{children}</I18nProvider>;
}
