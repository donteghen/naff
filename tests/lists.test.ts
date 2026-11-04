import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { City } from "@/server/models/City";
import { Driver } from "@/server/models/Driver";
import { User } from "@/server/models/User";
import { driverState, listDriversWithJobs } from "@/server/services/order-queries";
import { listUsers } from "@/server/services/people";
import { clearDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("admin list filters", () => {
  it("filters drivers by name, phone and state", async () => {
    const city = await City.create({ name: "Douala" });
    await Driver.create({ name: "Eric Tamba", phone: "650112233", cityId: city._id, pinHash: "-", available: true });
    await Driver.create({ name: "Paul Mbe", phone: "650445566", cityId: city._id, pinHash: "-", available: false });
    await Driver.create({ name: "Jean Fon", phone: "650778899", cityId: city._id, pinHash: "-", active: false });

    expect((await listDriversWithJobs({ includeInactive: true, q: "eric" })).map((driver) => driver.name)).toEqual(["Eric Tamba"]);
    expect((await listDriversWithJobs({ includeInactive: true, q: "650 44 55 66" })).map((driver) => driver.name)).toEqual(["Paul Mbe"]);
    expect((await listDriversWithJobs({ includeInactive: true, state: "offline" })).map((driver) => driver.name)).toEqual(["Paul Mbe"]);
    expect((await listDriversWithJobs({ includeInactive: true, state: "suspended" })).map((driver) => driver.name)).toEqual(["Jean Fon"]);
    expect(await listDriversWithJobs({ includeInactive: true })).toHaveLength(3);
  });

  it("gives each driver one state", () => {
    expect(driverState({ active: false, available: true, currentJobs: [1] })).toBe("suspended");
    expect(driverState({ active: true, available: false, currentJobs: [1] })).toBe("on_job");
    expect(driverState({ active: true, available: true, currentJobs: [] })).toBe("available");
    expect(driverState({ active: true, available: false, currentJobs: [] })).toBe("offline");
  });

  it("filters users by status", async () => {
    await User.create({ name: "Marie", phone: "677123456", email: "m@example.com", pinHash: "-" });
    await User.create({ name: "Joseph", phone: "677654321", email: "j@example.com", pinHash: "-", active: false });
    expect((await listUsers({ status: "active" })).users.map((user) => user.name)).toEqual(["Marie"]);
    expect((await listUsers({ status: "inactive" })).users.map((user) => user.name)).toEqual(["Joseph"]);
    expect((await listUsers({})).total).toBe(2);
  });
});
