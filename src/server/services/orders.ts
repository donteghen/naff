// Every rule about orders lives here: creation, prices, assignment, status changes and money.
// Each change is checked against the current status, saved, logged and announced to the admins.

import { Types } from "mongoose";
import { CANCELLABLE_STATUSES, FAILABLE_STATUSES, MOBILE_MONEY_METHODS, type OrderStatus } from "@/lib/constants";
import { fromLocalInput } from "@/lib/dates";
import { hasReached } from "@/lib/order-steps";
import { generateDigits, generateToken, generateTrackingCode } from "@/lib/codes";
import { computePrice } from "@/lib/money";
import { needsReceiverConfirmation, orderSummary } from "@/lib/order-summary";
import { normalizePhone } from "@/lib/phone";
import { translate } from "@/i18n";
import {
  approveSchema,
  detailsEditSchema,
  dropSchema,
  orderInputSchema,
  paymentEditSchema,
  priceEditSchema,
  reasonSchema,
  type ApproveInput,
  type DetailsEditInput,
  type DropInput,
  type OrderInput,
  type PaymentEditInput,
  type PriceEditInput,
} from "@/lib/schemas";
import { config } from "../config";
import { connectDb } from "../db";
import { AppError, ValidationError } from "../errors";
import { Agency } from "../models/Agency";
import { City } from "../models/City";
import { Counter } from "../models/Counter";
import { Driver, type DriverDoc } from "../models/Driver";
import { Order, type OrderDoc } from "../models/Order";
import { emailNewRequest, publishAlert } from "./alerts";
import { notifyDriver } from "./notify";
import { logActivity, type Actor } from "./logs";
import { getSettings, isMaintenance } from "./settings";

type OrderDocument = InstanceType<typeof Order>;
type AdminRef = { _id: Types.ObjectId; name: string };
type DriverRole = "origin" | "destination";

export function orderLabel(number: number) {
  return `NF-${number}`;
}

function adminActor(admin: AdminRef): Actor {
  return { type: "admin", id: admin._id, name: admin.name };
}

/**
 * The person doing a driver action: the driver themself, or an admin acting for a driver
 * who has no network (logged as "admin X on behalf of driver Y").
 */
export type DriverActor = { driver: DriverDoc; admin?: AdminRef };

function driverActorLog(actor: DriverActor): Actor {
  if (actor.admin) return { type: "admin", id: actor.admin._id, name: actor.admin.name, onBehalfOf: { id: actor.driver._id, name: actor.driver.name } };
  return { type: "driver", id: actor.driver._id, name: actor.driver.name };
}

async function loadOrder(orderId: string): Promise<OrderDocument> {
  await connectDb();
  if (!Types.ObjectId.isValid(orderId)) throw new AppError("errors.notFound");
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("errors.notFound");
  return order;
}

function requireStatus(order: OrderDoc, allowed: OrderStatus[]) {
  if (!allowed.includes(order.status)) throw new AppError("errors.wrongStatus");
}

/** Saves the order. Two people changing the same order at once: the second one gets "changed meanwhile". */
async function saveOrder(order: OrderDocument) {
  try {
    await order.save();
  } catch (error) {
    if (error instanceof Error && error.name === "VersionError") throw new AppError("errors.changedMeanwhile");
    throw error;
  }
}

/** Moves the order to a new status, records the time, saves, logs and alerts the admins. */
async function changeStatus(order: OrderDocument, to: OrderStatus, actor: Actor, details: Record<string, unknown> = {}) {
  const from = order.status;
  order.status = to;
  order.statusTimes = { ...order.statusTimes, [to]: new Date() };
  order.markModified("statusTimes");
  await saveOrder(order);
  await logActivity(actor, order, "status_changed", { fromStatus: from, toStatus: to, details });
  await publishAlert({ event: "status_changed", orderId: String(order._id), number: order.number, status: to });
}

/** Saves a change that is not a status change, logs it and alerts the admins. */
async function saveAndLog(order: OrderDocument, actor: Actor, action: string, details: Record<string, unknown> = {}) {
  await saveOrder(order);
  await logActivity(actor, order, action, { details });
  await publishAlert({ event: action, orderId: String(order._id), number: order.number, status: order.status });
}

