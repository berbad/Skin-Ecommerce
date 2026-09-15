import { render, screen, waitFor } from "@testing-library/react";
import { test, expect, vi, afterEach } from "vitest";
import SuccessPage from "./SuccessPageClient";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("session_id=cs_test"),
}));
vi.mock("@/lib/axios", () => ({ default: { get: vi.fn() } }));
import axios from "@/lib/axios";
afterEach(() => vi.clearAllMocks());
test("an unpaid session never displays payment success or clears the cart", async () => {
  localStorage.setItem("cart", "[1]");
  vi.mocked(axios.get).mockResolvedValue({
    data: {
      session: { id: "cs_test", payment_status: "unpaid", amount_total: 100 },
      fulfillmentStatus: "open",
    },
  });
  render(<SuccessPage />);
  await waitFor(() =>
    expect(screen.getByText("Payment pending")).toBeInTheDocument(),
  );
  expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
  expect(localStorage.getItem("cart")).toBe("[1]");
});
