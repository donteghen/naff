// Reports: analysis over time. Trends per period, this period against the previous one,
// and the tables the business asked for. Computed in plain code from the orders of the window
// (volumes are small for an MVP; move to aggregations if it ever gets slow).

import { addDays, dayKey, dayRange, minutesBetween, startOfDay } from "@/lib/dates";
import { areaName } from "@/lib/location";
import { connectDb } from "../db";
import { Order, type OrderDoc } from "../models/Order";

export type Granularity = "day" | "week" | "month";
const BUCKETS = 8;

type Period = { key: string; start: Date; end: Date };

/** The last 8 periods (oldest first), the last one containing today. */
export function buildPeriods(granularity: Granularity, today: string = dayKey()): Period[] {
  const periods: Period[] = [];
  if (granularity === "day") {
    for (let i = BUCKETS - 1; i >= 0; i--) {
      const key = addDays(today, -i);
      const range = dayRange(key, key);
      periods.push({ key, ...range });
    }
  } else if (granularity === "week") {
    const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    const monday = addDays(today, -weekday);
    for (let i = BUCKETS - 1; i >= 0; i--) {
      const first = addDays(monday, -7 * i);
      periods.push({ key: first, ...dayRange(first, addDays(first, 6)) });
    }
  } else {
    const [year, month] = today.split("-").map(Number);
    for (let i = BUCKETS - 1; i >= 0; i--) {
      const date = new Date(Date.UTC(year, month - 1 - i, 1));
      const first = date.toISOString().slice(0, 10);
      const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
      periods.push({ key: first.slice(0, 7), start: startOfDay(first), end: startOfDay(next) });
    }
  }
  return periods;
}

function within(date: Date | null | undefined, period: Period) {
  return Boolean(date) && date! >= period.start && date! < period.end;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Percentage change, or null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function periodFigures(orders: OrderDoc[], period: Period) {
  const created = orders.filter((order) => within(order.createdAt, period));
  const delivered = orders.filter((order) => order.status === "delivered" && within(order.statusTimes?.delivered, period));
  const revenue = delivered.reduce((sum, order) => sum + (order.netPrice ?? 0), 0);
  const agencyFees = delivered.reduce((sum, order) => sum + (order.agencyFee ?? 0), 0);
  const cancelled = orders.filter((order) => order.status === "cancelled" && within(order.statusTimes?.cancelled, period)).length;
  const failed = orders.filter((order) => order.status === "failed" && within(order.statusTimes?.failed, period)).length;
  const approvalMinutes = created.filter((order) => order.approvedAt).map((order) => minutesBetween(order.createdAt, order.approvedAt!));
  const deliveryMinutes = delivered.map((order) => minutesBetween(order.createdAt, order.statusTimes.delivered!));
  return {
    requests: created.length,
    delivered: delivered.length,
    revenue,
    margin: revenue - agencyFees,
    cancelled,
    failed,
    completionRate: created.length ? Math.round((created.filter((order) => order.status === "delivered").length / created.length) * 100) : 0,
    webShare: created.length ? Math.round((created.filter((order) => order.source === "web").length / created.length) * 100) : 0,
    avgApprovalMinutes: average(approvalMinutes),
    avgDeliveryMinutes: average(deliveryMinutes),
  };
}

function topCounts(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, count]) => ({ label, count }));
}

function route(order: OrderDoc) {
  if (order.type === "intercity") return `${order.originCityName} → ${order.destinationCityName}`;
  return `${areaName(order.pickup.text)} → ${areaName(order.dropoff.text)}`;
}

export async function getReports(granularity: Granularity) {
  await connectDb();
  const periods = buildPeriods(granularity);
  const windowStart = periods[0].start;
  const orders = await Order.find({
    $or: [{ createdAt: { $gte: windowStart } }, { updatedAt: { $gte: windowStart } }],
  })
    .select("number type source userId sender pickup dropoff originCityName destinationCityName status statusTimes createdAt approvedAt netPrice agencyFee cancelReason failReason handover")
    .lean();

  const trend = periods.map((period) => ({ key: period.key, ...periodFigures(orders, period) }));
  const current = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const currentPeriod = periods[periods.length - 1];
  const inCurrent = orders.filter((order) => within(order.createdAt, currentPeriod));

  // Customers: by sender phone, over the whole window.
  const windowOrders = orders.filter((order) => order.createdAt >= windowStart);
  const bySender = new Map<string, { name: string; count: number; spent: number }>();
  for (const order of windowOrders) {
    const entry = bySender.get(order.sender.phone) ?? { name: order.sender.name, count: 0, spent: 0 };
    entry.count += 1;
    if (order.status === "delivered") entry.spent += order.netPrice ?? 0;
    bySender.set(order.sender.phone, entry);
  }
  const customers = [...bySender.entries()].map(([phone, entry]) => ({ phone, ...entry }));
  const repeatRate = customers.length ? Math.round((customers.filter((customer) => customer.count > 1).length / customers.length) * 100) : 0;

  // Intercity: time at agencies and margin per route, over the whole window.
  const intercityDone = windowOrders.filter((order) => order.type === "intercity" && order.status === "delivered");
  const agencyMinutes = windowOrders
    .filter((order) => order.statusTimes?.in_transit && order.handover?.arrivedAt)
    .map((order) => minutesBetween(order.statusTimes.in_transit!, order.handover.arrivedAt!));
  const lateArrivals = windowOrders.filter((order) => order.handover?.eta && order.handover?.arrivedAt && order.handover.arrivedAt > order.handover.eta).length;
  const routeMargins = new Map<string, { deliveries: number; revenue: number; agencyFees: number }>();
  for (const order of intercityDone) {
    const key = route(order);
    const entry = routeMargins.get(key) ?? { deliveries: 0, revenue: 0, agencyFees: 0 };
    entry.deliveries += 1;
    entry.revenue += order.netPrice ?? 0;
    entry.agencyFees += order.agencyFee ?? 0;
    routeMargins.set(key, entry);
  }

  return {
    granularity,
    trend,
    current,
    previous,
    changes: {
      requests: change(current.requests, previous.requests),
      delivered: change(current.delivered, previous.delivered),
      revenue: change(current.revenue, previous.revenue),
      margin: change(current.margin, previous.margin),
    },
    topRoutes: topCounts(inCurrent.map(route)),
    topPickupAreas: topCounts(inCurrent.map((order) => `${order.originCityName} · ${areaName(order.pickup.text)}`), 6),
    topDropoffAreas: topCounts(inCurrent.map((order) => `${order.destinationCityName} · ${areaName(order.dropoff.text)}`), 6),
    topCustomers: customers.sort((a, b) => b.count - a.count || b.spent - a.spent).slice(0, 8),
    repeatRate,
    customersCount: customers.length,
    avgTimeAtAgencyMinutes: average(agencyMinutes),
    lateArrivals,
    cancelReasons: topCounts(windowOrders.filter((order) => order.status === "cancelled").map((order) => order.cancelReason || "—")),
    failReasons: topCounts(windowOrders.filter((order) => order.status === "failed").map((order) => order.failReason || "—")),
    routeMargins: [...routeMargins.entries()]
      .map(([label, entry]) => ({ label, ...entry, margin: entry.revenue - entry.agencyFees }))
      .sort((a, b) => b.deliveries - a.deliveries),
  };
}
export type Reports = Awaited<ReturnType<typeof getReports>>;
