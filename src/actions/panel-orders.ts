"use server";

import { Types } from "mongoose";
import { getLanguage } from "@/i18n/server";
import type { ApproveInput, DetailsEditInput, DropInput, OrderInput, PaymentEditInput, PriceEditInput } from "@/lib/schemas";
import { requireAdminAction } from "@/server/auth/current";
import { connectDb } from "@/server/db";
import { AppError, runAction } from "@/server/errors";
import { Driver } from "@/server/models/Driver";
import { Order } from "@/server/models/Order";
import * as orders from "@/server/services/orders";

type Role = "origin" | "destination";

/** The driver assigned to a role on an order, for actions an admin does on the driver's behalf. */
async function assignedDriver(orderId: string, role: Role) {
  await connectDb();
  if (!Types.ObjectId.isValid(orderId)) throw new AppError("errors.notFound");
  const order = await Order.findById(orderId).select("originDriverId destinationDriverId").lean();
  const driverId = role === "origin" ? order?.originDriverId : order?.destinationDriverId;
  if (!driverId) throw new AppError("errors.noDriver");
  const driver = await Driver.findById(driverId).lean();
  if (!driver) throw new AppError("errors.noDriver");
  return driver;
}

export async function createQuickOrderAction(input: OrderInput, approve: ApproveInput | null) {
  return runAction("panel.quickOrder", { input, approve }, async () => {
    const admin = await requireAdminAction();
    const created = await orders.createOrder({ input, source: "admin", admin, language: await getLanguage() });
    if (approve) await orders.approveOrder(admin, created.id, approve);
    return { id: created.id, number: created.number };
  });
}

export async function approveAction(orderId: string, input: ApproveInput) {
  return runAction("panel.approve", { orderId, ...input }, async () => orders.approveOrder(await requireAdminAction(), orderId, input));
}

export async function receiverConfirmedAction(orderId: string, confirmed: boolean) {
  return runAction("panel.receiverConfirmed", { orderId, confirmed }, async () => orders.setReceiverConfirmed(await requireAdminAction(), orderId, confirmed));
}

export async function editPriceAction(orderId: string, input: PriceEditInput) {
  return runAction("panel.editPrice", { orderId, ...input }, async () => orders.editPrice(await requireAdminAction(), orderId, input));
}

export async function editDetailsAction(orderId: string, input: DetailsEditInput) {
  return runAction("panel.editDetails", { orderId, ...input }, async () => orders.editDetails(await requireAdminAction(), orderId, input));
}

export async function editPaymentAction(orderId: string, input: PaymentEditInput) {
  return runAction("panel.editPayment", { orderId, ...input }, async () => orders.editPaymentAnswers(await requireAdminAction(), orderId, input));
}

export async function assignDriverAction(orderId: string, role: Role, driverId: string) {
  return runAction("panel.assign", { orderId, role, driverId }, async () => orders.assignDriver(await requireAdminAction(), orderId, role, driverId));
}

export async function unassignDriverAction(orderId: string, role: Role) {
  return runAction("panel.unassign", { orderId, role }, async () => orders.unassignDriver(await requireAdminAction(), orderId, role));
}

export async function confirmDropAction(orderId: string) {
  return runAction("panel.confirmDrop", { orderId }, async () => orders.confirmDrop(await requireAdminAction(), orderId));
}

export async function arrivedAction(orderId: string) {
  return runAction("panel.arrived", { orderId }, async () => orders.markArrivedAtAgency(await requireAdminAction(), orderId));
}

export async function deliveredAtAgencyAction(orderId: string) {
  return runAction("panel.deliveredAtAgency", { orderId }, async () => orders.markDeliveredAtAgency(await requireAdminAction(), orderId));
}

export async function destinationPhotoAction(orderId: string, checked: boolean) {
  return runAction("panel.destinationPhoto", { orderId, checked }, async () => orders.setDestinationPhotoChecked(await requireAdminAction(), orderId, checked));
}

export async function cancelOrderAction(orderId: string, reason: string) {
  return runAction("panel.cancel", { orderId, reason }, async () => orders.cancelOrder(await requireAdminAction(), orderId, reason));
}

export async function failOrderAction(orderId: string, reason: string) {
  return runAction("panel.fail", { orderId, reason }, async () => orders.failOrder(await requireAdminAction(), orderId, reason));
}

export async function issueAction(orderId: string, open: boolean, note: string) {
  return runAction("panel.issue", { orderId, open, note }, async () => orders.setIssue(await requireAdminAction(), orderId, open, note));
}

export async function unlockCodeAction(orderId: string) {
  return runAction("panel.unlockCode", { orderId }, async () => orders.unlockCode(await requireAdminAction(), orderId));
}

export async function correctFeeAction(orderId: string, input: { paid: boolean; driverId: string | null; reason: string }) {
  return runAction("panel.correctFee", { orderId, ...input }, async () => orders.correctFeePayment(await requireAdminAction(), orderId, input));
}

export async function goodsHandedAction(orderId: string, handed: boolean | null, driverId: string | null) {
  return runAction("panel.goodsHanded", { orderId, handed, driverId }, async () => orders.setGoodsHanded(await requireAdminAction(), orderId, handed, driverId));
}

// Driver actions done by an admin when the driver has no network.

export async function respondForDriverAction(orderId: string, role: Role, accept: boolean) {
  return runAction("panel.respondForDriver", { orderId, role, accept }, async () => {
    const admin = await requireAdminAction();
    await orders.respondToJob({ driver: await assignedDriver(orderId, role), admin }, orderId, role, accept);
  });
}

export async function pickedUpForDriverAction(orderId: string) {
  return runAction("panel.pickedUpForDriver", { orderId }, async () => {
    const admin = await requireAdminAction();
    await orders.markPickedUp({ driver: await assignedDriver(orderId, "origin"), admin }, orderId);
  });
}

export async function droppedForDriverAction(orderId: string, input: DropInput) {
  return runAction("panel.droppedForDriver", { orderId, ...input }, async () => {
    const admin = await requireAdminAction();
    await orders.markDroppedAtAgency({ driver: await assignedDriver(orderId, "origin"), admin }, orderId, input);
  });
}

export async function collectedForDriverAction(orderId: string) {
  return runAction("panel.collectedForDriver", { orderId }, async () => {
    const admin = await requireAdminAction();
    await orders.markCollectedAtDestination({ driver: await assignedDriver(orderId, "destination"), admin }, orderId);
  });
}

export async function deliveredForDriverAction(orderId: string, role: Role, code: string) {
  return runAction("panel.deliveredForDriver", { orderId, role, code }, async () => {
    const admin = await requireAdminAction();
    await orders.markDelivered({ driver: await assignedDriver(orderId, role), admin }, orderId, code);
  });
}
