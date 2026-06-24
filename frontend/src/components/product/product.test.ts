import { describe, it, expect, beforeEach, vi } from "vitest";
import { addToCart, type Product } from "./product";

const product: Product = {
  _id: "abc",
  name: "Niacinamide 10%",
  description: "A serum",
  price: 18,
  image: "x.png",
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("addToCart", () => {
  it("adds a new product with quantity 1", () => {
    addToCart(product);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart).toEqual([
      { id: "abc", name: "Niacinamide 10%", price: 18, quantity: 1 },
    ]);
  });
  it("increments quantity when the product is already in the cart", () => {
    addToCart(product);
    addToCart(product);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });
  it("dispatches a cart-updated event", () => {
    const spy = vi.fn();
    window.addEventListener("cart-updated", spy);
    addToCart(product);
    expect(spy).toHaveBeenCalledOnce();
    window.removeEventListener("cart-updated", spy);
  });
  it("falls back to id when _id is absent", () => {
    addToCart({ ...product, _id: undefined, id: "fallback" });
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart[0].id).toBe("fallback");
  });
});
