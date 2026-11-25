import { MongoClient } from "mongodb";
import { decryptSecret, encryptSecret } from "../src/config/encryption";
import { COLLECTIONS } from "../../../shared/persistence/collections";

// Dry-run by default. --apply migrates with compare-and-set; never logs secret values.
const apply = process.argv.includes("--apply");
const uri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
if (!uri) throw new Error("MONGO_URI or MONGODB_URI is required");
// Validate the key before opening a database connection.
encryptSecret("validation");
const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME ?? "meu");
  for (const [name, fields] of [[COLLECTIONS.Exchange, ["apiKey", "secret", "accessToken"]], [COLLECTIONS.Credentials, ["apiKey"]]] as const) {
    let pending = 0, migrated = 0;
    for await (const doc of db.collection(name).find({})) {
      for (const field of fields) {
        const value = doc[field];
        if (typeof value !== "string" || !value) continue;
        if (value.startsWith("meu:")) { decryptSecret(value); continue; }
        pending++;
        if (apply) {
          const result = await db.collection(name).updateOne({ _id: doc._id, [field]: value }, { $set: { [field]: encryptSecret(value) } });
          migrated += result.modifiedCount;
        }
      }
    }
    console.log(JSON.stringify({ collection: name, apply, plaintextFields: pending, migrated }));
  }
} finally { await client.close(); }
