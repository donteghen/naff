"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

/** EN | FR switch. The choice is kept in a cookie for this host. */
export function LanguageSwitch({ onDark = false }: { onDark?: boolean }) {
  const { language } = useT();
  const router = useRouter();

  function choose(next: "fr" | "en") {
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const base = "min-h-8 min-w-9 rounded-lg px-2 text-xs font-extrabold";
  const active = onDark ? "bg-white text-navy" : "bg-navy text-white";
  const idle = onDark ? "text-side-text" : "text-muted";
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-xl p-0.5 ${onDark ? "bg-navy-soft" : "bg-cloud"}`} role="group" aria-label="Language">
      <button type="button" onClick={() => choose("en")} aria-pressed={language === "en"} className={`${base} ${language === "en" ? active : idle}`}>EN</button>
      <button type="button" onClick={() => choose("fr")} aria-pressed={language === "fr"} className={`${base} ${language === "fr" ? active : idle}`}>FR</button>
    </div>
  );
}
