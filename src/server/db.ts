import mongoose from "mongoose";

// Reuse one connection across hot reloads (dev) and warm serverless invocations (Vercel).
const globalCache = globalThis as unknown as { mongoosePromise?: Promise<typeof mongoose> };
export async function connectDb(): Promise<typeof mongoose> {
  if (!globalCache.mongoosePromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    globalCache.mongoosePromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  }
  try {
    return await globalCache.mongoosePromise;
  } catch (error) {
    globalCache.mongoosePromise = undefined;
    throw error;
  }
}
