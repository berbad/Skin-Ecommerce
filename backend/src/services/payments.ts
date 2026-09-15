import { createHash, randomUUID } from "crypto";
import mongoose from "mongoose";
import Stripe from "stripe";
import Product from "../models/product.model";
import Order from "../models/Order";
import { Checkout, PaymentEvent, Notification } from "../models/payment.models";
import { sendReceiptEmail } from "../utils/mailer";

export class PaymentError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: "CHECKOUT_RELEASED" | "CHECKOUT_RECONCILIATION_REQUIRED",
  ) {
    super(message);
  }
}
function validateCheckoutState(checkout: { state: string }) {
  if (checkout.state === "released")
    throw new PaymentError(
      "This checkout expired unpaid. Click checkout again to start a new attempt.",
      409,
      "CHECKOUT_RELEASED",
    );
  if (checkout.state === "manual")
    throw new PaymentError(
      "This checkout needs reconciliation. Keep this attempt and contact support before starting another payment.",
      409,
      "CHECKOUT_RECONCILIATION_REQUIRED",
    );
}
let stripe: Stripe | undefined;
export function paymentProvider(): Stripe {
  if (!stripe)
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      timeout: 20000,
      maxNetworkRetries: 2,
    });
  return stripe;
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function normalizeCart(input: unknown) {
  if (!Array.isArray(input) || !input.length || input.length > 100)
    throw new PaymentError("Invalid cart");
  const seen = new Set<string>();
  return input
    .map((item) => {
      const raw = item?.id ?? item?.productId;
      if (
        typeof raw !== "string" ||
        !/^[a-f0-9]{24}$/i.test(raw) ||
        !Number.isSafeInteger(item?.quantity) ||
        item.quantity < 1 ||
        item.quantity > 1000
      )
        throw new PaymentError("Invalid cart item");
      const productId = raw.toLowerCase();
      if (seen.has(productId)) throw new PaymentError("Invalid cart duplicate");
      seen.add(productId);
      return { productId, quantity: item.quantity as number };
    })
    .sort((a, b) => a.productId.localeCompare(b.productId));
}
async function transaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  // Driver retries transient write conflicts. Unique-key races need a fresh
  // transaction/snapshot before reading the winning checkout/event.
  for (let attempt = 0; ; attempt++) {
    const session = await mongoose.startSession();
    try {
      return (await session.withTransaction(() => fn(session))) as T;
    } catch (error: any) {
      if (error.code !== 11000 || attempt >= 3) throw error;
    } finally {
      await session.endSession();
    }
  }
}
export async function initializePaymentStorage() {
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid")
    throw new Error("Payments require MongoDB replica-set transactions");
  await Promise.all([
    Checkout.createIndexes(),
    PaymentEvent.createIndexes(),
    Notification.createIndexes(),
    Order.createIndexes(),
  ]);
}

