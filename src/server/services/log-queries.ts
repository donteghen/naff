import { Types } from "mongoose";
import { PAGE_SIZE } from "@/lib/constants";
import { dayKey, dayRange } from "@/lib/dates";
import { connectDb } from "../db";
import { ActivityLog } from "../models/ActivityLog";
import { AuditLog } from "../models/AuditLog";

export type LogSearch = { from?: string; to?: string; actorType?: string; actor?: string; action?: string; order?: string; target?: string; page?: number };

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateFilter(search: LogSearch) {
  if (!search.from && !search.to) return null;
  const range = dayRange(search.from || "2000-01-01", search.to || dayKey());
  return { $gte: range.start, $lt: range.end };
}

export async function listActivity(search: LogSearch) {
  await connectDb();
  const query: Record<string, unknown> = {};
  const at = dateFilter(search);
  if (at) query.at = at;
  if (search.actorType) query.actorType = search.actorType;
  if (search.action) query.action = search.action;
  if (search.actor?.trim()) {
    const pattern = { $regex: escapeRegex(search.actor.trim()), $options: "i" };
    query.$or = [{ actorName: pattern }, { onBehalfOfDriverName: pattern }];
  }
  if (search.order?.trim()) {
    const number = Number(search.order.trim().replace(/^NF-?/i, ""));
    query.orderNumber = Number.isInteger(number) ? number : -1;
  }
  const page = Math.max(1, search.page ?? 1);
  const total = await ActivityLog.countDocuments(query);
  const rows = await ActivityLog.find(query).sort({ at: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean();
  const actions = (await ActivityLog.distinct("action")).sort();
  return {
    rows: rows.map((row) => ({
      id: String(row._id),
      orderId: row.orderId ? String(row.orderId) : null,
      orderNumber: row.orderNumber,
      actorType: row.actorType,
      actorName: row.actorName,
      onBehalfOfDriverName: row.onBehalfOfDriverName,
      action: row.action,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      details: JSON.parse(JSON.stringify(row.details ?? {})) as Record<string, unknown>,
      at: row.at.toISOString(),
    })),
    actions,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listAudit(search: LogSearch) {
  await connectDb();
  const query: Record<string, unknown> = {};
  const at = dateFilter(search);
  if (at) query.at = at;
  if (search.action) query.action = search.action;
  if (search.actorType) query.targetType = search.actorType;
  if (search.actor?.trim()) query.adminName = { $regex: escapeRegex(search.actor.trim()), $options: "i" };
  if (search.target?.trim()) query.targetName = { $regex: escapeRegex(search.target.trim()), $options: "i" };
  const page = Math.max(1, search.page ?? 1);
  const total = await AuditLog.countDocuments(query);
  const rows = await AuditLog.find(query).sort({ at: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean();
  const actions = (await AuditLog.distinct("action")).sort();
  const targetTypes = (await AuditLog.distinct("targetType")).sort();
  return {
    rows: rows.map((row) => ({
      id: String(row._id),
      adminName: row.adminName,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      targetName: row.targetName,
      details: JSON.parse(JSON.stringify(row.details ?? {})) as Record<string, unknown>,
      at: row.at.toISOString(),
    })),
    actions,
    targetTypes,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export function isObjectId(id: string) {
  return Types.ObjectId.isValid(id);
}
