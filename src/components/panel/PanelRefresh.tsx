"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/i18n/client";
import { IconRefresh } from "../Icons";

/** Top bar button: fetches the latest data for the current page without a full reload (keeps the alert sound on). */
export function PanelRefresh() {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label={t("common.refresh")}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-extrabold shadow-[var(--shadow-card)] disabled:opacity-70"
    >
      <IconRefresh size={16} className={pending ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{t("common.refresh")}</span>
    </button>
  );
}
