import { notFound } from "next/navigation";
import { SenderOrder } from "@/components/site/SenderOrder";
import { SiteHeader } from "@/components/site/SiteHeader";
import { requireUserPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { getUserOrder } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

export default async function UserOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUserPage(`/orders/${number}`);
  const order = await load("site.userOrder", { number }, () => getUserOrder(user._id, Number(number)));
  if (!order) notFound();
  return (
    <>
      <SiteHeader />
      <SenderOrder order={order} guest={false} />
    </>
  );
}
