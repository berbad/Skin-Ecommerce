const { test, before, after, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
process.env.STRIPE_SECRET_KEY = "sk_test_mock_only";
process.env.STRIPE_SHIPPING_RATE_ID = "shr_test";
process.env.CLIENT_URL = "https://store.example.test";
process.env.ADMIN_EMAIL = "admin@example.test";
const Product = require("../src/models/product.model").default;
const Order = require("../src/models/Order").default;
let repl, service, Checkout, PaymentEvent, Notification;
let sessions, params, requests, failure;
const provider = {
  shippingRates: {
    retrieve: async () => ({
      id: "shr_test",
      active: true,
      type: "fixed_amount",
      fixed_amount: { amount: 500, currency: "usd" },
    }),
  },
  checkout: {
    sessions: {
      create: async (p, o) => {
        requests.push(o.idempotencyKey);
        params = p;
        if (!sessions.has(o.idempotencyKey))
          sessions.set(o.idempotencyKey, {
            id: "cs_" + o.idempotencyKey,
            url: "https://checkout.stripe.test/" + o.idempotencyKey,
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            currency: "usd",
            amount_subtotal: p.line_items.reduce(
              (n, i) => n + i.quantity * i.price_data.unit_amount,
              0,
            ),
            amount_total:
              p.line_items.reduce(
                (n, i) => n + i.quantity * i.price_data.unit_amount,
                0,
              ) + 500,
            total_details: { amount_shipping: 500 },
            metadata: p.metadata,
            client_reference_id: p.client_reference_id,
            customer_details: { email: "buyer@example.test", name: "<Buyer>" },
            collected_information: {
              shipping_details: {
                name: "<Buyer>",
                address: {
                  line1: "<Street>",
                  city: "Chicago",
                  state: "IL",
                  postal_code: "60601",
                  country: "US",
                },
              },
            },
          });
        if (failure) {
          failure = false;
          throw Error("network timeout after provider accepted");
        }
        return sessions.get(o.idempotencyKey);
      },
      retrieve: async (id) => {
        const s = [...sessions.values()].find((s) => s.id === id);
        if (!s) throw Error("session missing");
        return s;
      },
      expire: async (id) => {
        const s = await provider.checkout.sessions.retrieve(id);
        if (s.status !== "open") throw Error("not open");
        s.status = "expired";
        return s;
      },
    },
  },
};
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  service = require("../src/services/payments");
  ({
    Checkout,
    PaymentEvent,
    Notification,
  } = require("../src/models/payment.models"));
  await service.initializePaymentStorage();
});
after(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
beforeEach(async () => {
  if (!Checkout) return;
  for (const m of [Product, Order, Checkout, PaymentEvent, Notification])
    await m.deleteMany({});
  sessions = new Map();
  requests = [];
  failure = false;
});
async function product(stock = 5, price = 25) {
  return Product.create({
    name: "<Serum>",
    description: "Test",
    image: "test",
    category: "test",
    stock,
    price,
  });
}
const user = { id: "507f1f77bcf86cd799439011", email: "buyer@example.test" };
async function checkout(p, quantity = 1, key = randomUUID()) {
  return service.createCheckout(
    user,
    [{ id: String(p._id), quantity, price: 0.01 }],
    key,
    provider,
  );
}
async function paid(p) {
  const c = await checkout(p);
  const s = await provider.checkout.sessions.retrieve(c.sessionId);
  s.payment_status = "paid";
  s.status = "complete";
  return { c, s };
}
test("catalog cents and shipping form a durable snapshot, metadata contains only reference", async () => {
  const p = await product();
  const c = await checkout(p, 2);
  assert.equal(c.totalCents, 5500);
  assert.equal(c.items[0].unitAmount, 2500);
  assert.equal(params.line_items[0].price_data.product_data.name, "<Serum>");
  assert.deepEqual(params.metadata, { checkoutId: c._id });
  assert.equal((await Product.findById(p._id)).stock, 3);
});
test("normalized duplicates and invalid quantities are rejected without stock changes", async () => {
  const p = await product();
  for (const items of [
    [
      { id: String(p._id), quantity: 1 },
      { id: String(p._id).toUpperCase(), quantity: 1 },
    ],
    [{ id: String(p._id), quantity: 0 }],
    [{ id: { $ne: null }, quantity: 1 }],
  ])
    await assert.rejects(
      service.createCheckout(user, items, randomUUID(), provider),
      /Invalid cart/,
    );
  assert.equal((await Product.findById(p._id)).stock, 5);
});
test("concurrent checkout and network retry share one reservation and provider session", async () => {
  const p = await product();
  const key = randomUUID();
  failure = true;
  await assert.rejects(checkout(p, 2, key), /network timeout/);
  const result = await Promise.all([checkout(p, 2, key), checkout(p, 2, key)]);
  assert.equal(result[0]._id, result[1]._id);
  assert.equal(sessions.size, 1);
  assert.equal(new Set(requests).size, 1);
  assert.equal((await Product.findById(p._id)).stock, 3);
  await assert.rejects(checkout(p, 1, key), /Idempotency/);
});
test("transactions prevent oversell and roll back an unavailable multi-item cart", async () => {
  const p = await product(1);
  const result = await Promise.allSettled([checkout(p), checkout(p)]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await Product.findById(p._id)).stock, 0);
  const q = await product(3);
  await assert.rejects(
    service.createCheckout(
      user,
      [
        { id: String(q._id), quantity: 2 },
        { id: String(p._id), quantity: 1 },
      ],
      randomUUID(),
      provider,
    ),
    /unavailable/,
  );
  assert.equal((await Product.findById(q._id)).stock, 3);
});
test("paid concurrent webhook events produce one complete catalog order and per-recipient outbox", async () => {
  const p = await product();
  const { c, s } = await paid(p);
  await Promise.all([
    service.fulfillSession(s, "evt_one"),
    service.fulfillSession(s, "evt_two"),
    service.fulfillSession(s, "evt_one"),
  ]);
  const orders = await Order.find({});
  assert.equal(orders.length, 1);
  assert.equal(orders[0].items[0].productId, String(p._id));
  assert.equal(orders[0].total, 30);
  assert.equal(orders[0].paymentStatus, "paid");
  assert.equal(orders[0].shippingAddress.line1, "<Street>");
  assert.equal(orders[0].customerName, "<Buyer>");
  assert.equal((await Checkout.findById(c._id)).state, "fulfilled");
  assert.equal(await Notification.countDocuments(), 2);
  assert.equal((await Product.findById(p._id)).stock, 4);
});
test("unpaid events create no order; delayed paid event subsequently fulfills", async () => {
  const p = await product();
  const c = await checkout(p);
  const s = await provider.checkout.sessions.retrieve(c.sessionId);
  await service.fulfillSession(s, "evt_unpaid");
  assert.equal(await Order.countDocuments(), 0);
  s.status = "complete";
  s.payment_status = "paid";
  await service.fulfillSession(s, "evt_later");
  assert.equal(await Order.countDocuments(), 1);
});
test("missing snapshots and amount or ownership mismatch become durable manual cases", async () => {
  await service.fulfillSession(
    { id: "cs_legacy", payment_status: "paid", metadata: { userId: user.id } },
    "evt_legacy",
  );
  assert.equal((await PaymentEvent.findById("evt_legacy")).state, "manual");
  for (const field of ["amount_total", "client_reference_id", "currency"]) {
    const { s } = await paid(await product());
    s[field] = field === "amount_total" ? 1 : "wrong";
    await service.fulfillSession(s, "evt_" + field);
  }
  assert.equal(await Order.countDocuments(), 0);
  assert.equal(await PaymentEvent.countDocuments({ state: "manual" }), 4);
});
test("owned session reads stay read-only before and after webhook, cross-user access denied", async () => {
  const { c, s } = await paid(await product());
  await assert.rejects(
    service.readSession("different", s.id, provider),
    /not found/,
  );
  const page = await service.readSession(user.id, s.id, provider);
  assert.equal(page.session.payment_status, "paid");
  assert.equal(await Order.countDocuments(), 0);
  await Promise.all([
    service.readSession(user.id, s.id, provider),
    service.fulfillSession(s, "evt_race"),
  ]);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal((await Checkout.findById(c._id)).state, "fulfilled");
});
test("expiry verifies provider state, releases once, and holds delayed payments", async () => {
  const p = await product();
  const a = await checkout(p);
  await Checkout.updateOne(
    { _id: a._id },
    { $set: { expiresAt: new Date(0), nextCheckAt: new Date(0) } },
  );
  await service.reconcilePayments(provider);
  await service.reconcilePayments(provider);
  assert.equal((await Product.findById(p._id)).stock, 5);
  const b = await checkout(p);
  const s = await provider.checkout.sessions.retrieve(b.sessionId);
  s.status = "complete";
  await Checkout.updateOne(
    { _id: b._id },
    { $set: { expiresAt: new Date(0), nextCheckAt: new Date(0) } },
  );
  await service.reconcilePayments(provider);
  assert.equal((await Product.findById(p._id)).stock, 4);
  s.payment_status = "paid";
  await service.fulfillSession(s, "evt_delayed");
  assert.equal(await Order.countDocuments(), 1);
});
test("a paid event after release is retained for manual reconciliation without oversell", async () => {
  const p = await product(1);
  const { c, s } = await paid(p);
  s.status = "open";
  s.payment_status = "unpaid";
  await Checkout.updateOne(
    { _id: c._id },
    { $set: { expiresAt: new Date(0), nextCheckAt: new Date(0) } },
  );
  await service.reconcilePayments(provider);
  await checkout(p);
  s.payment_status = "paid";
  s.status = "complete";
  await service.fulfillSession(s, "evt_after_release");
  assert.equal(await Order.countDocuments(), 0);
  assert.equal(
    (await PaymentEvent.findById("evt_after_release")).state,
    "manual",
  );
  assert.equal((await Product.findById(p._id)).stock, 0);
});
test("outbox retries failures with recipient leases and escapes all external HTML", async () => {
  const { s } = await paid(await product());
  await service.fulfillSession(s, "evt_mail");
  let tries = 0;
  const sent = [];
  const send = async (...a) => {
    if (++tries === 1) throw Error("SMTP unavailable");
    sent.push(a);
  };
  await service.deliverNotifications(send);
  assert.equal(await Notification.countDocuments({ state: "sent" }), 1);
  await Notification.updateMany(
    { state: "pending" },
    { $set: { nextAttemptAt: new Date(0) } },
  );
  await Promise.all([
    service.deliverNotifications(send),
    service.deliverNotifications(send),
  ]);
  assert.equal(sent.length, 2);
  assert.equal(await Notification.countDocuments({ state: "sent" }), 2);
  assert.ok(
    sent.every(
      (a) =>
        !a[2].includes("<Serum>") &&
        a[2].includes("&lt;Serum&gt;") &&
        a[3].includes("<Serum>"),
    ),
  );
});
test("admin status changes cannot assert provider payment, and signed webhook failure is retryable", async () => {
  const express = require("express");
  const http = require("http");
  const Stripe = require("stripe");
  const auth = mock.method(
    require("../src/middleware/auth.middleware"),
    "authMiddleware",
    (req, res, next) => {
      req.user = user;
      next();
    },
  );
  const admin = mock.method(
    require("../src/middleware/isAdmin.middleware"),
    "isAdminMiddleware",
    (req, res, next) => next(),
  );
  const app = express();
  app.use("/webhook", require("../src/routes/stripe/webhook").default);
  app.use(express.json());
  app.use("/orders", require("../src/routes/order.routes").default);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const p = await product();
    const { s } = await paid(p);
    await service.fulfillSession(s, "evt_order");
    let response = await fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/orders/" +
        s.id +
        "/status",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      },
    );
    assert.equal(response.status, 400);
    response = await fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/orders/" +
        s.id +
        "/status",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: "shipped" }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal((await Order.findById(s.id)).paymentStatus, "paid");
    assert.equal((await Order.findById(s.id)).fulfillmentStatus, "shipped");
    response = await fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/orders/" +
        s.id +
        "/status",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: "pending" }),
      },
    );
    assert.equal(response.status, 409);
    await Order.create({
      _id: "cs_legacy_admin",
      userId: user.id,
      items: [],
      total: 1,
      status: "pending",
    });
    response = await fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/orders/cs_legacy_admin/status",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: "processing" }),
      },
    );
    assert.equal(response.status, 409);
    response = await fetch(
      "http://127.0.0.1:" + server.address().port + "/orders?limit=1",
    );
    const first = await response.json();
    assert.equal(first.orders.length, 1);
    assert.ok(first.nextCursor);
    response = await fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/orders?limit=1&cursor=" +
        encodeURIComponent(first.nextCursor),
    );
    const second = await response.json();
    assert.equal(second.orders.length, 1);
    assert.notEqual(first.orders[0]._id, second.orders[0]._id);
    response = await fetch(
      "http://127.0.0.1:" + server.address().port + "/orders?limit=100000",
    );
    assert.equal(response.status, 400);
    await service.fulfillSession(
      { id: "cs_manual_visibility", payment_status: "paid" },
      "evt_manual_visibility",
    );
    response = await fetch(
      "http://127.0.0.1:" + server.address().port + "/orders/reconciliation",
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).events[0].reason, "missing_snapshot");
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const { s: other } = await paid(await product());
    const payload = JSON.stringify({
      id: "evt_signed_retry",
      type: "checkout.session.completed",
      data: { object: other },
    });
    const signature = new Stripe(
      "sk_test_mock_only",
    ).webhooks.generateTestHeaderString({ payload, secret: "whsec_test" });
    const failing = mock.method(Order, "create", async () => {
      throw Error("temporary DB error");
    });
    try {
      response = await fetch(
        "http://127.0.0.1:" + server.address().port + "/webhook",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": signature,
          },
          body: payload,
        },
      );
      assert.equal(response.status, 500);
      assert.equal(
        await PaymentEvent.countDocuments({ _id: "evt_signed_retry" }),
        0,
      );
    } finally {
      failing.mock.restore();
    }
    response = await fetch(
      "http://127.0.0.1:" + server.address().port + "/webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": signature,
        },
        body: payload,
      },
    );
    assert.equal(response.status, 200);
    assert.equal(await Order.countDocuments(), 3);
  } finally {
    auth.mock.restore();
    admin.mock.restore();
    await new Promise((r) => server.close(r));
  }
});
test("corrupted snapshot quantities cannot fulfill a correct provider total", async () => {
  const { c, s } = await paid(await product());
  await Checkout.updateOne(
    { _id: c._id },
    { $set: { "items.0.quantity": 100 } },
  );
  await service.fulfillSession(s, "evt_corrupt");
  assert.equal(await Order.countDocuments(), 0);
  assert.equal((await PaymentEvent.findById("evt_corrupt")).state, "manual");
});
test("corrupted expired reservations retain stock for manual reconciliation", async () => {
  const p = await product(5);
  const c = await checkout(p);
  await Checkout.updateOne(
    { _id: c._id },
    {
      $set: {
        "items.0.quantity": 100,
        expiresAt: new Date(0),
        nextCheckAt: new Date(0),
      },
    },
  );
  await service.reconcilePayments(provider);
  assert.equal((await Product.findById(p._id)).stock, 4);
  const held = await Checkout.findById(c._id);
  assert.equal(held.state, "manual");
  assert.equal(held.reason, "invalid_snapshot");
  await service.reconcilePayments(provider);
  assert.equal((await Product.findById(p._id)).stock, 4);
});
test("expired sessions with a payment intent release only after provider confirms cancellation", async () => {
  const p = await product();
  const c = await checkout(p);
  const s = await provider.checkout.sessions.retrieve(c.sessionId);
  s.status = "expired";
  s.payment_intent = "pi_pending";
  let status = "processing";
  provider.paymentIntents = {
    retrieve: async () => ({ id: "pi_pending", status }),
  };
  await Checkout.updateOne(
    { _id: c._id },
    { $set: { expiresAt: new Date(0), nextCheckAt: new Date(0) } },
  );
  await service.reconcilePayments(provider);
  assert.equal((await Product.findById(p._id)).stock, 4);
  status = "canceled";
  await Checkout.updateOne(
    { _id: c._id },
    { $set: { nextCheckAt: new Date(0) } },
  );
  await service.reconcilePayments(provider);
  assert.equal((await Product.findById(p._id)).stock, 5);
});
test("ambiguous creation without a session id retains stock for manual reconciliation", async () => {
  const p = await product();
  failure = true;
  await assert.rejects(checkout(p));
  await Checkout.updateMany(
    {},
    { $set: { expiresAt: new Date(0), nextCheckAt: new Date(0) } },
  );
  await service.reconcilePayments(provider);
  assert.equal((await Checkout.findOne()).state, "manual");
  assert.equal((await Product.findById(p._id)).stock, 4);
});
test("an abandoned notification lease is recovered by another worker", async () => {
  const { s } = await paid(await product());
  await service.fulfillSession(s, "evt_lease");
  await Notification.updateMany(
    {},
    {
      $set: {
        state: "sending",
        leaseToken: "crashed-worker",
        leaseUntil: new Date(0),
      },
    },
  );
  const sent = [];
  await service.deliverNotifications(async (...args) => {
    sent.push(args);
  });
  assert.equal(sent.length, 2);
  assert.equal(await Notification.countDocuments({ state: "sent" }), 2);
});
test("checkout retries distinguish released, ambiguous and fulfilled attempts without new reservations", async () => {
  const express = require("express");
  const http = require("http");
  const auth = mock.method(
    require("../src/middleware/auth.middleware"),
    "authMiddleware",
    (req, res, next) => {
      req.user = user;
      next();
    },
  );
  const app = express();
  app.use(express.json());
  app.use("/stripe", require("../src/routes/stripe.routes").default);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const p = await product(5);
  const key = randomUUID();
  const c = await checkout(p, 1, key);
  const retry = () =>
    fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/stripe/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ items: [{ id: String(p._id), quantity: 1 }] }),
      },
    );
  try {
    await Checkout.updateOne(
      { _id: c._id },
      { $set: { expiresAt: new Date(0), nextCheckAt: new Date(0) } },
    );
    await service.reconcilePayments(provider);
    let response = await retry();
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "CHECKOUT_RELEASED");
    assert.equal((await Product.findById(p._id)).stock, 5);
    assert.equal(await Checkout.countDocuments(), 1);
    await Checkout.updateOne(
      { _id: c._id },
      { $set: { state: "manual", reason: "ambiguous_session_creation" } },
    );
    response = await retry();
    assert.equal(response.status, 409);
    assert.equal(
      (await response.json()).code,
      "CHECKOUT_RECONCILIATION_REQUIRED",
    );
    // A different key with verified payment returns the existing local success page.
    const paidKey = randomUUID();
    const paidCheckout = await checkout(p, 1, paidKey);
    const s = await provider.checkout.sessions.retrieve(paidCheckout.sessionId);
    s.status = "complete";
    s.payment_status = "paid";
    await service.fulfillSession(s, "evt_retry_paid");
    response = await fetch(
      "http://127.0.0.1:" +
        server.address().port +
        "/stripe/create-checkout-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": paidKey,
        },
        body: JSON.stringify({ items: [{ id: String(p._id), quantity: 1 }] }),
      },
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.checkoutStatus, "fulfilled");
    assert.equal(result.url, "/success?session_id=" + encodeURIComponent(s.id));
    assert.equal(await Order.countDocuments(), 1);
    assert.equal((await Product.findById(p._id)).stock, 4);
    assert.equal(sessions.size, 2);
  } finally {
    auth.mock.restore();
    await new Promise((r) => server.close(r));
  }
});