async function nextOrderNumber(): Promise<number> {
  const counter = await Counter.findOneAndUpdate({ _id: "order" }, { $inc: { value: 1 } }, { upsert: true, new: true });
  return 1000 + counter.value;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

/** Checks the combination of answers (the form shape is checked by Zod). Returns field errors. */
export function checkPaymentAnswers(input: {
  type: "local" | "intercity";
  intercityMode: "to_address" | "collect_at_agency" | null;
  isSale: boolean;
  goodsStatus: "already_paid" | "receiver_pays" | null;
  goodsAmount: number;
  feeTiming: "request" | "pickup" | "delivery";
  feeMethod: "cash" | "mtn_momo" | "orange_money";
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.type === "intercity" && !input.intercityMode) fields.intercityMode = "errors.required";
  if (input.isSale) {
    if (!input.goodsStatus) fields.goodsStatus = "errors.required";
    // Intercity: a refused parcel would cost us, so goods must already be paid.
    if (input.goodsStatus === "receiver_pays" && input.type === "intercity") fields.goodsStatus = "errors.goodsIntercity";
    if (input.goodsStatus === "receiver_pays" && input.goodsAmount <= 0) fields.goodsAmount = "errors.amount";
  }
  if (input.feeTiming === "delivery" && input.type === "intercity") fields.feeTiming = "errors.feeIntercity";
  if (input.feeTiming === "request" && !MOBILE_MONEY_METHODS.includes(input.feeMethod)) fields.feeMethod = "errors.mobileMoneyOnly";
  return fields;
}

export async function createOrder(params: {
  input: OrderInput;
  source: "web" | "admin";
  userId?: Types.ObjectId | null;
  admin?: AdminRef;
  language: string;
}): Promise<{ id: string; number: number; guestToken: string | null }> {
  await connectDb();
  if (params.source === "web" && (await isMaintenance())) throw new AppError("errors.maintenance");

  // Language of every message about this order (SPEC §6.2b): the site language, or the caller's language chosen by the admin.
  if (params.source === "admin" && params.language !== "fr" && params.language !== "en") throw new ValidationError({ language: "errors.required" });
  const language = params.language === "en" ? "en" : "fr";

  const parsed = orderInputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError(parsed.error);
  const input = parsed.data;

  const fields = checkPaymentAnswers({
    type: input.type,
    intercityMode: input.type === "intercity" ? input.intercityMode : null,
    isSale: input.isSale,
    goodsStatus: input.isSale ? input.goodsStatus : null,
    goodsAmount: input.goodsAmount,
    feeTiming: input.feeTiming,
    feeMethod: input.feeMethod,
  });

  const senderPhone = normalizePhone(input.sender.phone);
  const receiverPhone = normalizePhone(input.receiver.phone);
  if (!senderPhone) fields.senderPhone = "errors.phone";
  if (!receiverPhone) fields.receiverPhone = "errors.phone";
  if (senderPhone && receiverPhone && senderPhone === receiverPhone) fields.receiverPhone = "errors.samePhone";

  const originCity = Types.ObjectId.isValid(input.originCityId) ? await City.findOne({ _id: input.originCityId, active: true }).lean() : null;
  const destinationId = input.type === "local" ? input.originCityId : input.destinationCityId;
  const destinationCity = Types.ObjectId.isValid(destinationId) ? await City.findOne({ _id: destinationId, active: true }).lean() : null;
  if (!originCity) fields.originCityId = "errors.cityInactive";
  if (!destinationCity) fields.destinationCityId = "errors.cityInactive";
  if (input.type === "intercity" && originCity && destinationCity && String(originCity._id) === String(destinationCity._id)) {
    fields.destinationCityId = "errors.sameCity";
  }
  if (Object.keys(fields).length > 0 || !originCity || !destinationCity) throw new ValidationError(fields);

  const intercityMode = input.type === "intercity" ? input.intercityMode : null;
  const goodsStatus = input.isSale ? input.goodsStatus : null;
  const now = new Date();
  const isGuest = params.source === "web" && !params.userId;

  // A new random code very rarely collides with an existing one; try a few times.
  let order: OrderDocument | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await Order.create({
        number: await nextOrderNumber(),
        trackingCode: generateTrackingCode(),
        deliveryCode: intercityMode === "collect_at_agency" ? null : generateDigits(4),
        guestToken: isGuest ? generateToken() : null,
        source: params.source,
        language,
        userId: params.source === "web" ? (params.userId ?? null) : null,
        createdByAdminId: params.admin?._id ?? null,
        type: input.type,
        intercityMode,
        originCityId: originCity._id,
        originCityName: originCity.name,
        destinationCityId: destinationCity._id,
        destinationCityName: destinationCity.name,
        sender: { name: input.sender.name, phone: senderPhone },
        receiver: { name: input.receiver.name, phone: receiverPhone },
        pickup: { text: input.pickup.text, lat: input.pickup.lat ?? null, lng: input.pickup.lng ?? null },
        dropoff: { text: input.dropoff.text, lat: input.dropoff.lat ?? null, lng: input.dropoff.lng ?? null },
        parcel: {
          size: input.size,
          category: input.category,
          contents: input.contents,
          itemCount: input.itemCount,
          estimatedValue: input.estimatedValue ?? null,
          declarationAccepted: true,
        },
        fee: {
          payer: input.feeTiming === "delivery" ? "receiver" : "sender",
          timing: input.feeTiming,
          method: input.feeMethod,
          status: "unpaid",
        },
        goods: {
          isSale: input.isSale,
          status: goodsStatus,
          amount: goodsStatus === "receiver_pays" ? input.goodsAmount : input.isSale ? input.goodsAmount : 0,
        },
        needsReceiverConfirmation: needsReceiverConfirmation(input.isSale, input.feeTiming),
        status: "requested",
        statusTimes: { requested: now },
      });
    } catch (error) {
      if (!(typeof error === "object" && error !== null && (error as { code?: number }).code === 11000)) throw error;
    }
  }
  if (!order) throw new AppError("errors.unexpected");

  const actor: Actor = params.admin
    ? adminActor(params.admin)
    : params.userId
      ? { type: "user", id: params.userId, name: input.sender.name }
      : { type: "guest", id: null, name: input.sender.name };
  await logActivity(actor, order, "created", { toStatus: "requested", details: { source: params.source } });
  await publishAlert({ event: "new_request", orderId: String(order._id), number: order.number, status: "requested" });

  const tx = (key: string, values?: Record<string, string | number>) => translate("fr", key, values);
  await emailNewRequest({
    orderId: String(order._id),
    number: orderLabel(order.number),
    route: order.type === "local" ? `${order.originCityName}` : `${order.originCityName} → ${order.destinationCityName}`,
    summary: orderSummary(order, tx),
    senderPhone: order.sender.phone,
  });

  return { id: String(order._id), number: order.number, guestToken: order.guestToken };
}

