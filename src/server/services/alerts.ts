import * as Ably from "ably";
import { config } from "../config";
import { newRequestEmail } from "../emails/new-request";
import { Admin } from "../models/Admin";
import { isMailerConfigured, sendEmail } from "./email";

export const ALERT_CHANNEL = "admin-alerts";

export type AlertEvent = { event: string; orderId: string; number: number; status: string; at: string };

/**
 * Live alert for every admin (Ably). Never breaks the action that triggered it:
 * if Ably is not configured or unreachable, the alert is simply not sent.
 */
export async function publishAlert(alert: Omit<AlertEvent, "at">) {
  if (!config.ablyConfigured()) return;
  try {
    const client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
    await client.channels.get(ALERT_CHANNEL).publish("order", { ...alert, at: new Date().toISOString() });
  } catch (error) {
    console.error("[ably] publish failed:", error instanceof Error ? error.message : error);
  }
}

/** Email to every active admin, only for new requests. Skipped when SMTP is not configured. */
export async function emailNewRequest(details: { orderId: string; number: string; route: string; summary: string; senderPhone: string }) {
  if (!isMailerConfigured()) return;
  try {
    const admins = await Admin.find({ active: true, email: { $ne: "" } }).select("email").lean();
    const recipients = admins.map((admin) => admin.email);
    if (recipients.length === 0) return;
    await sendEmail(newRequestEmail({ to: recipients, ...details, link: `${config.panelUrl()}/orders/${details.orderId}` }));
  } catch (error) {
    console.error("[email] new request alert failed:", error instanceof Error ? error.message : error);
  }
}
