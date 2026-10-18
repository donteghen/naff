import { notFound } from "next/navigation";
import { SenderOrder } from "@/components/site/SenderOrder";
import { SiteHeader } from "@/components/site/SiteHeader";
import { load } from "@/server/debug";
import { getGuestOrder } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

export default async function GuestOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await load("site.guestOrder", { token: `${token.slice(0, 6)}…` }, () => getGuestOrder(token));
  if (!found) notFound();
  return (
    <>
      <SiteHeader />
      <SenderOrder order={found.view} guest codeAlreadyShown={found.codeAlreadyShown} />
    </>
  );
}
