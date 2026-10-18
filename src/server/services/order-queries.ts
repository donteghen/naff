// Reading orders for each screen. Writes live in orders.ts.

import { Types } from "mongoose";
import { FINAL_STATUSES, PAGE_SIZE, type OrderStatus } from "@/lib/constants";
import { isTrackingCodeShape } from "@/lib/codes";
import { dayKey, dayRange } from "@/lib/dates";
import { normalizePhone } from "@/lib/phone";
import { hasReached } from "@/lib/order-steps";
import { connectDb } from "../db";
import { ActivityLog } from "../models/ActivityLog";
import { City } from "../models/City";
import { Driver } from "../models/Driver";
import { Order, type OrderDoc } from "../models/Order";
import { adminOrderView, driverJobView, senderOrderView, trackingView } from "./order-views";
import { agenciesForRoute } from "./places";

const ACTIVE_FILTER = { status: { $nin: FINAL_STATUSES } };
const INTERCITY_FOLLOW_UP: OrderStatus[] = ["dropped_at_agency", "in_transit", "arrived_at_agency_b"];

/** Driver id → name and phone, for every driver mentioned in these orders. */
async function driverNames(orders: OrderDoc[]) {
  const ids = new Set<string>();
  for (const order of orders) {
    for (const id of [order.originDriverId, order.destinationDriverId, order.fee.paidToDriverId, order.goods.collectedByDriverId, order.goods.handedByDriverId]) {
      if (id) ids.add(String(id));
    }
  }
  if (ids.size === 0) return {};
  const drivers = await Driver.find({ _id: { $in: [...ids] } }).select("name phone").lean();
  return Object.fromEntries(drivers.map((driver) => [String(driver._id), { name: driver.name, phone: driver.phone }]));
}