export async function createCheckout(
  user: { id: string; email: string },
  input: unknown,
  key: unknown,
  provider = paymentProvider(),
) {
  const cart = normalizeCart(input);
  if (
    typeof key !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
  )
    throw new PaymentError("A UUID Idempotency-Key is required");
  const id = hash(user.id + ":" + key.toLowerCase());
  const requestHash = hash(JSON.stringify(cart));
  let checkout = await Checkout.findById(id);
  if (!checkout) {
    const shippingRateId = process.env.STRIPE_SHIPPING_RATE_ID;
    if (!shippingRateId)
      throw new PaymentError("Shipping configuration unavailable", 503);
    const rate = await provider.shippingRates.retrieve(shippingRateId);
    if (
      !rate.active ||
      rate.type !== "fixed_amount" ||
      rate.fixed_amount?.currency !== "usd" ||
      !Number.isSafeInteger(rate.fixed_amount.amount) ||
      rate.fixed_amount.amount < 0
    )
      throw new PaymentError("Shipping configuration unavailable", 503);
    const shippingCents = rate.fixed_amount.amount;
    const clientUrl = process.env.CLIENT_URL!;
    if (!clientUrl || !/^https?:\/\//.test(clientUrl))
      throw new PaymentError("Checkout configuration unavailable", 503);
    checkout = await transaction(async (db) => {
      const existing = await Checkout.findById(id).session(db);
      if (existing) return existing;
      const items = [];
      let subtotalCents = 0;
      for (const item of cart) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session: db },
        );
        if (!product) throw new PaymentError("Product unavailable", 409);
        const unitAmount = Math.round(product.price * 100);
        if (
          !Number.isFinite(product.price) ||
          product.price < 0 ||
          !Number.isSafeInteger(unitAmount) ||
          unitAmount < 1 ||
          !Number.isInteger(product.stock)
        )
          throw new PaymentError("Product unavailable", 409);
        subtotalCents += unitAmount * item.quantity;
        items.push({ ...item, name: product.name, unitAmount });
      }
      if (
        !Number.isSafeInteger(subtotalCents + shippingCents) ||
        subtotalCents + shippingCents > 99999999
      )
        throw new PaymentError("Cart total exceeds checkout limit");
      const expiresAt = new Date(
        Math.floor(Date.now() / 1000) * 1000 + 60 * 60 * 1000,
      );
      return (
        await Checkout.create(
          [
            {
              _id: id,
              userId: user.id,
              email: user.email,
              requestHash,
              items,
              subtotalCents,
              shippingCents,
              shippingRateId,
              totalCents: subtotalCents + shippingCents,
              currency: "usd",
              clientUrl,
              state: "reserved",
              expiresAt,
              nextCheckAt: expiresAt,
            },
          ],
          { session: db },
        )
      )[0];
    });
  }
  if (checkout.requestHash !== requestHash)
    throw new PaymentError(
      "Idempotency key already used for another cart",
      409,
    );
  validateCheckoutState(checkout);
  if (checkout.sessionId) return checkout;
  // Stripe keys expire after at least 24h. Never blindly recreate an ambiguous
  // session after our fixed one-hour expiration or with changed parameters.
  if (checkout.expiresAt.getTime() <= Date.now() + 30 * 60 * 1000)
    throw new PaymentError(
      "This checkout needs reconciliation. Keep this attempt and contact support before starting another payment.",
      409,
      "CHECKOUT_RECONCILIATION_REQUIRED",
    );
  const session = await provider.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: checkout._id,
      line_items: checkout.items.map((item) => ({
        price_data: {
          currency: checkout.currency,
          product_data: { name: item.name! },
          unit_amount: item.unitAmount!,
        },
        quantity: item.quantity!,
      })),
      customer_email: checkout.email,
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{ shipping_rate: checkout.shippingRateId }],
      metadata: { checkoutId: checkout._id },
      expires_at: Math.floor(checkout.expiresAt.getTime() / 1000),
      success_url: `${checkout.clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkout.clientUrl}/cart?canceled=true`,
    },
    { idempotencyKey: `checkout-${checkout._id}` },
  );
  // A webhook may fulfill before this update; never regress its state.
  await Checkout.updateOne(
    { _id: id, sessionId: { $exists: false } },
    { $set: { sessionId: session.id, sessionUrl: session.url || undefined } },
  );
  await Checkout.updateOne(
    { _id: id, state: "reserved" },
    { $set: { state: "open" } },
  );
  const current = (await Checkout.findById(id))!;
  validateCheckoutState(current);
  return current;
}

