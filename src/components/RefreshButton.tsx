"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/i18n/client";
import { IconRefresh } from "./Icons";

/** Pages are not live: this reloads the latest data. */
export function RefreshButton({ hint = true, className = "" }: { hint?: boolean; className?: string }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl bg-indigo-tint px-4 py-2 ${className}`}>
      {hint && <p className="text-xs font-bold text-indigo">{t("common.notLive")}</p>}
      <button type="button" onClick={() => startTransition(() => router.refresh())} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-navy">
        <IconRefresh size={16} className={pending ? "animate-spin" : ""} />
        {t("common.refresh")}
      </button>
    </div>
  );
}