test("admin deletion preserves products held by reserved open or manual checkouts", async () => {
  const controller = require("../src/controllers/product.controller").default;
  for (const state of ["reserved", "open", "manual"]) {
    const p = await product(1);
    const c = await checkout(p);
    await Checkout.updateOne({ _id: c._id }, { $set: { state } });
    let status = 200;
    const res = {
      status(n) {
        status = n;
        return this;
      },
      json() {
        return this;
      },
    };
    await controller.deleteProduct({ params: { id: String(p._id) } }, res);
    assert.equal(status, 409);
    assert.ok(await Product.findById(p._id));
  }
  const available = await product();
  let status = 200;
  await controller.deleteProduct(
    { params: { id: String(available._id) } },
    {
      status(n) {
        status = n;
        return this;
      },
      json() {
        return this;
      },
    },
  );
  assert.equal(status, 200);
  assert.equal(await Product.findById(available._id), null);
});
test("admin deletion and checkout cannot leave a reservation for a deleted product", async () => {
  const controller = require("../src/controllers/product.controller").default;
  for (let n = 0; n < 6; n++) {
    const p = await product(1);
    let status = 200;
    const [buy] = await Promise.allSettled([
      checkout(p),
      controller.deleteProduct(
        { params: { id: String(p._id) } },
        {
          status(v) {
            status = v;
            return this;
          },
          json() {
            return this;
          },
        },
      ),
    ]);
    if (buy.status === "fulfilled") {
      assert.equal(status, 409);
      assert.ok(await Product.findById(p._id));
    } else {
      assert.equal(status, 200);
      assert.equal(await Product.findById(p._id), null);
      assert.equal(
        await Checkout.countDocuments({ "items.productId": String(p._id) }),
        0,
      );
    }
  }
});
