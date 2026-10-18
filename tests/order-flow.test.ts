import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { OrderInput } from "@/lib/schemas";
import { ActivityLog } from "@/server/models/ActivityLog";
import { Admin } from "@/server/models/Admin";
import { Agency } from "@/server/models/Agency";
import { City } from "@/server/models/City";
import { Driver, type DriverDoc } from "@/server/models/Driver";
import { Order } from "@/server/models/Order";
import { Settings } from "@/server/models/Settings";
import { getGuestOrder, getTracking, listDriverJobs } from "@/server/services/order-queries";
import * as orders from "@/server/services/orders";
import { clearDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);

let admin: { _id: Types.ObjectId; name: string };
let douala: Types.ObjectId;
let buea: Types.ObjectId;
let yaounde: Types.ObjectId;
let eric: DriverDoc;
let samuel: DriverDoc;
let brice: DriverDoc;
let agencyId: string;

async function driver(name: string, phone: string, cityId: Types.ObjectId) {
  const created = await Driver.create({ name, phone, cityId, pinHash: "-", mustChangePin: false, available: true });
  return created.toObject() as DriverDoc;
}

beforeEach(async () => {
  await clearDb();
  await Settings.create({ _id: "settings", discountRate: 0.05 });
  const created = await Admin.create({ name: "Aïcha", phone: "690000000", pinHash: "-", isSuperAdmin: true, mustChangePin: false });
  admin = { _id: created._id, name: created.name };
  [douala, buea, yaounde] = (await City.create([{ name: "Douala" }, { name: "Buea" }, { name: "Yaoundé" }])).map((city) => city._id);
  eric = await driver("Eric M.", "650112233", douala);
  samuel = await driver("Samuel T.", "677445566", douala);
  brice = await driver("Brice N.", "655987654", buea);
  const agency = await Agency.create({ name: "Express Voyages", branches: [{ cityId: douala, address: "Mboppi" }, { cityId: buea, address: "Molyko" }] });
  agencyId = String(agency._id);
});

function input(overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    type: "local",
    intercityMode: null,
    originCityId: String(douala),
    destinationCityId: String(douala),
    isSale: false,
    goodsStatus: null,
    goodsAmount: 0,
    feeTiming: "pickup",
    feeMethod: "cash",
    size: "small",
    category: "electronics",
    contents: "2 phone cases",
    itemCount: 2,
    estimatedValue: null,
    declarationAccepted: true,
    pickup: { text: "Akwa, near Total station", lat: 4.05, lng: 9.7 },
    dropoff: { text: "Makepe, Rue des Palmiers" },
    sender: { name: "Marie Ngo", phone: "+237 677 12 34 56" },
    receiver: { name: "Paul Kamga", phone: "699001122" },
    ...overrides,
  };
}

async function load(id: string) {
  return (await Order.findById(id).lean())!;
}

describe("creation", () => {
  it("creates a guest web order with codes and a private link", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    const order = await load(created.id);
    expect(order.status).toBe("requested");
    expect(order.number).toBe(1001);
    expect(order.trackingCode).toHaveLength(12);
    expect(order.deliveryCode).toMatch(/^\d{4}$/);
    expect(created.guestToken).toBeTruthy();
    expect(order.sender.phone).toBe("677123456");
    expect(await ActivityLog.countDocuments({ orderId: order._id, action: "created" })).toBe(1);
  });

  it("refuses the same phone for sender and receiver", async () => {
    await expect(orders.createOrder({ input: input({ receiver: { name: "Me", phone: "677123456" } }), source: "web", language: "fr" })).rejects.toMatchObject({ fields: { receiverPhone: "errors.samePhone" } });
  });

  it("refuses an inactive destination city", async () => {
    await City.updateOne({ _id: yaounde }, { active: false });
    await expect(
      orders.createOrder({ input: input({ type: "intercity", intercityMode: "to_address", destinationCityId: String(yaounde) }), source: "web", language: "fr" }),
    ).rejects.toMatchObject({ fields: { destinationCityId: "errors.cityInactive" } });
  });

  it("has no delivery code when the receiver collects at the agency", async () => {
    const created = await orders.createOrder({ input: input({ type: "intercity", intercityMode: "collect_at_agency", destinationCityId: String(buea) }), source: "web", language: "fr" });
    expect((await load(created.id)).deliveryCode).toBeNull();
  });

  it("refuses new web orders in maintenance, but not admin orders", async () => {
    await Settings.updateOne({ _id: "settings" }, { operationalStatus: "maintenance" });
    await expect(orders.createOrder({ input: input(), source: "web", language: "fr" })).rejects.toThrow("errors.maintenance");
    await expect(orders.createOrder({ input: input(), source: "admin", admin, language: "fr" })).resolves.toBeTruthy();
  });
});

