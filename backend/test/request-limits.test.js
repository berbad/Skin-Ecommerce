const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
let db;
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
});
after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
});
test("two limiter instances share atomic counters without storing raw IPs", async () => {
  const { MongoRateStore, RateBucket } = require("../src/security/rate-store");
  const a = new MongoRateStore("login", 60000),
    b = new MongoRateStore("login", 60000);
  const hits = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      (i % 2 ? a : b).increment("192.0.2.1"),
    ),
  );
  assert.equal(Math.max(...hits.map((h) => h.totalHits)), 20);
  const records = await RateBucket.find({}).lean();
  assert.equal(records.length, 1);
  assert.ok(!JSON.stringify(records).includes("192.0.2.1"));
});
