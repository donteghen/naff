import { connectDb } from "../db";
import { Settings, type SettingsDoc } from "../models/Settings";

/** The single settings document, created with defaults the first time. */
export async function getSettings(): Promise<SettingsDoc> {
  await connectDb();
  const settings = await Settings.findOneAndUpdate({ _id: "settings" }, { $setOnInsert: { _id: "settings" } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  return settings as SettingsDoc;
}

export async function isMaintenance(): Promise<boolean> {
  return (await getSettings()).operationalStatus === "maintenance";
}

/** "MTN MoMo 677 12 34 56 (NAFF SARL) · Orange Money …" for messages to customers. */
export function mobileMoneyText(settings: SettingsDoc, labels: { mtn: string; orange: string }): string {
  const parts: string[] = [];
  if (settings.mtnMomo.number) parts.push(`${labels.mtn} ${settings.mtnMomo.number}${settings.mtnMomo.name ? ` (${settings.mtnMomo.name})` : ""}`);
  if (settings.orangeMoney.number) parts.push(`${labels.orange} ${settings.orangeMoney.number}${settings.orangeMoney.name ? ` (${settings.orangeMoney.name})` : ""}`);
  return parts.join(" · ");
}
