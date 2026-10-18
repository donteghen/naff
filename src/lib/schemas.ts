import { z } from "zod";
import {
  FEE_TIMINGS,
  GOODS_STATUSES,
  INTERCITY_MODES,
  ORDER_TYPES,
  PARCEL_CATEGORIES,
  PARCEL_SIZES,
  PAYMENT_METHODS,
} from "./constants";

// Shapes of the forms. Business rules (which combinations are allowed) live in the order service.

const text = (max: number) => z.string().trim().min(1, "errors.required").max(max, "errors.tooLong");
const amount = z.coerce.number({ invalid_type_error: "errors.amount" }).int("errors.amount").min(0, "errors.amount").max(100_000_000, "errors.amount");

export const placeSchema = z.object({
  text: text(300),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

export const personSchema = z.object({
  name: text(80),
  phone: z.string().trim().min(1, "errors.required"),
});

export const orderInputSchema = z.object({
  type: z.enum(ORDER_TYPES),
  intercityMode: z.enum(INTERCITY_MODES).nullable(),
  originCityId: z.string().min(1, "errors.required"),
  destinationCityId: z.string().min(1, "errors.required"),
  isSale: z.boolean(),
  goodsStatus: z.enum(GOODS_STATUSES).nullable(),
  goodsAmount: amount.optional().default(0),
  feeTiming: z.enum(FEE_TIMINGS),
  feeMethod: z.enum(PAYMENT_METHODS),
  size: z.enum(PARCEL_SIZES),
  category: z.enum(PARCEL_CATEGORIES),
  contents: text(300),
  itemCount: z.coerce.number({ invalid_type_error: "errors.number" }).int("errors.number").min(1, "errors.number").max(999, "errors.number"),
  estimatedValue: amount.nullable().optional(),
  declarationAccepted: z.literal(true, { errorMap: () => ({ message: "errors.declaration" }) }),
  pickup: placeSchema,
  dropoff: placeSchema,
  sender: personSchema,
  receiver: personSchema,
});
export type OrderInput = z.input<typeof orderInputSchema>;

export const approveSchema = z.object({
  grossPrice: z.coerce.number({ invalid_type_error: "errors.amount" }).int("errors.amount").min(1, "errors.amount").max(10_000_000, "errors.amount"),
  agencyFee: amount.nullable().optional(),
  pickupTime: z.string().trim().max(60, "errors.tooLong").optional().default(""),
  receiverConfirmed: z.boolean().optional().default(false),
  paymentReceived: z.boolean().optional().default(false),
});
export type ApproveInput = z.input<typeof approveSchema>;

export const priceEditSchema = z.object({
  grossPrice: z.coerce.number({ invalid_type_error: "errors.amount" }).int("errors.amount").min(1, "errors.amount").max(10_000_000, "errors.amount"),
  agencyFee: amount.nullable().optional(),
  reason: text(200),
});
export type PriceEditInput = z.input<typeof priceEditSchema>;

export const detailsEditSchema = z.object({
  sender: personSchema,
  receiver: personSchema,
  pickup: placeSchema,
  dropoff: placeSchema,
  size: z.enum(PARCEL_SIZES),
  category: z.enum(PARCEL_CATEGORIES),
  contents: text(300),
  itemCount: z.coerce.number({ invalid_type_error: "errors.number" }).int("errors.number").min(1, "errors.number").max(999, "errors.number"),
  pickupTime: z.string().trim().max(60, "errors.tooLong").optional().default(""),
});
export type DetailsEditInput = z.input<typeof detailsEditSchema>;

export const paymentEditSchema = z.object({
  isSale: z.boolean(),
  goodsStatus: z.enum(GOODS_STATUSES).nullable(),
  goodsAmount: amount.optional().default(0),
  feeTiming: z.enum(FEE_TIMINGS),
  feeMethod: z.enum(PAYMENT_METHODS),
  reason: text(200),
});
export type PaymentEditInput = z.input<typeof paymentEditSchema>;

export const dropSchema = z.object({
  agencyId: z.string().min(1, "errors.required"),
  vehicleNumber: text(30),
  agencyDriverPhone: z.string().trim().min(1, "errors.required"),
  eta: z.string().min(1, "errors.etaRequired"),
});
export type DropInput = z.input<typeof dropSchema>;

export const reasonSchema = z.object({ reason: text(300) });
