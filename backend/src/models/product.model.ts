import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
  numReviews: number;
  order: number;
  featured: boolean;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    stock: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    ingredients: { type: String },
    benefits: { type: String },
    howToUse: { type: String },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1, order: 1 });
ProductSchema.index({ featured: 1 });

const Product = mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
