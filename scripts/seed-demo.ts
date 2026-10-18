// Optional starter data for a fresh database (testing or first launch): npm run seed-demo
// Creates Douala, Buea and Yaoundé, one partner agency serving the three, and contact settings.
// Drivers are not created here: add them in the panel so each gets a temporary PIN.
import mongoose from "mongoose";
import { connectDb } from "../src/server/db";
import { Agency } from "../src/server/models/Agency";
import { City } from "../src/server/models/City";
import { Settings } from "../src/server/models/Settings";

async function main() {
  await connectDb();
  if ((await City.countDocuments()) > 0) {
    console.log("Cities already exist: nothing to do.");
    return;
  }
  const [douala, buea, yaounde] = await City.create([{ name: "Douala" }, { name: "Buea" }, { name: "Yaoundé" }]);
  await Agency.create({
    name: "Express Voyages",
    phone: "",
    branches: [
      { cityId: douala._id, address: "Mboppi" },
      { cityId: buea._id, address: "Molyko" },
      { cityId: yaounde._id, address: "Mvan" },
    ],
  });
  await Settings.updateOne({ _id: "settings" }, { $setOnInsert: { discountRate: 0.05, operationalStatus: "live" } }, { upsert: true });
  console.log("Created Douala, Buea, Yaoundé and the agency Express Voyages. Set the contact numbers in Settings → Contacts.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
