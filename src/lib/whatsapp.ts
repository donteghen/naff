import { formatXAF } from "./money";
import { internationalPhone } from "./phone";

export type WhatsAppMode = "web" | "app";

/** Link that opens a WhatsApp chat with a prefilled message, in WhatsApp Web or the installed app. */
export function whatsappLink(phone: string, text: string, mode: WhatsAppMode): string {
  const number = internationalPhone(phone);
  const message = encodeURIComponent(text);
  if (mode === "app") return `whatsapp://send?phone=${number}&text=${message}`;
  return `https://web.whatsapp.com/send?phone=${number}&text=${message}`;
}

type Tx = (key: string, values?: Record<string, string | number>) => string;

export function priceMessage(tx: Tx, order: { number: string; netPrice: number; discountAmount: number }, momo: string) {
  const lines = [tx("wa.price", { number: order.number, price: formatXAF(order.netPrice) })];
  if (order.discountAmount > 0) lines.push(tx("wa.priceDiscount", { discount: formatXAF(order.discountAmount) }));
  if (momo) lines.push(tx("wa.momo", { accounts: momo }));
  return lines.join("\n");
}

export function trackingMessageForSender(tx: Tx, order: { number: string; link: string; code: string | null }) {
  const lines = [tx("wa.trackSender", { number: order.number, link: order.link })];
  if (order.code) lines.push(tx("wa.code", { code: order.code }));
  return lines.join("\n");
}

export function trackingMessageForReceiver(tx: Tx, order: { number: string; link: string }) {
  return tx("wa.trackReceiver", { number: order.number, link: order.link });
}
