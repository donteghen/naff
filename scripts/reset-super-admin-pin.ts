// Sets a new PIN for the super admin and ends all their sessions: npm run reset-super-admin-pin
import mongoose from "mongoose";
import { ADMIN_PIN_LENGTH } from "../src/lib/constants";
import { hashPin, isPinShape } from "../src/server/auth/pins";
import { connectDb } from "../src/server/db";
import { Admin } from "../src/server/models/Admin";
import { Session } from "../src/server/models/Session";
import { ask, closePrompt } from "./prompt";

async function main() {
  await connectDb();
  const admin = await Admin.findOne({ isSuperAdmin: true });
  if (!admin) throw new Error("No super admin yet. Run `npm run create-super-admin` first.");
  console.log(`Super admin: ${admin.name} (${admin.phone})`);
  const pin = await ask(`New PIN (${ADMIN_PIN_LENGTH} digits): `);
  const confirm = await ask("Repeat the PIN: ");
  if (!isPinShape(pin, ADMIN_PIN_LENGTH)) throw new Error(`The PIN must have ${ADMIN_PIN_LENGTH} digits.`);
  if (pin !== confirm) throw new Error("The two PINs do not match.");
  admin.pinHash = await hashPin(pin);
  admin.mustChangePin = false;
  admin.active = true;
  await admin.save();
  await Session.deleteMany({ audience: "panel", subjectId: admin._id });
  console.log("PIN changed. All super admin sessions were ended.");
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
