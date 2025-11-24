import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  _id: string;
  userId: string;
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
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["paid", "processing", "pending", "failed"],
      default: "paid",
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
  { _id: false, timestamps: true }
);

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