// ---------------------------------------------------------------------------
// Admin: approval and prices
// ---------------------------------------------------------------------------

export async function approveOrder(admin: AdminRef, orderId: string, rawInput: ApproveInput) {
  const order = await loadOrder(orderId);
  requireStatus(order, ["requested"]);
  const parsed = approveSchema.safeParse(rawInput);
  if (!parsed.success) throw new ValidationError(parsed.error);
  const input = parsed.data;

  if (order.type === "intercity" && (input.agencyFee === null || input.agencyFee === undefined)) {
    throw new ValidationError({ agencyFee: "errors.required" });
  }
  if (order.needsReceiverConfirmation && !order.receiverConfirmed && !input.receiverConfirmed) {
    throw new AppError("errors.receiverNotConfirmed");
  }
  if (order.fee.timing === "request" && !input.paymentReceived) throw new AppError("errors.paymentNotReceived");

  const settings = await getSettings();
  const price = computePrice(input.grossPrice, settings.discountRate, Boolean(order.userId));

  order.grossPrice = input.grossPrice;
  order.discountRate = price.discountRate;
  order.discountAmount = price.discountAmount;
  order.netPrice = price.netPrice;
  order.agencyFee = order.type === "intercity" ? (input.agencyFee ?? 0) : null;
  order.priceSetByAdminId = admin._id;
  order.approvedAt = new Date();
  order.pickupTime = input.pickupTime;
  if (order.needsReceiverConfirmation) order.receiverConfirmed = true;
  if (order.fee.timing === "request") {
    order.fee.status = "paid";
    order.fee.paidAt = new Date();
    order.fee.recordedByAdminId = admin._id;
  }

  await changeStatus(order, "approved", adminActor(admin), {
    grossPrice: input.grossPrice,
    discountAmount: price.discountAmount,
    netPrice: price.netPrice,
    agencyFee: order.agencyFee,
    paymentReceived: order.fee.timing === "request",
  });
}

export async function setReceiverConfirmed(admin: AdminRef, orderId: string, confirmed: boolean) {
  const order = await loadOrder(orderId);
  requireStatus(order, ["requested"]);
  order.receiverConfirmed = confirmed;
  await saveAndLog(order, adminActor(admin), "receiver_confirmed", { confirmed });
}

