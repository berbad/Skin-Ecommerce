const { test, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { randomBytes, createHash } = require("crypto");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-csrf-secret-never-deploy";
process.env.STRIPE_SECRET_KEY = "sk_test_mock_only";
process.env.STRIPE_WEBHOOK_SECRET = "test-webhook-secret";
const { createApp } = require("../src/app");
const User = require("../src/models/user.model").default;
const Session = require("../src/models/Session").default;
const Product = require("../src/models/product.model").default;
const { tokenHash } = require("../src/services/sessions");
const Stripe = require("stripe");
let db, server, url, user, admin;
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await User.init();
  user = await User.create({
    name: "Test",
    email: "user@example.test",
    password: "unused",
    role: "user",
  });
  admin = await User.create({
    name: "Admin",
    email: "admin@example.test",
    password: "unused",
    role: "admin",
    mfaSecret: "test-fixture-only",
  });
  server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + server.address().port;
  mock.method(require("https"), "request", () => {
    throw new Error("External network forbidden in security tests");
  });
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (db) await db.stop();
});
async function identity(u = user) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    _id: tokenHash(token),
    userId: String(u._id),
    role: u.role,
    authVersion: 0,
    mfaVerified: u.role === "admin",
    authenticatedAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
  });
  return "token=" + token;
}
function cookies(cookie, response) {
  const jar = new Map(
    cookie
      .split(";")
      .filter(Boolean)
      .map((c) => c.trim().split("=")),
  );
  for (const c of response.headers.getSetCookie()) {
    const [k, v] = c.split(";")[0].split("=");
    jar.set(k, v);
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function bootstrap(cookie = "") {
  const r = await fetch(url + "/api/csrf-token", {
    headers: { Origin: "https://www.eternalbotanic.com", Cookie: cookie },
  });
  assert.equal(r.status, 200);
  return { cookie: cookies(cookie, r), token: (await r.json()).csrfToken };
}
async function request(path, body, options = {}) {
  const method = options.method || "POST";
  let cookie = options.cookie ?? (await identity());
  const headers = {
    "Content-Type": "application/json",
    Origin: "https://www.eternalbotanic.com",
    Cookie: cookie,
    ...options.headers,
  };
  if (
    !options.noCsrf &&
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    !path.startsWith("/api/stripe/webhook")
  ) {
    const state = await bootstrap(cookie);
    headers.Cookie = state.cookie;
    headers["X-CSRF-Token"] = state.token;
  }
  if (options.noOrigin) delete headers.Origin;
  return fetch(url + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
test("unsafe requests reject missing hostile and suffix-matching origins", async () => {
  for (const options of [
    { noOrigin: true },
    { headers: { Origin: "https://attacker.example" } },
    { headers: { Origin: "https://www.eternalbotanic.com.attacker.example" } },
  ])
    assert.equal((await request("/api/auth/logout", {}, options)).status, 403);
});
test("trusted-origin writes require signed session-bound CSRF tokens", async () => {
  assert.equal(
    (await request("/api/auth/logout", {}, { noCsrf: true })).status,
    403,
  );
  const a = await bootstrap(),
    b = await bootstrap();
  const r = await request(
    "/api/auth/logout",
    {},
    { cookie: b.cookie, noCsrf: true, headers: { "X-CSRF-Token": a.token } },
  );
  assert.equal(r.status, 403);
});
test("CSRF endpoint rejects hostile origins and supports trusted Referer with no-store", async () => {
  for (const headers of [{ Origin: "https://attacker.example" }, {}])
    assert.equal(
      (await fetch(url + "/api/csrf-token", { headers })).status,
      403,
    );
  const r = await fetch(url + "/api/csrf-token", {
    headers: { Referer: "https://www.eternalbotanic.com/login" },
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
});
test("CSRF binding changes on logout and copied authenticated token cannot be replayed", async () => {
  const original = await identity();
  const a = await bootstrap(original);
  const logout = await request(
    "/api/auth/logout",
    {},
    { cookie: a.cookie, noCsrf: true, headers: { "X-CSRF-Token": a.token } },
  );
  assert.equal(logout.status, 200);
  assert.equal(
    (
      await request("/api/auth/profile", undefined, {
        method: "GET",
        cookie: original,
      })
    ).status,
    401,
  );
  const b = await bootstrap(cookies(a.cookie, logout));
  assert.notEqual(a.token, b.token);
});
test("normal users cannot access administrator writes or reconciliation", async () => {
  assert.equal((await request("/api/products", {})).status, 403);
  assert.equal(
    (await request("/api/orders/reconciliation", undefined, { method: "GET" }))
      .status,
    403,
  );
});
test("order reads cannot access another customer order", async () => {
  const Order = require("../src/models/Order").default;
  await Order.create({
    _id: "cs_other",
    userId: String(admin._id),
    items: [],
    total: 1,
    status: "paid",
  });
  assert.equal(
    (await request("/api/orders/cs_other", undefined, { method: "GET" }))
      .status,
    404,
  );
});
test("direct orders and operator object rearrangements cannot mutate state", async () => {
  assert.equal((await request("/api/orders", { items: [] })).status, 409);
  assert.equal(
    (
      await request(
        "/api/products/rearrange",
        { productIds: [{ $ne: null }] },
        { method: "PATCH", cookie: await identity(admin) },
      )
    ).status,
    400,
  );
});
test("cart rejects negative fractional string oversized and operator quantities", async () => {
  for (const quantity of [-1, 1.5, "2", 1001, { $gt: 0 }])
    assert.equal(
      (
        await request("/api/cart/items", {
          productId: "a".repeat(24),
          quantity,
        })
      ).status,
      400,
    );
});
test("profile rejects overlong strings and nested operators", async () => {
  assert.equal(
    (
      await request(
        "/api/auth/profile",
        { name: "x".repeat(101) },
        { method: "PUT" },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/auth/profile",
        { address: { line1: { $ne: null } } },
        { method: "PUT" },
      )
    ).status,
    400,
  );
});
test("large JSON is rejected before account handler", async () => {
  assert.equal(
    (
      await request("/api/auth/login", {
        email: "a@b.com",
        password: "a".repeat(40000),
      })
    ).status,
    413,
  );
});
test("invalid credentials objects are rejected before authentication", async () => {
  assert.equal(
    (
      await request("/api/auth/login", {
        email: { $ne: null },
        password: { $ne: null },
      })
    ).status,
    400,
  );
});
test("webhook signature verification keeps raw body and safe plaintext errors", async () => {
  const invalid = await request(
    "/api/stripe/webhook",
    { bad: "<script>" },
    { noOrigin: true, headers: { "stripe-signature": "invalid" } },
  );
  assert.equal(invalid.status, 400);
  assert.equal(await invalid.text(), "Invalid webhook signature");
  const payload = JSON.stringify({
    id: "evt_test",
    type: "test.event",
    data: { object: {} },
  });
  const signature = new Stripe(
    "sk_test_mock_only",
  ).webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  assert.equal(
    (
      await request("/api/stripe/webhook", JSON.parse(payload), {
        noOrigin: true,
        headers: { "stripe-signature": signature },
      })
    ).status,
    200,
  );
});
test("upload rejects non-raster types before cloud upload", async () => {
  const state = await bootstrap(await identity(admin));
  const form = new FormData();
  form.append(
    "image",
    new Blob(["<svg/>"], { type: "image/svg+xml" }),
    "test.svg",
  );
  const r = await fetch(url + "/api/products", {
    method: "POST",
    headers: {
      Origin: "https://www.eternalbotanic.com",
      Cookie: state.cookie,
      "X-CSRF-Token": state.token,
    },
    body: form,
  });
  assert.equal(r.status, 400);
});
test("auth limiter counts requests despite spoofed forwarding headers", async () => {
  let blocked = false;
  for (let n = 0; n < 25; n++) {
    const r = await request(
      "/api/auth/login",
      { email: "missing@example.test", password: "wrong" },
      { headers: { "X-Forwarded-For": `192.0.2.${n}` } },
    );
    if (r.status === 429) {
      blocked = true;
      break;
    }
  }
  assert.equal(blocked, true);
});

test("catalog schema rejects negative money and fractional inventory", async () => {
  for (const fields of [
    { price: -1, stock: 2 },
    { price: 1, stock: 0.5 },
  ]) {
    const product = new Product({
      name: "Test",
      description: "Test",
      category: "Test",
      image: "https://example.test/p.png",
      ...fields,
    });
    await assert.rejects(() => product.validate());
  }
});

test("stale admin inventory edits cannot overwrite checkout reservations", async () => {
  const p = await Product.create({
    name: "Test",
    description: "Test",
    category: "Test",
    image: "test",
    stock: 1,
    price: 25,
  });
  await Product.updateOne({ _id: p._id }, { $inc: { stock: -1 } });
  const body = {
    name: "Updated",
    description: "Test",
    category: "Test",
    price: 25,
    stock: 1,
    expectedStock: 1,
  };
  const r = await request("/api/products/" + p._id, body, {
    method: "PUT",
    cookie: await identity(admin),
  });
  assert.equal(r.status, 409);
  assert.equal((await Product.findById(p._id)).stock, 0);
  assert.equal((await Product.findById(p._id)).name, "Test");
  const fresh = await request(
    "/api/products/" + p._id,
    { ...body, stock: 3, expectedStock: 0 },
    { method: "PUT", cookie: await identity(admin) },
  );
  assert.equal(fresh.status, 200);
  assert.equal((await Product.findById(p._id)).stock, 3);
  const missing = await request(
    "/api/products/" + p._id,
    {
      name: "Test",
      description: "Test",
      category: "Test",
      price: 25,
      stock: 5,
    },
    { method: "PUT", cookie: await identity(admin) },
  );
  assert.equal(missing.status, 400);
  assert.equal((await Product.findById(p._id)).stock, 3);
});