function eventRecord(
  session: Stripe.Checkout.Session,
  eventId: string,
  state: string,
  reason?: string,
) {
  return {
    _id: eventId,
    sessionId: session.id,
    checkoutId: session.metadata?.checkoutId,
    state,
    reason,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
  };
}
function validSnapshot(checkout: any) {
  try {
    const cart = normalizeCart(
      checkout.items.map((item: any) => ({
        id: item.productId,
        quantity: item.quantity,
      })),
    );
    const subtotal = checkout.items.reduce((sum: number, item: any) => {
      if (
        !Number.isSafeInteger(item.unitAmount) ||
        item.unitAmount < 1 ||
        typeof item.name !== "string" ||
        !item.name
      )
        throw new Error("Invalid snapshot");
      return sum + item.unitAmount * item.quantity;
    }, 0);
    return (
      hash(JSON.stringify(cart)) === checkout.requestHash &&
      Number.isSafeInteger(subtotal) &&
      subtotal === checkout.subtotalCents &&
      Number.isSafeInteger(checkout.shippingCents) &&
      checkout.shippingCents >= 0 &&
      subtotal + checkout.shippingCents === checkout.totalCents
    );
  } catch {
    return false;
  }
}
export async function fulfillSession(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  if (session.payment_status !== "paid") return;
  return transaction(async (db) => {
    if (await PaymentEvent.findById(eventId).session(db)) return;
    const ref = session.metadata?.checkoutId;
    const checkout = ref ? await Checkout.findById(ref).session(db) : null;
    // Handle both Stripe API generations without confusing billing and shipping.
    const shipping =
      (session as any).collected_information?.shipping_details ??
      (session as any).shipping_details;
    const invalid = !checkout
      ? "missing_snapshot"
      : !validSnapshot(checkout)
        ? "invalid_snapshot"
        : checkout.state === "released"
          ? "paid_after_release"
          : checkout.state === "manual"
            ? "manual_checkout"
            : session.client_reference_id !== checkout._id ||
                (checkout.sessionId && checkout.sessionId !== session.id)
              ? "session_ownership_mismatch"
              : session.mode !== "payment" ||
                  session.status !== "complete" ||
                  session.currency !== checkout.currency ||
                  session.amount_total !== checkout.totalCents ||
                  session.amount_subtotal !== checkout.subtotalCents ||
                  session.total_details?.amount_shipping !==
                    checkout.shippingCents
                ? "payment_snapshot_mismatch"
                : !session.customer_details?.email ||
                    !shipping?.name ||
                    !shipping.address?.line1 ||
                    !shipping.address?.postal_code ||
                    !shipping.address?.country
                  ? "missing_customer_or_shipping"
                  : null;
    if (invalid) {
      await PaymentEvent.create(
        [eventRecord(session, eventId, "manual", invalid)],
        { session: db },
      );
      if (checkout && checkout.state !== "fulfilled")
        await Checkout.updateOne(
          { _id: checkout._id },
          { $set: { state: "manual", reason: invalid } },
          { session: db },
        );
      return;
    }
    if (checkout!.state !== "fulfilled") {
      // Existing legacy orders are never overwritten or guessed into ownership.
      if (await Order.findById(session.id).session(db)) {
        await PaymentEvent.create(
          [eventRecord(session, eventId, "manual", "existing_legacy_order")],
          { session: db },
        );
        await Checkout.updateOne(
          { _id: checkout!._id },
          { $set: { state: "manual", reason: "existing_legacy_order" } },
          { session: db },
        );
        return;
      }
      await Order.create(
        [
          {
            _id: session.id,
            checkoutId: checkout!._id,
            userId: checkout!.userId,
            items: checkout!.items.map((i) => ({
              productId: i.productId,
              name: i.name,
              quantity: i.quantity,
              price: i.unitAmount! / 100,
              unitAmount: i.unitAmount,
            })),
            total: checkout!.totalCents / 100,
            totalCents: checkout!.totalCents,
            shippingCents: checkout!.shippingCents,
            currency: checkout!.currency,
            status: "paid",
            paymentStatus: "paid",
            fulfillmentStatus: "pending",
            shippingAddress: shipping.address,
            shippingName: shipping.name,
            customerEmail: session.customer_details!.email,
            customerName: session.customer_details!.name || shipping.name,
          },
        ],
        { session: db },
      );
      const recipients = [
        { recipient: session.customer_details!.email!, kind: "customer" },
      ];
      if (process.env.ADMIN_EMAIL)
        recipients.push({ recipient: process.env.ADMIN_EMAIL, kind: "admin" });
      await Notification.create(
        recipients.map((r) => ({
          _id: hash(session.id + ":" + r.kind + ":" + r.recipient),
          orderId: session.id,
          ...r,
        })),
        { session: db, ordered: true },
      );
      await Checkout.updateOne(
        { _id: checkout!._id },
        { $set: { state: "fulfilled", sessionId: session.id } },
        { session: db },
      );
    }
    await PaymentEvent.create([eventRecord(session, eventId, "fulfilled")], {
      session: db,
    });
  });
}
export async function readSession(
  userId: string,
  sessionId: string,
  provider = paymentProvider(),
) {
  const checkout = await Checkout.findOne({
    sessionId: { $eq: sessionId },
    userId: { $eq: userId },
  });
  if (!checkout) throw new PaymentError("Session not found", 404);
  const session = await provider.checkout.sessions.retrieve(sessionId);
  if (
    session.metadata?.checkoutId !== checkout._id ||
    session.client_reference_id !== checkout._id
  )
    throw new PaymentError("Session not found", 404);
  return {
    session: {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_details: session.customer_details,
    },
    fulfillmentStatus: checkout.state,
  };
}

