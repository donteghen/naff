import { I18nProvider } from "@/i18n/client";
import { getLanguage } from "@/i18n/server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();
  return (
    <I18nProvider language={language}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-mist md:my-6 md:min-h-[calc(100dvh-48px)] md:rounded-[32px] md:shadow-[var(--shadow-float)]">{children}</div>
    </I18nProvider>
  );
}
