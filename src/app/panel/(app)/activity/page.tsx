import Link from "next/link";
import { describeDetails } from "@/components/panel/order/ActivityList";
import { FilterField, FilterForm } from "@/components/panel/FilterForm";
import { Pagination } from "@/components/panel/Pagination";
import { Card, EmptyState, PageTitle, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { ACTOR_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { load } from "@/server/debug";
import { listActivity } from "@/server/services/log-queries";

export const dynamic = "force-dynamic";

type Params = { from?: string; to?: string; actorType?: string; actor?: string; action?: string; order?: string; page?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { t, tx, language } = await getTranslator();
  const params = await searchParams;
  const result = await load("panel.activity", params, () => listActivity({ ...params, page: Number(params.page) || 1 }));
  const { page: _page, ...filters } = params;
  void _page;
  return (
    <>
      <PageTitle title={t("nav.activity")} subtitle={t("logs.activityIntro")} />
      <FilterForm resetHref="/activity">
        <FilterField label={t("common.from")}><input type="date" name="from" defaultValue={params.from} className={inputClass()} /></FilterField>
        <FilterField label={t("common.to")}><input type="date" name="to" defaultValue={params.to} className={inputClass()} /></FilterField>
        <FilterField label={t("logs.actorType")}>
          <select name="actorType" defaultValue={params.actorType ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {ACTOR_TYPES.map((type) => <option key={type} value={type}>{tx(`actor.${type}`)}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("logs.actor")}><input name="actor" defaultValue={params.actor} className={inputClass()} placeholder={t("logs.actorHint")} /></FilterField>
        <FilterField label={t("logs.action")}>
          <select name="action" defaultValue={params.action ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {result.actions.map((action) => <option key={action} value={action}>{tx(`activity.${action}`)}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("logs.order")}><input name="order" defaultValue={params.order} className={inputClass()} placeholder="NF-1042" /></FilterField>
      </FilterForm>
      <Card className="overflow-x-auto p-0">
        {result.rows.length === 0 ? (
          <EmptyState>{t("logs.none")}</EmptyState>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-mist text-xs text-muted uppercase">
              <tr><th className="px-4 py-3">{t("logs.when")}</th><th className="px-4 py-3">{t("logs.order")}</th><th className="px-4 py-3">{t("logs.action")}</th><th className="px-4 py-3">{t("logs.actor")}</th><th className="px-4 py-3">{t("logs.details")}</th></tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDateTime(row.at, language)}</td>
                  <td className="px-4 py-3">{row.orderId ? <Link className="font-bold text-indigo" href={`/orders/${row.orderId}`}>NF-{row.orderNumber}</Link> : "—"}</td>
                  <td className="px-4 py-3 font-bold">
                    {tx(`activity.${row.action}`)}
                    {row.toStatus && <span className="block text-xs font-normal text-muted">{row.fromStatus ? `${tx(`status.${row.fromStatus}`)} → ` : ""}{tx(`status.${row.toStatus}`)}</span>}
                  </td>
                  <td className="px-4 py-3">{row.actorName || "—"} <span className="text-xs text-muted">({tx(`actor.${row.actorType}`)})</span>{row.onBehalfOfDriverName && <span className="block text-xs text-muted">{t("actions.onBehalf", { name: row.onBehalfOfDriverName })}</span>}</td>
                  <td className="px-4 py-3 break-words">{describeDetails(row.details, tx) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={result.page} pages={result.pages} total={result.total} params={filters} basePath="/activity" />
      </Card>
    </>
  );
}
