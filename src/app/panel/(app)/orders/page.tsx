import { FilterField, FilterForm } from "@/components/panel/FilterForm";
import { OrderRow } from "@/components/panel/OrderRow";
import { Pagination } from "@/components/panel/Pagination";
import { Card, EmptyState, PageTitle, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { ORDER_STATUSES } from "@/lib/constants";
import { load } from "@/server/debug";
import { searchOrders } from "@/server/services/order-queries";
import { listActiveCities } from "@/server/services/places";

export const dynamic = "force-dynamic";

type Params = { q?: string; status?: string; type?: string; cityId?: string; source?: string; from?: string; to?: string; issue?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { t, tx } = await getTranslator();
  const params = await searchParams;
  const result = await load("panel.orders", params, () => searchOrders({ ...params, issue: params.issue === "1", page: Number(params.page) || 1 }));
  const cities = await listActiveCities();
  const { page: _page, ...filters } = params;
  void _page;

  return (
    <>
      <PageTitle title={t("nav.orders")} />
      <FilterForm resetHref="/orders">
        <FilterField label={t("common.search")}><input name="q" defaultValue={params.q} className={inputClass()} placeholder={t("orders.searchHint")} /></FilterField>
        <FilterField label={t("orders.status")}>
          <select name="status" defaultValue={params.status ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{tx(`status.${status}`)}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("orders.type")}>
          <select name="type" defaultValue={params.type ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            <option value="local">{t("orders.local")}</option>
            <option value="intercity">{t("orders.intercity")}</option>
          </select>
        </FilterField>
        <FilterField label={t("orders.city")}>
          <select name="cityId" defaultValue={params.cityId ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("orders.source")}>
          <select name="source" defaultValue={params.source ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            <option value="web">{t("orders.web")}</option>
            <option value="admin">{t("orders.admin")}</option>
          </select>
        </FilterField>
        <FilterField label={t("common.from")}><input type="date" name="from" defaultValue={params.from} className={inputClass()} /></FilterField>
        <FilterField label={t("common.to")}><input type="date" name="to" defaultValue={params.to} className={inputClass()} /></FilterField>
        <label className="flex min-h-12 items-center gap-3 self-end font-bold">
          <input type="checkbox" name="issue" value="1" defaultChecked={params.issue === "1"} className="h-5 w-5 accent-[#D92D20]" />
          {t("orders.issuesOnly")}
        </label>
      </FilterForm>
      <Card className="overflow-hidden p-0">
        {result.orders.length === 0 ? <EmptyState>{t("orders.none")}</EmptyState> : result.orders.map((order) => <OrderRow key={order.id} order={order} href={`/orders/${order.id}`} />)}
        <Pagination page={result.page} pages={result.pages} total={result.total} params={filters} basePath="/orders" />
      </Card>
    </>
  );
}
