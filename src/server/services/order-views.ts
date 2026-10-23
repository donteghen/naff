// Turns order documents into plain objects for each audience.
// Privacy rules live here: who may see the delivery code, the agency fee, phones and addresses.

import type { FeeTiming, Language, GoodsStatus, IntercityMode, OrderStatus, OrderType, ParcelCategory, ParcelSize, PaymentMethod } from "@/lib/constants";
import { areaName } from "@/lib/location";
import { hasReached, isFinal, journeySteps } from "@/lib/order-steps";
import type { OrderDoc } from "../models/Order";

type Names = Record<string, { name: string; phone: string }>;

function iso(date: Date | null | undefined): string | null {
  return date ? new Date(date).toISOString() : null;
}

function statusTimes(order: OrderDoc): Partial<Record<OrderStatus, string>> {
  const times: Partial<Record<OrderStatus, string>> = {};
  for (const [status, date] of Object.entries(order.statusTimes ?? {})) {
    if (date) times[status as OrderStatus] = new Date(date).toISOString();
  }
  return times;
}

function person(names: Names, id: unknown) {
  if (!id) return null;
  const found = names[String(id)];
  return { id: String(id), name: found?.name ?? "?", phone: found?.phone ?? "" };
}

/** Full view for admins. `names` maps driver ids to name/phone. */
export function adminOrderView(order: OrderDoc, names: Names = {}) {
  return {
    id: String(order._id),
    number: order.number,
    trackingCode: order.trackingCode,
    deliveryCode: order.deliveryCode,
    source: order.source,
    language: (order.language === "en" ? "en" : "fr") as Language,
    registered: Boolean(order.userId),
    userId: order.userId ? String(order.userId) : null,
    type: order.type as OrderType,
    intercityMode: order.intercityMode as IntercityMode | null,
    originCityId: String(order.originCityId),
    originCityName: order.originCityName,
    destinationCityId: String(order.destinationCityId),
    destinationCityName: order.destinationCityName,
    sender: { name: order.sender.name, phone: order.sender.phone },
    receiver: { name: order.receiver.name, phone: order.receiver.phone },
    pickup: { text: order.pickup.text, lat: order.pickup.lat, lng: order.pickup.lng },
    dropoff: { text: order.dropoff.text, lat: order.dropoff.lat, lng: order.dropoff.lng },
    parcel: {
      size: order.parcel.size as ParcelSize,
      category: order.parcel.category as ParcelCategory,
      contents: order.parcel.contents,
      itemCount: order.parcel.itemCount,
      estimatedValue: order.parcel.estimatedValue,
    },
    grossPrice: order.grossPrice,
    discountRate: order.discountRate,
    discountAmount: order.discountAmount,
    netPrice: order.netPrice,
    agencyFee: order.agencyFee,
    approvedAt: iso(order.approvedAt),
    pickupTime: order.pickupTime,
    fee: {
      payer: order.fee.payer,
      timing: order.fee.timing as FeeTiming,
      method: order.fee.method as PaymentMethod,
      status: order.fee.status,
      paidAt: iso(order.fee.paidAt),
      paidTo: person(names, order.fee.paidToDriverId),
    },
    goods: {
      isSale: order.goods.isSale,
      status: order.goods.status as GoodsStatus | null,
      amount: order.goods.amount,
      collected: order.goods.collected,
      collectedBy: person(names, order.goods.collectedByDriverId),
      handedToSeller: order.goods.handedToSeller,
      handedBy: person(names, order.goods.handedByDriverId),
    },
    needsReceiverConfirmation: order.needsReceiverConfirmation,
    receiverConfirmed: order.receiverConfirmed,
    originDriver: person(names, order.originDriverId),
    originConfirmedAt: iso(order.originConfirmedAt),
    destinationDriver: person(names, order.destinationDriverId),
    destinationConfirmedAt: iso(order.destinationConfirmedAt),
    handover: {
      agencyId: order.handover?.agencyId ? String(order.handover.agencyId) : null,
      agencyName: order.handover?.agencyName ?? "",
      vehicleNumber: order.handover?.vehicleNumber ?? "",
      agencyDriverPhone: order.handover?.agencyDriverPhone ?? "",
      registeredUnderName: order.handover?.registeredUnderName ?? "",
      registeredUnderPhone: order.handover?.registeredUnderPhone ?? "",
      eta: iso(order.handover?.eta),
      droppedAt: iso(order.handover?.droppedAt),
      arrivedAt: iso(order.handover?.arrivedAt),
      originPhotoConfirmed: Boolean(order.handover?.originPhotoConfirmed),
      destinationPhotoConfirmed: Boolean(order.handover?.destinationPhotoConfirmed),
    },
    status: order.status as OrderStatus,
    statusTimes: statusTimes(order),
    issue: { open: Boolean(order.issue?.open), note: order.issue?.note ?? "" },
    cancelReason: order.cancelReason,
    failReason: order.failReason,
    codeAttempts: order.codeAttempts,
    codeLocked: order.codeLocked,
    createdAt: iso(order.createdAt)!,
    etaPassed: order.status === "in_transit" && Boolean(order.handover?.eta) && new Date(order.handover.eta!) < new Date(),
  };
}
export type AdminOrderView = ReturnType<typeof adminOrderView>;

/**
 * View for the sender (logged-in user, or guest with their private link).
 * No agency fee, no driver details, no internal notes. The delivery code only from "driver confirmed".
 */