export async function editPrice(admin: AdminRef, orderId: string, rawInput: PriceEditInput) {
  const order = await loadOrder(orderId);
  if (order.grossPrice === null || order.status === "requested") throw new AppError("errors.wrongStatus");
  if (order.status === "cancelled" || order.status === "failed") throw new AppError("errors.wrongStatus");
  const parsed = priceEditSchema.safeParse(rawInput);
  if (!parsed.success) throw new ValidationError(parsed.error);
  const input = parsed.data;

  const old = { grossPrice: order.grossPrice, netPrice: order.netPrice, agencyFee: order.agencyFee };
  // Keep the discount rate agreed at approval.
  const price = computePrice(input.grossPrice, order.discountRate, order.discountRate > 0);
  order.grossPrice = input.grossPrice;
  order.discountAmount = price.discountAmount;
  order.netPrice = price.netPrice;
  if (order.type === "intercity") order.agencyFee = input.agencyFee ?? order.agencyFee ?? 0;
  order.priceSetByAdminId = admin._id;

  await saveAndLog(order, adminActor(admin), "price_changed", {
    old,
    new: { grossPrice: order.grossPrice, netPrice: order.netPrice, agencyFee: order.agencyFee },
    reason: input.reason,
  });
  if (order.status !== "delivered" && order.netPrice !== old.netPrice) {
    for (const driverId of driversStillOnOrder(order)) await notifyDriver(driverId, "price_changed", order);
  }
}

/** Drivers whose part of the job is not finished (the first driver of an intercity order is done once the parcel is at the agency). */
function driversStillOnOrder(order: OrderDoc): Types.ObjectId[] {
  const ids: Types.ObjectId[] = [];
  const originDone = order.type === "intercity" && hasReached(order.status, "dropped_at_agency");
  if (order.originDriverId && !originDone) ids.push(order.originDriverId);
  if (order.destinationDriverId) ids.push(order.destinationDriverId);
  return ids;
}

// ---------------------------------------------------------------------------
// Admin: assignment
// ---------------------------------------------------------------------------

async function loadAssignableDriver(driverId: string, cityId: Types.ObjectId): Promise<DriverDoc> {
  if (!Types.ObjectId.isValid(driverId)) throw new AppError("errors.notFound");
  const driver = await Driver.findById(driverId).lean();
  if (!driver || !driver.active) throw new AppError("errors.driverInactive");
  if (String(driver.cityId) !== String(cityId)) throw new AppError("errors.driverWrongCity");
  return driver;
}

export async function assignDriver(admin: AdminRef, orderId: string, role: DriverRole, driverId: string) {
  const order = await loadOrder(orderId);
  const actor = adminActor(admin);

  if (role === "origin") {
    requireStatus(order, ["approved", "assigned", "driver_confirmed"]);
    const driver = await loadAssignableDriver(driverId, order.originCityId);
    const previous = order.originDriverId;
    order.originDriverId = driver._id;
    order.originConfirmedAt = null;
    await logActivity(actor, order, previous ? "driver_reassigned" : "driver_assigned", {
      details: { role, driverId: String(driver._id), driverName: driver.name, previousDriverId: previous ? String(previous) : null },
    });
    await changeStatus(order, "assigned", actor, { role, driverName: driver.name });
    if (previous && String(previous) !== String(driver._id)) await notifyDriver(previous, "job_removed", order);
    await notifyDriver(driver._id, "job_assigned", order);
    return;
  }

  if (order.type !== "intercity" || order.intercityMode !== "to_address") throw new AppError("errors.noDestinationDriver");
  requireStatus(order, ["approved", "assigned", "driver_confirmed", "picked_up", "dropped_at_agency", "in_transit", "arrived_at_agency_b"]);
  const driver = await loadAssignableDriver(driverId, order.destinationCityId);
  const previous = order.destinationDriverId;
  order.destinationDriverId = driver._id;
  order.destinationConfirmedAt = null;
  // After the drop, the agency registered the parcel under the previous driver: the admin must tell the agency.
  await saveAndLog(order, actor, previous ? "driver_reassigned" : "driver_assigned", {
    role,
    driverId: String(driver._id),
    driverName: driver.name,
    previousDriverId: previous ? String(previous) : null,
  });
  if (previous && String(previous) !== String(driver._id)) await notifyDriver(previous, "job_removed", order);
  await notifyDriver(driver._id, "job_assigned", order);
}

