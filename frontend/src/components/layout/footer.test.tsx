import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./footer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? "#"} {...props}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  it("renders brand, shop, company and contact sections", () => {
    render(<Footer />);
    expect(screen.getByText("Eternal Botanic")).toBeInTheDocument();
    expect(screen.getByText("All Products")).toBeInTheDocument();
    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.getByText(/eternalbotanic@gmail.com/)).toBeInTheDocument();
  });

  it("links Terms with an absolute path", () => {
    render(<Footer />);
    const terms = screen.getByText("Terms & Conditions");
    expect(terms.getAttribute("href")).toBe("/terms");
  });

  it("shows the current year", () => {
    render(<Footer />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
