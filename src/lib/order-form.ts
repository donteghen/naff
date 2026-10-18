// Request form state shared by the customer wizard and the admin quick order.
// Which options are shown depends on earlier answers; the server checks the same rules again.

import type { FeeTiming, IntercityMode, OrderType, ParcelCategory, ParcelSize, PaymentMethod } from "./constants";
import type { Place } from "./location";
import type { OrderInput } from "./schemas";

export type SaleChoice = "no" | "already_paid" | "receiver_pays";

export type OrderDraft = {
  type: OrderType | null;
  intercityMode: IntercityMode | null;
  originCityId: string;
  destinationCityId: string;
  sale: SaleChoice | null;
  goodsAmount: string;
  feeTiming: FeeTiming | null;
  feeMethod: PaymentMethod | null;
  size: ParcelSize | null;
  category: ParcelCategory | null;
  contents: string;
  itemCount: string;
  estimatedValue: string;
  declarationAccepted: boolean;
  pickup: Place;
  dropoff: Place;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
};

export function emptyDraft(defaults: { originCityId?: string; senderName?: string; senderPhone?: string } = {}): OrderDraft {
  return {
    type: null,
    intercityMode: null,
    originCityId: defaults.originCityId ?? "",
    destinationCityId: "",
    sale: null,
    goodsAmount: "",
    feeTiming: null,
    feeMethod: null,
    size: null,
    category: null,
    contents: "",
    itemCount: "1",
    estimatedValue: "",
    declarationAccepted: false,
    pickup: { text: "" },
    dropoff: { text: "" },
    senderName: defaults.senderName ?? "",
    senderPhone: defaults.senderPhone ?? "",
    receiverName: "",
    receiverPhone: "",
  };
}

/** Delivery fee moments allowed for this type of order. */
export function feeTimingOptions(type: OrderType | null): FeeTiming[] {
  return type === "intercity" ? ["request", "pickup"] : ["request", "pickup", "delivery"];
}

/** Payment methods allowed for a moment: at request time only mobile money. */
export function methodOptions(timing: FeeTiming | null): PaymentMethod[] {
  return timing === "request" ? ["mtn_momo", "orange_money"] : ["cash", "mtn_momo", "orange_money"];
}

/** "Receiver pays on delivery" exists only for local orders. */
export function saleOptions(type: OrderType | null): SaleChoice[] {
  return type === "intercity" ? ["no", "already_paid"] : ["no", "already_paid", "receiver_pays"];
}

/** Clears answers that are no longer allowed after an earlier answer changed. */
export function cleanDraft(draft: OrderDraft): OrderDraft {
  const next = { ...draft };
  if (next.type === "local") {
    next.intercityMode = null;
    next.destinationCityId = next.originCityId;
  }
  if (next.sale && !saleOptions(next.type).includes(next.sale)) next.sale = null;
  if (next.feeTiming && !feeTimingOptions(next.type).includes(next.feeTiming)) next.feeTiming = null;
  if (next.feeMethod && !methodOptions(next.feeTiming).includes(next.feeMethod)) next.feeMethod = null;
  return next;
}

function toNumber(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function draftToInput(draft: OrderDraft): OrderInput {
  const isSale = draft.sale === "already_paid" || draft.sale === "receiver_pays";
  return {
    type: draft.type ?? "local",
    intercityMode: draft.type === "intercity" ? draft.intercityMode : null,
    originCityId: draft.originCityId,
    destinationCityId: draft.type === "local" ? draft.originCityId : draft.destinationCityId,
    isSale,
    goodsStatus: isSale ? (draft.sale as "already_paid" | "receiver_pays") : null,
    goodsAmount: isSale ? toNumber(draft.goodsAmount) : 0,
    feeTiming: draft.feeTiming ?? "pickup",
    feeMethod: draft.feeMethod ?? "cash",
    size: draft.size ?? "small",
    category: draft.category ?? "other",
    contents: draft.contents,
    itemCount: toNumber(draft.itemCount) || 1,
    estimatedValue: draft.estimatedValue ? toNumber(draft.estimatedValue) : null,
    declarationAccepted: draft.declarationAccepted as true,
    pickup: { text: draft.pickup.text, lat: draft.pickup.lat ?? null, lng: draft.pickup.lng ?? null },
    dropoff: { text: draft.dropoff.text, lat: draft.dropoff.lat ?? null, lng: draft.dropoff.lng ?? null },
    sender: { name: draft.senderName, phone: draft.senderPhone },
    receiver: { name: draft.receiverName, phone: draft.receiverPhone },
  };
}
