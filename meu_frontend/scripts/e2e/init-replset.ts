import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://127.0.0.1:27018/?directConnection=true");
await client.connect();
try {
  await client.db("admin").command({
    replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27018" }] },
  });
  console.log("replica set initiated");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("already initialized")) console.log("replica set already initialized");
  else throw error;
}
// Wait for PRIMARY
for (let i = 0; i < 60; i++) {
  const hello = await client.db("admin").command({ hello: 1 });
  if (hello.isWritablePrimary) { console.log("primary ready"); break; }
  await new Promise((r) => setTimeout(r, 500));
}
await client.close();
