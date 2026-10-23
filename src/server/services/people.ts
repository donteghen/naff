// Account management from the panel: users, drivers and admins.
// Every change is written to the audit log. Nobody is deleted, only deactivated.

import { Types } from "mongoose";
import { FINAL_STATUSES, PAGE_SIZE } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { endAllSessions } from "../auth/session";
import { connectDb } from "../db";
import { AppError, ValidationError, isDuplicateKeyError } from "../errors";
import { Admin } from "../models/Admin";
import { City } from "../models/City";
import { Driver } from "../models/Driver";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { issueTemporaryPin } from "./auth";
import { logAudit } from "./logs";
import { driverTopic, rotateDriverTopic } from "./notify";
import { generateNtfyTopic } from "@/lib/codes";

type AdminRef = { _id: Types.ObjectId; name: string; isSuperAdmin?: boolean };

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanName(name: string, fields: Record<string, string>) {
  const value = name.trim();
  if (value.length < 2 || value.length > 80) fields.name = "errors.required";
  return value;
}

function cleanEmail(email: string, fields: Record<string, string>, required: boolean) {
  const value = email.trim().toLowerCase();
  if (!value && !required) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fields.email = "errors.email";
  return value;
}

function validId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new AppError("errors.notFound");
}

// ---------------------------------------------------------------------------
// Users (customers)
// ---------------------------------------------------------------------------

