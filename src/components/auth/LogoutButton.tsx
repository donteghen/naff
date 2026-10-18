"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import type { ActionResult } from "@/server/errors";
import { useAction } from "../use-action";
import { IconLogout } from "../Icons";

export function LogoutButton({ action, afterLogout, className = "", iconOnly = false }: { action: () => Promise<ActionResult<void>>; afterLogout: string; className?: string; iconOnly?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const { run, pending } = useAction();
  return (
    <button type="button" aria-label={t("auth.logout")} title={iconOnly ? t("auth.logout") : undefined} disabled={pending} onClick={() => run("logout", action, () => router.push(afterLogout))} className={`inline-flex min-h-11 items-center justify-center gap-2 font-bold ${className}`}>
      <IconLogout size={18} />
      {!iconOnly && t("auth.logout")}
    </button>
  );
}