export async function reconcilePayments(provider = paymentProvider()) {
  const due = await Checkout.find({
    state: { $in: ["reserved", "open"] },
    nextCheckAt: { $lte: new Date() },
  })
    .sort({ nextCheckAt: 1 })
    .limit(100);
  for (const checkout of due) {
    // Delay next attempt before external I/O so one bad session cannot starve
    // the queue. Duplicate worker reads remain safe through transaction state.
    await Checkout.updateOne(
      { _id: checkout._id },
      { $set: { nextCheckAt: new Date(Date.now() + 5 * 60 * 1000) } },
    );
    try {
      if (!checkout.sessionId) {
        await Checkout.updateOne(
          { _id: checkout._id, state: "reserved" },
          { $set: { state: "manual", reason: "ambiguous_session_creation" } },
        );
        continue;
      }
      let remote = await provider.checkout.sessions.retrieve(
        checkout.sessionId,
      );
      if (remote.payment_status === "paid") {
        await fulfillSession(remote, `reconcile-paid-${remote.id}`);
        continue;
      }
      if (
        remote.status === "open" &&
        checkout.expiresAt.getTime() <= Date.now()
      ) {
        await provider.checkout.sessions.expire(remote.id);
        remote = await provider.checkout.sessions.retrieve(remote.id);
      }
      // Completed unpaid sessions may still settle asynchronously. Retain stock.
      if (remote.status !== "expired" || remote.payment_status !== "unpaid")
        continue;
      if (remote.payment_intent) {
        const intentId =
          typeof remote.payment_intent === "string"
            ? remote.payment_intent
            : remote.payment_intent.id;
        const intent = await provider.paymentIntents.retrieve(intentId);
        if (intent.status !== "canceled") continue;
      }
      if (
        remote.metadata?.checkoutId !== checkout._id ||
        remote.client_reference_id !== checkout._id
      ) {
        await Checkout.updateOne(
          { _id: checkout._id, state: { $in: ["open", "reserved"] } },
          {
            $set: {
              state: "manual",
              reason: "reconciliation_ownership_mismatch",
            },
          },
        );
        continue;
      }
      await transaction(async (db) => {
        const current = await Checkout.findById(checkout._id).session(db);
        if (!current || !["reserved", "open"].includes(current.state)) return;
        // Returning stock requires the same trusted snapshot as fulfillment.
        if (!validSnapshot(current)) {
          await Checkout.updateOne(
            { _id: current._id },
            { $set: { state: "manual", reason: "invalid_snapshot" } },
            { session: db },
          );
          return;
        }
        for (const item of current.items) {
          const result = await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity! } },
            { session: db },
          );
          if (!result.matchedCount) throw new Error("Reserved product missing");
        }
        await Checkout.updateOne(
          { _id: current._id },
          { $set: { state: "released" } },
          { session: db },
        );
      });
    } catch {
      console.error("Payment reconciliation attempt failed");
    }
  }
}
const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function notificationContent(order: any, kind: string) {
  const lines = [
    kind === "admin" ? "New order received" : "Thank you for your order",
    `Order: ${order._id}`,
    `Customer: ${order.customerName || ""}`,
    `Email: ${order.customerEmail || ""}`,
    ...order.items.map(
      (i: any) =>
        `${i.name} × ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`,
    ),
    `Shipping: $${(order.shippingCents / 100).toFixed(2)}`,
    `Total: $${order.total.toFixed(2)}`,
    `Ship to: ${order.shippingName || ""}`,
    ...["line1", "line2", "city", "state", "postal_code", "country"].map(
      (k) => order.shippingAddress?.[k] || "",
    ),
  ];
  return {
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
  };
}
export async function deliverNotifications(send = sendReceiptEmail) {
  for (let count = 0; count < 100; count++) {
    const now = new Date(),
      leaseToken = randomUUID();
    const entry = await Notification.findOneAndUpdate(
      {
        $or: [
          { state: "pending", nextAttemptAt: { $lte: now } },
          { state: "sending", leaseUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          state: "sending",
          leaseToken,
          leaseUntil: new Date(Date.now() + 5 * 60 * 1000),
        },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { nextAttemptAt: 1 } },
    );
    if (!entry) break;
    try {
      const order = await Order.findById(entry.orderId);
      if (!order) throw new Error("Order unavailable");
      const body = notificationContent(order, entry.kind);
      await send(
        entry.recipient,
        "Eternal Botanic order receipt",
        body.html,
        body.text,
      );
      await Notification.updateOne(
        { _id: entry._id, leaseToken, state: "sending" },
        {
          $set: { state: "sent", sentAt: new Date() },
          $unset: { leaseToken: 1, leaseUntil: 1 },
        },
      );
    } catch {
      await Notification.updateOne(
        { _id: entry._id, leaseToken, state: "sending" },
        {
          $set: {
            state: "pending",
            nextAttemptAt: new Date(
              Date.now() +
                Math.min(
                  24 * 60 * 60 * 1000,
                  30000 * 2 ** Math.min(entry.attempts, 11),
                ),
            ),
          },
          $unset: { leaseToken: 1, leaseUntil: 1 },
        },
      );
      console.error("Order notification attempt failed");
    }
  }
}
export function startPaymentWorkers() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await reconcilePayments();
      await deliverNotifications();
    } catch {
      console.error("Payment worker failed");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, 60 * 1000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