export async function listUsers(search: { q?: string; page?: number }) {
  await connectDb();
  const query: Record<string, unknown> = {};
  const q = search.q?.trim();
  if (q) {
    const phone = normalizePhone(q);
    const or: Record<string, unknown>[] = [{ name: { $regex: escapeRegex(q), $options: "i" } }, { email: { $regex: escapeRegex(q), $options: "i" } }];
    if (phone) or.push({ phone });
    query.$or = or;
  }
  const page = Math.max(1, search.page ?? 1);
  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean();
  const counts = await Order.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { userId: { $in: users.map((user) => user._id) } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const orderCount = Object.fromEntries(counts.map((row) => [String(row._id), row.count]));
  return {
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      phone: user.phone,
      email: user.email,
      active: user.active,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      orders: orderCount[String(user._id)] ?? 0,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function updateUserByAdmin(admin: AdminRef, userId: string, input: { name: string; phone: string; email: string }) {
  await connectDb();
  validId(userId);
  const user = await User.findById(userId);
  if (!user) throw new AppError("errors.notFound");
  const fields: Record<string, string> = {};
  const name = cleanName(input.name, fields);
  const phone = normalizePhone(input.phone);
  if (!phone) fields.phone = "errors.phone";
  const email = cleanEmail(input.email, fields, true);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  const old = { name: user.name, phone: user.phone, email: user.email };
  user.name = name;
  user.phone = phone!;
  user.email = email;
  try {
    await user.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
  await logAudit(admin, "user_updated", { type: "user", id: user._id, name: user.name }, { old, new: { name, phone, email } });
}

/** The user edits their own profile. Phone changes are allowed (must stay unique). */
export async function updateOwnProfile(userId: Types.ObjectId, input: { name: string; phone: string; email: string }) {
  await connectDb();
  const fields: Record<string, string> = {};
  const name = cleanName(input.name, fields);
  const phone = normalizePhone(input.phone);
  if (!phone) fields.phone = "errors.phone";
  const email = cleanEmail(input.email, fields, true);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  try {
    await User.updateOne({ _id: userId }, { name, phone, email });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
}

export async function setUserActive(admin: AdminRef, userId: string, active: boolean) {
  await connectDb();
  validId(userId);
  const user = await User.findByIdAndUpdate(userId, { active }, { new: true }).lean();
  if (!user) throw new AppError("errors.notFound");
  if (!active) await endAllSessions("user", user._id);
  await logAudit(admin, active ? "user_reactivated" : "user_deactivated", { type: "user", id: user._id, name: user.name });
}

export async function resetUserPin(admin: AdminRef, userId: string): Promise<string> {
  await connectDb();
  validId(userId);
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("errors.notFound");
  const tempPin = await issueTemporaryPin("user", user._id);
  await logAudit(admin, "user_pin_reset", { type: "user", id: user._id, name: user.name });
  return tempPin;
}

export async function endUserSessions(admin: AdminRef, userId: string) {
  await connectDb();
  validId(userId);
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("errors.notFound");
  await endAllSessions("user", user._id);
  await logAudit(admin, "user_sessions_ended", { type: "user", id: user._id, name: user.name });
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

async function checkCity(cityId: string, fields: Record<string, string>) {
  if (!Types.ObjectId.isValid(cityId) || !(await City.exists({ _id: cityId }))) fields.cityId = "errors.required";
}

export async function createDriver(admin: AdminRef, input: { name: string; phone: string; cityId: string }): Promise<string> {
  await connectDb();
  const fields: Record<string, string> = {};
  const name = cleanName(input.name, fields);
  const phone = normalizePhone(input.phone);
  if (!phone) fields.phone = "errors.phone";
  await checkCity(input.cityId, fields);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  let driverId: Types.ObjectId;
  try {
    // A placeholder hash: the real temporary PIN is issued right after.
    const driver = await Driver.create({ name, phone, cityId: input.cityId, pinHash: "-", mustChangePin: true, ntfyTopic: generateNtfyTopic() });
    driverId = driver._id;
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
  const tempPin = await issueTemporaryPin("driver", driverId);
  await logAudit(admin, "driver_created", { type: "driver", id: driverId, name }, { phone, cityId: input.cityId });
  return tempPin;
}

export async function updateDriver(admin: AdminRef, driverId: string, input: { name: string; phone: string; cityId: string }) {
  await connectDb();
  validId(driverId);
  const driver = await Driver.findById(driverId);
  if (!driver) throw new AppError("errors.notFound");
  const fields: Record<string, string> = {};
  const name = cleanName(input.name, fields);
  const phone = normalizePhone(input.phone);
  if (!phone) fields.phone = "errors.phone";
  await checkCity(input.cityId, fields);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  if (String(driver.cityId) !== input.cityId && (await hasActiveJobs(driver._id))) throw new AppError("errors.driverHasJobs");
  const old = { name: driver.name, phone: driver.phone, cityId: String(driver.cityId) };
  driver.name = name;
  driver.phone = phone!;
  driver.cityId = new Types.ObjectId(input.cityId);
  try {
    await driver.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
  await logAudit(admin, "driver_updated", { type: "driver", id: driver._id, name }, { old, new: { name, phone, cityId: input.cityId } });
}

async function hasActiveJobs(driverId: Types.ObjectId) {
  const job = await Order.exists({
    status: { $nin: FINAL_STATUSES },
    $or: [
      { originDriverId: driverId, status: { $nin: [...FINAL_STATUSES, "dropped_at_agency", "in_transit", "arrived_at_agency_b", "collected_at_destination"] } },
      { destinationDriverId: driverId },
    ],
  });
  return Boolean(job);
}

export async function setDriverActive(admin: AdminRef, driverId: string, active: boolean) {
  await connectDb();
  validId(driverId);
  const driver = await Driver.findById(driverId);
  if (!driver) throw new AppError("errors.notFound");
  if (!active && (await hasActiveJobs(driver._id))) throw new AppError("errors.driverHasJobs");
  driver.active = active;
  if (!active) driver.available = false;
  await driver.save();
  if (!active) {
    await endAllSessions("driver", driver._id);
    await rotateDriverTopic(driver._id);
  }
  await logAudit(admin, active ? "driver_reactivated" : "driver_suspended", { type: "driver", id: driver._id, name: driver.name });
}

export async function resetDriverPin(admin: AdminRef, driverId: string): Promise<string> {
  await connectDb();
  validId(driverId);
  const driver = await Driver.findById(driverId).lean();
  if (!driver) throw new AppError("errors.notFound");
  const tempPin = await issueTemporaryPin("driver", driver._id);
  await logAudit(admin, "driver_pin_reset", { type: "driver", id: driver._id, name: driver.name });
  return tempPin;
}

export async function endDriverSessions(admin: AdminRef, driverId: string) {
  await connectDb();
  validId(driverId);
  const driver = await Driver.findById(driverId).lean();
  if (!driver) throw new AppError("errors.notFound");
  await endAllSessions("driver", driver._id);
  // Lost phone: a new notification channel, so the old phone stops receiving job notifications.
  await rotateDriverTopic(driver._id);
  await logAudit(admin, "driver_sessions_ended", { type: "driver", id: driver._id, name: driver.name });
}

/** Availability toggle in the driver app. */
export async function setDriverAvailable(driverId: Types.ObjectId, available: boolean) {
  await connectDb();
  await Driver.updateOne({ _id: driverId }, { available });
}

/** Driver page summary: money collected and jobs done in a period. */
export async function driverMoneySummary(driverId: string, from: Date, to: Date) {
  await connectDb();
  validId(driverId);
  const id = new Types.ObjectId(driverId);
  const fees = await Order.aggregate<{ total: number; count: number }>([
    { $match: { "fee.paidToDriverId": id, "fee.paidAt": { $gte: from, $lt: to } } },
    { $group: { _id: null, total: { $sum: "$netPrice" }, count: { $sum: 1 } } },
  ]);
  const goods = await Order.aggregate<{ total: number; count: number }>([
    { $match: { "goods.collectedByDriverId": id, "goods.collectedAt": { $gte: from, $lt: to } } },
    { $group: { _id: null, total: { $sum: "$goods.amount" }, count: { $sum: 1 } } },
  ]);
  const delivered = await Order.countDocuments({
    status: "delivered",
    "statusTimes.delivered": { $gte: from, $lt: to },
    $or: [{ originDriverId: id }, { destinationDriverId: id }],
  });
  return { fees: fees[0]?.total ?? 0, goods: goods[0]?.total ?? 0, delivered };
}

// ---------------------------------------------------------------------------
// Admins (super admin only, checked by the actions)
// ---------------------------------------------------------------------------

export async function listAdmins() {
  await connectDb();
  const admins = await Admin.find().sort({ isSuperAdmin: -1, name: 1 }).lean();
  return admins.map((admin) => ({
    id: String(admin._id),
    name: admin.name,
    phone: admin.phone,
    email: admin.email ?? "",
    isSuperAdmin: admin.isSuperAdmin,
    active: admin.active,
    lastSeenAt: admin.lastSeenAt ? admin.lastSeenAt.toISOString() : null,
  }));
}

export async function createAdmin(superAdmin: AdminRef, input: { name: string; phone: string; email: string }): Promise<string> {
  await connectDb();
  const fields: Record<string, string> = {};
  const name = cleanName(input.name, fields);
  const phone = normalizePhone(input.phone);
  if (!phone) fields.phone = "errors.phone";
  const email = cleanEmail(input.email, fields, false);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  let adminId: Types.ObjectId;
  try {
    const admin = await Admin.create({ name, phone, email, pinHash: "-", mustChangePin: true, isSuperAdmin: false });
    adminId = admin._id;
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
  const tempPin = await issueTemporaryPin("panel", adminId);
  await logAudit(superAdmin, "admin_created", { type: "admin", id: adminId, name }, { phone, email });
  return tempPin;
}

export async function updateAdmin(superAdmin: AdminRef, adminId: string, input: { name: string; phone: string; email: string }) {
  await connectDb();
  validId(adminId);
  const admin = await Admin.findById(adminId);
  if (!admin) throw new AppError("errors.notFound");
  const fields: Record<string, string> = {};
  const name = cleanName(input.name, fields);
  const phone = normalizePhone(input.phone);
  if (!phone) fields.phone = "errors.phone";
  const email = cleanEmail(input.email, fields, false);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  const old = { name: admin.name, phone: admin.phone, email: admin.email };
  admin.name = name;
  admin.phone = phone!;
  admin.email = email;
  try {
    await admin.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
  await logAudit(superAdmin, "admin_updated", { type: "admin", id: admin._id, name }, { old, new: { name, phone, email } });
}

export async function setAdminActive(superAdmin: AdminRef, adminId: string, active: boolean) {
  await connectDb();
  validId(adminId);
  const admin = await Admin.findById(adminId);
  if (!admin) throw new AppError("errors.notFound");
  if (admin.isSuperAdmin) throw new AppError("errors.superAdminProtected");
  admin.active = active;
  await admin.save();
  if (!active) await endAllSessions("panel", admin._id);
  await logAudit(superAdmin, active ? "admin_reactivated" : "admin_deactivated", { type: "admin", id: admin._id, name: admin.name });
}

export async function resetAdminPin(superAdmin: AdminRef, adminId: string): Promise<string> {
  await connectDb();
  validId(adminId);
  const admin = await Admin.findById(adminId).lean();
  if (!admin) throw new AppError("errors.notFound");
  if (admin.isSuperAdmin) throw new AppError("errors.superAdminProtected");
  const tempPin = await issueTemporaryPin("panel", admin._id);
  await logAudit(superAdmin, "admin_pin_reset", { type: "admin", id: admin._id, name: admin.name });
  return tempPin;
}

// ---------------------------------------------------------------------------
// Single records for detail pages
// ---------------------------------------------------------------------------

export async function getUser(userId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return { id: String(user._id), name: user.name, phone: user.phone, email: user.email, active: user.active, lastSeenAt: user.lastSeenAt?.toISOString() ?? null };
}

export async function getDriver(driverId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(driverId)) return null;
  const driver = await Driver.findById(driverId).lean();
  if (!driver) return null;
  const city = await City.findById(driver.cityId).lean();
  return {
    id: String(driver._id),
    name: driver.name,
    phone: driver.phone,
    cityId: String(driver.cityId),
    cityName: city?.name ?? "?",
    available: driver.available,
    active: driver.active,
    mustChangePin: driver.mustChangePin,
    lastSeenAt: driver.lastSeenAt?.toISOString() ?? null,
    ntfyTopic: await driverTopic(driver._id),
  };
}
