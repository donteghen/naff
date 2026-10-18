import type { IntercityMode, OrderStatus, OrderType } from "./constants";

/** The normal journey of an order, in order, depending on its type. */
export function journeySteps(type: OrderType, intercityMode: IntercityMode | null): OrderStatus[] {
  const start: OrderStatus[] = ["requested", "approved", "assigned", "driver_confirmed", "picked_up"];
  if (type === "local") return [...start, "delivered"];
  const agency: OrderStatus[] = ["dropped_at_agency", "in_transit", "arrived_at_agency_b"];
  if (intercityMode === "collect_at_agency") return [...start, ...agency, "delivered"];
  return [...start, ...agency, "collected_at_destination", "delivered"];
}

/** Position of a status in the full journey, to compare "before / after". Exits rank last. */
const RANK: Record<OrderStatus, number> = {
  requested: 0,
  approved: 1,
  assigned: 2,
  driver_confirmed: 3,
  picked_up: 4,
  dropped_at_agency: 5,
  in_transit: 6,
  arrived_at_agency_b: 7,
  collected_at_destination: 8,
  delivered: 9,
  cancelled: 10,
  failed: 10,
};

export function hasReached(status: OrderStatus, step: OrderStatus): boolean {
  if (status === "cancelled" || status === "failed") return false;
  return RANK[status] >= RANK[step];
}

export function isFinal(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled" || status === "failed";
}

/** Statuses where the parcel is with us but not delivered yet. */
export function isRunning(status: OrderStatus): boolean {
  return !isFinal(status) && status !== "requested";
}
