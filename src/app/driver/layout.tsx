import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/client";
import { getLanguage } from "@/i18n/server";

export const metadata: Metadata = { title: "NAFF · Driver", manifest: "/driver.webmanifest", robots: { index: false, follow: false } };

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();
  return (
    <I18nProvider language={language}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col bg-mist md:shadow-[var(--shadow-float)]">{children}</div>
    </I18nProvider>
  );
}