export async function unassignDriver(admin: AdminRef, orderId: string, role: DriverRole) {
  const order = await loadOrder(orderId);
  const actor = adminActor(admin);
  if (role === "origin") {
    requireStatus(order, ["assigned", "driver_confirmed"]);
    const previous = order.originDriverId;
    order.originDriverId = null;
    order.originConfirmedAt = null;
    await logActivity(actor, order, "driver_unassigned", { details: { role, previousDriverId: previous ? String(previous) : null } });
    await changeStatus(order, "approved", actor, { role });
    await notifyDriver(previous, "job_removed", order);
    return;
  }
  requireStatus(order, ["approved", "assigned", "driver_confirmed", "picked_up"]);
  if (!order.destinationDriverId) throw new AppError("errors.wrongStatus");
  const previous = order.destinationDriverId;
  order.destinationDriverId = null;
  order.destinationConfirmedAt = null;
  await saveAndLog(order, actor, "driver_unassigned", { role, previousDriverId: String(previous) });
  await notifyDriver(previous, "job_removed", order);
}

// ---------------------------------------------------------------------------
// Driver actions (or an admin acting for the driver)
// ---------------------------------------------------------------------------

function roleOf(order: OrderDoc, driverId: Types.ObjectId): DriverRole | null {
  if (order.originDriverId && String(order.originDriverId) === String(driverId)) return "origin";
  if (order.destinationDriverId && String(order.destinationDriverId) === String(driverId)) return "destination";
  return null;
}

function requireRole(order: OrderDoc, actor: DriverActor, role: DriverRole) {
  const driverId = role === "origin" ? order.originDriverId : order.destinationDriverId;
  if (!driverId || String(driverId) !== String(actor.driver._id)) throw new AppError("errors.notYourJob");
}

export async function respondToJob(actor: DriverActor, orderId: string, role: DriverRole, accept: boolean) {
  const order = await loadOrder(orderId);
  requireRole(order, actor, role);
  const log = driverActorLog(actor);

  if (role === "origin") {
    requireStatus(order, ["assigned"]);
    if (accept) {
      order.originConfirmedAt = new Date();
      await changeStatus(order, "driver_confirmed", log, { role });
    } else {
      order.originDriverId = null;
      await logActivity(log, order, "driver_declined", { details: { role } });
      await changeStatus(order, "approved", log, { role, declined: true });
    }
    return;
  }

  if (order.destinationConfirmedAt) throw new AppError("errors.wrongStatus");
  if (accept) {
    order.destinationConfirmedAt = new Date();
    await saveAndLog(order, log, "driver_confirmed_destination", { role });
  } else {
    order.destinationDriverId = null;
    await saveAndLog(order, log, "driver_declined", { role });
  }
}

export async function markPickedUp(actor: DriverActor, orderId: string) {
  const order = await loadOrder(orderId);
  requireRole(order, actor, "origin");
  requireStatus(order, ["driver_confirmed"]);
  const details: Record<string, unknown> = {};
  if (order.fee.timing === "pickup" && order.fee.status === "unpaid") {
    order.fee.status = "paid";
    order.fee.paidAt = new Date();
    order.fee.paidToDriverId = actor.driver._id;
    details.feeCollected = order.netPrice;
  }
  await changeStatus(order, "picked_up", driverActorLog(actor), details);
}

export async function markDroppedAtAgency(actor: DriverActor, orderId: string, rawInput: DropInput) {
  const order = await loadOrder(orderId);
  requireRole(order, actor, "origin");
  requireStatus(order, ["picked_up"]);
  if (order.type !== "intercity") throw new AppError("errors.wrongStatus");

  const parsed = dropSchema.safeParse(rawInput);
  if (!parsed.success) throw new ValidationError(parsed.error);
  const input = parsed.data;
  const eta = fromLocalInput(input.eta);
  if (!eta) throw new ValidationError({ eta: "errors.etaRequired" });
  const agencyDriverPhone = normalizePhone(input.agencyDriverPhone);
  if (!agencyDriverPhone) throw new ValidationError({ agencyDriverPhone: "errors.phone" });

  let registeredUnder = { name: order.receiver.name, phone: order.receiver.phone };
  if (order.intercityMode === "to_address") {
    if (!order.destinationDriverId) throw new AppError("errors.destinationDriverMissing");
    const destinationDriver = await Driver.findById(order.destinationDriverId).lean();
    if (!destinationDriver) throw new AppError("errors.destinationDriverMissing");
    registeredUnder = { name: destinationDriver.name, phone: destinationDriver.phone };
  }

  const agency = Types.ObjectId.isValid(input.agencyId) ? await Agency.findOne({ _id: input.agencyId, active: true }).lean() : null;
  const branchCities = agency?.branches.map((branch) => String(branch.cityId)) ?? [];
  if (!agency || !branchCities.includes(String(order.originCityId)) || !branchCities.includes(String(order.destinationCityId))) {
    throw new ValidationError({ agencyId: "errors.agencyRoute" });
  }

  order.handover = {
    ...order.handover,
    agencyId: agency._id,
    agencyName: agency.name,
    vehicleNumber: input.vehicleNumber.toUpperCase(),
    agencyDriverPhone,
    registeredUnderName: registeredUnder.name,
    registeredUnderPhone: registeredUnder.phone,
    eta,
    droppedAt: new Date(),
  };
  order.markModified("handover");
  await changeStatus(order, "dropped_at_agency", driverActorLog(actor), {
    agency: agency.name,
    vehicleNumber: order.handover.vehicleNumber,
    eta: eta.toISOString(),
  });
}