async function adminViews(orders: OrderDoc[]) {
  const names = await driverNames(orders);
  return orders.map((order) => adminOrderView(order, names));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type QueueFilter = "all" | "requested" | "active" | "issues";

/** Live queue: every unfinished order, plus those finished today. */
export async function listQueue(filter: QueueFilter) {
  await connectDb();
  const today = dayRange(dayKey(), dayKey());
  const base = { $or: [ACTIVE_FILTER, { updatedAt: { $gte: today.start } }] };
  const counts = {
    all: await Order.countDocuments(base),
    requested: await Order.countDocuments({ status: "requested" }),
    active: await Order.countDocuments({ status: { $nin: [...FINAL_STATUSES, "requested"] } }),
    issues: await Order.countDocuments({ "issue.open": true, ...ACTIVE_FILTER }),
  };
  let query: Record<string, unknown> = base;
  if (filter === "requested") query = { status: "requested" };
  if (filter === "active") query = { status: { $nin: [...FINAL_STATUSES, "requested"] } };
  if (filter === "issues") query = { "issue.open": true, ...ACTIVE_FILTER };
  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(200).lean();
  return { orders: await adminViews(orders), counts };
}

export async function listInTransit(etaPassedOnly: boolean) {
  await connectDb();
  const orders = await Order.find({ type: "intercity", status: { $in: INTERCITY_FOLLOW_UP } }).sort({ "handover.eta": 1 }).lean();
  const views = await adminViews(orders);
  const etaPassedCount = views.filter((order) => order.etaPassed).length;
  return { orders: etaPassedOnly ? views.filter((order) => order.etaPassed) : views, etaPassedCount, total: views.length };
}

export type OrderSearch = {
  q?: string;
  status?: string;
  type?: string;
  cityId?: string;
  source?: string;
  from?: string;
  to?: string;
  issue?: boolean;
  userId?: string;
  driverId?: string;
  page?: number;
};

export async function searchOrders(search: OrderSearch) {
  await connectDb();
  const query: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  const q = search.q?.trim();
  if (q) {
    const number = Number(q.replace(/^NF-?/i, ""));
    const phone = normalizePhone(q);
    const or: Record<string, unknown>[] = [
      { "sender.name": { $regex: escapeRegex(q), $options: "i" } },
      { "receiver.name": { $regex: escapeRegex(q), $options: "i" } },
      { trackingCode: q.toUpperCase() },
    ];
    if (Number.isInteger(number) && number > 0) or.push({ number });
    if (phone) or.push({ "sender.phone": phone }, { "receiver.phone": phone });
    and.push({ $or: or });
  }
  if (search.status) query.status = search.status;
  if (search.type) query.type = search.type;
  if (search.source) query.source = search.source;
  if (search.issue) query["issue.open"] = true;
  if (search.cityId && Types.ObjectId.isValid(search.cityId)) and.push({ $or: [{ originCityId: search.cityId }, { destinationCityId: search.cityId }] });
  if (search.userId && Types.ObjectId.isValid(search.userId)) query.userId = search.userId;
  if (search.driverId && Types.ObjectId.isValid(search.driverId)) and.push({ $or: [{ originDriverId: search.driverId }, { destinationDriverId: search.driverId }] });
  if (search.from || search.to) {
    const range = dayRange(search.from || "2000-01-01", search.to || dayKey());
    query.createdAt = { $gte: range.start, $lt: range.end };
  }
  if (and.length > 0) query.$and = and;

  const page = Math.max(1, search.page ?? 1);
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean();
  return { orders: await adminViews(orders), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type DriverOption = {
  id: string;
  name: string;
  phone: string;
  cityId: string;
  cityName: string;
  available: boolean;
  active: boolean;
  currentJobs: { id: string; number: number; route: string }[];
};

/** Drivers with their city, availability and unfinished jobs (assignment screen, drivers page). */
export async function listDriversWithJobs(options: { cityIds?: string[]; includeInactive?: boolean } = {}): Promise<DriverOption[]> {
  await connectDb();
  const query: Record<string, unknown> = {};
  if (!options.includeInactive) query.active = true;
  if (options.cityIds) query.cityId = { $in: options.cityIds };
  const drivers = await Driver.find(query).sort({ name: 1 }).lean();
  const cities = await City.find().lean();
  const cityName = Object.fromEntries(cities.map((city) => [String(city._id), city.name]));
  const ids = drivers.map((driver) => driver._id);
  const jobs = await Order.find({
    ...ACTIVE_FILTER,
    $or: [{ originDriverId: { $in: ids } }, { destinationDriverId: { $in: ids } }],
  })
    .select("number type originDriverId destinationDriverId pickup dropoff status")
    .lean();

  return drivers.map((driver) => {
    const id = String(driver._id);
    // The origin driver of an intercity order is done once the parcel is at the agency.
    const mine = jobs.filter(
      (job) =>
        (String(job.originDriverId) === id && !(job.type === "intercity" && hasReached(job.status, "dropped_at_agency"))) ||
        String(job.destinationDriverId) === id,
    );
    return {
      id: String(driver._id),
      name: driver.name,
      phone: driver.phone,
      cityId: String(driver.cityId),
      cityName: cityName[String(driver.cityId)] ?? "?",
      available: driver.available,
      active: driver.active,
      currentJobs: mine.map((job) => ({ id: String(job._id), number: job.number, route: `${shortPlace(job.pickup.text)} → ${shortPlace(job.dropoff.text)}` })),
    };
  });
}

function shortPlace(text: string) {
  return text.split(/[,\n]/)[0].trim().slice(0, 24);
}

export async function getAdminOrder(orderId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(orderId)) return null;
  const order = await Order.findById(orderId).lean();
  if (!order) return null;
  const [view] = await adminViews([order]);
  const activity = await ActivityLog.find({ orderId: order._id }).sort({ at: -1 }).limit(200).lean();
  const cityIds = [String(order.originCityId), String(order.destinationCityId)];
  const drivers = await listDriversWithJobs({ cityIds });
  const agencies = order.type === "intercity" ? await agenciesForRoute(order.originCityId, order.destinationCityId) : [];
  return {
    order: view,
    activity: activity.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      actorType: entry.actorType,
      actorName: entry.actorName,
      onBehalfOfDriverName: entry.onBehalfOfDriverName,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      details: JSON.parse(JSON.stringify(entry.details ?? {})) as Record<string, unknown>,
      at: entry.at.toISOString(),
    })),
    drivers,
    agencies,
  };
}

