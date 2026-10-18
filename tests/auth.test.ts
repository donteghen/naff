import "./cookies-mock";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashPin } from "@/server/auth/pins";
import { Admin } from "@/server/models/Admin";
import { AuditLog } from "@/server/models/AuditLog";
import { City } from "@/server/models/City";
import { Driver } from "@/server/models/Driver";
import { Order } from "@/server/models/Order";
import { Session } from "@/server/models/Session";
import { User } from "@/server/models/User";
import { login, registerUser, setNewPin } from "@/server/services/auth";
import { createDriver, setDriverActive } from "@/server/services/people";
import { cookieJar } from "./cookies-mock";
import { clearDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  cookieJar.clear();
});

describe("users", () => {
  it("registers, logs in and keeps sessions per audience", async () => {
    await registerUser({ name: "Marie Ngo", phone: "677 12 34 56", email: "marie@example.com", pin: "1234", confirmPin: "1234" });
    expect(cookieJar.has("sess_user")).toBe(true);
    const session = await Session.findById(cookieJar.get("sess_user")).lean();
    expect(session?.audience).toBe("user");
    const days = (session!.expiresAt.getTime() - session!.createdAt.getTime()) / 86400000;
    expect(Math.round(days)).toBe(7);
    await expect(registerUser({ name: "Other", phone: "677123456", email: "o@example.com", pin: "1234", confirmPin: "1234" })).rejects.toMatchObject({ fields: { phone: "errors.phoneTaken" } });
  });

  it("gives the same error for unknown phone and wrong PIN, and rate limits", async () => {
    await User.create({ name: "Marie", phone: "677123456", email: "m@example.com", pinHash: await hashPin("1234") });
    await expect(login("user", "699999999", "1234")).rejects.toThrow("errors.wrongLogin");
    for (let i = 0; i < 5; i++) await expect(login("user", "677123456", "0000")).rejects.toThrow("errors.wrongLogin");
    await expect(login("user", "677123456", "1234")).rejects.toThrow("errors.tooManyAttempts");
  });

  it("accepts an emailed temporary PIN and forces a new one", async () => {
    await User.create({ name: "Marie", phone: "677123456", email: "m@example.com", pinHash: await hashPin("1234"), tempPin: { hash: await hashPin("5555"), expiresAt: new Date(Date.now() + 60000) } });
    const result = await login("user", "677123456", "5555");
    expect(result.mustChangePin).toBe(true);
    const user = (await User.findOne({ phone: "677123456" }).lean())!;
    await setNewPin("user", { ...user, sessionId: cookieJar.get("sess_user")! }, { newPin: "4321", confirmPin: "4321" });
    const updated = (await User.findOne({ phone: "677123456" }).lean())!;
    expect(updated.mustChangePin).toBe(false);
    expect(updated.tempPin).toBeNull();
  });

  it("refuses an expired temporary PIN", async () => {
    await User.create({ name: "Marie", phone: "677123456", email: "m@example.com", pinHash: await hashPin("1234"), tempPin: { hash: await hashPin("5555"), expiresAt: new Date(Date.now() - 1000) } });
    await expect(login("user", "677123456", "5555")).rejects.toThrow("errors.wrongLogin");
  });

  it("needs the current PIN to change it, and ends other sessions", async () => {
    await User.create({ name: "Marie", phone: "677123456", email: "m@example.com", pinHash: await hashPin("1234") });
    await login("user", "677123456", "1234");
    const first = cookieJar.get("sess_user")!;
    await login("user", "677123456", "1234");
    const second = cookieJar.get("sess_user")!;
    const user = (await User.findOne({ phone: "677123456" }).lean())!;
    await expect(setNewPin("user", { ...user, sessionId: second }, { currentPin: "0000", newPin: "4321", confirmPin: "4321" })).rejects.toMatchObject({ fields: { currentPin: "errors.wrongPin" } });
    await setNewPin("user", { ...user, sessionId: second }, { currentPin: "1234", newPin: "4321", confirmPin: "4321" });
    expect(await Session.exists({ _id: first })).toBeNull();
    expect(await Session.exists({ _id: second })).toBeTruthy();
  });
});

describe("drivers and admins", () => {
  it("creates a driver with a temporary PIN and forces a change at first login", async () => {
    const admin = await Admin.create({ name: "Aïcha", phone: "690000000", pinHash: "-", isSuperAdmin: true });
    const city = await City.create({ name: "Douala" });
    const tempPin = await createDriver(admin, { name: "Eric", phone: "650112233", cityId: String(city._id) });
    expect(tempPin).toMatch(/^\d{4}$/);
    const result = await login("driver", "650112233", tempPin);
    expect(result.mustChangePin).toBe(true);
    expect(await AuditLog.countDocuments({ action: "driver_created" })).toBe(1);
  });

  it("blocks suspending a driver who has active jobs", async () => {
    const admin = await Admin.create({ name: "Aïcha", phone: "690000000", pinHash: "-", isSuperAdmin: true });
    const city = await City.create({ name: "Douala" });
    const driver = await Driver.create({ name: "Eric", phone: "650112233", cityId: city._id, pinHash: "-" });
    await Order.collection.insertOne({ number: 1, trackingCode: "X", status: "assigned", originDriverId: driver._id });
    await expect(setDriverActive(admin, String(driver._id), false)).rejects.toThrow("errors.driverHasJobs");
  });

  it("uses 6-digit PINs for admins", async () => {
    await Admin.create({ name: "Aïcha", phone: "690000000", pinHash: await hashPin("123456"), mustChangePin: false });
    await expect(login("panel", "690000000", "1234")).rejects.toThrow("errors.wrongLogin");
    await expect(login("panel", "690000000", "123456")).resolves.toEqual({ mustChangePin: false });
    expect(cookieJar.has("sess_panel")).toBe(true);
  });
});
