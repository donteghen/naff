import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { OrderInput } from "@/lib/schemas";
import { Admin } from "@/server/models/Admin";
import { Agency } from "@/server/models/Agency";
import { City } from "@/server/models/City";
import { Driver, type DriverDoc } from "@/server/models/Driver";
import { Order } from "@/server/models/Order";
import { Settings } from "@/server/models/Settings";
import * as orders from "@/server/services/orders";
import { endDriverSessions } from "@/server/services/people";
import { clearDb, startDb, stopDb } from "./db";
import { fetchMock } from "./setup";

beforeAll(startDb);
afterAll(stopDb);

let admin: { _id: Types.ObjectId; name: string };
let douala: Types.ObjectId;
let buea: Types.ObjectId;
let eric: DriverDoc;
let samuel: DriverDoc;
let brice: DriverDoc;
let agencyId: string;

type Posted = { topic: string; title: string; message: string; priority: number; click: string };
function posted(): Posted[] {
  return fetchMock.mock.calls.map((call) => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)) as Posted);
}

beforeEach(async () => {
  await clearDb();
  fetchMock.mockClear();
  await Settings.create({ _id: "settings", discountRate: 0.05 });
  const created = await Admin.create({ name: "Aïcha", phone: "690000000", pinHash: "-", isSuperAdmin: true, mustChangePin: false });
  admin = { _id: created._id, name: created.name };
  [douala, buea] = (await City.create([{ name: "Douala" }, { name: "Buea" }])).map((city) => city._id);
  const make = async (name: string, phone: string, cityId: Types.ObjectId, topic: string) =>
    (await Driver.create({ name, phone, cityId, pinHash: "-", mustChangePin: false, ntfyTopic: topic })).toObject() as DriverDoc;
  eric = await make("Eric", "650112233", douala, "naff-eric");
  samuel = await make("Samuel", "677445566", douala, "naff-samuel");
  brice = await make("Brice", "655987654", buea, "naff-brice");
  agencyId = String((await Agency.create({ name: "Express Voyages", branches: [{ cityId: douala }, { cityId: buea }] }))._id);
});

function input(overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    type: "local", intercityMode: null, originCityId: String(douala), destinationCityId: String(douala),
    isSale: false, goodsStatus: null, goodsAmount: 0, feeTiming: "pickup", feeMethod: "cash", size: "small", category: "documents",
    contents: "Contract", itemCount: 1, estimatedValue: null, declarationAccepted: true,
    pickup: { text: "Akwa, near Total station" }, dropoff: { text: "Makepe, Rue des Palmiers" },
    sender: { name: "Marie", phone: "677123456" }, receiver: { name: "Paul", phone: "699001122" }, ...overrides,
  };
}

async function approved(language: "fr" | "en", overrides: Partial<OrderInput> = {}) {
  const created = await orders.createOrder({ input: input(overrides), source: "web", language });
  const intercity = overrides.type === "intercity";
  await orders.approveOrder(admin, created.id, { grossPrice: 3000, agencyFee: intercity ? 1000 : null });
  fetchMock.mockClear();
  return created.id;
}

describe("order language", () => {
  it("is saved from the site, and required on a quick order", async () => {
    const web = await orders.createOrder({ input: input(), source: "web", language: "en" });
    expect((await Order.findById(web.id).lean())!.language).toBe("en");
    await expect(orders.createOrder({ input: input(), source: "admin", admin, language: "" })).rejects.toMatchObject({ fields: { language: "errors.required" } });
    const quick = await orders.createOrder({ input: input(), source: "admin", admin, language: "fr" });
    expect((await Order.findById(quick.id).lean())!.language).toBe("fr");
  });

  it("can be corrected by an admin", async () => {
    const id = await approved("fr");
    const order = (await Order.findById(id).lean())!;
    await orders.editDetails(admin, id, {
      sender: order.sender, receiver: order.receiver, pickup: { text: order.pickup.text }, dropoff: { text: order.dropoff.text },
      size: order.parcel.size, category: order.parcel.category, contents: order.parcel.contents, itemCount: 1, language: "en",
    });
    expect((await Order.findById(id).lean())!.language).toBe("en");
  });
});

