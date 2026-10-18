import bcrypt from "bcryptjs";
import { generateDigits } from "@/lib/codes";

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export function checkPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isPinShape(pin: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(pin);
}

/** A random PIN given out by an admin or by email. */
export function generatePin(length: number): string {
  return generateDigits(length);
}
