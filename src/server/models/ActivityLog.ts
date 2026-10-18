import { Schema, model, models, type Model, type Types } from "mongoose";
import type { ActorType } from "@/lib/constants";

// Every order operation (status changes, price edits, assignments, payments, notes).
export type ActivityLogDoc = {
  _id: Types.ObjectId;
  orderId: Types.ObjectId | null;
  orderNumber: number | null;
  actorType: ActorType;
  actorId: Types.ObjectId | null;
  actorName: string;
  onBehalfOfDriverId: Types.ObjectId | null;
  onBehalfOfDriverName: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  details: Record<string, unknown>;
  at: Date;
};

const activityLogSchema = new Schema<ActivityLogDoc>({
  orderId: { type: Schema.Types.ObjectId, default: null, index: true },
  orderNumber: { type: Number, default: null, index: true },
  actorType: { type: String, required: true },
  actorId: { type: Schema.Types.ObjectId, default: null },
  actorName: { type: String, default: "" },
  onBehalfOfDriverId: { type: Schema.Types.ObjectId, default: null },
  onBehalfOfDriverName: { type: String, default: "" },
  action: { type: String, required: true, index: true },
  fromStatus: { type: String, default: null },
  toStatus: { type: String, default: null },
  details: { type: Schema.Types.Mixed, default: {} },
  at: { type: Date, required: true, index: true },
});

export const ActivityLog = (models.ActivityLog as Model<ActivityLogDoc>) || model<ActivityLogDoc>("ActivityLog", activityLogSchema);
