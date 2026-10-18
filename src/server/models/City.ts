import { Schema, model, models, type Model, type Types } from "mongoose";

export type CityDoc = { _id: Types.ObjectId; name: string; active: boolean };

const citySchema = new Schema<CityDoc>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const City = (models.City as Model<CityDoc>) || model<CityDoc>("City", citySchema);
