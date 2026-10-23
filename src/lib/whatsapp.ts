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

/** wa.me link: opens the WhatsApp app on phones, and offers app or web on computers. No phone = choose a contact. */
export function waMeLink(phone: string | null, text: string): string {
  const base = phone ? `https://wa.me/${internationalPhone(phone)}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

function mapLink(place: { lat: number | null; lng: number | null }) {
  return place.lat !== null && place.lng !== null ? `https://maps.google.com/?q=${place.lat},${place.lng}` : "";
}

export type JobMessageInput = {
  number: string;
  role: "origin" | "destination";
  type: "local" | "intercity";
  intercityMode: "to_address" | "collect_at_agency" | null;
  route: string;
  parcel: string;
  pickupTime: string;
  sender: { name: string; phone: string };
  receiver: { name: string; phone: string };
  pickup: { text: string; lat: number | null; lng: number | null };
  dropoff: { text: string; lat: number | null; lng: number | null };
  registeredUnder: { name: string; phone: string } | null;
  handover: { agencyName: string; vehicleNumber: string; eta: string } | null;
  collectAtPickup: string;
  collectAtDelivery: string;
  jobLink: string;
};

/** "Send job details" to the assigned driver (never the delivery code). Phones are already formatted. */
export function jobDetailsMessage(tx: Tx, job: JobMessageInput) {
  const lines = [tx("wa.job.title", { number: job.number, route: job.route }), tx("wa.job.parcel", { parcel: job.parcel })];
  if (job.role === "origin") {
    if (job.pickupTime) lines.push(tx("wa.job.pickupTime", { time: job.pickupTime }));
    lines.push(tx("wa.job.pickup", { address: job.pickup.text }));
    const pickupMap = mapLink(job.pickup);
    if (pickupMap) lines.push(pickupMap);
    lines.push(tx("wa.job.sender", { name: job.sender.name, phone: job.sender.phone }));
    if (job.collectAtPickup) lines.push(tx("wa.job.collectAtPickup", { amount: job.collectAtPickup }));
    if (job.type === "intercity") {
      lines.push(job.registeredUnder ? tx("wa.job.registerUnder", { name: job.registeredUnder.name, phone: job.registeredUnder.phone }) : tx("wa.job.registerUnderLater"));
    } else {
      lines.push(tx("wa.job.dropoff", { address: job.dropoff.text }));
      lines.push(tx("wa.job.receiver", { name: job.receiver.name, phone: job.receiver.phone }));
      if (job.collectAtDelivery) lines.push(tx("wa.job.collectAtDelivery", { amount: job.collectAtDelivery }));
    }
  } else {
    lines.push(job.handover?.agencyName ? tx("wa.job.collectAt", { agency: job.handover.agencyName, vehicle: job.handover.vehicleNumber, eta: job.handover.eta }) : tx("wa.job.collectLater"));
    lines.push(tx("wa.job.dropoff", { address: job.dropoff.text }));
    const dropMap = mapLink(job.dropoff);
    if (dropMap) lines.push(dropMap);
    lines.push(tx("wa.job.receiver", { name: job.receiver.name, phone: job.receiver.phone }));
  }
  lines.push(tx("wa.job.link", { link: job.jobLink }));
  return lines.join("\n");
}

/** Delivery code to the receiver, only at the sender's request (SPEC §6.5). */
export function codeForReceiverMessage(tx: Tx, order: { number: string; code: string; link: string }) {
  return tx("wa.codeReceiver", order);
}

/** Driver → office: the parcel photo at the agency drop or collection. */
export function photoMessage(tx: Tx, input: { number: string; step: "drop" | "collect"; agency: string }) {
  return tx(`wa.photo.${input.step}`, { number: input.number, agency: input.agency });
}

/** Customer → office, right after sending a request. */
export function notifyNaffMessage(tx: Tx, input: { number: string; route: string; phone: string }) {
  return tx("wa.notifyNaff", input);
}

/** Customer → receiver: tracking link, and the code when it is shown. */
export function shareTrackingMessage(tx: Tx, input: { number: string; link: string; code: string | null }) {
  const lines = [tx("wa.share", { number: input.number, link: input.link })];
  if (input.code) lines.push(tx("wa.shareCode", { code: input.code }));
  return lines.join("\n");
}
