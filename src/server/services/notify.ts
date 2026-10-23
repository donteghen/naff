// Job notifications to drivers' phones through ntfy (SPEC §9.2).
// Channels on ntfy.sh are public to anyone who knows the name: never put a phone number,
// an address, an amount or a code in a notification. Only the order number, the areas and what happened.

import type { Types } from "mongoose";
import { translate } from "@/i18n";
import { generateNtfyTopic } from "@/lib/codes";
import type { Language } from "@/lib/constants";
import { areaName } from "@/lib/location";
import { config } from "../config";
import { Driver } from "../models/Driver";
import type { OrderDoc } from "../models/Order";

export type DriverNotice = "job_assigned" | "job_removed" | "job_cancelled" | "price_changed" | "go_collect" | "code_unlocked";

const PRIORITY: Record<DriverNotice, number> = {
  job_assigned: 5,
  job_removed: 4,
  job_cancelled: 4,
  price_changed: 3,
  go_collect: 4,
  code_unlocked: 4,
};

/** Posts one message to ntfy. Never throws: a failure (e.g. free daily limit reached) is only logged. */
export async function publishToNtfy(message: { topic: string; title: string; message: string; priority: number; click?: string }) {
  if (!message.topic) return;
  try {
    const response = await fetch(config.ntfyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(config.ntfyToken() ? { Authorization: `Bearer ${config.ntfyToken()}` } : {}) },
      body: JSON.stringify({ ...message, tags: ["package"] }),
    });
    if (!response.ok) console.error(`[ntfy] publish refused: ${response.status} ${await response.text().catch(() => "")}`);
  } catch (error) {
    console.error("[ntfy] publish failed:", error instanceof Error ? error.message : error);
  }
}

/** The driver's channel, created the first time it is needed (drivers created before ntfy existed). */
export async function driverTopic(driverId: Types.ObjectId | string): Promise<string> {
  const driver = await Driver.findById(driverId).select("ntfyTopic").lean();
  if (!driver) return "";
  if (driver.ntfyTopic) return driver.ntfyTopic;
  const topic = generateNtfyTopic();
  await Driver.updateOne({ _id: driverId, ntfyTopic: "" }, { ntfyTopic: topic });
  return (await Driver.findById(driverId).select("ntfyTopic").lean())?.ntfyTopic ?? "";
}

/** Text of a driver notification, in the order's language. Exported for tests. */
export function driverNoticeText(notice: DriverNotice, order: Pick<OrderDoc, "number" | "language" | "pickup" | "dropoff" | "originCityName" | "destinationCityName" | "type">) {
  const language = (order.language === "en" ? "en" : "fr") as Language;
  const route =
    order.type === "intercity" ? `${order.originCityName} → ${order.destinationCityName}` : `${areaName(order.pickup.text)} → ${areaName(order.dropoff.text)}`;
  const values = { number: `NF-${order.number}`, route, city: order.destinationCityName };
  return {
    title: translate(language, `ntfy.${notice}.title`, values),
    message: translate(language, `ntfy.${notice}.message`, values),
  };
}

/** Notifies one driver about one of their jobs. Tapping opens the job in the driver app. */
export async function notifyDriver(driverId: Types.ObjectId | string | null | undefined, notice: DriverNotice, order: OrderDoc) {
  if (!driverId) return;
  const topic = await driverTopic(driverId);
  const text = driverNoticeText(notice, order);
  const click = notice === "job_removed" ? `${config.driverUrl()}/` : `${config.driverUrl()}/jobs/${order._id}`;
  await publishToNtfy({ topic, ...text, priority: PRIORITY[notice], click });
}

/** "Send test" from the driver's page, in the admin's language. */
export async function sendDriverTestNotification(driverId: string, language: Language) {
  const topic = await driverTopic(driverId);
  await publishToNtfy({ topic, title: translate(language, "ntfy.test.title"), message: translate(language, "ntfy.test.message"), priority: 4, click: `${config.driverUrl()}/` });
}

/** New secret channel (lost phone, suspension): the old phone stops receiving notifications. */
export async function rotateDriverTopic(driverId: Types.ObjectId | string) {
  await Driver.updateOne({ _id: driverId }, { ntfyTopic: generateNtfyTopic() });
}
