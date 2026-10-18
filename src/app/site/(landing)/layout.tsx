import { I18nProvider } from "@/i18n/client";
import { getLanguage } from "@/i18n/server";

/** Full-width layout for the public landing page (campaign and shared links land here). */
export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();
  return <I18nProvider language={language}>{children}</I18nProvider>;
}
