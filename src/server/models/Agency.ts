import { Schema, model, models, type Model, type Types } from "mongoose";

// A transport company with branches in several cities. A parcel dropped at the
// agency in city A is collected at the same agency's branch in city B.
export type AgencyBranch = { cityId: Types.ObjectId; address: string };

export type AgencyDoc = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  active: boolean;
  branches: AgencyBranch[];
};

const agencySchema = new Schema<AgencyDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    active: { type: Boolean, default: true },
    branches: [{ cityId: { type: Schema.Types.ObjectId, ref: "City", required: true }, address: { type: String, default: "" }, _id: false }],
  },
  { timestamps: true },
);

export const Agency = (models.Agency as Model<AgencyDoc>) || model<AgencyDoc>("Agency", agencySchema);
