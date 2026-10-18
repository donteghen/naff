import type { Types } from "mongoose";
import { connectDb } from "../db";
import { Agency } from "../models/Agency";
import { City } from "../models/City";

export type CityOption = { id: string; name: string };
export type AgencyOption = { id: string; name: string; cityIds: string[]; branches: { cityId: string; address: string }[] };

export async function listActiveCities(): Promise<CityOption[]> {
  await connectDb();
  const cities = await City.find({ active: true }).sort({ name: 1 }).lean();
  return cities.map((city) => ({ id: String(city._id), name: city.name }));
}

export async function listActiveAgencies(): Promise<AgencyOption[]> {
  await connectDb();
  const agencies = await Agency.find({ active: true }).sort({ name: 1 }).lean();
  return agencies.map((agency) => ({
    id: String(agency._id),
    name: agency.name,
    cityIds: agency.branches.map((branch) => String(branch.cityId)),
    branches: agency.branches.map((branch) => ({ cityId: String(branch.cityId), address: branch.address })),
  }));
}

/** Agencies that can carry a parcel between two cities: active, with a branch in both. */
export async function agenciesForRoute(originCityId: Types.ObjectId | string, destinationCityId: Types.ObjectId | string): Promise<AgencyOption[]> {
  const all = await listActiveAgencies();
  return all.filter((agency) => agency.cityIds.includes(String(originCityId)) && agency.cityIds.includes(String(destinationCityId)));
}
