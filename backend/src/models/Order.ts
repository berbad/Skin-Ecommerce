import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document<string> {
  _id: string;
  userId: string;
  checkoutId?: string;
  paymentStatus: "paid" | "unverified";
  fulfillmentStatus:
    "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingName?: string;
  totalCents?: number;
  shippingCents?: number;
  currency?: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: "paid" | "processing" | "pending" | "failed";
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  customerEmail?: string;
  customerName?: string;
  trackingNumber?: string;
  statusHistory: {
    status: string;
    timestamp: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    _id: { type: String, required: true },
    userId: { type: String, index: true },
    checkoutId: String,
    paymentStatus: {
      type: String,
      enum: ["paid", "unverified"],
      default: "unverified",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingName: String,
    totalCents: Number,
    shippingCents: Number,
    currency: String,
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        unitAmount: Number,
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["paid", "processing", "pending", "failed"],
      default: "pending",
    },
    shippingAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      postal_code: { type: String },
      country: { type: String },
    },
    customerEmail: { type: String },
    customerName: { type: String },
    trackingNumber: { type: String },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
          note: { type: String },
        },
      ],
      default: [],
    },
  },
  { _id: false, timestamps: true },
);

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
