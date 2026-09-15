import mongoose, { Schema } from "mongoose";

// A checkout IS its inventory reservation. stock counts available units; held
// units move to an order or are returned in the same transaction as this state.
const checkoutSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    requestHash: { type: String, required: true },
    items: [
      {
        _id: false,
        productId: String,
        name: String,
        quantity: Number,
        unitAmount: Number,
      },
    ],
    subtotalCents: { type: Number, required: true },
    shippingCents: { type: Number, required: true },
    shippingRateId: { type: String, required: true },
    totalCents: { type: Number, required: true },
    currency: { type: String, required: true },
    clientUrl: { type: String, required: true },
    sessionId: { type: String },
    sessionUrl: String,
    state: {
      type: String,
      enum: ["reserved", "open", "fulfilled", "released", "manual"],
      required: true,
    },
    reason: String,
    expiresAt: { type: Date, required: true },
    nextCheckAt: { type: Date, required: true },
  },
  { timestamps: true },
);
checkoutSchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } },
);
checkoutSchema.index({ state: 1, nextCheckAt: 1 });

// No TTL: paid anomalies must remain discoverable until explicitly resolved.
const eventSchema = new Schema(
  {
    _id: { type: String, required: true },
    sessionId: String,
    checkoutId: String,
    state: { type: String, enum: ["fulfilled", "manual"], required: true },
    reason: String,
    amountTotal: Number,
    currency: String,
    paymentIntentId: String,
  },
  { timestamps: true },
);
eventSchema.index({ state: 1, createdAt: 1 });
const notificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    orderId: { type: String, required: true },
    recipient: { type: String, required: true },
    kind: { type: String, enum: ["customer", "admin"], required: true },
    state: {
      type: String,
      enum: ["pending", "sending", "sent"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: Date,
    leaseToken: String,
    sentAt: Date,
  },
  { timestamps: true },
);
notificationSchema.index({ state: 1, nextAttemptAt: 1, leaseUntil: 1 });
export const Checkout = mongoose.model("Checkout", checkoutSchema);
export const PaymentEvent = mongoose.model("PaymentEvent", eventSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
