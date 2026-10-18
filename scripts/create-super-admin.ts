// Creates the one super admin. Run once after deployment: npm run create-super-admin
import mongoose from "mongoose";
import { ADMIN_PIN_LENGTH } from "../src/lib/constants";
import { normalizePhone } from "../src/lib/phone";
import { hashPin, isPinShape } from "../src/server/auth/pins";
import { connectDb } from "../src/server/db";
import { Admin } from "../src/server/models/Admin";
import { ask, closePrompt } from "./prompt";

async function main() {
  await connectDb();
  if (await Admin.exists({ isSuperAdmin: true })) {
    console.log("A super admin already exists. Use `npm run reset-super-admin-pin` to change its PIN.");
    return;
  }
  const name = await ask("Name: ");
  const phone = normalizePhone(await ask("Phone (6XX XX XX XX): "));
  if (!name || !phone) throw new Error("A name and a valid Cameroon mobile number are required.");
  if (await Admin.exists({ phone })) throw new Error("An admin with this phone already exists.");
  const email = await ask("Email for new request alerts (optional): ");
  const pin = await ask(`PIN (${ADMIN_PIN_LENGTH} digits): `);
  const confirm = await ask("Repeat the PIN: ");
  if (!isPinShape(pin, ADMIN_PIN_LENGTH)) throw new Error(`The PIN must have ${ADMIN_PIN_LENGTH} digits.`);
  if (pin !== confirm) throw new Error("The two PINs do not match.");

  await Admin.create({ name, phone, email, pinHash: await hashPin(pin), mustChangePin: false, isSuperAdmin: true, active: true });
  console.log(`Super admin ${name} created. Log in on the panel host with ${phone}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    closePrompt();
    await mongoose.disconnect();
  });
