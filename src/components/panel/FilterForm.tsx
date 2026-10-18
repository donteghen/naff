import type { ReactNode } from "react";
import { getTranslator } from "@/i18n/server";
import { buttonClass } from "../ui";

/** Plain GET form: filters live in the URL, so they can be bookmarked and shared. */
export async function FilterForm({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  const { t } = await getTranslator();
  return (
    <form method="get" className="grid grid-cols-1 gap-3 rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
        <a href={resetHref} className={buttonClass("secondary", "md")}>{t("common.reset")}</a>
        <button type="submit" className={buttonClass("primary", "md")}>{t("common.apply")}</button>
      </div>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-extrabold text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}
