import { Schema, model, models, type Model, type Types } from "mongoose";

export type UserDoc = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  pinHash: string;
  /** Emailed temporary PIN (forgot PIN). The normal PIN keeps working until this one is used. */
  tempPin: { hash: string; expiresAt: Date } | null;
  mustChangePin: boolean;
  active: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    pinHash: { type: String, required: true },
    tempPin: { type: { hash: String, expiresAt: Date }, default: null, _id: false },
    mustChangePin: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = (models.User as Model<UserDoc>) || model<UserDoc>("User", userSchema);
