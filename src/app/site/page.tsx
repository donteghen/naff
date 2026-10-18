import Link from "next/link";
import { cookies } from "next/headers";
import { CallUsButton } from "@/components/site/CallUsButton";
import { Maintenance } from "@/components/site/Maintenance";
import { SiteHeader } from "@/components/site/SiteHeader";
import { IconChevron, IconPlus } from "@/components/Icons";
import { ButtonLink, Card, SectionLabel, StatusChip } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { GUEST_COOKIE } from "@/lib/constants";
import { formatXAF, percent } from "@/lib/money";
import { isFinal } from "@/lib/order-steps";
import { getCurrentUser } from "@/server/auth/current";
import { load } from "@/server/debug";
import { getGuestOrder, listUserOrders } from "@/server/services/order-queries";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

function greetingKey() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Douala", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hour < 12) return "site.goodMorning";
  if (hour < 18) return "site.goodAfternoon";
  return "site.goodEvening";
}

export default async function HomePage() {
  const settings = await getSettings();
  if (settings.operationalStatus === "maintenance") return <Maintenance />;
  const { t, tx } = await getTranslator();
  const user = await getCurrentUser();
  const orders = user ? await load("site.home", { userId: String(user._id) }, () => listUserOrders(user._id)) : [];
  const active = orders.find((order) => !isFinal(order.status));
  const recent = orders.filter((order) => order !== active).slice(0, 3);

  // Guests: the latest request made on this device.
  let guestOrder = null;
  if (!user) {
    const token = (await cookies()).get(GUEST_COOKIE)?.value?.split(".")[0];
    if (token) {
      const found = await getGuestOrder(token, { reveal: false });
      if (found && !isFinal(found.view.status)) guestOrder = { token, view: found.view };
    }
  }

  const current = active ? { href: `/orders/${active.number}`, view: active } : guestOrder ? { href: `/o/${guestOrder.token}`, view: guestOrder.view } : null;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-5 px-5 pt-3 pb-8">
        <div>
          {user && <p className="font-bold text-muted">{t(greetingKey())}, {user.name.split(" ")[0]}</p>}
          <h1 className="mt-1 text-[28px] leading-tight font-extrabold">{t("site.heroTitle")}</h1>
        </div>
        <ButtonLink href="/request" variant="action" className="w-full">
          <IconPlus size={20} />
          {t("site.newDelivery")}
        </ButtonLink>

        {current && (
          <Link href={current.href} className="press flex items-center gap-3 rounded-[18px] bg-navy p-4 text-white">
            <div className="flex-1">
              <p className="text-sm font-bold text-side-text">{t("site.activeDelivery")} · NF-{current.view.number}</p>
              <div className="my-2"><StatusChip status={current.view.status} label={tx(`status.${current.view.status}`)} /></div>
              <p className="text-sm">{current.view.originCityName}{current.view.type === "intercity" ? ` → ${current.view.destinationCityName}` : ""}</p>
            </div>
            <IconChevron className="text-side-text" />
          </Link>
        )}

        {recent.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SectionLabel>{t("site.recent")}</SectionLabel>
              <Link href="/orders" className="text-sm font-bold text-indigo">{t("site.allOrders")}</Link>
            </div>
            {recent.map((order) => (
              <Link key={order.id} href={`/orders/${order.number}`} className="press flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="flex-1">
                  <p className="font-extrabold">{order.pickupText.split(",")[0]} → {order.dropoffText.split(",")[0]}</p>
                  <p className="text-sm text-muted">{tx(`status.${order.status}`)}{order.netPrice ? ` · ${formatXAF(order.netPrice)}` : ""}</p>
                </div>
                <IconChevron className="text-faint" />
              </Link>
            ))}
          </section>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-4">
          {!user && settings.discountRate > 0 && (
            <Link href="/account/register">
              <Card className="bg-amber-soft text-sm font-bold">{t("site.createAccountBanner", { rate: percent(settings.discountRate) })}</Card>
            </Link>
          )}
          <CallUsButton />
        </div>
      </main>
    </>
  );
}
