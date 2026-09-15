import mongoose, { Document, Schema } from "mongoose";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  disabled: boolean;
  authVersion: number;
  mfaSecret?: string;
  mfaLastStep: number;
  recoveryCodes: string[];
  address?: Address;
  cart: { productId: string; quantity: number }[];
}

const AddressSchema = new Schema<Address>(
  {
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "United States" },
  },
  { _id: false },
);

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    disabled: { type: Boolean, default: false },
    authVersion: { type: Number, default: 0 },
    mfaSecret: { type: String },
    mfaLastStep: { type: Number, default: -1 },
    recoveryCodes: { type: [String], default: [] },

    address: { type: AddressSchema, default: undefined },

    cart: [
      {
        productId: { type: String, required: true },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          max: 1000,
          validate: Number.isInteger,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Every supported security mutation permanently invalidates earlier sessions.
const securityFields = ["role", "disabled", "password", "email", "mfaSecret"];
UserSchema.pre("save", function (next) {
  if (!this.isNew && securityFields.some((field) => this.isModified(field))) {
    this.$inc("authVersion", 1);
  }
  next();
});
for (const operation of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
] as const) {
  UserSchema.pre(operation, function (next) {
    const update = this.getUpdate();
    if (Array.isArray(update)) {
      next(new Error("Pipeline user updates are not supported"));
      return;
    }
    if (
      update &&
      securityFields.some(
        (field) =>
          field in update ||
          field in (update.$set || {}) ||
          field in (update.$unset || {}),
      )
    ) {
      update.$inc = {
        ...update.$inc,
        authVersion: Math.max(1, Number(update.$inc?.authVersion || 0)),
      };
      this.setUpdate(update);
    }
    next();
  });
}
export default mongoose.model<IUser>("User", UserSchema);
