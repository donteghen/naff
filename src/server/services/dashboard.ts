// Dashboard: the state of affairs for a chosen date range. No comparisons (that is the Reports page).

import { FINAL_STATUSES, ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { dayRange } from "@/lib/dates";
import { connectDb } from "../db";
import { Agency } from "../models/Agency";
import { City } from "../models/City";
import { Driver } from "../models/Driver";
import { Order } from "../models/Order";
import { User } from "../models/User";

function inRange(date: Date | null | undefined, start: Date, end: Date) {
  return Boolean(date) && date! >= start && date! < end;
}

export async function getDashboard(from: string, to: string) {
  await connectDb();
  const { start, end } = dayRange(from, to);

  // Orders created in the range, and orders whose money moved in the range.
  const created = await Order.find({ createdAt: { $gte: start, $lt: end } })
    .select("status type source userId issue")
    .lean();
  const moneyOrders = await Order.find({
    $or: [
      { "statusTimes.delivered": { $gte: start, $lt: end } },
      { "fee.paidAt": { $gte: start, $lt: end } },
      { "goods.collectedAt": { $gte: start, $lt: end } },
    ],
  })
    .select("status statusTimes grossPrice discountAmount netPrice agencyFee fee goods")
    .lean();

  const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
  for (const order of created) byStatus[order.status] += 1;
  const running = created.filter((order) => !FINAL_STATUSES.includes(order.status) && order.status !== "requested").length;

  const money = { gross: 0, discounts: 0, net: 0, agencyFees: 0, margin: 0, feesByDrivers: 0, feesAtRequest: 0, goodsCollected: 0 };
  for (const order of moneyOrders) {
    if (order.status === "delivered" && inRange(order.statusTimes?.delivered, start, end)) {
      money.gross += order.grossPrice ?? 0;
      money.discounts += order.discountAmount ?? 0;
      money.net += order.netPrice ?? 0;
      money.agencyFees += order.agencyFee ?? 0;
    }
    if (order.fee.status === "paid" && inRange(order.fee.paidAt, start, end)) {
      if (order.fee.paidToDriverId) money.feesByDrivers += order.netPrice ?? 0;
      if (order.fee.timing === "request") money.feesAtRequest += order.netPrice ?? 0;
    }
    if (order.goods.collected && inRange(order.goods.collectedAt, start, end)) money.goodsCollected += order.goods.amount;
  }
  money.margin = money.net - money.agencyFees;

  // "Right now" figures, whatever the range.
  const now = new Date();
  const inTransit = await Order.countDocuments({ status: "in_transit" });
  const etaPassed = await Order.countDocuments({ status: "in_transit", "handover.eta": { $lt: now } });
  const awaitingCollection = await Order.countDocuments({ status: "arrived_at_agency_b" });
  const goodsNotHanded = await Order.aggregate<{ total: number; count: number }>([
    { $match: { "goods.collected": true, "goods.handedToSeller": { $ne: true } } },
    { $group: { _id: null, total: { $sum: "$goods.amount" }, count: { $sum: 1 } } },
  ]);
  const issuesOpen = await Order.countDocuments({ "issue.open": true, status: { $nin: FINAL_STATUSES } });

  const drivers = await Driver.find({ active: true }).select("_id available").lean();
  const busyIds = new Set(
    (
      await Order.find({ status: { $nin: FINAL_STATUSES } })
        .select("originDriverId destinationDriverId")
        .lean()
    ).flatMap((order) => [order.originDriverId, order.destinationDriverId].filter(Boolean).map(String)),
  );
  const driversOnJob = drivers.filter((driver) => busyIds.has(String(driver._id))).length;
  const driversAvailable = drivers.filter((driver) => driver.available && !busyIds.has(String(driver._id))).length;

  return {
    orders: {
      total: created.length,
      byStatus,
      running,
      issuesOpen,
    },
    intercity: { inTransit, etaPassed, awaitingCollection },
    money,
    goodsNotHanded: { total: goodsNotHanded[0]?.total ?? 0, count: goodsNotHanded[0]?.count ?? 0 },
    people: {
      driversActive: drivers.length,
      driversAvailable,
      driversOnJob,
      driversOffline: drivers.length - driversAvailable - driversOnJob,
      cities: await City.countDocuments({ active: true }),
      agencies: await Agency.countDocuments({ active: true }),
      newUsers: await User.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    },
    split: {
      local: created.filter((order) => order.type === "local").length,
      intercity: created.filter((order) => order.type === "intercity").length,
      web: created.filter((order) => order.source === "web").length,
      admin: created.filter((order) => order.source === "admin").length,
      registered: created.filter((order) => order.userId).length,
      guest: created.filter((order) => order.source === "web" && !order.userId).length,
    },
  };
}
export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
