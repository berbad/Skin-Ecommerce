import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";

const pathname = { current: "/" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

const getCurrentUser = vi.fn();
vi.mock("@/lib/getCurrentUser", () => ({
  getCurrentUser: () => getCurrentUser(),
}));
vi.mock("@/lib/logout", () => ({ logout: vi.fn() }));

beforeEach(() => {
  pathname.current = "/";
  getCurrentUser.mockResolvedValue(null);
});

describe("Navbar", () => {
  it("marks the active route with brand text color", async () => {
    pathname.current = "/products";
    render(<Navbar />);
    const shopLinks = await screen.findAllByText("Shop");
    expect(shopLinks[0].className).toContain("text-brand");
  });

  it("shows account and cart links when logged out", async () => {
    render(<Navbar />);
    expect(await screen.findByLabelText("Account")).toBeInTheDocument();
    const cartLink = document.querySelector('a[href="/cart"]');
    expect(cartLink).not.toBeNull();
  });

  it("does NOT use a hardcoded pink class anywhere", async () => {
    const { container } = render(<Navbar />);
    await screen.findByLabelText("Account");
    expect(container.innerHTML).not.toContain("pink-600");
  });

  it("uses brand tokens and no pink in the logged-in (admin) branch", async () => {
    getCurrentUser.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
      role: "admin",
    });
    const { container } = render(<Navbar />);
    // avatar button renders the user's initial once the user loads
    expect(await screen.findByRole("button", { name: "A" })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("pink-600");
    expect(container.innerHTML).toContain("bg-brand");
  });

  it("opens the mobile menu when the menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByLabelText("Menu"));
    const shopLinks = await screen.findAllByText("Shop");
    expect(shopLinks.length).toBeGreaterThan(1);
  });
});