export async function markCollectedAtDestination(actor: DriverActor, orderId: string) {
  const order = await loadOrder(orderId);
  requireRole(order, actor, "destination");
  requireStatus(order, ["arrived_at_agency_b"]);
  if (!order.destinationConfirmedAt) throw new AppError("errors.confirmJobFirst");
  await changeStatus(order, "collected_at_destination", driverActorLog(actor));
}

/** Final handover with the 4-digit code the receiver gives. Records money collected on delivery. */
export async function markDelivered(actor: DriverActor, orderId: string, code: string) {
  const order = await loadOrder(orderId);
  const finalRole: DriverRole = order.type === "local" ? "origin" : "destination";
  requireRole(order, actor, finalRole);
  if (order.type === "intercity" && order.intercityMode === "collect_at_agency") throw new AppError("errors.wrongStatus");
  requireStatus(order, [order.type === "local" ? "picked_up" : "collected_at_destination"]);

  if (order.codeLocked) throw new AppError("errors.codeLocked");
  if (!/^\d{4}$/.test(code) || code !== order.deliveryCode) {
    order.codeAttempts += 1;
    const left = config.deliveryCodeMaxAttempts() - order.codeAttempts;
    if (left <= 0) order.codeLocked = true;
    await saveOrder(order);
    await logActivity(driverActorLog(actor), order, "wrong_code", { details: { attempts: order.codeAttempts } });
    if (left <= 0) {
      await publishAlert({ event: "code_locked", orderId: String(order._id), number: order.number, status: order.status });
      throw new AppError("errors.codeLocked");
    }
    throw new AppError("errors.wrongCode", { left });
  }

  const now = new Date();
  const details: Record<string, unknown> = {};
  if (order.fee.timing === "delivery" && order.fee.status === "unpaid") {
    order.fee.status = "paid";
    order.fee.paidAt = now;
    order.fee.paidToDriverId = actor.driver._id;
    details.feeCollected = order.netPrice;
  }
  if (order.goods.isSale && order.goods.status === "receiver_pays" && !order.goods.collected) {
    order.goods.collected = true;
    order.goods.collectedAt = now;
    order.goods.collectedByDriverId = actor.driver._id;
    details.goodsCollected = order.goods.amount;
  }
  await changeStatus(order, "delivered", driverActorLog(actor), details);
}

// ---------------------------------------------------------------------------
// Admin: intercity follow-up
// ---------------------------------------------------------------------------

export async function confirmDrop(admin: AdminRef, orderId: string) {
  const order = await loadOrder(orderId);
  requireStatus(order, ["dropped_at_agency"]);
  order.handover.originPhotoConfirmed = true;
  order.markModified("handover");
  await changeStatus(order, "in_transit", adminActor(admin), { originPhotoConfirmed: true });
}

export async function markArrivedAtAgency(admin: AdminRef, orderId: string) {
  const order = await loadOrder(orderId);
  requireStatus(order, ["in_transit"]);
  order.handover.arrivedAt = new Date();
  order.markModified("handover");
  await changeStatus(order, "arrived_at_agency_b", adminActor(admin));
  if (order.intercityMode === "to_address") await notifyDriver(order.destinationDriverId, "go_collect", order);
}

/** Collect-at-agency: the admin phoned the receiver; our job ends here. */
export async function markDeliveredAtAgency(admin: AdminRef, orderId: string) {
  const order = await loadOrder(orderId);
  if (order.intercityMode !== "collect_at_agency") throw new AppError("errors.wrongStatus");
  requireStatus(order, ["arrived_at_agency_b"]);
  await changeStatus(order, "delivered", adminActor(admin));
}

