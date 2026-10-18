import { Schema, model, models, type Model, type Types } from "mongoose";

// Admin-side operations outside orders: accounts, PIN resets, settings, cities, agencies.
export type AuditLogDoc = {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  details: Record<string, unknown>;
  at: Date;
};

const auditLogSchema = new Schema<AuditLogDoc>({
  adminId: { type: Schema.Types.ObjectId, required: true },
  adminName: { type: String, default: "" },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: { type: String, default: "" },
  targetName: { type: String, default: "" },
  details: { type: Schema.Types.Mixed, default: {} },
  at: { type: Date, required: true, index: true },
});

export const AuditLog = (models.AuditLog as Model<AuditLogDoc>) || model<AuditLogDoc>("AuditLog", auditLogSchema);
