import { cookies } from "next/headers";
import type { Types } from "mongoose";
import type { Audience } from "@/lib/constants";
import { generateToken } from "@/lib/codes";
import { config } from "../config";
import { connectDb } from "../db";
import { Session } from "../models/Session";

const COOKIE_NAMES: Record<Audience, string> = { user: "sess_user", driver: "sess_driver", panel: "sess_panel" };

/** Creates a 7-day session and sets the host-only cookie for this app. */
export async function startSession(audience: Audience, subjectId: Types.ObjectId): Promise<string> {
  await connectDb();
  const id = generateToken();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + config.sessionDays * 24 * 60 * 60 * 1000);
  await Session.create({ _id: id, audience, subjectId, createdAt, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES[audience], id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return id;
}

/** The current valid session for this app, or null. */
export async function readSession(audience: Audience) {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAMES[audience])?.value;
  if (!id) return null;
  await connectDb();
  const session = await Session.findById(id).lean();
  if (!session || session.audience !== audience || session.expiresAt <= new Date()) return null;
  return session;
}

/** Logout: deletes the session document and the cookie. */
export async function endSession(audience: Audience) {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAMES[audience])?.value;
  if (id) {
    await connectDb();
    await Session.deleteOne({ _id: id });
  }
  cookieStore.delete(COOKIE_NAMES[audience]);
}

/** Deletes every session of a person, optionally keeping one (the current device). */
export async function endAllSessions(audience: Audience, subjectId: Types.ObjectId | string, keepSessionId?: string) {
  await connectDb();
  const filter: Record<string, unknown> = { audience, subjectId };
  if (keepSessionId) filter._id = { $ne: keepSessionId };
  await Session.deleteMany(filter);
}