export async function setDestinationPhotoChecked(admin: AdminRef, orderId: string, checked: boolean) {
  const order = await loadOrder(orderId);
  if (order.intercityMode !== "to_address") throw new AppError("errors.wrongStatus");
  order.handover.destinationPhotoConfirmed = checked;
  order.markModified("handover");
  await saveAndLog(order, adminActor(admin), "destination_photo_checked", { checked });
}

// ---------------------------------------------------------------------------
// Admin: exits, issues, corrections
// ---------------------------------------------------------------------------

export async function cancelOrder(admin: AdminRef, orderId: string, reasonInput: string) {
  const order = await loadOrder(orderId);
  requireStatus(order, CANCELLABLE_STATUSES);
  const parsed = reasonSchema.safeParse({ reason: reasonInput });
  if (!parsed.success) throw new ValidationError(parsed.error);
  order.cancelReason = parsed.data.reason;
  order.issue = { ...order.issue, open: false };
  const drivers = driversStillOnOrder(order);
  await changeStatus(order, "cancelled", adminActor(admin), { reason: parsed.data.reason });
  for (const driverId of drivers) await notifyDriver(driverId, "job_cancelled", order);
}

export async function failOrder(admin: AdminRef, orderId: string, reasonInput: string) {
  const order = await loadOrder(orderId);
  requireStatus(order, FAILABLE_STATUSES);
  const parsed = reasonSchema.safeParse({ reason: reasonInput });
  if (!parsed.success) throw new ValidationError(parsed.error);
  order.failReason = parsed.data.reason;
  order.issue = { ...order.issue, open: false };
  await changeStatus(order, "failed", adminActor(admin), { reason: parsed.data.reason });
}

export async function setIssue(admin: AdminRef, orderId: string, open: boolean, note: string) {
  const order = await loadOrder(orderId);
  if (order.status === "delivered" || order.status === "cancelled" || order.status === "failed") throw new AppError("errors.wrongStatus");
  const cleanNote = note.trim().slice(0, 300);
  if (open && !cleanNote) throw new ValidationError({ note: "errors.required" });
  order.issue = { open, note: open ? cleanNote : order.issue.note, byAdminId: admin._id, at: new Date() };
  await saveAndLog(order, adminActor(admin), open ? "issue_raised" : "issue_cleared", { note: cleanNote });
}

export async function unlockCode(admin: AdminRef, orderId: string) {
  const order = await loadOrder(orderId);
  order.codeAttempts = 0;
  order.codeLocked = false;
  await saveAndLog(order, adminActor(admin), "code_unlocked");
  await notifyDriver(order.type === "local" ? order.originDriverId : order.destinationDriverId, "code_unlocked", order);
}

export async function editDetails(admin: AdminRef, orderId: string, rawInput: DetailsEditInput) {
  const order = await loadOrder(orderId);
  if (order.status === "delivered" || order.status === "cancelled" || order.status === "failed") throw new AppError("errors.wrongStatus");
  const parsed = detailsEditSchema.safeParse(rawInput);
  if (!parsed.success) throw new ValidationError(parsed.error);
  const input = parsed.data;

  const senderPhone = normalizePhone(input.sender.phone);
  const receiverPhone = normalizePhone(input.receiver.phone);
  const fields: Record<string, string> = {};
  if (!senderPhone) fields.senderPhone = "errors.phone";
  if (!receiverPhone) fields.receiverPhone = "errors.phone";
  if (senderPhone && senderPhone === receiverPhone) fields.receiverPhone = "errors.samePhone";
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  const old = {
    sender: order.sender,
    receiver: order.receiver,
    pickup: order.pickup.text,
    dropoff: order.dropoff.text,
    parcel: { size: order.parcel.size, category: order.parcel.category, contents: order.parcel.contents, itemCount: order.parcel.itemCount },
    pickupTime: order.pickupTime,
    language: order.language,
  };
  order.sender = { name: input.sender.name, phone: senderPhone! };
  order.receiver = { name: input.receiver.name, phone: receiverPhone! };
  order.pickup = { text: input.pickup.text, lat: input.pickup.lat ?? null, lng: input.pickup.lng ?? null };
  order.dropoff = { text: input.dropoff.text, lat: input.dropoff.lat ?? null, lng: input.dropoff.lng ?? null };
  order.parcel = { ...order.parcel, size: input.size, category: input.category, contents: input.contents, itemCount: input.itemCount };
  order.pickupTime = input.pickupTime;
  if (input.language) order.language = input.language;

  await saveAndLog(order, adminActor(admin), "details_changed", {
    old,
    new: {
      sender: order.sender,
      receiver: order.receiver,
      pickup: order.pickup.text,
      dropoff: order.dropoff.text,
      parcel: { size: input.size, category: input.category, contents: input.contents, itemCount: input.itemCount },
      pickupTime: input.pickupTime,
      language: order.language,
    },
  });
}

