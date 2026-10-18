import type { Types } from "mongoose";
import type { ActorType } from "@/lib/constants";
import { ActivityLog } from "../models/ActivityLog";
import { AuditLog } from "../models/AuditLog";

export type Actor = {
  type: ActorType;
  id: Types.ObjectId | null;
  name: string;
  /** Set when an admin performs a driver action for a driver who has no network. */
  onBehalfOf?: { id: Types.ObjectId; name: string };
};

export async function logActivity(
  actor: Actor,
  order: { _id: Types.ObjectId; number: number } | null,
  action: string,
  extra: { fromStatus?: string; toStatus?: string; details?: Record<string, unknown> } = {},
) {
  await ActivityLog.create({
    orderId: order?._id ?? null,
    orderNumber: order?.number ?? null,
    actorType: actor.type,
    actorId: actor.id,
    actorName: actor.name,
    onBehalfOfDriverId: actor.onBehalfOf?.id ?? null,
    onBehalfOfDriverName: actor.onBehalfOf?.name ?? "",
    action,
    fromStatus: extra.fromStatus ?? null,
    toStatus: extra.toStatus ?? null,
    details: extra.details ?? {},
    at: new Date(),
  });
}

export async function logAudit(
  admin: { _id: Types.ObjectId; name: string },
  action: string,
  target: { type: string; id?: string | Types.ObjectId; name?: string },
  details: Record<string, unknown> = {},
) {
  await AuditLog.create({
    adminId: admin._id,
    adminName: admin.name,
    action,
    targetType: target.type,
    targetId: target.id ? String(target.id) : "",
    targetName: target.name ?? "",
    details,
    at: new Date(),
  });
}
