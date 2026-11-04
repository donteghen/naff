import { FilterField, FilterForm } from "@/components/panel/FilterForm";
import { Pagination } from "@/components/panel/Pagination";
import { Cell, Row, RowLink, Table } from "@/components/panel/Table";
import { Card, Chip, EmptyState, PageTitle, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { requireAdminPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { listUsers } from "@/server/services/people";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireAdminPage();
  const { t, language } = await getTranslator();
  const params = await searchParams;
  const result = await load("panel.users", params, () => listUsers({ q: params.q, status: params.status, page: Number(params.page) || 1 }));
  return (
    <>
      <PageTitle title={t("nav.users")} subtitle={t("users.intro")} />
      <FilterForm resetHref="/users">
        <FilterField label={t("common.search")}><input name="q" defaultValue={params.q} className={inputClass()} placeholder={t("users.searchHint")} /></FilterField>
        <FilterField label={t("orders.status")}>
          <select name="status" defaultValue={params.status ?? ""} className={inputClass()}>
            <option value="">{t("common.all")}</option>
            <option value="active">{t("people.active")}</option>
            <option value="inactive">{t("people.inactive")}</option>
          </select>
        </FilterField>
      </FilterForm>
      <Card className="overflow-hidden p-0">
        {result.users.length === 0 ? (
          <EmptyState>{t("users.none")}</EmptyState>
        ) : (
          <Table
            columns={[
              { label: t("form.name") },
              { label: t("auth.phone"), className: "hidden md:table-cell" },
              { label: t("site.email"), className: "hidden lg:table-cell" },
              { label: t("table.orders"), className: "hidden sm:table-cell text-right" },
              { label: t("table.joined"), className: "hidden lg:table-cell" },
              { label: t("orders.status"), className: "text-right" },
            ]}
          >
            {result.users.map((user) => (
              <Row key={user.id}>
                <Cell>
                  <RowLink href={`/users/${user.id}`}>{user.name}</RowLink>
                  <p className="truncate text-xs text-muted md:hidden">{formatPhone(user.phone)}</p>
                </Cell>
                <Cell className="hidden whitespace-nowrap tabular-nums md:table-cell">{formatPhone(user.phone)}</Cell>
                <Cell className="hidden max-w-[240px] truncate lg:table-cell">{user.email}</Cell>
                <Cell className="hidden text-right tabular-nums sm:table-cell">{user.orders}</Cell>
                <Cell className="hidden whitespace-nowrap lg:table-cell">{formatDate(user.createdAt, language)}</Cell>
                <Cell className="text-right"><Chip tone={user.active ? "green" : "grey"}>{user.active ? t("people.active") : t("people.inactive")}</Chip></Cell>
              </Row>
            ))}
          </Table>
        )}
        <Pagination page={result.page} pages={result.pages} total={result.total} params={{ q: params.q, status: params.status }} basePath="/users" />
      </Card>
    </>
  );
}
