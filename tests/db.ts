import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// In-memory MongoDB for tests. Each test file gets a fresh database.
let server: MongoMemoryServer | null = null;

export async function startDb() {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri("naff-test");
  const { connectDb } = await import("@/server/db");
  await connectDb();
}

export async function stopDb() {
  await mongoose.disconnect();
  await server?.stop();
}

export async function clearDb() {
  const collections = await mongoose.connection.db!.collections();
  for (const collection of collections) await collection.deleteMany({});
}
