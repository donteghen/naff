import { Schema, model, models, type Model } from "mongoose";

type CounterDoc = { _id: string; value: number };

const counterSchema = new Schema<CounterDoc>({ _id: String, value: { type: Number, default: 0 } });

export const Counter = (models.Counter as Model<CounterDoc>) || model<CounterDoc>("Counter", counterSchema);