describe("local delivery, end to end", () => {
  it("runs the whole journey and records the money", async () => {
    const userId = new Types.ObjectId();
    const created = await orders.createOrder({
      input: input({ isSale: true, goodsStatus: "receiver_pays", goodsAmount: 15000, feeTiming: "delivery", feeMethod: "cash" }),
      source: "web",
      userId,
      language: "fr",
    });

    await orders.approveOrder(admin, created.id, { grossPrice: 2500 });
    let order = await load(created.id);
    expect(order.status).toBe("approved");
    expect(order.discountAmount).toBe(125);
    expect(order.netPrice).toBe(2375);

    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric }, created.id, "origin", true);
    await orders.markPickedUp({ driver: eric }, created.id);
    order = await load(created.id);
    expect(order.status).toBe("picked_up");
    expect(order.fee.status).toBe("unpaid");

    await expect(orders.markDelivered({ driver: eric }, created.id, "0000" === order.deliveryCode ? "1111" : "0000")).rejects.toMatchObject({ message: "errors.wrongCode", values: { left: 2 } });
    await orders.markDelivered({ driver: eric }, created.id, order.deliveryCode!);
    order = await load(created.id);
    expect(order.status).toBe("delivered");
    expect(order.fee.status).toBe("paid");
    expect(String(order.fee.paidToDriverId)).toBe(String(eric._id));
    expect(order.goods.collected).toBe(true);
    expect(String(order.goods.collectedByDriverId)).toBe(String(eric._id));

    const statusLogs = await ActivityLog.countDocuments({ orderId: order._id, action: "status_changed" });
    expect(statusLogs).toBe(5);
  });

  it("marks the fee paid to the driver at pickup", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    expect((await load(created.id)).netPrice).toBe(2000);
    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric }, created.id, "origin", true);
    await orders.markPickedUp({ driver: eric }, created.id);
    const order = await load(created.id);
    expect(order.fee.status).toBe("paid");
    expect(String(order.fee.paidToDriverId)).toBe(String(eric._id));
  });

  it("locks the code after 3 wrong tries until an admin unlocks it", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric }, created.id, "origin", true);
    await orders.markPickedUp({ driver: eric }, created.id);
    const code = (await load(created.id)).deliveryCode!;
    const wrong = code === "9999" ? "1111" : "9999";
    await expect(orders.markDelivered({ driver: eric }, created.id, wrong)).rejects.toThrow("errors.wrongCode");
    await expect(orders.markDelivered({ driver: eric }, created.id, wrong)).rejects.toThrow("errors.wrongCode");
    await expect(orders.markDelivered({ driver: eric }, created.id, wrong)).rejects.toThrow("errors.codeLocked");
    await expect(orders.markDelivered({ driver: eric }, created.id, code)).rejects.toThrow("errors.codeLocked");
    await orders.unlockCode(admin, created.id);
    await orders.markDelivered({ driver: eric }, created.id, code);
    expect((await load(created.id)).status).toBe("delivered");
  });

  it("lets an admin act for a driver, logged as on behalf", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric, admin }, created.id, "origin", true);
    const log = await ActivityLog.findOne({ orderId: new Types.ObjectId(created.id), toStatus: "driver_confirmed" }).lean();
    expect(log?.actorType).toBe("admin");
    expect(log?.onBehalfOfDriverName).toBe("Eric M.");
  });
});