/** Changes the payment answers (who pays what and when). Only before pickup, with a reason. */
export async function editPaymentAnswers(admin: AdminRef, orderId: string, rawInput: PaymentEditInput) {
  const order = await loadOrder(orderId);
  requireStatus(order, ["requested", "approved", "assigned", "driver_confirmed"]);
  const parsed = paymentEditSchema.safeParse(rawInput);
  if (!parsed.success) throw new ValidationError(parsed.error);
  const input = parsed.data;
  const fields = checkPaymentAnswers({
    type: order.type,
    intercityMode: order.intercityMode,
    isSale: input.isSale,
    goodsStatus: input.isSale ? input.goodsStatus : null,
    goodsAmount: input.goodsAmount,
    feeTiming: input.feeTiming,
    feeMethod: input.feeMethod,
  });
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  if (input.feeTiming === "request" && order.status !== "requested" && order.fee.status !== "paid") {
    throw new ValidationError({ feeTiming: "errors.requestTimingLate" });
  }

  const old = { fee: { ...order.fee }, goods: { ...order.goods } };
  order.fee.timing = input.feeTiming;
  order.fee.method = input.feeMethod;
  order.fee.payer = input.feeTiming === "delivery" ? "receiver" : "sender";
  order.goods.isSale = input.isSale;
  order.goods.status = input.isSale ? input.goodsStatus : null;
  order.goods.amount = input.isSale ? input.goodsAmount : 0;
  order.needsReceiverConfirmation = needsReceiverConfirmation(input.isSale, input.feeTiming);
  if (!order.needsReceiverConfirmation) order.receiverConfirmed = false;
  order.markModified("fee");
  order.markModified("goods");
  await saveAndLog(order, adminActor(admin), "payment_answers_changed", { old, new: { fee: order.fee, goods: order.goods }, reason: input.reason });
}

/** Correction of the delivery fee record (who received it, paid or not). Logged. */
export async function correctFeePayment(admin: AdminRef, orderId: string, input: { paid: boolean; driverId: string | null; reason: string }) {
  const order = await loadOrder(orderId);
  const parsed = reasonSchema.safeParse({ reason: input.reason });
  if (!parsed.success) throw new ValidationError(parsed.error);
  const old = { status: order.fee.status, paidToDriverId: order.fee.paidToDriverId ? String(order.fee.paidToDriverId) : null };
  order.fee.status = input.paid ? "paid" : "unpaid";
  order.fee.paidAt = input.paid ? (order.fee.paidAt ?? new Date()) : null;
  order.fee.paidToDriverId = input.paid && input.driverId && Types.ObjectId.isValid(input.driverId) ? new Types.ObjectId(input.driverId) : null;
  order.fee.recordedByAdminId = admin._id;
  order.markModified("fee");
  await saveAndLog(order, adminActor(admin), "fee_corrected", { old, new: { status: order.fee.status, paidToDriverId: input.driverId }, reason: parsed.data.reason });
}

/** Goods money handed to the seller: a record, not a control. */
export async function setGoodsHanded(admin: AdminRef, orderId: string, handed: boolean | null, driverId: string | null) {
  const order = await loadOrder(orderId);
  if (!order.goods.isSale) throw new AppError("errors.wrongStatus");
  order.goods.handedToSeller = handed;
  order.goods.handedByDriverId = handed && driverId && Types.ObjectId.isValid(driverId) ? new Types.ObjectId(driverId) : null;
  order.markModified("goods");
  await saveAndLog(order, adminActor(admin), "goods_handed_to_seller", { handed, driverId });
}

/** Which role a driver has on an order (used by the driver app). */
export function driverRoleOn(order: OrderDoc, driverId: Types.ObjectId): DriverRole | null {
  return roleOf(order, driverId);
}

/** The admin sent the delivery code to the receiver (only at the sender's request). Recorded, nothing else changes. */
export async function logCodeShared(admin: AdminRef, orderId: string) {
  const order = await loadOrder(orderId);
  if (!order.deliveryCode || !hasReached(order.status, "driver_confirmed") || order.status === "delivered") throw new AppError("errors.wrongStatus");
  await logActivity(adminActor(admin), order, "code_shared_with_receiver");
}
