import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConcernChips } from "./ConcernChips";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : (href?.pathname ?? "#")} {...props}>
      {children}
    </a>
  ),
}));

describe("ConcernChips", () => {
  it("renders an 'All' chip linking to /products", () => {
    render(<ConcernChips />);
    const all = screen.getByText("All");
    expect(all.getAttribute("href")).toBe("/products");
  });
  it("links a concern chip to /products with a concern query", () => {
    render(<ConcernChips />);
    const acne = screen.getByText("Acne & Pores");
    expect(acne.getAttribute("href")).toContain("/products?concern=");
  });
  it("uses no hardcoded pink classes", () => {
    const { container } = render(<ConcernChips />);
    expect(container.innerHTML).not.toContain("pink-");
  });
});