describe("approval rules", () => {
  it("blocks approval until the receiver is confirmed", async () => {
    const created = await orders.createOrder({ input: input({ feeTiming: "delivery" }), source: "web", language: "fr" });
    expect((await load(created.id)).needsReceiverConfirmation).toBe(true);
    await expect(orders.approveOrder(admin, created.id, { grossPrice: 2000 })).rejects.toThrow("errors.receiverNotConfirmed");
    await orders.approveOrder(admin, created.id, { grossPrice: 2000, receiverConfirmed: true });
    expect((await load(created.id)).receiverConfirmed).toBe(true);
  });

  it("requires the mobile money payment before approving a fee paid at request", async () => {
    const created = await orders.createOrder({ input: input({ feeTiming: "request", feeMethod: "orange_money" }), source: "web", language: "fr" });
    await expect(orders.approveOrder(admin, created.id, { grossPrice: 2000 })).rejects.toThrow("errors.paymentNotReceived");
    await orders.approveOrder(admin, created.id, { grossPrice: 2000, paymentReceived: true });
    const order = await load(created.id);
    expect(order.fee.status).toBe("paid");
    expect(String(order.fee.recordedByAdminId)).toBe(String(admin._id));
  });

  it("logs price changes with old and new values", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    await expect(orders.editPrice(admin, created.id, { grossPrice: 2800, reason: "" })).rejects.toThrow();
    await orders.editPrice(admin, created.id, { grossPrice: 2800, reason: "Extra distance" });
    const log = await ActivityLog.findOne({ action: "price_changed" }).lean();
    expect(log?.details).toMatchObject({ old: { grossPrice: 2000 }, new: { grossPrice: 2800 }, reason: "Extra distance" });
  });
});

describe("assignment", () => {
  it("only allows drivers of the right city", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    await expect(orders.assignDriver(admin, created.id, "origin", String(brice._id))).rejects.toThrow("errors.driverWrongCity");
  });

  it("goes back to approved when the driver declines, and can be reassigned", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric }, created.id, "origin", false);
    expect((await load(created.id)).status).toBe("approved");
    await orders.assignDriver(admin, created.id, "origin", String(samuel._id));
    await expect(orders.respondToJob({ driver: eric }, created.id, "origin", true)).rejects.toThrow("errors.notYourJob");
    expect(await ActivityLog.countDocuments({ action: "driver_declined" })).toBe(1);
  });
});

describe("intercity", () => {
  async function pickedUpIntercity(mode: "to_address" | "collect_at_agency") {
    const created = await orders.createOrder({ input: input({ type: "intercity", intercityMode: mode, destinationCityId: String(buea) }), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 6000, agencyFee: 1500 });
    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric }, created.id, "origin", true);
    await orders.markPickedUp({ driver: eric }, created.id);
    return created.id;
  }
  const drop = { agencyId: "", vehicleNumber: "lt 482 ab", agencyDriverPhone: "699112233", eta: "2030-01-01T16:30" };

  it("requires the agency fee at approval", async () => {
    const created = await orders.createOrder({ input: input({ type: "intercity", intercityMode: "to_address", destinationCityId: String(buea) }), source: "web", language: "fr" });
    await expect(orders.approveOrder(admin, created.id, { grossPrice: 6000 })).rejects.toMatchObject({ fields: { agencyFee: "errors.required" } });
  });

  it("locks the drop until the destination driver is assigned, and needs an ETA and a valid agency", async () => {
    const id = await pickedUpIntercity("to_address");
    await expect(orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId })).rejects.toThrow("errors.destinationDriverMissing");
    await orders.assignDriver(admin, id, "destination", String(brice._id));
    await expect(orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId, eta: "" })).rejects.toThrow();
    const otherAgency = await Agency.create({ name: "Only Douala", branches: [{ cityId: douala, address: "" }, { cityId: yaounde, address: "" }] });
    await expect(orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId: String(otherAgency._id) })).rejects.toMatchObject({ fields: { agencyId: "errors.agencyRoute" } });
    await orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId });
    const order = await load(id);
    expect(order.status).toBe("dropped_at_agency");
    expect(order.handover.vehicleNumber).toBe("LT 482 AB");
    expect(order.handover.registeredUnderName).toBe("Brice N.");
  });

  it("runs delivery to the address with two drivers", async () => {
    const id = await pickedUpIntercity("to_address");
    await orders.assignDriver(admin, id, "destination", String(brice._id));
    await orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId });
    await orders.confirmDrop(admin, id);
    expect((await load(id)).handover.originPhotoConfirmed).toBe(true);
    await orders.markArrivedAtAgency(admin, id);
    await expect(orders.markCollectedAtDestination({ driver: brice }, id)).rejects.toThrow("errors.confirmJobFirst");
    await orders.respondToJob({ driver: brice }, id, "destination", true);
    await orders.markCollectedAtDestination({ driver: brice }, id);
    await expect(orders.markDelivered({ driver: eric }, id, "1234")).rejects.toThrow("errors.notYourJob");
    const code = (await load(id)).deliveryCode!;
    await orders.markDelivered({ driver: brice }, id, code);
    expect((await load(id)).status).toBe("delivered");
  });

  it("ends at the agency when the receiver collects, set delivered by the admin", async () => {
    const id = await pickedUpIntercity("collect_at_agency");
    await orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId });
    expect((await load(id)).handover.registeredUnderName).toBe("Paul Kamga");
    await orders.confirmDrop(admin, id);
    await orders.markArrivedAtAgency(admin, id);
    await orders.markDeliveredAtAgency(admin, id);
    expect((await load(id)).status).toBe("delivered");
  });

  it("lists the job as finished for the origin driver once dropped", async () => {
    const id = await pickedUpIntercity("collect_at_agency");
    await orders.markDroppedAtAgency({ driver: eric }, id, { ...drop, agencyId });
    const jobs = await listDriverJobs(eric._id);
    expect(jobs.active).toHaveLength(0);
    expect(jobs.done.map((job) => job.id)).toContain(id);
  });
});