export function senderOrderView(order: OrderDoc, options: { showCode: boolean }) {
  const codeAvailable = Boolean(order.deliveryCode) && hasReached(order.status, "driver_confirmed") && !isFinal(order.status);
  return {
    id: String(order._id),
    number: order.number,
    language: (order.language === "en" ? "en" : "fr") as Language,
    senderPhone: order.sender.phone,
    trackingCode: order.trackingCode,
    type: order.type as OrderType,
    intercityMode: order.intercityMode as IntercityMode | null,
    originCityName: order.originCityName,
    destinationCityName: order.destinationCityName,
    pickupText: order.pickup.text,
    dropoffText: order.dropoff.text,
    receiver: { name: order.receiver.name, phone: order.receiver.phone },
    size: order.parcel.size as ParcelSize,
    status: order.status as OrderStatus,
    statusTimes: statusTimes(order),
    steps: journeySteps(order.type, order.intercityMode),
    grossPrice: order.grossPrice,
    discountRate: order.discountRate,
    discountAmount: order.discountAmount,
    netPrice: order.netPrice,
    paid: order.fee.status === "paid",
    feeTiming: order.fee.timing as FeeTiming,
    feeMethod: order.fee.method as PaymentMethod,
    codeAvailable,
    trackingAvailable: hasReached(order.status, "driver_confirmed") && !isFinal(order.status),
    deliveryCode: codeAvailable && options.showCode ? order.deliveryCode : null,
    agencyName: order.handover?.agencyName ?? "",
    vehicleNumber: order.handover?.vehicleNumber ?? "",
    eta: iso(order.handover?.eta),
    cancelReason: order.status === "cancelled" ? order.cancelReason : "",
    createdAt: iso(order.createdAt)!,
  };
}
export type SenderOrderView = ReturnType<typeof senderOrderView>;

/**
 * Public tracking view: never phones, full addresses, coordinates, prices, the code, the agency fee or notes.
 * Finished deliveries only return "expired".
 */
export function trackingView(order: OrderDoc | null) {
  if (!order) return { state: "not_found" as const };
  if (isFinal(order.status)) return { state: "expired" as const };
  return {
    state: "active" as const,
    number: order.number,
    type: order.type as OrderType,
    intercityMode: order.intercityMode as IntercityMode | null,
    originCityName: order.originCityName,
    destinationCityName: order.destinationCityName,
    pickupArea: areaName(order.pickup.text),
    dropoffArea: areaName(order.dropoff.text),
    status: order.status as OrderStatus,
    statusTimes: statusTimes(order),
    steps: journeySteps(order.type, order.intercityMode),
    paid: order.fee.status === "paid",
    agencyName: hasReached(order.status, "dropped_at_agency") ? (order.handover?.agencyName ?? "") : "",
    vehicleNumber: hasReached(order.status, "dropped_at_agency") ? (order.handover?.vehicleNumber ?? "") : "",
    eta: hasReached(order.status, "dropped_at_agency") ? iso(order.handover?.eta) : null,
    arrivedAt: iso(order.handover?.arrivedAt),
  };
}
export type TrackingView = ReturnType<typeof trackingView>;

/** Job as the driver sees it: full contact details (only for their own jobs), never the code or the agency fee. */
export function driverJobView(order: OrderDoc, role: "origin" | "destination", driverId: string, names: Names = {}) {
  const feeDue = order.fee.status === "unpaid" ? order.netPrice ?? 0 : 0;
  const goodsDue = order.goods.isSale && order.goods.status === "receiver_pays" && !order.goods.collected ? order.goods.amount : 0;
  const confirmedAt = role === "origin" ? order.originConfirmedAt : order.destinationConfirmedAt;
  return {
    id: String(order._id),
    number: order.number,
    role,
    language: (order.language === "en" ? "en" : "fr") as Language,
    type: order.type as OrderType,
    intercityMode: order.intercityMode as IntercityMode | null,
    originCityId: String(order.originCityId),
    originCityName: order.originCityName,
    destinationCityName: order.destinationCityName,
    sender: { name: order.sender.name, phone: order.sender.phone },
    receiver: { name: order.receiver.name, phone: order.receiver.phone },
    pickup: { text: order.pickup.text, lat: order.pickup.lat, lng: order.pickup.lng },
    dropoff: { text: order.dropoff.text, lat: order.dropoff.lat, lng: order.dropoff.lng },
    size: order.parcel.size as ParcelSize,
    category: order.parcel.category as ParcelCategory,
    contents: order.parcel.contents,
    itemCount: order.parcel.itemCount,
    pickupTime: order.pickupTime,
    status: order.status as OrderStatus,
    confirmed: Boolean(confirmedAt),
    feeTiming: order.fee.timing as FeeTiming,
    feeMethod: order.fee.method as PaymentMethod,
    feePaid: order.fee.status === "paid",
    collectAtPickup: role === "origin" && order.fee.timing === "pickup" ? feeDue : 0,
    collectAtDelivery: {
      fee: order.fee.timing === "delivery" ? feeDue : 0,
      goods: goodsDue,
    },
    paidToMe: order.fee.status === "paid" && String(order.fee.paidToDriverId) === driverId,
    collectedOnThisJob:
      (order.fee.status === "paid" && String(order.fee.paidToDriverId) === driverId ? (order.netPrice ?? 0) : 0) +
      (order.goods.collected && String(order.goods.collectedByDriverId) === driverId ? order.goods.amount : 0),
    destinationDriverAssigned: Boolean(order.destinationDriverId),
    destinationDriver: person(names, order.destinationDriverId),
    handover: {
      agencyName: order.handover?.agencyName ?? "",
      vehicleNumber: order.handover?.vehicleNumber ?? "",
      registeredUnderName: order.handover?.registeredUnderName ?? "",
      registeredUnderPhone: order.handover?.registeredUnderPhone ?? "",
      eta: iso(order.handover?.eta),
    },
    codeLocked: order.codeLocked,
    codeAttempts: order.codeAttempts,
    statusTimes: statusTimes(order),
  };
}
export type DriverJobView = ReturnType<typeof driverJobView>;
