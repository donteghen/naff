import type { Types } from "mongoose";
import { ADMIN_PIN_LENGTH, DRIVER_PIN_LENGTH, USER_PIN_LENGTH, type Audience } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { checkPin, generatePin, hashPin, isPinShape } from "../auth/pins";
import { endAllSessions, startSession } from "../auth/session";
import { config } from "../config";
import { connectDb } from "../db";
import { pinResetEmail } from "../emails/pin-reset";
import { AppError, ValidationError, isDuplicateKeyError } from "../errors";
import { Admin } from "../models/Admin";
import { Driver } from "../models/Driver";
import { User } from "../models/User";
import { isMailerConfigured, sendEmail } from "./email";
import { assertNotBlocked, consumeAttempt, countEvent } from "./rate-limit";

const PIN_LENGTHS: Record<Audience, number> = { user: USER_PIN_LENGTH, driver: DRIVER_PIN_LENGTH, panel: ADMIN_PIN_LENGTH };

type Account = { _id: Types.ObjectId; pinHash: string; active: boolean; tempPin?: { hash: string; expiresAt: Date } | null };

async function findAccount(audience: Audience, phone: string): Promise<Account | null> {
  if (audience === "user") return User.findOne({ phone }).lean();
  if (audience === "driver") return Driver.findOne({ phone }).lean();
  return Admin.findOne({ phone }).lean();
}

async function updateAccount(audience: Audience, id: Types.ObjectId | string, update: Record<string, unknown>) {
  if (audience === "user") await User.updateOne({ _id: id }, update);
  else if (audience === "driver") await Driver.updateOne({ _id: id }, update);
  else await Admin.updateOne({ _id: id }, update);
}

/**
 * Phone + PIN login for any of the three apps.
 * The same error is returned for an unknown phone and a wrong PIN.
 */
export async function login(audience: Audience, phoneInput: string, pin: string): Promise<{ mustChangePin: boolean }> {
  await connectDb();
  const phone = normalizePhone(phoneInput);
  if (!phone || !isPinShape(pin, PIN_LENGTHS[audience])) throw new AppError("errors.wrongLogin");

  const limitKey = `login:${audience}:${phone}`;
  await assertNotBlocked(limitKey, config.loginMaxFails(), config.loginWindowMinutes());

  const account = await findAccount(audience, phone);
  let usedTempPin = false;
  let valid = false;
  if (account && account.active) {
    valid = await checkPin(pin, account.pinHash);
    if (!valid && account.tempPin && account.tempPin.expiresAt > new Date()) {
      valid = await checkPin(pin, account.tempPin.hash);
      usedTempPin = valid;
    }
  }
  if (!account || !valid) {
    await countEvent(limitKey, config.loginWindowMinutes());
    throw new AppError("errors.wrongLogin");
  }

  const update: Record<string, unknown> = { lastSeenAt: new Date() };
  if (usedTempPin) update.mustChangePin = true;
  await updateAccount(audience, account._id, update);
  await startSession(audience, account._id);

  const fresh = await findAccount(audience, phone);
  return { mustChangePin: Boolean((fresh as { mustChangePin?: boolean } | null)?.mustChangePin) };
}

/**
 * Sets a new PIN. The current PIN is required, except right after logging in with a temporary PIN.
 * All other sessions of that person are ended.
 */
export async function setNewPin(
  audience: Audience,
  account: { _id: Types.ObjectId; pinHash: string; mustChangePin: boolean; sessionId: string },
  input: { currentPin?: string; newPin: string; confirmPin: string },
) {
  const length = PIN_LENGTHS[audience];
  if (!account.mustChangePin) {
    if (!input.currentPin || !(await checkPin(input.currentPin, account.pinHash))) {
      throw new ValidationError({ currentPin: "errors.wrongPin" });
    }
  }
  if (!isPinShape(input.newPin, length)) throw new ValidationError({ newPin: length === 6 ? "errors.pin6" : "errors.pin4" });
  if (input.newPin !== input.confirmPin) throw new ValidationError({ confirmPin: "errors.pinMismatch" });

  await updateAccount(audience, account._id, { pinHash: await hashPin(input.newPin), mustChangePin: false, tempPin: null });
  await endAllSessions(audience, account._id, account.sessionId);
}

export async function registerUser(input: { name: string; phone: string; email: string; pin: string; confirmPin: string }) {
  await connectDb();
  const phone = normalizePhone(input.phone);
  const fields: Record<string, string> = {};
  if (input.name.trim().length < 2) fields.name = "errors.required";
  if (!phone) fields.phone = "errors.phone";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) fields.email = "errors.email";
  if (!isPinShape(input.pin, USER_PIN_LENGTH)) fields.pin = "errors.pin4";
  else if (input.pin !== input.confirmPin) fields.confirmPin = "errors.pinMismatch";
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  try {
    const user = await User.create({
      name: input.name.trim(),
      phone,
      email: input.email.trim(),
      pinHash: await hashPin(input.pin),
      lastSeenAt: new Date(),
    });
    await startSession("user", user._id);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ValidationError({ phone: "errors.phoneTaken" });
    throw error;
  }
}

/** Forgot PIN: emails a temporary PIN. Always answers the same way, whether the account exists or not. */
export async function requestUserPinReset(phoneInput: string, language: string) {
  await connectDb();
  if (!isMailerConfigured()) throw new AppError("errors.resetUnavailable");
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new ValidationError({ phone: "errors.phone" });
  await consumeAttempt(`pinreset:${phone}`, config.pinResetMax(), config.pinResetWindowMinutes());

  const user = await User.findOne({ phone, active: true }).lean();
  if (!user) return;

  const tempPin = generatePin(USER_PIN_LENGTH);
  const expiresAt = new Date(Date.now() + config.tempPinTtlMinutes() * 60 * 1000);
  await User.updateOne({ _id: user._id }, { tempPin: { hash: await hashPin(tempPin), expiresAt } });
  await sendEmail(pinResetEmail({ to: user.email, name: user.name, tempPin, minutes: config.tempPinTtlMinutes(), language }));
}

/** Admin-issued temporary PIN (drivers, admins, users): replaces the PIN and ends all sessions. Returned once. */
export async function issueTemporaryPin(audience: Audience, id: Types.ObjectId | string): Promise<string> {
  const tempPin = generatePin(PIN_LENGTHS[audience]);
  await updateAccount(audience, id, { pinHash: await hashPin(tempPin), mustChangePin: true, tempPin: null });
  await endAllSessions(audience, id);
  return tempPin;
}
