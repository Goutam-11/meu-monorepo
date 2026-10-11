import { logger, errMeta } from "@/lib/logger";
import { MongoClient } from "mongodb";

const log = logger.child({ module: "db" });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error("MONGO_URI (or MONGODB_URI) missing");

const client = new MongoClient(MONGO_URI);

export async function connectDB() {
  try {
    await client.connect();
    log.info({ event: "db.connected" }, "MongoDB connected");
    return client.db(process.env.DATABASE_NAME || "meu");
  } catch (err) {
    log.error({ event: "db.connection_failed", ...errMeta(err) }, "MongoDB connection failed");
    throw err;
  }
}

export async function closeDB() {
  await client.close();
  log.info({ event: "db.closed" }, "MongoDB connection closed");
}
