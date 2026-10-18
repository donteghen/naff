// Panel settings: cities, agencies, pricing, contacts and operational status. All audited.

import { Types } from "mongoose";
import { normalizePhone } from "@/lib/phone";
import { connectDb } from "../db";
import { AppError, ValidationError, isDuplicateKeyError } from "../errors";
import { Agency } from "../models/Agency";
import { City } from "../models/City";
import { Driver } from "../models/Driver";
import { Settings } from "../models/Settings";
import { logAudit } from "./logs";
import { getSettings } from "./settings";

type AdminRef = { _id: Types.ObjectId; name: string };

export async function listAllCities() {
  await connectDb();
  const cities = await City.find().sort({ name: 1 }).lean();
  const driverCounts = await Driver.aggregate<{ _id: Types.ObjectId; count: number }>([{ $match: { active: true } }, { $group: { _id: "$cityId", count: { $sum: 1 } } }]);
  const drivers = Object.fromEntries(driverCounts.map((row) => [String(row._id), row.count]));
  return cities.map((city) => ({ id: String(city._id), name: city.name, active: city.active, drivers: drivers[String(city._id)] ?? 0 }));
}

export async function saveCity(admin: AdminRef, input: { id?: string; name: string; active: boolean }) {
  await connectDb();
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new ValidationError({ name: "errors.required" });
  try {
    if (input.id) {
      if (!Types.ObjectId.isValid(input.id)) throw new AppError("errors.notFound");
      const city = await City.findById(input.id);
      if (!city) throw new AppError("errors.notFound");
      const old = { name: city.name, active: city.active };
      city.name = name;
      city.active = input.active;
      await city.save();
      await logAudit(admin, "city_updated", { type: "city", id: city._id, name }, { old, new: { name, active: input.active } });
    } else {
      const city = await City.create({ name, active: input.active });
      await logAudit(admin, "city_created", { type: "city", id: city._id, name });
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ name: "errors.cityExists" });
    throw error;
  }
}

export async function listAllAgencies() {
  await connectDb();
  const agencies = await Agency.find().sort({ name: 1 }).lean();
  return agencies.map((agency) => ({
    id: String(agency._id),
    name: agency.name,
    phone: agency.phone,
    active: agency.active,
    branches: agency.branches.map((branch) => ({ cityId: String(branch.cityId), address: branch.address })),
  }));
}

export async function saveAgency(admin: AdminRef, input: { id?: string; name: string; phone: string; active: boolean; branches: { cityId: string; address: string }[] }) {
  await connectDb();
  const fields: Record<string, string> = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) fields.name = "errors.required";
  const phone = input.phone.trim() ? normalizePhone(input.phone) : "";
  if (phone === null) fields.phone = "errors.phone";
  const branches = input.branches.filter((branch) => Types.ObjectId.isValid(branch.cityId));
  const cityIds = new Set(branches.map((branch) => branch.cityId));
  if (cityIds.size !== branches.length) fields.branches = "errors.duplicateBranch";
  if (branches.length < 2) fields.branches = "errors.twoBranches";
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  const data = { name, phone: phone ?? "", active: input.active, branches: branches.map((branch) => ({ cityId: branch.cityId, address: branch.address.trim().slice(0, 200) })) };
  if (input.id) {
    if (!Types.ObjectId.isValid(input.id)) throw new AppError("errors.notFound");
    const old = await Agency.findByIdAndUpdate(input.id, data).lean();
    if (!old) throw new AppError("errors.notFound");
    await logAudit(admin, "agency_updated", { type: "agency", id: input.id, name }, { old: { name: old.name, phone: old.phone, active: old.active }, new: { name, phone: data.phone, active: data.active, branches: data.branches.length } });
  } else {
    const agency = await Agency.create(data);
    await logAudit(admin, "agency_created", { type: "agency", id: agency._id, name });
  }
}

export async function saveDiscountRate(admin: AdminRef, percentValue: number) {
  if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 50) throw new ValidationError({ discountRate: "errors.percent" });
  const before = await getSettings();
  const rate = Math.round(percentValue * 10) / 1000;
  await Settings.updateOne({ _id: "settings" }, { discountRate: rate });
  await logAudit(admin, "pricing_updated", { type: "settings", name: "pricing" }, { old: { discountRate: before.discountRate }, new: { discountRate: rate } });
}

export async function saveContacts(
  admin: AdminRef,
  input: { callUsPhone: string; whatsappPhone: string; mtnNumber: string; mtnName: string; orangeNumber: string; orangeName: string },
) {
  const fields: Record<string, string> = {};
  const phoneOrEmpty = (value: string, key: string) => {
    if (!value.trim()) return "";
    const phone = normalizePhone(value);
    if (!phone) fields[key] = "errors.phone";
    return phone ?? "";
  };
  const update = {
    callUsPhone: phoneOrEmpty(input.callUsPhone, "callUsPhone"),
    whatsappPhone: phoneOrEmpty(input.whatsappPhone, "whatsappPhone"),
    mtnMomo: { number: phoneOrEmpty(input.mtnNumber, "mtnNumber"), name: input.mtnName.trim().slice(0, 60) },
    orangeMoney: { number: phoneOrEmpty(input.orangeNumber, "orangeNumber"), name: input.orangeName.trim().slice(0, 60) },
  };
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  const before = await getSettings();
  await Settings.updateOne({ _id: "settings" }, update);
  await logAudit(admin, "contacts_updated", { type: "settings", name: "contacts" }, {
    old: { callUsPhone: before.callUsPhone, whatsappPhone: before.whatsappPhone, mtnMomo: before.mtnMomo, orangeMoney: before.orangeMoney },
    new: update,
  });
}

export async function setOperationalStatus(admin: AdminRef, status: "live" | "maintenance") {
  if (status !== "live" && status !== "maintenance") throw new AppError("errors.invalid");
  const before = await getSettings();
  await Settings.updateOne({ _id: "settings" }, { operationalStatus: status });
  await logAudit(admin, "operational_status_changed", { type: "settings", name: "operational status" }, { old: before.operationalStatus, new: status });
}
