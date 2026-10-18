"use server";

import type { DropInput } from "@/lib/schemas";
import { requireDriverAction, requireDriverSession } from "@/server/auth/current";
import { endSession } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { login, setNewPin } from "@/server/services/auth";
import { markCollectedAtDestination, markDelivered, markDroppedAtAgency, markPickedUp, respondToJob } from "@/server/services/orders";
import { setDriverAvailable } from "@/server/services/people";

export async function loginDriverAction(input: { phone: string; pin: string }) {
  return runAction("driver.login", input, () => login("driver", input.phone, input.pin));
}

export async function logoutDriverAction() {
  return runAction("driver.logout", {}, () => endSession("driver"));
}

export async function setDriverPinAction(input: { currentPin?: string; newPin: string; confirmPin: string }) {
  return runAction("driver.setPin", input, async () => {
    const driver = await requireDriverSession();
    await setNewPin("driver", driver, input);
  });
}

export async function setAvailableAction(available: boolean) {
  return runAction("driver.setAvailable", { available }, async () => {
    const driver = await requireDriverAction();
    await setDriverAvailable(driver._id, available);
  });
}

export async function respondToJobAction(orderId: string, role: "origin" | "destination", accept: boolean) {
  return runAction("driver.respond", { orderId, role, accept }, async () => {
    const driver = await requireDriverAction();
    await respondToJob({ driver }, orderId, role, accept);
  });
}

export async function pickedUpAction(orderId: string) {
  return runAction("driver.pickedUp", { orderId }, async () => {
    const driver = await requireDriverAction();
    await markPickedUp({ driver }, orderId);
  });
}

export async function droppedAtAgencyAction(orderId: string, input: DropInput) {
  return runAction("driver.dropped", { orderId, ...input }, async () => {
    const driver = await requireDriverAction();
    await markDroppedAtAgency({ driver }, orderId, input);
  });
}

export async function collectedAction(orderId: string) {
  return runAction("driver.collected", { orderId }, async () => {
    const driver = await requireDriverAction();
    await markCollectedAtDestination({ driver }, orderId);
  });
}

export async function deliveredAction(orderId: string, code: string) {
  return runAction("driver.delivered", { orderId, code }, async () => {
    const driver = await requireDriverAction();
    await markDelivered({ driver }, orderId, code);
  });
}
