const { test, before, after, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomBytes } = require("node:crypto");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
// Exercise the production Mongo-backed limiter with real opaque sessions.
process.env.NODE_ENV = "production";
const User = require("../src/models/user.model").default;
const Session = require("../src/models/Session").default;
const { tokenHash } = require("../src/services/sessions");
const { MongoRateStore, RateBucket } = require("../src/security/rate-store");
let db,
  server,
  url,
  buyer,
  otherBuyer,
  admin,
  otherAdmin,
  providerCalls = 0,
  uploads = 0;
async function sessionFor(user) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    _id: tokenHash(token),
    userId: String(user._id),
    role: user.role,
    authVersion: 0,
    mfaVerified: user.role === "admin",
    authenticatedAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
  });
  return token;
}
async function account(name, role = "user") {
  const user = await User.create({
    name,
    email: name + "@example.test",
    password: "unused",
    role,
    ...(role === "admin" ? { mfaSecret: "fixture-only" } : {}),
  });
  return { user, token: await sessionFor(user) };
}
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await User.init();
  buyer = await account("buyer");
  otherBuyer = await account("other-buyer");
  admin = await account("admin", "admin");
  otherAdmin = await account("other-admin", "admin");
  // Replace only the expensive service/provider boundary; routing and auth stay real.
  mock.method(
    require("../src/services/payments"),
    "createCheckout",
    async () => {
      providerCalls++;
      return {
        _id: "checkout",
        state: "open",
        sessionUrl: "https://checkout.stripe.com/c/pay/test",
      };
    },
  );
  mock.method(
    require("../src/config/cloudinary").storage,
    "_handleFile",
    (req, file, callback) => {
      uploads++;
      file.stream.resume();
      file.stream.on("end", () =>
        callback(null, {
          path: "https://images.example.test/test.png",
          filename: "test",
          size: 1,
        }),
      );
    },
  );
  const ProductController =
    require("../src/controllers/product.controller").default;
  mock.method(ProductController, "createProduct", (_req, res) =>
    res.sendStatus(204),
  );
  mock.method(ProductController, "updateProduct", (_req, res) =>
    res.sendStatus(204),
  );
  const app = express();
  app.use(express.json());
  app.use("/stripe", require("../src/routes/stripe.routes").default);
  app.use("/products", require("../src/routes/product.routes").default);
  app.use((_error, _req, res, _next) =>
    res.status(503).json({ message: "Service unavailable" }),
  );
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + server.address().port;
});
beforeEach(async () => {
  await RateBucket.deleteMany({});
  providerCalls = 0;
  uploads = 0;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  mock.restoreAll();
  await mongoose.disconnect();
  if (db) await db.stop();
});
function checkout(token, forwarded = "192.0.2.1") {
  return fetch(url + "/stripe/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      "X-Forwarded-For": forwarded,
    },
    body: JSON.stringify({ items: [] }),
  });
}
function upload(token, method = "POST") {
  const form = new FormData();
  form.append("image", new Blob(["x"], { type: "image/png" }), "test.png");
  return fetch(
    url + "/products" + (method === "PUT" ? "/507f1f77bcf86cd799439011" : ""),
    { method, headers: { Authorization: "Bearer " + token }, body: form },
  );
}
test("checkout quota blocks the eleventh account request before payment work and cannot be reset by another session", async () => {
  assert.equal((await checkout()).status, 401);
  assert.equal(providerCalls, 0);
  for (let i = 0; i < 10; i++)
    assert.equal((await checkout(buyer.token, "192.0.2." + i)).status, 200);
  const blocked = await checkout(buyer.token);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal(providerCalls, 10);
  assert.equal((await checkout(await sessionFor(buyer.user))).status, 429);
  assert.equal(providerCalls, 10);
  assert.equal((await checkout(otherBuyer.token)).status, 200);
  assert.equal(providerCalls, 11);
});
test("product creation and update share one admin quota before multipart upload work", async () => {
  assert.equal((await upload(buyer.token)).status, 403);
  assert.equal(uploads, 0);
  for (let i = 0; i < 20; i++)
    assert.equal(
      (await upload(admin.token, i % 2 ? "PUT" : "POST")).status,
      204,
    );
  assert.equal((await upload(admin.token)).status, 429);
  assert.equal((await upload(admin.token, "PUT")).status, 429);
  assert.equal(uploads, 20);
  assert.equal((await upload(otherAdmin.token)).status, 204);
  assert.equal(uploads, 21);
  // Checkout has an independent quota for the same administrator account.
  assert.equal((await checkout(admin.token)).status, 200);
  assert.equal(providerCalls, 1);
});
test("rate-store failure blocks both expensive operations", async () => {
  const failure = mock.method(
    MongoRateStore.prototype,
    "increment",
    async () => {
      throw new Error("temporary store failure");
    },
  );
  try {
    assert.equal((await checkout(buyer.token)).status, 503);
    assert.equal((await upload(admin.token)).status, 503);
    assert.equal(providerCalls, 0);
    assert.equal(uploads, 0);
  } finally {
    failure.mock.restore();
  }
});
