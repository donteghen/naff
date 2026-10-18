import Link from "next/link";
import { FilterField, FilterForm } from "@/components/panel/FilterForm";
import { Pagination } from "@/components/panel/Pagination";
import { IconChevron } from "@/components/Icons";
import { Card, Chip, EmptyState, PageTitle, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { load } from "@/server/debug";
import { listUsers } from "@/server/services/people";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { t, language } = await getTranslator();
  const params = await searchParams;
  const result = await load("panel.users", params, () => listUsers({ q: params.q, page: Number(params.page) || 1 }));
  return (
    <>
      <PageTitle title={t("nav.users")} subtitle={t("users.intro")} />
      <FilterForm resetHref="/users">
        <FilterField label={t("common.search")}><input name="q" defaultValue={params.q} className={inputClass()} placeholder={t("users.searchHint")} /></FilterField>
      </FilterForm>
      <Card className="overflow-hidden p-0">
        {result.users.length === 0 && <EmptyState>{t("users.none")}</EmptyState>}
        {result.users.map((user) => (
          <Link key={user.id} href={`/users/${user.id}`} className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-3 hover:bg-mist">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted">{formatPhone(user.phone)} · {user.email} · {t("users.since", { date: formatDate(user.createdAt, language) })}</p>
            </div>
            <span className="hidden text-sm text-muted sm:inline">{t("users.orders", { count: user.orders })}</span>
            <Chip tone={user.active ? "green" : "grey"}>{user.active ? t("people.active") : t("people.inactive")}</Chip>
            <IconChevron className="text-faint" />
          </Link>
        ))}
        <Pagination page={result.page} pages={result.pages} total={result.total} params={{ q: params.q }} basePath="/users" />
      </Card>
    </>
  );
}
