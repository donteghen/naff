import { AddDriverButton } from "@/components/panel/DriverManage";
import { FilterField, FilterForm } from "@/components/panel/FilterForm";
import { Cell, Row, RowLink, Table } from "@/components/panel/Table";
import { Avatar, Card, Chip, EmptyState, PageTitle, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatPhone } from "@/lib/phone";
import { requireAdminPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { driverState, listDriversWithJobs, type DriverState } from "@/server/services/order-queries";
import { listActiveCities } from "@/server/services/places";

export const dynamic = "force-dynamic";

const STATES: DriverState[] = ["available", "on_job", "offline", "suspended"];
const STATE_LABEL: Record<DriverState, string> = { available: "driver.available", on_job: "assign.onJob", offline: "driver.offline", suspended: "drivers.suspended" };
const STATE_TONE = { available: "green", on_job: "amber", offline: "grey", suspended: "red" } as const;

export default async function DriversPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; state?: string }> }) {
  await requireAdminPage();
  const { t, tx } = await getTranslator();
  const params = await searchParams;
  const cities = await listActiveCities();
  const drivers = await load("panel.drivers", params, () =>
    listDriversWithJobs({ includeInactive: true, cityIds: params.city ? [params.city] : undefined, q: params.q, state: params.state }),
  );
  return (
    <>
      <PageTitle title={t("nav.drivers")} subtitle={t("drivers.intro")} actions={<AddDriverButton cities={cities} />} />
      <FilterForm resetHref="/drivers">
        <FilterField label={t("common.search")}><input name="q" defaultValue={params.q} className={inputClass()} placeholder={t("drivers.searchHint")} /></FilterField>
        <FilterField label={t("orders.city")}>
          <select name="city" defaultValue={params.city ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("orders.status")}>
          <select name="state" defaultValue={params.state ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            {STATES.map((state) => <option key={state} value={state}>{tx(STATE_LABEL[state])}</option>)}
          </select>
        </FilterField>
      </FilterForm>
      <Card className="overflow-hidden p-0">
        {drivers.length === 0 ? (
          <EmptyState>{t("drivers.none")}</EmptyState>
        ) : (
          <Table
            columns={[
              { label: t("form.name") },
              { label: t("table.city"), className: "hidden md:table-cell" },
              { label: t("auth.phone"), className: "hidden lg:table-cell" },
              { label: t("table.currentJobs"), className: "hidden md:table-cell" },
              { label: t("orders.status"), className: "text-right" },
            ]}
          >
            {drivers.map((driver) => {
              const state = driverState(driver);
              return (
                <Row key={driver.id}>
                  <Cell>
                    <div className="flex items-center gap-3">
                      <Avatar name={driver.name} size={36} />
                      <div className="min-w-0">
                        <RowLink href={`/drivers/${driver.id}`}>{driver.name}</RowLink>
                        <p className="truncate text-xs text-muted lg:hidden">{formatPhone(driver.phone)}<span className="md:hidden"> · {driver.cityName}</span></p>
                      </div>
                    </div>
                  </Cell>
                  <Cell className="hidden md:table-cell">{driver.cityName}</Cell>
                  <Cell className="hidden whitespace-nowrap tabular-nums lg:table-cell">{formatPhone(driver.phone)}</Cell>
                  <Cell className="hidden max-w-[280px] md:table-cell">
                    {driver.currentJobs.length === 0 ? <span className="text-faint">—</span> : driver.currentJobs.map((job) => <p key={job.id} className="truncate">#{job.number} · {job.route}</p>)}
                  </Cell>
                  <Cell className="text-right"><Chip tone={STATE_TONE[state]}>{tx(STATE_LABEL[state])}</Chip></Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
