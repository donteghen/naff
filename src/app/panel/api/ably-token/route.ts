import * as Ably from "ably";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/current";
import { ALERT_CHANNEL } from "@/server/services/alerts";

// Gives the admin's browser a short-lived Ably token that can only listen to the alerts channel.
// The browser uses it with Ably's Server-Sent Events endpoint (no client library needed).
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.mustChangePin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.ABLY_API_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  const token = await client.auth.requestToken({ clientId: String(admin._id), capability: { [ALERT_CHANNEL]: ["subscribe"] }, ttl: 60 * 60 * 1000 });
  return NextResponse.json({ token: token.token }, { headers: { "Cache-Control": "no-store" } });
}
