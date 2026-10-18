export const LANGUAGES = ["fr", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const ORDER_STATUSES = [
  "requested",
  "approved",
  "assigned",
  "driver_confirmed",
  "picked_up",
  "dropped_at_agency",
  "in_transit",
  "arrived_at_agency_b",
  "collected_at_destination",
  "delivered",
  "cancelled",
  "failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled", "failed"];
export const CANCELLABLE_STATUSES: OrderStatus[] = ["requested", "approved", "assigned", "driver_confirmed"];
export const FAILABLE_STATUSES: OrderStatus[] = [
  "picked_up",
  "dropped_at_agency",
  "in_transit",
  "arrived_at_agency_b",
  "collected_at_destination",
];

export const ORDER_TYPES = ["local", "intercity"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const INTERCITY_MODES = ["to_address", "collect_at_agency"] as const;
export type IntercityMode = (typeof INTERCITY_MODES)[number];

export const PARCEL_SIZES = ["envelope", "small", "medium", "large", "bulky"] as const;
export type ParcelSize = (typeof PARCEL_SIZES)[number];

export const PARCEL_CATEGORIES = ["documents", "clothes", "electronics", "food", "cosmetics", "spare_parts", "medicine", "other"] as const;
export type ParcelCategory = (typeof PARCEL_CATEGORIES)[number];

/** When the delivery fee is paid. */
export const FEE_TIMINGS = ["request", "pickup", "delivery"] as const;
export type FeeTiming = (typeof FEE_TIMINGS)[number];

export const PAYMENT_METHODS = ["cash", "mtn_momo", "orange_money"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const MOBILE_MONEY_METHODS: PaymentMethod[] = ["mtn_momo", "orange_money"];

export const GOODS_STATUSES = ["already_paid", "receiver_pays"] as const;
export type GoodsStatus = (typeof GOODS_STATUSES)[number];

export const AUDIENCES = ["user", "driver", "panel"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const ACTOR_TYPES = ["user", "guest", "driver", "admin", "system"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const USER_PIN_LENGTH = 4;
export const DRIVER_PIN_LENGTH = 4;
export const ADMIN_PIN_LENGTH = 6;

export const PAGE_SIZE = 30;

/** Cookie that keeps the private links of guest orders made on this device. */
export const GUEST_COOKIE = "guest_orders";