describe("driver notifications", () => {
  it("tells the assigned driver, in the order's language, with a link to the job", async () => {
    const id = await approved("en");
    await orders.assignDriver(admin, id, "origin", String(eric._id));
    const [message] = posted();
    expect(message.topic).toBe("naff-eric");
    expect(message.title).toMatch(/^New job NF-\d+$/);
    expect(message.message).toBe("Akwa → Makepe. Open the app to accept the job.");
    expect(message.click).toBe(`http://driver.localhost:3000/jobs/${id}`);
  });

  it("writes French for a French order and never includes phones, addresses or amounts", async () => {
    const id = await approved("fr");
    await orders.assignDriver(admin, id, "origin", String(eric._id));
    const text = JSON.stringify(posted());
    expect(posted()[0].title).toMatch(/^Nouvelle course NF-/);
    expect(text).not.toMatch(/677123456|699001122|Total station|Palmiers|3,000|3 000|2,850|XAF/);
  });

  it("tells the previous driver when the job is given to someone else, and when unassigned", async () => {
    const id = await approved("en");
    await orders.assignDriver(admin, id, "origin", String(eric._id));
    fetchMock.mockClear();
    await orders.assignDriver(admin, id, "origin", String(samuel._id));
    expect(posted().map((message) => [message.topic, message.title.split(" ")[0]])).toEqual([["naff-eric", "Job"], ["naff-samuel", "New"]]);
    fetchMock.mockClear();
    await orders.unassignDriver(admin, id, "origin");
    expect(posted()[0].topic).toBe("naff-samuel");
    expect(posted()[0].title).toContain("taken off you");
  });

  it("tells the drivers still on the order when it is cancelled or the price changes", async () => {
    const id = await approved("en");
    await orders.assignDriver(admin, id, "origin", String(eric._id));
    fetchMock.mockClear();
    await orders.editPrice(admin, id, { grossPrice: 3500, reason: "Extra distance" });
    expect(posted()[0].title).toMatch(/^Price changed/);
    fetchMock.mockClear();
    await orders.cancelOrder(admin, id, "Customer changed their mind");
    expect(posted()[0].title).toMatch(/cancelled$/);
  });

  it("tells the second driver to go and collect when the parcel reaches the agency", async () => {
    const id = await approved("en", { type: "intercity", intercityMode: "to_address", destinationCityId: String(buea) });
    await orders.assignDriver(admin, id, "origin", String(eric._id));
    await orders.assignDriver(admin, id, "destination", String(brice._id));
    await orders.respondToJob({ driver: eric }, id, "origin", true);
    await orders.markPickedUp({ driver: eric }, id);
    await orders.markDroppedAtAgency({ driver: eric }, id, { agencyId, vehicleNumber: "LT 482 AB", agencyDriverPhone: "699112233", eta: "2030-01-01T16:30" });
    await orders.confirmDrop(admin, id);
    fetchMock.mockClear();
    await orders.markArrivedAtAgency(admin, id);
    expect(posted()).toEqual([expect.objectContaining({ topic: "naff-brice", message: "The parcel is at the agency in Buea. You can go and collect it." })]);
  });

  it("never blocks the action when ntfy refuses (e.g. free daily limit reached)", async () => {
    const id = await approved("en");
    fetchMock.mockResolvedValueOnce(new Response("limit reached", { status: 429 }));
    await orders.assignDriver(admin, id, "origin", String(eric._id));
    expect((await Order.findById(id).lean())!.status).toBe("assigned");
  });

  it("gives the driver a new channel when logged out everywhere (lost phone)", async () => {
    await endDriverSessions(admin, String(eric._id));
    const topic = (await Driver.findById(eric._id).lean())!.ntfyTopic;
    expect(topic).toMatch(/^naff-/);
    expect(topic).not.toBe("naff-eric");
  });
});
