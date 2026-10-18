import { Schema, model, models, type Model, type Types } from "mongoose";
import type {
  FeeTiming,
  GoodsStatus,
  IntercityMode,
  OrderStatus,
  OrderType,
  ParcelCategory,
  ParcelSize,
  PaymentMethod,
} from "@/lib/constants";

export type PlaceDoc = { text: string; lat: number | null; lng: number | null };
export type PersonDoc = { name: string; phone: string };

export type FeeDoc = {
  payer: "sender" | "receiver";
  timing: FeeTiming;
  method: PaymentMethod;
  status: "unpaid" | "paid";
  paidAt: Date | null;
  paidToDriverId: Types.ObjectId | null;
  recordedByAdminId: Types.ObjectId | null;
};

export type GoodsDoc = {
  isSale: boolean;
  status: GoodsStatus | null;
  amount: number;
  collected: boolean;
  collectedByDriverId: Types.ObjectId | null;
  collectedAt: Date | null;
  handedToSeller: boolean | null;
  handedByDriverId: Types.ObjectId | null;
};

export type HandoverDoc = {
  agencyId: Types.ObjectId | null;
  agencyName: string;
  vehicleNumber: string;
  agencyDriverPhone: string;
  registeredUnderName: string;
  registeredUnderPhone: string;
  eta: Date | null;
  droppedAt: Date | null;
  originPhotoConfirmed: boolean;
  destinationPhotoConfirmed: boolean;
  arrivedAt: Date | null;
};

export type OrderDoc = {
  _id: Types.ObjectId;
  number: number;
  trackingCode: string;
  deliveryCode: string | null;
  guestToken: string | null;
  source: "web" | "admin";
  userId: Types.ObjectId | null;
  createdByAdminId: Types.ObjectId | null;

  type: OrderType;
  intercityMode: IntercityMode | null;
  originCityId: Types.ObjectId;
  originCityName: string;
  destinationCityId: Types.ObjectId;
  destinationCityName: string;

  sender: PersonDoc;
  receiver: PersonDoc;
  pickup: PlaceDoc;
  dropoff: PlaceDoc;

  parcel: {
    size: ParcelSize;
    category: ParcelCategory;
    contents: string;
    itemCount: number;
    estimatedValue: number | null;
    declarationAccepted: boolean;
  };

  grossPrice: number | null;
  discountRate: number;
  discountAmount: number;
  netPrice: number | null;
  agencyFee: number | null;
  priceSetByAdminId: Types.ObjectId | null;
  approvedAt: Date | null;
  pickupTime: string;

  fee: FeeDoc;
  goods: GoodsDoc;
  needsReceiverConfirmation: boolean;
  receiverConfirmed: boolean;

  originDriverId: Types.ObjectId | null;
  originConfirmedAt: Date | null;
  destinationDriverId: Types.ObjectId | null;
  destinationConfirmedAt: Date | null;

  handover: HandoverDoc;

  status: OrderStatus;
  /** Time each status was (last) reached, e.g. { requested: Date, approved: Date }. */
  statusTimes: Partial<Record<OrderStatus, Date>>;
  issue: { open: boolean; note: string; byAdminId: Types.ObjectId | null; at: Date | null };
  cancelReason: string;
  failReason: string;
  codeAttempts: number;
  codeLocked: boolean;
  guestCodeShownAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
};

const placeSchema = { text: { type: String, required: true }, lat: { type: Number, default: null }, lng: { type: Number, default: null } };
const personSchema = { name: { type: String, required: true }, phone: { type: String, required: true } };

const orderSchema = new Schema<OrderDoc>(
  {
    number: { type: Number, required: true, unique: true },
    trackingCode: { type: String, required: true, unique: true },
    deliveryCode: { type: String, default: null },
    guestToken: { type: String, default: null, index: { unique: true, partialFilterExpression: { guestToken: { $type: "string" } } } },
    source: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, default: null, index: true },
    createdByAdminId: { type: Schema.Types.ObjectId, default: null },

    type: { type: String, required: true },
    intercityMode: { type: String, default: null },
    originCityId: { type: Schema.Types.ObjectId, required: true },
    originCityName: { type: String, required: true },
    destinationCityId: { type: Schema.Types.ObjectId, required: true },
    destinationCityName: { type: String, required: true },

    sender: { type: personSchema, required: true, _id: false },
    receiver: { type: personSchema, required: true, _id: false },
    pickup: { type: placeSchema, required: true, _id: false },
    dropoff: { type: placeSchema, required: true, _id: false },

    parcel: {
      type: {
        size: String,
        category: String,
        contents: String,
        itemCount: Number,
        estimatedValue: { type: Number, default: null },
        declarationAccepted: Boolean,
      },
      required: true,
      _id: false,
    },

    grossPrice: { type: Number, default: null },
    discountRate: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    netPrice: { type: Number, default: null },
    agencyFee: { type: Number, default: null },
    priceSetByAdminId: { type: Schema.Types.ObjectId, default: null },
    approvedAt: { type: Date, default: null },
    pickupTime: { type: String, default: "" },

    fee: {
      type: {
        payer: String,
        timing: String,
        method: String,
        status: { type: String, default: "unpaid" },
        paidAt: { type: Date, default: null },
        paidToDriverId: { type: Schema.Types.ObjectId, default: null },
        recordedByAdminId: { type: Schema.Types.ObjectId, default: null },
      },
      required: true,
      _id: false,
    },
    goods: {
      type: {
        isSale: Boolean,
        status: { type: String, default: null },
        amount: { type: Number, default: 0 },
        collected: { type: Boolean, default: false },
        collectedByDriverId: { type: Schema.Types.ObjectId, default: null },
        collectedAt: { type: Date, default: null },
        handedToSeller: { type: Boolean, default: null },
        handedByDriverId: { type: Schema.Types.ObjectId, default: null },
      },
      required: true,
      _id: false,
    },
    needsReceiverConfirmation: { type: Boolean, default: false },
    receiverConfirmed: { type: Boolean, default: false },

    originDriverId: { type: Schema.Types.ObjectId, default: null, index: true },
    originConfirmedAt: { type: Date, default: null },
    destinationDriverId: { type: Schema.Types.ObjectId, default: null, index: true },
    destinationConfirmedAt: { type: Date, default: null },

    handover: {
      type: {
        agencyId: { type: Schema.Types.ObjectId, default: null },
        agencyName: { type: String, default: "" },
        vehicleNumber: { type: String, default: "" },
        agencyDriverPhone: { type: String, default: "" },
        registeredUnderName: { type: String, default: "" },
        registeredUnderPhone: { type: String, default: "" },
        eta: { type: Date, default: null },
        droppedAt: { type: Date, default: null },
        originPhotoConfirmed: { type: Boolean, default: false },
        destinationPhotoConfirmed: { type: Boolean, default: false },
        arrivedAt: { type: Date, default: null },
      },
      default: () => ({}),
      _id: false,
    },

    status: { type: String, required: true, index: true },
    statusTimes: { type: Schema.Types.Mixed, default: {} },
    issue: {
      type: { open: Boolean, note: String, byAdminId: { type: Schema.Types.ObjectId, default: null }, at: { type: Date, default: null } },
      default: () => ({ open: false, note: "" }),
      _id: false,
    },
    cancelReason: { type: String, default: "" },
    failReason: { type: String, default: "" },
    codeAttempts: { type: Number, default: 0 },
    codeLocked: { type: Boolean, default: false },
    guestCodeShownAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false, optimisticConcurrency: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ "sender.phone": 1 });
orderSchema.index({ "receiver.phone": 1 });

export const Order = (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", orderSchema);
