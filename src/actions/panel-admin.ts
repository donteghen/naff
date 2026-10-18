"use server";

import { requireAdminAction, requireAdminSession, requireSuperAdminAction } from "@/server/auth/current";
import { endSession } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { login, setNewPin } from "@/server/services/auth";
import * as people from "@/server/services/people";
import * as setup from "@/server/services/setup";

type PersonInput = { name: string; phone: string; email: string };
type DriverInput = { name: string; phone: string; cityId: string };

export async function loginAdminAction(input: { phone: string; pin: string }) {
  return runAction("panel.login", input, () => login("panel", input.phone, input.pin));
}

export async function logoutAdminAction() {
  return runAction("panel.logout", {}, () => endSession("panel"));
}

export async function setAdminPinAction(input: { currentPin?: string; newPin: string; confirmPin: string }) {
  return runAction("panel.setPin", input, async () => {
    const admin = await requireAdminSession();
    await setNewPin("panel", admin, input);
  });
}

// Users

export async function updateUserAction(userId: string, input: PersonInput) {
  return runAction("panel.updateUser", { userId, ...input }, async () => people.updateUserByAdmin(await requireAdminAction(), userId, input));
}

export async function setUserActiveAction(userId: string, active: boolean) {
  return runAction("panel.setUserActive", { userId, active }, async () => people.setUserActive(await requireAdminAction(), userId, active));
}

export async function resetUserPinAction(userId: string) {
  return runAction("panel.resetUserPin", { userId }, async () => people.resetUserPin(await requireAdminAction(), userId));
}

export async function endUserSessionsAction(userId: string) {
  return runAction("panel.endUserSessions", { userId }, async () => people.endUserSessions(await requireAdminAction(), userId));
}

// Drivers

export async function createDriverAction(input: DriverInput) {
  return runAction("panel.createDriver", input, async () => people.createDriver(await requireAdminAction(), input));
}

export async function updateDriverAction(driverId: string, input: DriverInput) {
  return runAction("panel.updateDriver", { driverId, ...input }, async () => people.updateDriver(await requireAdminAction(), driverId, input));
}

export async function setDriverActiveAction(driverId: string, active: boolean) {
  return runAction("panel.setDriverActive", { driverId, active }, async () => people.setDriverActive(await requireAdminAction(), driverId, active));
}

export async function resetDriverPinAction(driverId: string) {
  return runAction("panel.resetDriverPin", { driverId }, async () => people.resetDriverPin(await requireAdminAction(), driverId));
}

export async function endDriverSessionsAction(driverId: string) {
  return runAction("panel.endDriverSessions", { driverId }, async () => people.endDriverSessions(await requireAdminAction(), driverId));
}

// Admins (super admin only)

export async function createAdminAction(input: PersonInput) {
  return runAction("panel.createAdmin", input, async () => people.createAdmin(await requireSuperAdminAction(), input));
}

export async function updateAdminAction(adminId: string, input: PersonInput) {
  return runAction("panel.updateAdmin", { adminId, ...input }, async () => people.updateAdmin(await requireSuperAdminAction(), adminId, input));
}

export async function setAdminActiveAction(adminId: string, active: boolean) {
  return runAction("panel.setAdminActive", { adminId, active }, async () => people.setAdminActive(await requireSuperAdminAction(), adminId, active));
}

export async function resetAdminPinAction(adminId: string) {
  return runAction("panel.resetAdminPin", { adminId }, async () => people.resetAdminPin(await requireSuperAdminAction(), adminId));
}

// Settings

export async function saveCityAction(input: { id?: string; name: string; active: boolean }) {
  return runAction("panel.saveCity", input, async () => setup.saveCity(await requireAdminAction(), input));
}

export async function saveAgencyAction(input: { id?: string; name: string; phone: string; active: boolean; branches: { cityId: string; address: string }[] }) {
  return runAction("panel.saveAgency", input, async () => setup.saveAgency(await requireAdminAction(), input));
}

export async function saveDiscountRateAction(percent: number) {
  return runAction("panel.saveDiscountRate", { percent }, async () => setup.saveDiscountRate(await requireAdminAction(), percent));
}

export async function saveContactsAction(input: { callUsPhone: string; whatsappPhone: string; mtnNumber: string; mtnName: string; orangeNumber: string; orangeName: string }) {
  return runAction("panel.saveContacts", input, async () => setup.saveContacts(await requireAdminAction(), input));
}

export async function setOperationalStatusAction(status: "live" | "maintenance") {
  return runAction("panel.setOperationalStatus", { status }, async () => setup.setOperationalStatus(await requireAdminAction(), status));
}
