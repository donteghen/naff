import { Schema, model, models, type Model } from "mongoose";

export type MobileMoneyAccount = { number: string; name: string };

export type SettingsDoc = {
  _id: string;
  /** Fraction, e.g. 0.05 = 5%. Applied to orders of registered users. */
  discountRate: number;
  callUsPhone: string;
  whatsappPhone: string;
  mtnMomo: MobileMoneyAccount;
  orangeMoney: MobileMoneyAccount;
  operationalStatus: "live" | "maintenance";
};

const accountSchema = { number: { type: String, default: "" }, name: { type: String, default: "" } };

const settingsSchema = new Schema<SettingsDoc>(
  {
    _id: { type: String, default: "settings" },
    discountRate: { type: Number, default: 0.05 },
    callUsPhone: { type: String, default: "" },
    whatsappPhone: { type: String, default: "" },
    mtnMomo: { type: accountSchema, default: () => ({}), _id: false },
    orangeMoney: { type: accountSchema, default: () => ({}), _id: false },
    operationalStatus: { type: String, default: "live" },
  },
  { timestamps: true },
);

export const Settings = (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>("Settings", settingsSchema);
