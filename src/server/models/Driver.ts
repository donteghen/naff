import { Schema, model, models, type Model, type Types } from "mongoose";

export type DriverDoc = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  cityId: Types.ObjectId;
  pinHash: string;
  mustChangePin: boolean;
  available: boolean;
  active: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const driverSchema = new Schema<DriverDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
    pinHash: { type: String, required: true },
    mustChangePin: { type: Boolean, default: true },
    available: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Driver = (models.Driver as Model<DriverDoc>) || model<DriverDoc>("Driver", driverSchema);