describe("exits", () => {
  it("cancels only before pickup and fails only after", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await expect(orders.failOrder(admin, created.id, "No reason")).rejects.toThrow("errors.wrongStatus");
    await expect(orders.cancelOrder(admin, created.id, " ")).rejects.toThrow();
    await orders.cancelOrder(admin, created.id, "Customer declined the price");
    const order = await load(created.id);
    expect(order.status).toBe("cancelled");
    expect(order.cancelReason).toBe("Customer declined the price");
  });

  it("raises and clears an issue without changing the status", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.setIssue(admin, created.id, true, "Late");
    let order = await load(created.id);
    expect(order.issue.open).toBe(true);
    expect(order.status).toBe("requested");
    await orders.setIssue(admin, created.id, false, "");
    order = await load(created.id);
    expect(order.issue.open).toBe(false);
  });
});

describe("public tracking and guest code", () => {
  it("shows a reduced view, then only 'expired' once finished", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    const order = await load(created.id);
    const view = await getTracking(order.trackingCode);
    expect(view.state).toBe("active");
    const text = JSON.stringify(view);
    expect(text).not.toContain("677123456");
    expect(text).not.toContain("699001122");
    expect(text).not.toContain(order.deliveryCode!);
    expect(text).not.toContain("2000");
    expect(text).not.toContain("Rue des Palmiers");
    await orders.cancelOrder(admin, created.id, "Test");
    expect(await getTracking(order.trackingCode)).toEqual({ state: "expired" });
    expect(await getTracking("NOTAREALCODE")).toEqual({ state: "not_found" });
  });

  it("shows the guest the code once, after the driver confirmed", async () => {
    const created = await orders.createOrder({ input: input(), source: "web", language: "fr" });
    const token = created.guestToken!;
    expect((await getGuestOrder(token))!.view.deliveryCode).toBeNull();
    await orders.approveOrder(admin, created.id, { grossPrice: 2000 });
    await orders.assignDriver(admin, created.id, "origin", String(eric._id));
    await orders.respondToJob({ driver: eric }, created.id, "origin", true);
    expect((await getGuestOrder(token, { reveal: false }))!.view.deliveryCode).toBeNull();
    const first = await getGuestOrder(token);
    expect(first!.view.deliveryCode).toMatch(/^\d{4}$/);
    const second = await getGuestOrder(token);
    expect(second!.view.deliveryCode).toBeNull();
    expect(second!.codeAlreadyShown).toBe(true);
  });
});
