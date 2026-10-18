import { Schema, model, models, type Model, type Types } from "mongoose";

export type AdminDoc = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  /** Optional. New-request alert emails go to every active admin with an email. */
  email: string;
  pinHash: string;
  mustChangePin: boolean;
  isSuperAdmin: boolean;
  active: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const adminSchema = new Schema<AdminDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    pinHash: { type: String, required: true },
    mustChangePin: { type: Boolean, default: true },
    isSuperAdmin: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Admin = (models.Admin as Model<AdminDoc>) || model<AdminDoc>("Admin", adminSchema);
