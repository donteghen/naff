import { Schema, model, models, type Model } from "mongoose";

// Request counters for rate limiting. MongoDB deletes them automatically after `expiresAt`.
type RateLimitDoc = { key: string; count: number; expiresAt: Date };

const rateLimitSchema = new Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const RateLimit = (models.RateLimit as Model<RateLimitDoc>) || model<RateLimitDoc>("RateLimit", rateLimitSchema);