// ---------------------------------------------------------------------------
// Driver app
// ---------------------------------------------------------------------------

export async function listDriverJobs(driverId: Types.ObjectId) {
  await connectDb();
  const id = String(driverId);
  const since = new Date(startOfToday().getTime() - 6 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    $or: [{ originDriverId: driverId }, { destinationDriverId: driverId }],
    $and: [{ $or: [ACTIVE_FILTER, { updatedAt: { $gte: since } }] }],
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  const names = await driverNames(orders);

  const awaiting = [];
  const active = [];
  const done = [];
  for (const order of orders) {
    const role = String(order.originDriverId) === id ? "origin" : "destination";
    const job = driverJobView(order, role, id, names);
    const finished = FINAL_STATUSES.includes(order.status) || (role === "origin" && order.type === "intercity" && hasReached(order.status, "dropped_at_agency"));
    if (finished) done.push(job);
    else if (!job.confirmed) awaiting.push(job);
    else active.push(job);
  }
  const todayStart = startOfToday();
  const doneToday = done.filter((job) => {
    const finishedAt = job.statusTimes.delivered ?? job.statusTimes.failed ?? job.statusTimes.cancelled ?? job.statusTimes.dropped_at_agency;
    return finishedAt && new Date(finishedAt) >= todayStart;
  });
  return { awaiting, active, done, doneToday };
}

function startOfToday() {
  return dayRange(dayKey(), dayKey()).start;
}

export async function getDriverJob(driverId: Types.ObjectId, orderId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(orderId)) return null;
  const order = await Order.findById(orderId).lean();
  if (!order) return null;
  const id = String(driverId);
  let role: "origin" | "destination" | null = null;
  if (String(order.originDriverId) === id) role = "origin";
  else if (String(order.destinationDriverId) === id) role = "destination";
  if (!role) return null;
  const names = await driverNames([order]);
  const agencies = role === "origin" && order.type === "intercity" ? await agenciesForRoute(order.originCityId, order.destinationCityId) : [];
  return { job: driverJobView(order, role, id, names), agencies };
}

// ---------------------------------------------------------------------------
// Customer site
// ---------------------------------------------------------------------------

export async function listUserOrders(userId: Types.ObjectId) {
  await connectDb();
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(100).lean();
  return orders.map((order) => senderOrderView(order, { showCode: true }));
}

export async function getUserOrder(userId: Types.ObjectId, number: number) {
  await connectDb();
  const order = await Order.findOne({ userId, number }).lean();
  return order ? senderOrderView(order, { showCode: true }) : null;
}

/**
 * Guest order page. The delivery code is shown once: the first time the page is loaded
 * after the driver confirmed. Later loads never show it again.
 */
export async function getGuestOrder(token: string, options: { reveal: boolean } = { reveal: true }) {
  await connectDb();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const order = await Order.findOne({ guestToken: token }).lean();
  if (!order) return null;
  let showCode = false;
  if (options.reveal && order.deliveryCode && hasReached(order.status, "driver_confirmed") && !order.guestCodeShownAt) {
    const updated = await Order.updateOne({ _id: order._id, guestCodeShownAt: null }, { $set: { guestCodeShownAt: new Date() } });
    showCode = updated.modifiedCount === 1;
  }
  return { view: senderOrderView(order, { showCode }), codeAlreadyShown: Boolean(order.guestCodeShownAt) };
}

export async function getTracking(code: string) {
  await connectDb();
  const clean = code.trim().toUpperCase();
  if (!isTrackingCodeShape(clean)) return trackingView(null);
  const order = await Order.findOne({ trackingCode: clean })
    .select("number type intercityMode originCityName destinationCityName pickup.text dropoff.text status statusTimes fee.status handover")
    .lean();
  return trackingView(order as OrderDoc | null);
}

