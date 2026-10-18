import { describe, expect, it } from "vitest";
import { generateTrackingCode, isTrackingCodeShape } from "@/lib/codes";
import { parseCoordinates, areaName } from "@/lib/location";
import { computePrice } from "@/lib/money";
import { cleanDraft, emptyDraft, feeTimingOptions, methodOptions, saleOptions } from "@/lib/order-form";
import { hasReached, journeySteps } from "@/lib/order-steps";
import { needsReceiverConfirmation, orderSummary } from "@/lib/order-summary";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { translate } from "@/i18n";
import { checkPaymentAnswers } from "@/server/services/orders";
import { buildPeriods, change } from "@/server/services/reports";

describe("prices and discount", () => {
  it("applies the rate to registered users only", () => {
    expect(computePrice(2500, 0.05, true)).toEqual({ discountRate: 0.05, discountAmount: 125, netPrice: 2375 });
    expect(computePrice(2500, 0.05, false)).toEqual({ discountRate: 0, discountAmount: 0, netPrice: 2500 });
  });
  it("shows no discount when the rate is 0", () => {
    expect(computePrice(2500, 0, true).discountAmount).toBe(0);
  });
  it("rounds to whole XAF", () => {
    expect(computePrice(1999, 0.05, true).discountAmount).toBe(100);
  });
});

describe("payment answers", () => {
  const base = { type: "local" as const, intercityMode: null, isSale: false, goodsStatus: null, goodsAmount: 0, feeTiming: "pickup" as const, feeMethod: "cash" as const };
  it("accepts a normal local order", () => {
    expect(checkPaymentAnswers(base)).toEqual({});
  });
  it("refuses payment on delivery for intercity", () => {
    expect(checkPaymentAnswers({ ...base, type: "intercity", intercityMode: "to_address", feeTiming: "delivery" }).feeTiming).toBe("errors.feeIntercity");
  });
  it("refuses goods paid on arrival for intercity", () => {
    expect(checkPaymentAnswers({ ...base, type: "intercity", intercityMode: "to_address", isSale: true, goodsStatus: "receiver_pays", goodsAmount: 5000 }).goodsStatus).toBe("errors.goodsIntercity");
  });
  it("requires mobile money when paying at request", () => {
    expect(checkPaymentAnswers({ ...base, feeTiming: "request", feeMethod: "cash" }).feeMethod).toBe("errors.mobileMoneyOnly");
    expect(checkPaymentAnswers({ ...base, feeTiming: "request", feeMethod: "mtn_momo" })).toEqual({});
  });
  it("requires an amount when the receiver pays the goods", () => {
    expect(checkPaymentAnswers({ ...base, isSale: true, goodsStatus: "receiver_pays", goodsAmount: 0 }).goodsAmount).toBe("errors.amount");
  });
  it("flags 'confirm with receiver first' only for a non-sale paid by the receiver", () => {
    expect(needsReceiverConfirmation(false, "delivery")).toBe(true);
    expect(needsReceiverConfirmation(true, "delivery")).toBe(false);
    expect(needsReceiverConfirmation(false, "pickup")).toBe(false);
  });
});

describe("request form options", () => {
  it("offers the right choices per order type", () => {
    expect(feeTimingOptions("intercity")).toEqual(["request", "pickup"]);
    expect(feeTimingOptions("local")).toEqual(["request", "pickup", "delivery"]);
    expect(methodOptions("request")).toEqual(["mtn_momo", "orange_money"]);
    expect(saleOptions("intercity")).not.toContain("receiver_pays");
  });
  it("clears answers that become impossible", () => {
    const draft = cleanDraft({ ...emptyDraft(), type: "intercity", sale: "receiver_pays", feeTiming: "delivery", feeMethod: "cash" });
    expect(draft.sale).toBeNull();
    expect(draft.feeTiming).toBeNull();
  });
});

describe("journey", () => {
  it("has the right steps per type", () => {
    expect(journeySteps("local", null)).toEqual(["requested", "approved", "assigned", "driver_confirmed", "picked_up", "delivered"]);
    expect(journeySteps("intercity", "collect_at_agency")).not.toContain("collected_at_destination");
    expect(journeySteps("intercity", "to_address")).toContain("collected_at_destination");
  });
  it("compares steps", () => {
    expect(hasReached("in_transit", "picked_up")).toBe(true);
    expect(hasReached("approved", "driver_confirmed")).toBe(false);
    expect(hasReached("cancelled", "requested")).toBe(false);
  });
});

describe("codes, phones and places", () => {
  it("makes 12-character tracking codes without look-alikes", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateTrackingCode();
      expect(isTrackingCodeShape(code)).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
    expect(isTrackingCodeShape("8F2K9Q")).toBe(false);
  });
  it("normalizes Cameroon numbers", () => {
    expect(normalizePhone("+237 677 12 34 56")).toBe("677123456");
    expect(normalizePhone("237677123456")).toBe("677123456");
    expect(normalizePhone("12345")).toBeNull();
    expect(formatPhone("677123456")).toBe("+237 677 12 34 56");
  });
  it("reads coordinates from shared location links", () => {
    expect(parseCoordinates("https://maps.google.com/?q=4.0511,9.7679")).toEqual({ lat: 4.0511, lng: 9.7679 });
    expect(parseCoordinates("https://www.google.com/maps/place/X/@4.05,9.70,17z")).toEqual({ lat: 4.05, lng: 9.7 });
    expect(parseCoordinates("4.0511, 9.7679")).toEqual({ lat: 4.0511, lng: 9.7679 });
    expect(parseCoordinates("https://maps.app.goo.gl/abc")).toBeNull();
    expect(areaName("Akwa, near Total station")).toBe("Akwa");
  });
});

describe("summary and reports", () => {
  it("writes the plain-language summary", () => {
    const tx = (key: string, values?: Record<string, string | number>) => translate("en", key, values);
    const text = orderSummary({ type: "local", intercityMode: null, destinationCityName: "Douala", goods: { isSale: true, status: "receiver_pays", amount: 15000 }, fee: { timing: "delivery", method: "cash" } }, tx);
    expect(text).toBe("Local sale. Receiver pays 15,000 XAF for the goods on delivery. Receiver pays the delivery fee on delivery (Cash).");
  });
  it("builds 8 periods ending today", () => {
    const weeks = buildPeriods("week", "2026-10-18");
    expect(weeks).toHaveLength(8);
    expect(weeks[7].key).toBe("2026-10-12");
    expect(buildPeriods("month", "2026-10-18")[7].key).toBe("2026-10");
    expect(change(12, 10)).toBe(20);
    expect(change(5, 0)).toBeNull();
  });
});
