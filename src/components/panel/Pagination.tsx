import { getTranslator } from "@/i18n/server";
import { PendingLink } from "./Pending";

/** Previous / next links that keep the current filters. */
export async function Pagination({ page, pages, total, params, basePath }: { page: number; pages: number; total: number; params: Record<string, string | undefined>; basePath: string }) {
  const { t } = await getTranslator();
  const link = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  };
  return (
    <div className="flex items-center justify-between gap-3 p-3 text-sm">
      <span className="text-muted">{t("common.results", { count: total })}</span>
      <div className="flex items-center gap-2">
        {page > 1 && <PendingLink href={link(page - 1)} className="min-h-10 rounded-xl bg-cloud px-3 py-2 font-bold">‹ {t("common.previous")}</PendingLink>}
        <span className="font-bold">{page} / {pages}</span>
        {page < pages && <PendingLink href={link(page + 1)} className="min-h-10 rounded-xl bg-cloud px-3 py-2 font-bold">{t("common.next")} ›</PendingLink>}
      </div>
    </div>
  );
}
