import { Schema, model, models, type Model, type Types } from "mongoose";
import type { Audience } from "@/lib/constants";

// One document per login. MongoDB deletes it automatically at `expiresAt`.
export type SessionDoc = {
  _id: string;
  audience: Audience;
  subjectId: Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

const sessionSchema = new Schema<SessionDoc>({
  _id: { type: String, required: true },
  audience: { type: String, required: true },
  subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
  createdAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const Session = (models.Session as Model<SessionDoc>) || model<SessionDoc>("Session", sessionSchema);
