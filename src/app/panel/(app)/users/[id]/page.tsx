import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderRow } from "@/components/panel/OrderRow";
import { UserManage } from "@/components/panel/UserManage";
import { IconBack } from "@/components/Icons";
import { Card, Chip, EmptyState, PageTitle, SectionLabel } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { load } from "@/server/debug";
import { searchOrders } from "@/server/services/order-queries";
import { getUser } from "@/server/services/people";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, language } = await getTranslator();
  const user = await getUser(id);
  if (!user) notFound();
  const orders = await load("panel.userOrders", { id }, () => searchOrders({ userId: id }));
  return (
    <>
      <Link href="/users" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-muted"><IconBack size={16} />{t("nav.users")}</Link>
      <PageTitle
        title={user.name}
        subtitle={<span>{formatPhone(user.phone)} · {user.email} · {t("people.lastSeen")}: {user.lastSeenAt ? formatDateTime(user.lastSeenAt, language) : "—"}</span>}
        actions={<Chip tone={user.active ? "green" : "grey"}>{user.active ? t("people.active") : t("people.inactive")}</Chip>}
      />
      <UserManage user={{ id, name: user.name, phone: formatPhone(user.phone), email: user.email, active: user.active }} />
      <Card className="overflow-hidden p-0">
        <div className="p-4"><SectionLabel>{t("users.ordersTitle", { count: orders.total })}</SectionLabel></div>
        {orders.orders.length === 0 ? <EmptyState>{t("orders.none")}</EmptyState> : orders.orders.map((order) => <OrderRow key={order.id} order={order} href={`/orders/${order.id}`} />)}
      </Card>
    </>
  );
}
