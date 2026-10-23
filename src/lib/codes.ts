import { randomBytes, randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/I/L), so codes can be read aloud and typed safely.
const TRACKING_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TRACKING_CODE_LENGTH = 12;

export function generateTrackingCode(): string {
  let code = "";
  for (let i = 0; i < TRACKING_CODE_LENGTH; i++) {
    code += TRACKING_ALPHABET[randomInt(TRACKING_ALPHABET.length)];
  }
  return code;
}

export function isTrackingCodeShape(code: string): boolean {
  return code.length === TRACKING_CODE_LENGTH && [...code].every((char) => TRACKING_ALPHABET.includes(char));
}

export function generateDigits(length: number): string {
  let digits = "";
  for (let i = 0; i < length; i++) digits += String(randomInt(10));
  return digits;
}

/** Long random token for sessions and guest order links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Secret ntfy channel name for a driver: hard to guess, letters and digits only. */
export function generateNtfyTopic(): string {
  return `naff-${randomBytes(18).toString("base64url").replace(/[-_]/g, "x")}`;
}
