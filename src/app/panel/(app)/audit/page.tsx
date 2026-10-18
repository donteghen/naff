import { FilterField, FilterForm } from "@/components/panel/FilterForm";
import { Pagination } from "@/components/panel/Pagination";
import { Card, EmptyState, PageTitle, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { load } from "@/server/debug";
import { listAudit } from "@/server/services/log-queries";

export const dynamic = "force-dynamic";

type Params = { from?: string; to?: string; actorType?: string; actor?: string; action?: string; target?: string; page?: string };

/** Short readable version of an audit entry's details (old → new values). */
function auditDetails(details: Record<string, unknown>): string {
  const old = details.old;
  const next = details.new;
  if (old !== undefined && next !== undefined) {
    if (typeof old !== "object" || typeof next !== "object") return `${String(old)} → ${String(next)}`;
    const changes: string[] = [];
    const oldRecord = (old ?? {}) as Record<string, unknown>;
    const newRecord = (next ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(newRecord)) {
      const before = JSON.stringify(oldRecord[key]);
      const after = JSON.stringify(newRecord[key]);
      if (before !== after) changes.push(`${key}: ${before ?? "—"} → ${after}`);
    }
    return changes.join(" · ");
  }
  return Object.entries(details).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join(" · ");
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { t, tx, language } = await getTranslator();
  const params = await searchParams;
  const result = await load("panel.audit", params, () => listAudit({ ...params, page: Number(params.page) || 1 }));
  const { page: _page, ...filters } = params;
  void _page;
  return (
    <>
      <PageTitle title={t("nav.audit")} subtitle={t("logs.auditIntro")} />
      <FilterForm resetHref="/audit">
        <FilterField label={t("common.from")}><input type="date" name="from" defaultValue={params.from} className={inputClass()} /></FilterField>
        <FilterField label={t("common.to")}><input type="date" name="to" defaultValue={params.to} className={inputClass()} /></FilterField>
        <FilterField label={t("logs.admin")}><input name="actor" defaultValue={params.actor} className={inputClass()} /></FilterField>
        <FilterField label={t("logs.action")}>
          <select name="action" defaultValue={params.action ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {result.actions.map((action) => <option key={action} value={action}>{tx(`audit.${action}`)}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("logs.targetType")}>
          <select name="actorType" defaultValue={params.actorType ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {result.targetTypes.map((type) => <option key={type} value={type}>{tx(`target.${type}`)}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("logs.target")}><input name="target" defaultValue={params.target} className={inputClass()} /></FilterField>
      </FilterForm>
      <Card className="overflow-x-auto p-0">
        {result.rows.length === 0 ? (
          <EmptyState>{t("logs.none")}</EmptyState>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-mist text-xs text-muted uppercase">
              <tr><th className="px-4 py-3">{t("logs.when")}</th><th className="px-4 py-3">{t("logs.admin")}</th><th className="px-4 py-3">{t("logs.action")}</th><th className="px-4 py-3">{t("logs.target")}</th><th className="px-4 py-3">{t("logs.details")}</th></tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDateTime(row.at, language)}</td>
                  <td className="px-4 py-3">{row.adminName}</td>
                  <td className="px-4 py-3 font-bold">{tx(`audit.${row.action}`)}</td>
                  <td className="px-4 py-3">{row.targetName || "—"} <span className="text-xs text-muted">({tx(`target.${row.targetType}`)})</span></td>
                  <td className="max-w-[360px] px-4 py-3 break-words">{auditDetails(row.details) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={result.page} pages={result.pages} total={result.total} params={filters} basePath="/audit" />
      </Card>
    </>
  );
}
