import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "./product";

vi.mock("@/lib/images", () => ({
  normalizeImageSrc: (s: string) => s || "/placeholder.png",
}));

const product: Product = {
  _id: "abc",
  name: "Niacinamide 10%",
  description: "Oil control serum",
  price: 18,
  image: "n.png",
  category: "Serum",
};

beforeEach(() => {
  localStorage.clear();
});

describe("ProductCard", () => {
  it("renders name, category and a tabular-formatted price", () => {
    render(<ProductCard product={product} onView={() => {}} />);
    expect(screen.getByText("Niacinamide 10%")).toBeInTheDocument();
    expect(screen.getByText("Serum")).toBeInTheDocument();
    expect(screen.getByText("$18.00")).toBeInTheDocument();
  });
  it("uses no hardcoded pink classes", () => {
    const { container } = render(<ProductCard product={product} onView={() => {}} />);
    expect(container.innerHTML).not.toContain("pink-");
  });
  it("adds to cart when Add to cart is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} onView={() => {}} />);
    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart[0].id).toBe("abc");
  });
  it("calls onView with the product when View is clicked", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<ProductCard product={product} onView={onView} />);
    await user.click(screen.getByRole("button", { name: /view/i }));
    expect(onView).toHaveBeenCalledWith(product);
  });
});
